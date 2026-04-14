import logging
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from sqlalchemy.orm import Session
from models import Notification, User
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import uuid

logger = logging.getLogger(__name__)

def create_notification(db: Session, user_id: str, title: str, body: str = "", notif_type: str = "INFO", source_url: str = None) -> Notification:
    """Creates an in-app notification in the database."""
    notification = Notification(
        id=str(uuid.uuid4()),
        owner_id=user_id,
        title=title,
        body=body,
        type=notif_type,
        source_url=source_url,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def send_email_notification(user: User, subject: str, message_html: str):
    """Sends an email using the user's Google OAuth credentials."""
    if not user.google_access_token:
        logger.warning(f"Cannot send email to {user.email}: No active OAuth token.")
        return

    try:
        import datetime
        creds = Credentials(
            token=user.google_access_token,
            expiry=datetime.datetime.utcnow() + datetime.timedelta(minutes=55),
        )
        # Using Gmail API v1 to send email on user's behalf
        service = build('gmail', 'v1', credentials=creds, cache_discovery=False)

        message = MIMEMultipart('alternative')
        message['to'] = user.email
        message['from'] = "Miro AI Autopilot <" + user.email + ">"
        # Wrap subject in Header with utf-8 to prevent "folded header contains newline" crash
        message['subject'] = Header(subject, 'utf-8').encode()

        mime_text = MIMEText(message_html, 'html')
        message.attach(mime_text)

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        send_request = service.users().messages().send(userId='me', body={'raw': raw_message})
        send_request.execute()
        
        logger.info(f"Successfully sent Autopilot email to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send email to {user.email}: {e}")
