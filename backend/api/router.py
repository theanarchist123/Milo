from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from typing import List, Dict
import datetime as dt
import uuid
import logging

from database import get_db
from models import User, EmailRecord, Course, CourseItem, Task as DBTask, GeneratedOutput, Notification
from api.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# ─── Dashboard ────────────────────────────────────────────────────────

@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Calculate real stats from the database
    emails_fetched = db.query(EmailRecord).filter(EmailRecord.owner_id == current_user.id).count()
    files_processed = db.query(CourseItem).filter(CourseItem.owner_id == current_user.id, CourseItem.type == 'MATERIAL').count()
    assignments = db.query(GeneratedOutput).filter(GeneratedOutput.owner_id == current_user.id, GeneratedOutput.type == 'ASSIGNMENT').count()
    materials = db.query(GeneratedOutput).filter(GeneratedOutput.owner_id == current_user.id, GeneratedOutput.type != 'ASSIGNMENT').count()

    # Get active tasks — include all in-progress states from both manual and autopilot processing
    active = db.query(DBTask).filter(
        DBTask.owner_id == current_user.id,
        DBTask.status.in_(["RUNNING", "PENDING", "CLASSIFYING", "GENERATING", "WRITING"])
    ).order_by(DBTask.started_at.desc()).all()

    # Get recent activity
    activity_recs = db.query(EmailRecord).filter(EmailRecord.owner_id == current_user.id).order_by(EmailRecord.date.desc()).limit(6).all()
    
    # Map them to frontend types
    activity = []
    for r in activity_recs:
        activity.append({
            "id": r.id,
            "subject": r.subject,
            "classification": r.classification.get("type", "UNKNOWN") if r.classification else "UNKNOWN",
            "status": r.status,
            "timestamp": r.date.isoformat() if r.date else None
        })

    # Build weekly volume — count emails fetched per day for the last 7 days
    day_labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    today = dt.datetime.utcnow().date()
    weekly = []
    for i in range(6, -1, -1):  # 6 days ago → today
        day = today - dt.timedelta(days=i)
        count = db.query(EmailRecord).filter(
            EmailRecord.owner_id == current_user.id,
            cast(EmailRecord.date, Date) == day
        ).count()
        # Monday=0 in Python weekday(); day_labels[0]='Mon'
        weekly.append({"day": day_labels[day.weekday()], "count": count})

    return {
        "stats": {
            "emailsFetchedToday": emails_fetched,
            "filesProcessed": files_processed,
            "assignmentsGenerated": assignments,
            "studyMaterialsReady": materials
        },
        "weekly": weekly,
        "activity": activity,
        "active": [
            {
                "id": t.id,
                "status": t.status,
                "sourceType": t.source_type,
                "sourceSubject": t.source_subject,
                "currentStep": t.current_step,
                "startedAt": t.started_at.isoformat() if t.started_at else None
            } for t in active
        ]
    }

# ─── Emails ────────────────────────────────────────────────────────

