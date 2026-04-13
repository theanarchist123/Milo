"""
Google Classroom Service — fetches courses, coursework, and materials
for a user using their OAuth2 access token.

Saves data to the SQLite database via SQLAlchemy models.
"""
import datetime
import logging

from google.oauth2.credentials import Credentials as GoogleCredentials
from googleapiclient.discovery import build

from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Course, CourseItem

logger = logging.getLogger(__name__)


def _build_classroom_service(access_token: str):
    """Build and return an authenticated Google Classroom API service."""
    try:
        # Explicitly set expiry to 55 min from now. Without an expiry, the
        # google-auth library thinks the token needs refreshing and raises:
        #   "You must specify refresh_token, token_uri, client_id, and client_secret"
        # since we don't have refresh credentials from Firebase's OAuth flow.
        creds = GoogleCredentials(
            token=access_token,
            expiry=datetime.datetime.utcnow() + datetime.timedelta(minutes=55),
        )
        service = build("classroom", "v1", credentials=creds, cache_discovery=False)
        return service
    except Exception as e:
        logger.error(f"[Classroom] Failed to build service: {e}")
        raise


def _parse_due_date(coursework: dict) -> datetime.datetime | None:
    """Extract due date from a coursework item if present."""
    due = coursework.get("dueDate")
    due_time = coursework.get("dueTime", {})
    if not due:
        return None
    try:
        return datetime.datetime(
            year=due.get("year", 1970),
            month=due.get("month", 1),
            day=due.get("day", 1),
            hour=due_time.get("hours", 0),
            minute=due_time.get("minutes", 0),
        )
    except Exception:
        return None


def fetch_classroom_for_user(user_id: str, access_token: str) -> dict:
    """
    Main entry point. Fetches courses, coursework, and materials from
    Google Classroom and saves them to the SQLite database.

    Returns: { courses: int, items: int, errors: int }
    """
    db: Session = SessionLocal()
    courses_saved = 0
    items_saved = 0
    errors = 0

    try:
        service = _build_classroom_service(access_token)

        # ─── Step 1: List all active courses ──────────────────────────────
        logger.info(f"[Classroom] Fetching courses for user {user_id}...")
        response = service.courses().list(courseStates=["ACTIVE"]).execute()
        courses = response.get("courses", [])
        logger.info(f"[Classroom] Found {len(courses)} active courses.")

        for course_data in courses:
            course_id = course_data["id"]

            # Upsert course record
            course = db.query(Course).filter(Course.id == course_id).first()
            if not course:
                course = Course(id=course_id, owner_id=user_id)
                db.add(course)

            course.name = course_data.get("name", "Unknown Course")
            # Google Classroom doesn't expose teacher display name in courses.list;
            # 'description' often has it, otherwise we use ownerId as a fallback
            course.teacher = course_data.get("description", course_data.get("ownerId", ""))[:80]
            course.section = course_data.get("section", "")
            # Use the course name as the subject query for Unsplash images
            course.subject = course_data.get("name", "").lower()

            db.commit()
            courses_saved += 1

            # ─── Step 2: Fetch coursework for this course ───────────────
            try:
                cw_response = service.courses().courseWork().list(
                    courseId=course_id,
                    orderBy="updateTime desc",
                    pageSize=20,
                ).execute()
                courseworks = cw_response.get("courseWork", [])

                for cw in courseworks:
                    cw_id = cw["id"]
                    existing = db.query(CourseItem).filter(CourseItem.id == cw_id).first()
                    if existing:
                        continue

                    item = CourseItem(
                        id=cw_id,
                        course_id=course_id,
                        owner_id=user_id,
                        title=cw.get("title", "Untitled"),
                        type="COURSEWORK",
                        description=cw.get("description", "")[:2000],
                        due_date=_parse_due_date(cw),
                        status="fetched",
                    )
                    db.add(item)
                    db.commit()
                    items_saved += 1

            except Exception as e:
                logger.warning(f"[Classroom] Error fetching coursework for course {course_id}: {e}")
                errors += 1
                db.rollback()

            # ─── Step 3: Fetch course materials ────────────────────────
            try:
                mat_response = service.courses().courseWorkMaterials().list(
                    courseId=course_id,
                    pageSize=20,
                ).execute()
                materials = mat_response.get("courseWorkMaterial", [])

                for mat in materials:
                    mat_id = mat["id"]
                    existing = db.query(CourseItem).filter(CourseItem.id == mat_id).first()
                    if existing:
                        continue

                    item = CourseItem(
                        id=mat_id,
                        course_id=course_id,
                        owner_id=user_id,
                        title=mat.get("title", "Untitled Material"),
                        type="MATERIAL",
                        description=mat.get("description", "")[:2000],
                        due_date=None,
                        status="fetched",
                    )
                    db.add(item)
                    db.commit()
                    items_saved += 1

            except Exception as e:
                logger.warning(f"[Classroom] Error fetching materials for course {course_id}: {e}")
                errors += 1
                db.rollback()

            # ─── Step 4: Fetch announcements ────────────────────────────
            try:
                ann_response = service.courses().announcements().list(
                    courseId=course_id,
                    pageSize=10,
                ).execute()
                announcements = ann_response.get("announcements", [])

                for ann in announcements:
                    ann_id = ann["id"]
                    existing = db.query(CourseItem).filter(CourseItem.id == ann_id).first()
                    if existing:
                        continue

                    item = CourseItem(
                        id=ann_id,
                        course_id=course_id,
                        owner_id=user_id,
                        title=ann.get("text", "Announcement")[:200],
                        type="ANNOUNCEMENT",
                        description=ann.get("text", "")[:2000],
                        due_date=None,
                        status="fetched",
                    )
                    db.add(item)
                    db.commit()
                    items_saved += 1

            except Exception as e:
                logger.warning(f"[Classroom] Error fetching announcements for course {course_id}: {e}")
                errors += 1
                db.rollback()

    except Exception as e:
        logger.error(f"[Classroom] Fatal error during sync for user {user_id}: {e}")
        errors += 1
    finally:
        db.close()

    logger.info(
        f"[Classroom] Sync complete for {user_id}: courses={courses_saved}, items={items_saved}, errors={errors}"
    )
    return {"courses": courses_saved, "items": items_saved, "errors": errors}
