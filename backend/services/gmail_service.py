"""
Gmail Service — fetches academic emails for a user using their OAuth2 access token.
Uses the official Google API Python client (google-api-python-client).

Key improvements:
- Extracts Google Drive / Docs / Sheets links from multipart email parts,
  including application/pdf and other non-text MIME parts that carry Drive links.
- Injects discovered attachment URLs directly into body_text so that
  _expand_urls_in_content() in gemini_service.py fetches and reads them for the AI.
"""
import base64
import datetime
import logging
import os
import re
from typing import Optional

from google.oauth2.credentials import Credentials as GoogleCredentials
from googleapiclient.discovery import build

from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, EmailRecord

logger = logging.getLogger(__name__)

# Max emails to fetch per sync — reduced on serverless to avoid timeout
# (each email requires a full message fetch = ~0.3-0.5s per message)
_is_vercel = bool(os.getenv("VERCEL"))
MAX_EMAILS = 20 if _is_vercel else 100

# Regex to pull any https:// URL out of text (used when extracting from HTML parts)
_URL_RE = re.compile(r'https?://[^\s<>"\']+')

# Drive / Docs / Sheets / Slides / Forms URL patterns worth fetching
_GOOGLE_DOC_PATTERNS = re.compile(
    r'https://(?:docs|drive)\.google\.com/(?:document|spreadsheets|presentation|forms|file)/[^\s<>"\']*',
    re.IGNORECASE,
)


def _build_gmail_service(access_token: str):
    """Build and return an authenticated Gmail API service."""
    try:
        creds = GoogleCredentials(
            token=access_token,
            expiry=datetime.datetime.utcnow() + datetime.timedelta(minutes=55),
        )
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)
        return service
    except Exception as e:
        logger.error(f"[Gmail] Failed to build service: {e}")
        raise


def _extract_headers(headers: list, name: str) -> str:
    """Extract a specific header by name from the list of Gmail headers."""
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _decode_part_data(data: str) -> str:
    """Base64url-decode a Gmail message part's data field."""
    try:
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
    except Exception:
        return ""


def _walk_parts(payload: dict) -> tuple[str, str, list[str]]:
    """
    Recursively walk the message payload tree.
    Returns:
        plain_text  – best plain-text body found
        html_text   – best HTML body found (fallback)
        drive_urls  – all Google Drive / Docs / Sheets URLs found in any part
    """
    plain_text = ""
    html_text = ""
    drive_urls: list[str] = []

    mime = payload.get("mimeType", "")
    parts = payload.get("parts", [])
    body_data = payload.get("body", {}).get("data", "")

    if mime == "text/plain" and body_data:
        plain_text = _decode_part_data(body_data)
        # Also scan plain text for Drive URLs
        drive_urls += _GOOGLE_DOC_PATTERNS.findall(plain_text)

    elif mime == "text/html" and body_data:
        html_text = _decode_part_data(body_data)
        # Pull every href / raw URL from the HTML that looks like a Google Doc
        drive_urls += _GOOGLE_DOC_PATTERNS.findall(html_text)

    elif parts:
        # Multipart — recurse into each child part
        for part in parts:
            child_plain, child_html, child_urls = _walk_parts(part)
            if child_plain:
                plain_text = child_plain  # prefer plain text
            if child_html and not html_text:
                html_text = child_html
            drive_urls += child_urls

    return plain_text, html_text, drive_urls


def _decode_body_and_attachments(payload: dict) -> tuple[str, list[str]]:
    """
    Parse the full Gmail message payload.
    Returns:
        body_text   – plain text body (or stripped HTML as fallback)
        drive_urls  – deduplicated Google Drive attachment/link URLs
    """
    plain_text, html_text, drive_urls = _walk_parts(payload)

    if plain_text:
        body_text = plain_text.strip()
    elif html_text:
        # Strip HTML tags for a cleaner body
        body_text = re.sub(r'<[^>]+>', ' ', html_text)
        body_text = re.sub(r'\s+', ' ', body_text).strip()
    else:
        body_text = ""

    # Deduplicate while preserving order
    seen = set()
    unique_urls = []
    for u in drive_urls:
        # Clean trailing punctuation that sometimes sticks to URLs in HTML
        u = u.rstrip(').,;"\'')
        if u not in seen:
            seen.add(u)
            unique_urls.append(u)

    return body_text, unique_urls


