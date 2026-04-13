"""
Orchestrator — coordinates the Gmail and Classroom sync pipelines.
Called by FastAPI BackgroundTasks so it runs asynchronously after the request returns.
"""
import logging
from database import SessionLocal
from models import User

logger = logging.getLogger(__name__)


def run_gmail_sync(user_id: str, access_token: str):
    """
    Runs the Gmail fetch pipeline for a user.
    Fetches academic emails and saves them to SQLite.
    """
    logger.info(f"[Orchestrator] Starting Gmail sync for user {user_id}")
    try:
        from services.gmail_service import fetch_emails_for_user
        result = fetch_emails_for_user(user_id, access_token)
        logger.info(f"[Orchestrator] Gmail sync complete: {result}")
    except Exception as e:
        logger.error(f"[Orchestrator] Gmail sync failed for {user_id}: {e}")


def run_classroom_sync(user_id: str, access_token: str):
    """
    Runs the Google Classroom fetch pipeline for a user.
    Fetches courses, coursework, materials, and announcements.
    """
    logger.info(f"[Orchestrator] Starting Classroom sync for user {user_id}")
    try:
        from services.classroom_service import fetch_classroom_for_user
        result = fetch_classroom_for_user(user_id, access_token)
        logger.info(f"[Orchestrator] Classroom sync complete: {result}")
    except Exception as e:
        logger.error(f"[Orchestrator] Classroom sync failed for {user_id}: {e}")


def run_full_sync(user_id: str, access_token: str):
    """
    Runs both Gmail and Classroom syncs sequentially for a user.
    Use this for a full manual refresh.
    """
    run_gmail_sync(user_id, access_token)
    run_classroom_sync(user_id, access_token)


# Kept for backward compat — old code references this name
def _run_pipeline_for_user(user_id: str, access_token: str):
    run_full_sync(user_id, access_token)
