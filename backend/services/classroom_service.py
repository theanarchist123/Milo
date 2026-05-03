"""
Google Classroom Service — fetches courses, coursework, materials, and announcements
for a user using their OAuth2 access token.

Key improvements:
- Upserts items (not just insert-if-missing) so edits by teachers are reflected.
- Extracts ALL attachment URLs from materials list (driveFile, link, form, youtubeVideo)
  and stores them in the description so the AI pipeline can read them automatically.
- Fetches the full updateTime to detect when content has changed.
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


def _extract_material_urls(materials: list) -> list[str]:
    """
    Pull every accessible URL out of a Classroom `materials` list.
    Each material can be a driveFile, link, youtubeVideo, or form.
    Returns a deduplicated list of URL strings.
    """
    urls = []
    for mat in materials:
        # Google Drive file
        drive_file = mat.get("driveFile", {}).get("driveFile", {})
        if drive_file.get("alternateLink"):
            urls.append(drive_file["alternateLink"])

        # Plain hyperlink
        link = mat.get("link", {})
        if link.get("url"):
            urls.append(link["url"])

        # YouTube video
        yt = mat.get("youtubeVideo", {})
        if yt.get("alternateLink"):
            urls.append(yt["alternateLink"])
        elif yt.get("id"):
            urls.append(f"https://www.youtube.com/watch?v={yt['id']}")

        # Google Form
        form = mat.get("form", {})
        if form.get("formUrl"):
            urls.append(form["formUrl"])

    # Deduplicate while preserving order
    seen = set()
    result = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            result.append(u)
    return result


def _build_description(base_text: str, material_urls: list[str]) -> str:
    """
    Combine the text description with any attachment URLs so that
    the AI pipeline (_expand_urls_in_content) can find and fetch them.
    """
    text = (base_text or "").strip()
    if material_urls:
        url_block = "\n".join(f"[Attachment]: {u}" for u in material_urls)
        text = f"{text}\n\n{url_block}" if text else url_block
    return text[:4000]  # keep within DB column budget


def fetch_classroom_for_user(user_id: str, access_token: str) -> dict:
    """
    Main entry point. Fetches courses, coursework, materials, and announcements
    from Google Classroom and upserts them into the database.

    Optimized for serverless (Vercel):
    - Reduced pageSize to keep Google API calls fast
    - Batched DB commits (per-type, not per-item)
    - Pre-loads existing IDs to avoid N+1 queries

    Returns: { courses: int, items: int, errors: int }
    """
    import os
    _is_vercel = bool(os.getenv("VERCEL"))
    PAGE_SIZE = 20 if _is_vercel else 100

    db: Session = SessionLocal()
    courses_saved = 0
    items_saved = 0
    errors = 0

    try:
        service = _build_classroom_service(access_token)

        # ─── Step 1: List all active courses ──────────────────────────────
        logger.info(f"[Classroom] Fetching courses for user {user_id} (pageSize={PAGE_SIZE})...")
        response = service.courses().list(courseStates=["ACTIVE"]).execute()
        courses = response.get("courses", [])
        logger.info(f"[Classroom] Found {len(courses)} active courses.")

        # Pre-load all existing CourseItem IDs for this user to avoid N+1 queries
        existing_ids: set[str] = set(
            row[0] for row in db.query(CourseItem.id).filter(CourseItem.owner_id == user_id).all()
        )

        for course_data in courses:
            course_id = course_data["id"]

            # Upsert course record
            course = db.query(Course).filter(Course.id == course_id).first()
            if not course:
                course = Course(id=course_id, owner_id=user_id)
                db.add(course)

            course.name = course_data.get("name", "Unknown Course")
            course.teacher = course_data.get("description", course_data.get("ownerId", ""))[:80]
            course.section = course_data.get("section", "")
            course.subject = course_data.get("name", "").lower()
            courses_saved += 1

        # Batch commit all courses at once
        db.commit()

        for course_data in courses:
            course_id = course_data["id"]
            course_name = course_data.get("name", "?")[:40]

            # ─── Step 2: Fetch coursework ─────────────────────────────────
            try:
                cw_response = service.courses().courseWork().list(
                    courseId=course_id,
                    orderBy="updateTime desc",
                    pageSize=PAGE_SIZE,
                ).execute()
                courseworks = cw_response.get("courseWork", [])
                logger.info(f"[Classroom] {course_name}: {len(courseworks)} coursework")

                for cw in courseworks:
                    cw_id = cw["id"]
                    mat_urls = _extract_material_urls(cw.get("materials", []))
                    description = _build_description(cw.get("description", ""), mat_urls)

                    if cw_id in existing_ids:
                        # Update in case teacher edited
                        existing = db.query(CourseItem).filter(CourseItem.id == cw_id).first()
                        if existing:
                            existing.title = cw.get("title", existing.title)
                            existing.description = description
                            existing.due_date = _parse_due_date(cw)
                    else:
                        item = CourseItem(
                            id=cw_id,
                            course_id=course_id,
                            owner_id=user_id,
                            title=cw.get("title", "Untitled"),
                            type="COURSEWORK",
                            description=description,
                            due_date=_parse_due_date(cw),
                            status="fetched",
                        )
                        db.add(item)
                        existing_ids.add(cw_id)
                        items_saved += 1
                        logger.info(f"[Classroom] + coursework: '{cw.get('title', '')[:50]}' ({len(mat_urls)} attachments)")

                db.commit()  # Batch commit per course per type

            except Exception as e:
                logger.warning(f"[Classroom] Error fetching coursework for {course_name}: {e}")
                errors += 1
                db.rollback()

            # ─── Step 3: Fetch course materials ───────────────────────────
            try:
                mat_response = service.courses().courseWorkMaterials().list(
                    courseId=course_id,
                    orderBy="updateTime desc",
                    pageSize=PAGE_SIZE,
                ).execute()
                materials = mat_response.get("courseWorkMaterial", [])
                logger.info(f"[Classroom] {course_name}: {len(materials)} materials")

                for mat in materials:
                    mat_id = mat["id"]
                    mat_urls = _extract_material_urls(mat.get("materials", []))
                    description = _build_description(mat.get("description", ""), mat_urls)

                    if mat_id in existing_ids:
                        existing = db.query(CourseItem).filter(CourseItem.id == mat_id).first()
                        if existing:
                            existing.title = mat.get("title", existing.title)
                            existing.description = description
                    else:
                        item = CourseItem(
                            id=mat_id,
                            course_id=course_id,
                            owner_id=user_id,
                            title=mat.get("title", "Untitled Material"),
                            type="MATERIAL",
                            description=description,
                            due_date=None,
                            status="fetched",
                        )
                        db.add(item)
                        existing_ids.add(mat_id)
                        items_saved += 1
                        logger.info(f"[Classroom] + material: '{mat.get('title', '')[:50]}' ({len(mat_urls)} attachments)")

                db.commit()

            except Exception as e:
                logger.warning(f"[Classroom] Error fetching materials for {course_name}: {e}")
                errors += 1
                db.rollback()

            # ─── Step 4: Fetch announcements ──────────────────────────────
            try:
                ann_response = service.courses().announcements().list(
                    courseId=course_id,
                    orderBy="updateTime desc",
                    pageSize=PAGE_SIZE,
                ).execute()
                announcements = ann_response.get("announcements", [])
                logger.info(f"[Classroom] {course_name}: {len(announcements)} announcements")

                for ann in announcements:
                    ann_id = ann["id"]
                    ann_text = ann.get("text", "")
                    mat_urls = _extract_material_urls(ann.get("materials", []))
                    description = _build_description(ann_text, mat_urls)
                    title = ann_text[:200] if ann_text else "Announcement"

                    if ann_id in existing_ids:
                        existing = db.query(CourseItem).filter(CourseItem.id == ann_id).first()
                        if existing:
                            existing.title = title
                            existing.description = description
                    else:
                        item = CourseItem(
                            id=ann_id,
                            course_id=course_id,
                            owner_id=user_id,
                            title=title,
                            type="ANNOUNCEMENT",
                            description=description,
                            due_date=None,
                            status="fetched",
                        )
                        db.add(item)
                        existing_ids.add(ann_id)
                        items_saved += 1
                        logger.info(f"[Classroom] + announcement: '{title[:50]}' ({len(mat_urls)} attachments)")

                db.commit()

            except Exception as e:
                logger.warning(f"[Classroom] Error fetching announcements for {course_name}: {e}")
                errors += 1
                db.rollback()

    except Exception as e:
        logger.error(f"[Classroom] Fatal error during sync for user {user_id}: {e}")
        errors += 1
    finally:
        db.close()

    logger.info(
        f"[Classroom] Sync complete for {user_id}: courses={courses_saved}, new_items={items_saved}, errors={errors}"
    )
    return {"courses": courses_saved, "items": items_saved, "errors": errors}

