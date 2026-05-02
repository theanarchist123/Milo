"""
Auto-Processor — Background autopilot that syncs Gmail/Classroom,
detects pending assignments, generates documents, and notifies users.

Runs periodically via APScheduler. Designed to respect:
  1. Gemini free-tier rate limits (15 RPM) — sequential processing with delays
  2. Smart filtering — only processes academic/assignment emails, not promotional junk
  3. User interval settings — honours each user's auto_process_interval_minutes
  4. Failure visibility — notifies users on both success AND failure
"""
import logging
import time
import uuid
import datetime as dt

from database import SessionLocal
from models import User, CourseItem, EmailRecord, Task as DBTask
from services.gemini_service import classify_content, generate_output
from services.gmail_service import fetch_emails_for_user
from services.classroom_service import fetch_classroom_for_user
from services.notification_service import create_notification, send_email_notification
from services.docx_generator import create_docx_from_markdown

logger = logging.getLogger(__name__)

# Delay between API calls in seconds.
# We don't need the 6 second sleep anymore since we switched from Gemini to Ollama Cloud
INTER_CALL_DELAY_SECONDS = 1

# Maximum items to process per cycle per user (prevents runaway processing)
MAX_ITEMS_PER_CYCLE = 10


import threading

# Global lock to prevent overlapping autopilot cycles causing 429 concurrency errors on Ollama API
_cycle_lock = threading.Lock()

def run_auto_processing_cycle():
    """Runs periodically via APScheduler. Processes all enabled users sequentially."""

    try:
        logger.info("[AutoProcessor] ═══ Starting auto-processing cycle ═══")

        db = SessionLocal()
        try:
            users = db.query(User).filter(User.auto_process_enabled == True).all()
            logger.info(f"[AutoProcessor] Found {len(users)} user(s) with autopilot enabled")

            for user in users:
                try:
                    _process_user(db, user)
                except Exception as e:
                    logger.error(f"[AutoProcessor] Cycle error for user {user.email}: {e}")
        finally:
            db.close()

        logger.info("[AutoProcessor] ═══ Cycle complete ═══")
    finally:
        _cycle_lock.release()