def _build_body_with_attachments(body_text: str, drive_urls: list[str]) -> str:
    """
    Append Drive attachment URLs to the body text so that
    _expand_urls_in_content() in gemini_service.py will find and fetch them.
    """
    if not drive_urls:
        return body_text
    url_block = "\n".join(f"[Attachment]: {u}" for u in drive_urls)
    combined = f"{body_text}\n\n--- ATTACHED DOCUMENTS ---\n{url_block}" if body_text else url_block
    return combined[:8000]  # cap to avoid bloating the DB


def fetch_emails_for_user(user_id: str, access_token: str) -> dict:
    """
    Main entry point. Fetches up to MAX_EMAILS emails from Gmail and writes
    them (with extracted attachment URLs) to the database.

    Optimized for serverless: pre-loads existing IDs, skips full-message fetch
    for known emails, batches commits.

    Returns a summary dict: { fetched: int, saved: int, errors: int }
    """
    db: Session = SessionLocal()
    fetched = 0
    saved = 0
    errors = 0

    try:
        service = _build_gmail_service(access_token)

        # Fetch all emails from the last 30 days.
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

        # Pre-load existing email IDs to skip API calls for known messages
        existing_ids: set[str] = set(
            row[0] for row in db.query(EmailRecord.id).filter(EmailRecord.owner_id == user_id).all()
        )
        skip_count = 0

        for msg_ref in messages:
            try:
                msg_id = msg_ref["id"]

                # Skip if we already have this email — no API call needed
                if msg_id in existing_ids:
                    skip_count += 1
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
                        from email.utils import parsedate_to_datetime
                        email_date = parsedate_to_datetime(date_str).replace(tzinfo=None)
                    except Exception:
                        email_date = datetime.datetime.utcnow()

                # Extract body + any Drive attachment URLs
                body_text, drive_urls = _decode_body_and_attachments(payload)

                if drive_urls:
                    logger.info(
                        f"[Gmail] Message '{subject[:50]}' has {len(drive_urls)} Drive attachment(s): "
                        + ", ".join(u[:60] for u in drive_urls)
                    )

                # Combine body with attachment URLs so AI pipeline can fetch them
                enriched_body = _build_body_with_attachments(body_text, drive_urls)

                # Save to DB
                record = EmailRecord(
                    id=msg_id,
                    owner_id=user_id,
                    subject=subject,
                    sender=sender,
                    date=email_date or datetime.datetime.utcnow(),
                    body_text=enriched_body,
                    status="fetched",
                    classification=None,
                )
                db.add(record)
                existing_ids.add(msg_id)
                saved += 1

                # Commit every 5 saves to balance DB round-trips vs data safety
                if saved % 5 == 0:
                    db.commit()

                logger.debug(f"[Gmail] Saved: {subject[:60]}")

                # Auto-classify with AI — skip on serverless to save time
                if not _is_vercel:
                    try:
                        from services.gemini_service import classify_content
                        classification = classify_content(
                            subject=subject,
                            body=body_text[:2000],
                            sender=sender,
                        )
                        record.classification = classification
                        record.status = "classified"
                    except Exception as classify_err:
                        logger.warning(f"[Gmail] Auto-classify failed for {msg_id}: {classify_err}")

            except Exception as e:
                errors += 1
                logger.warning(f"[Gmail] Error processing message {msg_ref.get('id')}: {e}")
                db.rollback()

        # Final commit for any remaining records
        db.commit()

    except Exception as e:
        logger.error(f"[Gmail] Fatal error during sync for user {user_id}: {e}")
        errors += 1
    finally:
        db.close()

    logger.info(f"[Gmail] Sync complete for {user_id}: fetched={fetched}, saved={saved}, skipped={skip_count}, errors={errors}")
    return {"fetched": fetched, "saved": saved, "errors": errors}