@router.get("/emails")
def get_emails(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emails = db.query(EmailRecord).filter(EmailRecord.owner_id == current_user.id).order_by(EmailRecord.date.desc()).all()
    return [
        {
            "id": e.id,
            "subject": e.subject,
            "sender": e.sender,
            "senderInitials": "".join([part[0] for part in e.sender.split()[:2]]).upper() if e.sender else "?",
            "date": e.date.isoformat() if e.date else None,
            "bodyText": e.body_text,
            "status": e.status,
            "classification": e.classification,
            "attachments": [] # We could load an attachments table later
        } for e in emails
    ]

# ─── Classroom ────────────────────────────────────────────────────────

@router.get("/classroom/courses")
def get_courses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    courses = db.query(Course).filter(Course.owner_id == current_user.id).all()
    result = []
    for c in courses:
        pending = db.query(CourseItem).filter(
            CourseItem.course_id == c.id,
            CourseItem.type == 'COURSEWORK',
            CourseItem.status.in_(['fetched', 'classified'])
        ).count()
        result.append({
            "id": c.id,
            "name": c.name,
            "teacher": c.teacher,
            "section": c.section,
            "subject": c.subject,
            "pendingCount": pending
        })
    return result

# ─── Vault (Outputs) ──────────────────────────────────────────────────

@router.get("/outputs")
def get_vault_outputs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    outputs = db.query(GeneratedOutput).filter(GeneratedOutput.owner_id == current_user.id).order_by(GeneratedOutput.created_at.desc()).all()
    return [
        {
            "id": o.id,
            "taskId": o.task_id,
            "generatedAt": o.created_at.isoformat() if o.created_at else None,
            "type": o.type,
            "title": o.title,
            "sourceSubject": o.task.source_subject if o.task else "Unknown",
            "docxUrl": f"http://localhost:8000/media/{o.file_path}",
            "pdfUrl": f"http://localhost:8000/media/{o.file_path}",
            "fileSizeBytes": 100000, # Mock size since it's local
            "previewText": o.preview_text
        } for o in outputs
    ]

# ─── Tasks ───────────────────────────────────────────────────────

@router.get("/tasks")
def list_tasks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tasks = db.query(DBTask).filter(DBTask.owner_id == current_user.id).order_by(DBTask.started_at.desc()).limit(50).all()
    return [
        {
            "id": t.id,
            "status": t.status,
            "sourceType": t.source_type,
            "sourceSubject": t.source_subject,
            "currentStep": t.current_step,
            "startedAt": t.started_at.isoformat() if t.started_at else None,
            "retryCount": 0,
        } for t in tasks
    ]


@router.get("/tasks/{task_id}")
def get_task(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(DBTask).filter(DBTask.id == task_id, DBTask.owner_id == current_user.id).first()
    if not task:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "id": task.id,
        "status": task.status,
        "sourceType": task.source_type,
        "sourceSubject": task.source_subject,
        "currentStep": task.current_step,
        "startedAt": task.started_at.isoformat() if task.started_at else None,
        "errorMessage": task.error_message,
        "retryCount": 0,
    }


# ─── Synchronization ─────────────────────────────────────────────────

from services.orchestrator import run_gmail_sync, run_classroom_sync
from services.gmail_service import fetch_emails_for_user
from services.classroom_service import fetch_classroom_for_user


def _token_error_response(svc_name: str, err: Exception) -> dict:
    """Convert a Google API error into a user-friendly message."""
    msg = str(err)
    if '401' in msg or 'invalid_grant' in msg or 'Token has been expired' in msg or 'refresh the access token' in msg:
        return {"error": "token_expired", "message": "Google token expired. Please sign out and sign in again to re-grant access."}
    if '403' in msg:
        return {"error": "permission_denied", "message": f"{svc_name}: Permission denied. Ensure the API is enabled in Google Cloud Console and the OAuth scope is granted."}
    return {"error": "api_error", "message": msg[:200]}


@router.post("/sync/gmail")
def trigger_gmail_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Synchronously fetch Gmail emails and return real stats."""
    if not current_user.google_access_token:
        return {"error": "no_token", "message": "No Google OAuth token. Sign out and sign in again."}
    try:
        result = fetch_emails_for_user(current_user.id, current_user.google_access_token)
        return {"status": "ok", "gmail": result}
    except Exception as e:
        return {"status": "error", "gmail": _token_error_response("Gmail", e)}


@router.post("/sync/classroom")
def trigger_classroom_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Synchronously fetch Classroom data and return real stats."""
    if not current_user.google_access_token:
        return {"error": "no_token", "message": "No Google OAuth token. Sign out and sign in again."}
    try:
        result = fetch_classroom_for_user(current_user.id, current_user.google_access_token)
        return {"status": "ok", "classroom": result}
    except Exception as e:
        return {"status": "error", "classroom": _token_error_response("Classroom", e)}


@router.post("/sync/all")
def trigger_full_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Synchronously run Gmail + Classroom sync in sequence.
    Returns real stats: how many emails/courses were fetched, and any errors.
    This is intentionally synchronous so the frontend receives actual results.
    """
    if not current_user.google_access_token:
        return {
            "status": "error",
            "error": "no_token",
            "message": "No Google OAuth token found. Please sign out and sign in again to reconnect Google services."
        }

    gmail_result: dict = {}
    classroom_result: dict = {}

    try:
        gmail_result = fetch_emails_for_user(current_user.id, current_user.google_access_token)
    except Exception as e:
        gmail_result = _token_error_response("Gmail", e)

    try:
        classroom_result = fetch_classroom_for_user(current_user.id, current_user.google_access_token)
    except Exception as e:
        classroom_result = _token_error_response("Classroom", e)

    has_error = ("error" in gmail_result) or ("error" in classroom_result)
    return {
        "status": "error" if has_error else "ok",
        "gmail": gmail_result,
        "classroom": classroom_result,
    }


# ─── Classroom Items ──────────────────────────────────────────────────

@router.get("/classroom/{course_id}/items")
def get_course_items(
    course_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(CourseItem).filter(
        CourseItem.course_id == course_id,
        CourseItem.owner_id == current_user.id
    ).all()
    return [
        {
            "id": item.id,
            "courseId": item.course_id,
            "title": item.title,
            "type": item.type,
            "description": item.description or "",
            "dueDate": item.due_date.isoformat() if item.due_date else None,
            "attachments": [],
            "status": item.status,
        } for item in items
    ]


# ─── AI Processing Pipeline ──────────────────────────────────────────────────

from services.gemini_service import classify_content, generate_output, determine_output_type
from services.docx_generator import create_docx_from_markdown


def _serialize_task(t):
    """Convert a Task ORM object to a frontend-compatible dict."""
    return {
        "id": t.id,
        "status": t.status,
        "sourceType": t.source_type,
        "sourceSubject": t.source_subject,
        "currentStep": t.current_step,
        "startedAt": t.started_at.isoformat() if t.started_at else None,
        "errorMessage": getattr(t, 'error_message', None),
        "retryCount": 0,
    }


@router.post("/process/email/{email_id}")
def process_email(
    email_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process an email through the full Gemini AI pipeline:
    1. Classify the email content
    2. Generate an output (assignment solution / summary / Q&A)
    3. Save the generated output to the database
    Returns the task object with real-time status.
    """
    email = db.query(EmailRecord).filter(
        EmailRecord.id == email_id,
        EmailRecord.owner_id == current_user.id
    ).first()
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")

    # Create task record
    task = DBTask(
        id=str(uuid.uuid4()),
        owner_id=current_user.id,
        source_id=email_id,
        source_type="gmail",
        source_subject=email.subject or "(No Subject)",
        status="CLASSIFYING",
        current_step="Classifying with Gemini AI",
        started_at=dt.datetime.utcnow(),
    )
    db.add(task)
    db.commit()

    try:
        # Step 1: Classify
        task.status = "CLASSIFYING"
        task.current_step = "Analyzing content with Gemini AI"
        db.commit()

        classification = classify_content(
            subject=email.subject or "",
            body=email.body_text or "",
            sender=email.sender or "Unknown",
        )
        email.classification = classification
        email.status = "classified"
        db.commit()

        # Step 2: Generate output
        output_type = determine_output_type(classification, "email")
        task.status = "GENERATING"
        task.current_step = f"Generating {output_type.lower()} with Gemini AI"
        db.commit()

        generated = generate_output(
            title=email.subject or "Email",
            content=email.body_text or "",
            output_type=output_type,
        )

        if "error" in generated:
            task.status = "ERROR"
            task.current_step = f"Generation failed: {generated['error'][:100]}"
            db.commit()
            return _serialize_task(task)

        # Step 3: Save output
        task.status = "WRITING"
        task.current_step = "Saving generated document"
        db.commit()

        # Generate DOCX
        file_path = create_docx_from_markdown(generated["title"], generated["text"])

        output_record = GeneratedOutput(
            id=str(uuid.uuid4()),
            owner_id=current_user.id,
            task_id=task.id,
            type=generated["type"],
            title=generated["title"],
            preview_text=generated["text"],
            file_path=file_path,
            created_at=dt.datetime.utcnow(),
        )
        db.add(output_record)

        # Mark done
        task.status = "DONE"
        task.current_step = "Complete"
        email.status = "done"
        db.commit()

        return _serialize_task(task)

    except Exception as e:
        task.status = "ERROR"
        task.current_step = f"Failed: {str(e)[:200]}"
        db.commit()
        return _serialize_task(task)


@router.post("/process/classroom/{item_id}")
def process_classroom_item(
    item_id: str,
    roll_number: str = "",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Process a classroom item (coursework/material/announcement) through Gemini AI.
    """
    item = db.query(CourseItem).filter(
        CourseItem.id == item_id,
        CourseItem.owner_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Classroom item not found")

    # Determine output type from item type
    type_map = {
        "COURSEWORK": "ASSIGNMENT",
        "MATERIAL": "SUMMARY",
        "ANNOUNCEMENT": "NOTES",
    }
    output_type = type_map.get(item.type, "SUMMARY")
    
    # Override: if description contains external links (Google Doc/Sheet/Doc),
    # treat as ASSIGNMENT regardless of stored type so the AI reads the link
    import re as _re
    desc_text = item.description or ""
    if _re.search(r'https?://docs\.google\.com', desc_text) or \
       _re.search(r'https?://drive\.google\.com', desc_text):
        output_type = "ASSIGNMENT"
        logger.info(f"[Router] Overriding output_type to ASSIGNMENT — external link found in '{item.title[:40]}'")

    # Create task
    task = DBTask(
        id=str(uuid.uuid4()),
        owner_id=current_user.id,
        source_id=item_id,
        source_type="classroom",
        source_subject=item.title or "Classroom Item",
        status="CLASSIFYING",
        current_step="Analyzing classroom content",
        started_at=dt.datetime.utcnow(),
    )
    db.add(task)
    db.commit()

    try:
        # Step 1: Classify
        task.status = "CLASSIFYING"
        task.current_step = "Classifying with Gemini AI"
        db.commit()

        content = f"{item.title or ''}\n\n{item.description or ''}"
        classification = classify_content(
            subject=item.title or "",
            body=content,
            sender="Google Classroom",
        )

        # Step 2: Generate
        task.status = "GENERATING"
        task.current_step = f"Generating {output_type.lower()} with Gemini AI"
        db.commit()

        generated = generate_output(
            title=item.title or "Classroom Item",
            content=content,
            output_type=output_type,
            roll_number=roll_number,
        )

        if "error" in generated:
            task.status = "ERROR"
            task.current_step = f"Generation failed: {generated['error'][:100]}"
            db.commit()
            return _serialize_task(task)

        # Step 3: Save
        task.status = "WRITING"
        task.current_step = "Saving generated document"
        db.commit()

        # Generate DOCX
        file_path = create_docx_from_markdown(generated["title"], generated["text"])

        output_record = GeneratedOutput(
            id=str(uuid.uuid4()),
            owner_id=current_user.id,
            task_id=task.id,
            type=generated["type"],
            title=generated["title"],
            preview_text=generated["text"],
            file_path=file_path,
            created_at=dt.datetime.utcnow(),
        )
        db.add(output_record)

        task.status = "DONE"
        task.current_step = "Complete"
        item.status = "done"
        db.commit()

        return _serialize_task(task)

    except Exception as e:
        task.status = "ERROR"
        task.current_step = f"Failed: {str(e)[:200]}"
        db.commit()
        return _serialize_task(task)

# ─── Settings & Notifications & Autopilot ──────────────────────────────────────────

@router.get("/settings")
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return {
        "auto_process_enabled": current_user.auto_process_enabled,
        "roll_number": current_user.roll_number,
        "auto_process_interval_minutes": current_user.auto_process_interval_minutes
    }

from pydantic import BaseModel
class SettingsUpdate(BaseModel):
    auto_process_enabled: bool
    roll_number: str
    auto_process_interval_minutes: int

@router.post("/settings")
def update_settings(settings: SettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    current_user.auto_process_enabled = settings.auto_process_enabled
    current_user.roll_number = settings.roll_number
    current_user.auto_process_interval_minutes = settings.auto_process_interval_minutes
    db.commit()
    return {"status": "ok"}

@router.post("/process/trigger-autopilot")
def trigger_autopilot(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Manually trigger the autopilot cycle for testing"""
    # Force bypass the cooldown timer
    current_user.last_sync_time = None
    db.commit()

    from services.auto_processor import run_auto_processing_cycle
    # Note: the real cycle runs for all enabled users, but for manual test we just trigger it
    import threading
    t = threading.Thread(target=run_auto_processing_cycle)
    t.start()
    return {"status": "ok", "message": "Autopilot cycle started"}

@router.get("/notifications")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notifications = db.query(Notification).filter(Notification.owner_id == current_user.id).order_by(Notification.created_at.desc()).limit(20).all()
    return [{
        "id": n.id,
        "title": n.title,
        "body": n.body,
        "type": n.type,
        "sourceUrl": n.source_url,
        "isRead": n.is_read,
        "createdAt": n.created_at.isoformat()
    } for n in notifications]

@router.post("/notifications/read-all")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.owner_id == current_user.id).update({Notification.is_read: True})
    db.commit()
    return {"status": "ok"}