def _process_user(db, user: User):
    """Process a single user: sync → find pending items → generate → notify."""
    
    # Block overlapping API calls if the user rapidly clicks 'Run Now' or if the background cycle triggers
    if not _cycle_lock.acquire(blocking=False):
        logger.warning(f"[AutoProcessor] Already processing. Ignoring overlapping request for user {user.email}.")
        return
        
    # ── Guard: skip if no Google token ──────────────────────────────────
    if not user.google_access_token:
        logger.warning(f"[AutoProcessor] Skipping {user.email}: no Google OAuth token")
        _cycle_lock.release()
        return

    # ── Guard: Respect User's Interval Setting ──────────────────────────
    if user.last_sync_time:
        interval = user.auto_process_interval_minutes or 15
        elapsed_mins = (dt.datetime.utcnow() - user.last_sync_time).total_seconds() / 60.0
        if elapsed_mins < interval:
            logger.info(f"[AutoProcessor] Skipping {user.email}: Not time yet (elapsed {elapsed_mins:.1f}m < {interval}m)")
            _cycle_lock.release()
            return

    user.last_sync_time = dt.datetime.utcnow()
    db.commit()

    logger.info(f"[AutoProcessor] Processing user: {user.email}")
    items_processed = 0

    # ── Step 1: Sync Gmail & Classroom ──────────────────────────────────
    try:
        logger.info(f"[AutoProcessor]   → Syncing Gmail...")
        fetch_emails_for_user(user.id, user.google_access_token)
    except Exception as e:
        logger.warning(f"[AutoProcessor]   Gmail sync failed: {e}")

    try:
        logger.info(f"[AutoProcessor]   → Syncing Classroom...")
        fetch_classroom_for_user(user.id, user.google_access_token)
    except Exception as e:
        logger.warning(f"[AutoProcessor]   Classroom sync failed: {e}")

    from sqlalchemy import case

    # ── Step 2: Process unprocessed CourseItems (these are high-value) ──
    unprocessed_items = db.query(CourseItem).filter(
        CourseItem.owner_id == user.id,
        CourseItem.auto_processed == False
    ).order_by(
        case(
             {"COURSEWORK": 1, "MATERIAL": 2, "ANNOUNCEMENT": 3},
             value=CourseItem.type,
             else_=4
        )
    ).all()

    logger.info(f"[AutoProcessor]   Found {len(unprocessed_items)} unprocessed classroom items")

    for item in unprocessed_items:
        if items_processed >= MAX_ITEMS_PER_CYCLE:
            logger.info(f"[AutoProcessor]   Hit per-cycle limit ({MAX_ITEMS_PER_CYCLE}), deferring rest to next cycle")
            break
        _process_course_item_safe(db, user, item)
        items_processed += 1
        time.sleep(INTER_CALL_DELAY_SECONDS)

    # ── Step 3: Process unprocessed Emails (only academic/actionable) ──
    unprocessed_emails = db.query(EmailRecord).filter(
        EmailRecord.owner_id == user.id,
        EmailRecord.auto_processed == False
    ).all()

    logger.info(f"[AutoProcessor]   Found {len(unprocessed_emails)} unprocessed emails — filtering for academic relevance...")

    for email in unprocessed_emails:
        if items_processed >= MAX_ITEMS_PER_CYCLE:
            logger.info(f"[AutoProcessor]   Hit per-cycle limit ({MAX_ITEMS_PER_CYCLE}), deferring rest to next cycle")
            break

        # ── SMART FILTER: Only process emails that are actually academic ──
        if not _is_email_worth_processing(email):
            # Mark as auto_processed so we don't re-check it every cycle
            email.auto_processed = True
            db.commit()
            logger.debug(f"[AutoProcessor]   Skipped non-academic email: {email.subject[:50]}")
            continue

        _process_email_safe(db, user, email)
        items_processed += 1
        time.sleep(INTER_CALL_DELAY_SECONDS)

    logger.info(f"[AutoProcessor]   User {user.email}: processed {items_processed} item(s) this cycle")
    _cycle_lock.release()


def _is_email_worth_processing(email: EmailRecord) -> bool:
    """
    Determines whether an email should be auto-processed.
    Returns True only for emails that contain academic assignments or require action.
    """
    cls = email.classification
    if not cls:
        # Not yet classified — we could classify it, but to save Gemini calls
        # we'll use a simple heuristic first
        return _looks_academic(email)

    email_type = cls.get("type", "UNCLASSIFIED").upper()
    action_required = cls.get("actionRequired", False)
    priority = cls.get("priority", "LOW").upper()

    # Definitely process assignments
    if email_type == "ASSIGNMENT":
        return True

    # Process notes/materials immediately, they are valuable study content
    if email_type == "NOTES":
        return True

    # Process all announcements (skip low priority marketing, but keep regular ones)
    if email_type == "ANNOUNCEMENT" and priority != "LOW":
        return True

    # Fall-back to keyword heuristic for UNCLASSIFIED
    if email_type == "UNCLASSIFIED":
        return _looks_academic(email)

    return False


def _looks_academic(email: EmailRecord) -> bool:
    """
    Simple heuristic for unclassified emails — checks if the content
    looks like it came from a teacher/university.
    """
    text = f"{email.subject or ''} {email.sender or ''} {(email.body_text or '')[:500]}".lower()

    academic_keywords = [
        "assignment", "submission", "deadline", "coursework", "homework",
        "lab report", "experiment", "marks", "grades", "syllabus",
        "lecture", "tutorial", "classwork", "exam", "quiz",
        "google classroom", "classroom.google.com",
        "docs.google.com/document", "docs.google.com/spreadsheets",
        "submit by", "due date", "last date",
    ]

    spam_keywords = [
        "unsubscribe", "marketing", "newsletter", "promotional",
        "sale", "discount", "offer", "click here to",
        "verify your account", "sign-in", "security alert",
        "noreply@", "no-reply@", "notifications@github.com",
        "dribbble", "vercel", "linkedin", "twitter",
    ]

    # If it looks like spam/marketing, skip
    if any(kw in text for kw in spam_keywords):
        return False

    # If it has academic signals, process
    if any(kw in text for kw in academic_keywords):
        return True

    return False


