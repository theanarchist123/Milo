"""
Gmail Service — fetches academic emails for a user using their OAuth2 access token.
Uses the official Google API Python client (google-api-python-client).

Fetches emails with academic keywords, saves them to SQLite via SQLAlchemy.
"""
import base64
import datetime
import logging
from typing import Optional

from google.oauth2.credentials import Credentials as GoogleCredentials
from googleapiclient.discovery import build

from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, EmailRecord

logger = logging.getLogger(__name__)

MAX_EMAILS = 100  # Max emails to fetch per sync


def _build_gmail_service(access_token: str):
    """Build and return an authenticated Gmail API service."""
    try:
        # Explicitly set expiry to 55 min from now. Without an expiry, the
        # google-auth library thinks the token needs refreshing and raises:
        #   "You must specify refresh_token, token_uri, client_id, and client_secret"
        # since we don't have refresh credentials from Firebase's OAuth flow.
        creds = GoogleCredentials(
            token=access_token,
            expiry=datetime.datetime.utcnow() + datetime.timedelta(minutes=55),
        )
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        return service
    except Exception as e:
        logger.error(f"[Gmail] Failed to build service: {e}")
        raise


def _decode_body(payload: dict) -> str:
    """Recursively decode the email body from the Gmail message payload."""
    body_text = ""
    mime_type = payload.get("mimeType", "")

    if mime_type == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            body_text = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
    elif mime_type == "text/html":
        # Only use HTML if we have no plain text
        data = payload.get("body", {}).get("data", "")
        if data:
            body_text = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
    elif "parts" in payload:
        # Multipart message — prefer text/plain part
        for part in payload["parts"]:
            result = _decode_body(part)
            if result:
                body_text = result
                if part.get("mimeType") == "text/plain":
                    break  # Found plain text; stop looking

    return body_text.strip()


def _extract_headers(headers: list, name: str) -> str:
    """Extract a specific header by name from the list of Gmail headers."""
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def fetch_emails_for_user(user_id: str, access_token: str) -> dict:
    """
    Main entry point. Fetches up to MAX_EMAILS academic emails from Gmail
    and writes them to the SQLite database.

    Returns a summary dict: { fetched: int, saved: int, errors: int }
    """
    db: Session = SessionLocal()
    fetched = 0
    saved = 0
    errors = 0

    try:
        service = _build_gmail_service(access_token)

        # Fetch all emails from the last 30 days.
        # We previously filtered by academic keywords but that was too restrictive —
        # teacher announcements, grade notices, etc. often don't use those words.
        # The MAX_EMAILS cap prevents fetching too many for large inboxes.
        query = "newer_than:30d"

        logger.info(f"[Gmail] Fetching up to {MAX_EMAILS} emails for user {user_id}...")

        results = service.users().messages().list(
            userId="me",
            q=query,
            maxResults=MAX_EMAILS,
        ).execute()

        messages = results.get("messages", [])
        fetched = len(messages)
        logger.info(f"[Gmail] Found {fetched} messages to process.")

        for msg_ref in messages:
            try:
                msg_id = msg_ref["id"]

                # Skip if we already have this email
                existing = db.query(EmailRecord).filter(EmailRecord.id == msg_id).first()
                if existing:
                    continue

                # Fetch full message
                msg = service.users().messages().get(
                    userId="me",
                    id=msg_id,
                    format="full",
                ).execute()

                payload = msg.get("payload", {})
                headers = payload.get("headers", [])

                subject = _extract_headers(headers, "Subject") or "(No Subject)"
                sender = _extract_headers(headers, "From") or "Unknown"
                date_str = _extract_headers(headers, "Date") or ""

                # Parse date
                email_date: Optional[datetime.datetime] = None
                if date_str:
                    try:
                        # Gmail dates can have timezone abbreviations — parse safely
                        from email.utils import parsedate_to_datetime
                        email_date = parsedate_to_datetime(date_str).replace(tzinfo=None)
                    except Exception:
                        email_date = datetime.datetime.utcnow()

                body_text = _decode_body(payload)

                # Save to DB
                record = EmailRecord(
                    id=msg_id,
                    owner_id=user_id,
                    subject=subject,
                    sender=sender,
                    date=email_date or datetime.datetime.utcnow(),
                    body_text=body_text[:5000],
                    status="fetched",
                    classification=None,
                )
                db.add(record)
                db.commit()
                saved += 1
                logger.debug(f"[Gmail] Saved: {subject[:60]}")

                # Auto-classify with Gemini AI (non-fatal if it fails)
                try:
                    from services.gemini_service import classify_content
                    classification = classify_content(
                        subject=subject,
                        body=body_text[:2000],
                        sender=sender,
                    )
                    record.classification = classification
                    record.status = "classified"
                    db.commit()
                except Exception as classify_err:
                    logger.warning(f"[Gmail] Auto-classify failed for {msg_id}: {classify_err}")

            except Exception as e:
                errors += 1
                logger.warning(f"[Gmail] Error processing message {msg_ref.get('id')}: {e}")
                db.rollback()

    except Exception as e:
        logger.error(f"[Gmail] Fatal error during sync for user {user_id}: {e}")
        errors += 1
    finally:
        db.close()

    logger.info(f"[Gmail] Sync complete for {user_id}: fetched={fetched}, saved={saved}, errors={errors}")
    return {"fetched": fetched, "saved": saved, "errors": errors}
