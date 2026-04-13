from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict

from database import get_db
from models import User, EmailRecord, Course, CourseItem, Task as DBTask, GeneratedOutput
from api.auth import get_current_user

router = APIRouter()

# ─── Dashboard ────────────────────────────────────────────────────────

@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Calculate real stats from the database
    emails_fetched = db.query(EmailRecord).filter(EmailRecord.owner_id == current_user.id).count()
    files_processed = db.query(CourseItem).filter(CourseItem.owner_id == current_user.id, CourseItem.type == 'MATERIAL').count()
    assignments = db.query(GeneratedOutput).filter(GeneratedOutput.owner_id == current_user.id, GeneratedOutput.type == 'ASSIGNMENT').count()
    materials = db.query(GeneratedOutput).filter(GeneratedOutput.owner_id == current_user.id, GeneratedOutput.type != 'ASSIGNMENT').count()

    # Get active tasks
    active = db.query(DBTask).filter(DBTask.owner_id == current_user.id, DBTask.status.in_(["RUNNING", "PENDING"])).all()

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

    return {
        "stats": {
            "emailsFetchedToday": emails_fetched,
            "filesProcessed": files_processed,
            "assignmentsGenerated": assignments,
            "studyMaterialsReady": materials
        },
        "weekly": [
            {"day": "Mon", "count": 0},
            {"day": "Tue", "count": 0},
            {"day": "Wed", "count": 0},
            {"day": "Thu", "count": emails_fetched}, # simplified for now
            {"day": "Fri", "count": 0},
            {"day": "Sat", "count": 0},
            {"day": "Sun", "count": 0},
        ],
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
    return [
        {
            "id": c.id,
            "name": c.name,
            "teacher": c.teacher,
            "section": c.section,
            "subject": c.subject,
            "pendingCount": 0
        } for c in courses
    ]

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

# ─── Synchronization / Agent Trigger ─────────────────────────────────

from services.orchestrator import _run_pipeline_for_user

def background_sync_job(user_id: str, google_token: str):
    """
    This is the background task that will run the LangGraph pipeline
    """
    _run_pipeline_for_user(user_id, google_token)

@router.post("/sync")
def trigger_sync(
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Frontend calls this endpoint to trigger the AI to check for new emails/courses
    and ingest them via LangGraph.
    """
    if not current_user.google_access_token:
        # In a real app we'd redirect to OAuth consent here or trigger it from the frontend
        return {"error": "Google OAuth token not found for user. Please re-authenticate."}

    background_tasks.add_task(background_sync_job, current_user.id, current_user.google_access_token)
    return {"status": "Sync triggered successfully. Processing in the background."}