def _process_course_item_safe(db, user: User, item: CourseItem):
    """Process a single classroom item with full error handling + notifications."""
    # Mark as processed immediately so we don't pick it up again
    item.auto_processed = True
    db.commit()

    # Determine output type
    output_type = "SUMMARY"
    if item.type == "COURSEWORK":
        output_type = "ASSIGNMENT"
    elif item.type == "ANNOUNCEMENT":
        output_type = "NOTES"

    import re
    desc_text = item.description or ""
    if re.search(r'https?://docs\.google\.com', desc_text) or \
       re.search(r'https?://drive\.google\.com', desc_text):
        output_type = "ASSIGNMENT"

    # Create Task
    task_id = str(uuid.uuid4())
    task = DBTask(
        id=task_id,
        owner_id=user.id,
        source_id=item.id,
        source_type="classroom",
        source_subject=item.title or "Classroom Item",
        status="GENERATING",
        current_step="Autopilot: Generating document",
        started_at=dt.datetime.utcnow(),
    )
    db.add(task)
    db.commit()

    logger.info(f"[AutoProcessor]   📄 Processing classroom item: {item.title[:50]} (type={output_type})")

    try:
        content = f"{item.title or ''}\n\n{item.description or ''}"
        generated = generate_output(
            title=item.title or "Classroom Item",
            content=content,
            output_type=output_type,
            roll_number=user.roll_number or "",
            access_token=user.google_access_token or "",
        )

        if "error" in generated:
            raise Exception(generated["error"])

        filepath = create_docx_from_markdown(item.title or "Classroom Item", generated["text"])

        from models import GeneratedOutput
        db_output = GeneratedOutput(
            id=str(uuid.uuid4()),
            owner_id=user.id,
            task_id=task.id,
            type=generated.get("type", output_type),
            title=generated.get("title", item.title),
            preview_text=generated.get("text", ""),
            file_path=filepath
        )
        db.add(db_output)

        task.status = "DONE"
        task.current_step = "Completed"
        db.commit()

        logger.info(f"[AutoProcessor]   ✅ Success: {item.title[:50]}")
        _notify_user_success(db, user, task.source_subject, output_type, filepath)

    except Exception as e:
        logger.error(f"[AutoProcessor]   ❌ Task {task_id} failed: {e}")
        task.status = "ERROR"
        task.current_step = "Failed during autopilot processing"
        task.error_message = str(e)[:500]
        db.commit()

        # NOTIFY USER ABOUT THE FAILURE (this was missing before!)
        _notify_user_failure(db, user, task.source_subject, str(e))


