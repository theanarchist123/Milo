import logging
import threading
import uuid
import datetime as dt
from concurrent.futures import ThreadPoolExecutor

from database import SessionLocal
from models import User, CourseItem, EmailRecord, Task as DBTask
from services.gemini_service import classify_content, generate_output
from services.gmail_service import fetch_emails_for_user
from services.classroom_service import fetch_classroom_for_user
from services.notification_service import create_notification, send_email_notification
from services.docx_generator import create_docx_from_markdown

logger = logging.getLogger(__name__)

# Max 1 concurrent processing job to avoid Google API rate limits (15 RPM)
executor = ThreadPoolExecutor(max_workers=1)

def run_auto_processing_cycle():
    """Runs periodically via APScheduler. Fetches all active users and submits processing jobs."""
    logger.info("[AutoProcessor] Starting auto-processing cycle...")
    
    with SessionLocal() as db:
        users = db.query(User).filter(User.auto_process_enabled == True).all()
        for user in users:
            # Optionally, we could check user.auto_process_interval_minutes here
            # against a last_synced timestamp, but for simplicity we'll just run it.
            try:
                # 1. Sync Gmail
                try:
                    logger.info(f"[AutoProcessor] Syncing emails for {user.email}")
                    if user.google_access_token:
                        fetch_emails_for_user(user.id, user.google_access_token)
                except Exception as e:
                    logger.warning(f"Email sync failed for {user.email} in background: {e}")
                    
                # 1.5 Sync Classroom
                try:
                    logger.info(f"[AutoProcessor] Syncing classroom for {user.email}")
                    if user.google_access_token:
                        fetch_classroom_for_user(user.id, user.google_access_token)
                except Exception as e:
                    logger.warning(f"Classroom sync failed for {user.email} in background: {e}")
                
                # 2. Find unprocessed CourseItems
                # (An item is unprocessed if auto_processed=False and we don't have a task for it)
                unprocessed_items = db.query(CourseItem).filter(
                    CourseItem.owner_id == user.id,
                    CourseItem.auto_processed == False
                ).all()

                for item in unprocessed_items:
                    executor.submit(_process_course_item, user.id, item.id)
                
                # 3. Find unprocessed Emails
                unprocessed_emails = db.query(EmailRecord).filter(
                    EmailRecord.owner_id == user.id,
                    EmailRecord.auto_processed == False
                ).all()

                for email in unprocessed_emails:
                    executor.submit(_process_email, user.id, email.id)
                    
            except Exception as e:
                logger.error(f"[AutoProcessor] Cycle error for user {user.id}: {e}")

def _process_course_item(user_id: str, item_id: str):
    """Background worker to process a specific course item."""
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == user_id).first()
        item = db.query(CourseItem).filter(CourseItem.id == item_id).first()
        if not user or not item or item.auto_processed:
            return

        # Mark as processed immediately so we don't pick it up again
        item.auto_processed = True
        db.commit()

        # If it's just material/announcement without docs, maybe skip? Let's process all as SUMMARY/NOTES/ASSIGNMENT
        # Same logic as router
        output_type = "SUMMARY"
        if item.type == "COURSEWORK":
            output_type = "ASSIGNMENT"
        elif item.type == "ANNOUNCEMENT":
            output_type = "NOTES"
        
        import re
        desc_text = item.description or ""
        if re.search(r'https?://docs\.google\.com', desc_text) or re.search(r'https?://drive\.google\.com', desc_text):
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

        try:
            content = f"{item.title or ''}\n\n{item.description or ''}"
            generated = generate_output(
                title=item.title or "Classroom Item",
                content=content,
                output_type=output_type,
                roll_number=user.roll_number or ""
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
                preview_text=generated.get("text", "")[:300],
                file_path=filepath
            )
            db.add(db_output)
            
            task.status = "DONE"
            task.current_step = "Completed"
            db.commit()

            # --- NOTIFICATIONS ---
            _notify_user_success(db, user, task.source_subject, output_type, filepath)

        except Exception as e:
            logger.error(f"[AutoProcessor] Task {task_id} failed: {e}")
            task.status = "ERROR"
            task.current_step = "Failed during autopilot processing"
            task.error_message = str(e)
            db.commit()

def _process_email(user_id: str, email_id: str):
    """Background worker to process a specific email."""
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == user_id).first()
        email = db.query(EmailRecord).filter(EmailRecord.id == email_id).first()
        if not user or not email or email.auto_processed:
            return

        email.auto_processed = True
        db.commit()

        # Classify first if not done
        if not email.classification:
            cls = classify_content(email.subject, email.body_text, email.sender)
            email.classification = cls
            db.commit()
            
        output_type = email.classification.get('output_type', 'SUMMARY')
        
        # Override for assignments
        import re
        body = email.body_text or ""
        if re.search(r'https?://docs\.google\.com', body) or re.search(r'https?://drive\.google\.com', body):
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

        try:
            content = f"Subject: {email.subject}\nFrom: {email.sender}\n\n{email.body_text}"
            generated = generate_output(
                title=email.subject or "Email Content",
                content=content,
                output_type=output_type,
                roll_number=user.roll_number or ""
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
                preview_text=generated.get("text", "")[:300],
                file_path=filepath
            )
            db.add(db_output)
            
            task.status = "DONE"
            task.current_step = "Completed"
            db.commit()

            # --- NOTIFICATIONS ---
            _notify_user_success(db, user, task.source_subject, output_type, filepath)

        except Exception as e:
            logger.error(f"[AutoProcessor] Email Task {task_id} failed: {e}")
            task.status = "ERROR"
            task.current_step = "Failed during autopilot processing"
            task.error_message = str(e)
            db.commit()


def _notify_user_success(db, user: User, subject: str, doc_type: str, file_path: str):
    """Helper to send both in-app and email notification."""
    title = f"Autopilot Complete: {doc_type.capitalize()}"
    body = f"Miro has automatically generated your document for '{subject}'. It is ready in your Vault."
    
    # 1. In-App
    create_notification(db, user.id, title, body, "SUCCESS", "/files")

    # 2. Email
    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; text-align: center;">
        <h2 style="color: #F59E0B;">Miro AI Autopilot</h2>
        <p>Good news! A new document has been automatically generated for you.</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Source:</strong> {subject}</p>
            <p><strong>Type:</strong> {doc_type}</p>
        </div>
        <a href="http://localhost:5173/files" style="display: inline-block; background: #F59E0B; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in The Vault</a>
        <p style="margin-top: 30px; font-size: 12px; color: #888;">You are receiving this because Autopilot is enabled in your Miro Settings.</p>
    </div>
    """
    send_email_notification(user, f"Miro AI: Document Ready ({subject})", html_content)