def _process_email_safe(db, user: User, email: EmailRecord):
    """Process a single email with full error handling + notifications."""
    email.auto_processed = True
    db.commit()

    # Classify first if not done
    if not email.classification:
        try:
            cls = classify_content(email.subject, email.body_text, email.sender)
            email.classification = cls
            db.commit()
            time.sleep(INTER_CALL_DELAY_SECONDS)  # Rate limit after classify call
        except Exception as e:
            logger.warning(f"[AutoProcessor]   Classification failed for email: {e}")
            _notify_user_failure(db, user, email.subject or "Email", f"Classification failed: {e}")
            return

    # Re-check after classification — maybe it's not worth processing after all
    if not _is_email_worth_processing(email):
        logger.debug(f"[AutoProcessor]   Post-classify skip: {email.subject[:50]} (type={email.classification.get('type')})")
        return

    output_type = email.classification.get("type", "SUMMARY") if email.classification else "SUMMARY"
    if output_type == "ANNOUNCEMENT":
        output_type = "SUMMARY"

    # Override for assignments with document links
    import re
    body = email.body_text or ""
    if re.search(r'https?://docs\.google\.com', body) or \
       re.search(r'https?://drive\.google\.com', body):
        output_type = "ASSIGNMENT"

    # Create Task
    task_id = str(uuid.uuid4())
    task = DBTask(
        id=task_id,
        owner_id=user.id,
        source_id=email.id,
        source_type="gmail",
        source_subject=email.subject or "Email",
        status="GENERATING",
        current_step="Autopilot: Generating document",
        started_at=dt.datetime.utcnow(),
    )
    db.add(task)
    db.commit()

    logger.info(f"[AutoProcessor]   📧 Processing email: {email.subject[:50]} (type={output_type})")

    try:
        content = f"Subject: {email.subject}\nFrom: {email.sender}\n\n{email.body_text}"
        generated = generate_output(
            title=email.subject or "Email Content",
            content=content,
            output_type=output_type,
            roll_number=user.roll_number or "",
            access_token=user.google_access_token or "",
        )

        if "error" in generated:
            raise Exception(generated["error"])

        filepath = create_docx_from_markdown(email.subject or "Email Info", generated["text"])

        from models import GeneratedOutput
        db_output = GeneratedOutput(
            id=str(uuid.uuid4()),
            owner_id=user.id,
            task_id=task.id,
            type=generated.get("type", output_type),
            title=generated.get("title", email.subject),
            preview_text=generated.get("text", ""),
            file_path=filepath
        )
        db.add(db_output)

        task.status = "DONE"
        task.current_step = "Completed"
        db.commit()

        logger.info(f"[AutoProcessor]   ✅ Success: {email.subject[:50]}")
        _notify_user_success(db, user, task.source_subject, output_type, filepath)

    except Exception as e:
        logger.error(f"[AutoProcessor]   ❌ Email task {task_id} failed: {e}")
        task.status = "ERROR"
        task.current_step = "Failed during autopilot processing"
        task.error_message = str(e)[:500]
        db.commit()

        # NOTIFY USER ABOUT THE FAILURE
        _notify_user_failure(db, user, task.source_subject, str(e))


# ─── Notification Helpers ─────────────────────────────────────────────────────

def _notify_user_success(db, user: User, subject: str, doc_type: str, file_path: str):
    """Send both in-app and email notification on success."""
    import re
    # Aggressively strip multiple spaces and any newlines/tabs
    clean_subject = re.sub(r'\s+', ' ', str(subject)).strip()[:120]
    
    title = f"✅ Autopilot: {doc_type.capitalize()} Ready"
    body = f"Miro has automatically generated your document for '{clean_subject}'. It's ready in your Vault."

    # 1. In-App
    create_notification(db, user.id, title, body, "SUCCESS", "/files")

    # 2. Email (best-effort)
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; text-align: center;">
        <h2 style="color: #10B981;">✅ Miro AI Autopilot</h2>
        <p>Good news! A new document has been automatically generated for you.</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Source:</strong> {clean_subject}</p>
            <p><strong>Type:</strong> {doc_type}</p>
        </div>
        <a href="http://localhost:5173/files" style="display: inline-block; background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in The Vault</a>
        <p style="margin-top: 30px; font-size: 12px; color: #888;">You are receiving this because Autopilot is enabled in your Miro Settings.</p>
    </div>
    """
    try:
        send_email_notification(user, f"Miro AI: Document Ready ({clean_subject})", html_content)
    except Exception as e:
        logger.warning(f"[AutoProcessor] Email notification failed (non-fatal): {e}")


def _notify_user_failure(db, user: User, subject: str, error_msg: str):
    """Create an in-app notification when autopilot processing fails."""
    # Simplify common error messages for user readability
    if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
        friendly_error = "AI rate limit reached. Will retry on next cycle."
    elif "401" in error_msg or "token" in error_msg.lower():
        friendly_error = "Google token expired. Please sign out and sign in again."
    else:
        friendly_error = error_msg[:150]

    title = "⚠️ Autopilot: Processing Failed"
    import re
    clean_subject = re.sub(r'\s+', ' ', str(subject)).strip()[:120]
    body = f"Could not generate document for '{clean_subject}'. {friendly_error}"

    create_notification(db, user.id, title, body, "WARNING", "/settings")
