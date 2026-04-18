import asyncio
import os
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from models import User, Notification
from database import get_db
from sqlalchemy.orm import Session
import json

from api.auth import FIREBASE_ENABLED, _verify_firebase_token

router = APIRouter()

IS_VERCEL = bool(os.getenv("VERCEL"))


def get_user_from_query_token(token: str = Query(None), db: Session = Depends(get_db)):
    if not FIREBASE_ENABLED:
        user = db.query(User).filter(User.id == "local_dev_user").first()
        return user
    if not token:
        raise HTTPException(status_code=401, detail="Missing token query param in SSE")
    try:
        claims = _verify_firebase_token(token)
        uid = claims["uid"]
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            raise HTTPException(status_code=401)
        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid SSE token: {e}")


# ─── Polling fallback (works on Vercel serverless) ───────────────────────────
@router.get("/notifications/poll")
def notification_poll(
    current_user: User = Depends(get_user_from_query_token),
    db: Session = Depends(get_db),
):
    """
    Lightweight polling endpoint for serverless environments where SSE
    connections can't be held open. Returns the same payload shape as the
    SSE stream — a single JSON snapshot of unread count + latest notification.
    """
    unread_count = db.query(Notification).filter(
        Notification.owner_id == current_user.id,
        Notification.is_read == False
    ).count()

    latest_notif = db.query(Notification).filter(
        Notification.owner_id == current_user.id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).first()

    latest_data = None
    if latest_notif:
        latest_data = {
            "id": latest_notif.id,
            "title": latest_notif.title,
            "body": latest_notif.body,
            "type": latest_notif.type,
        }

    return {"unreadCount": unread_count, "latest": latest_data}


# ─── SSE stream (local dev / long-running servers only) ──────────────────────
@router.get("/notifications/stream")
async def notification_stream(current_user: User = Depends(get_user_from_query_token)):
    """Server-Sent Events endpoint for real-time notification push."""

    # On Vercel serverless, SSE will time out almost immediately.
    # Redirect clients to use the /poll endpoint instead.
    if IS_VERCEL:
        raise HTTPException(
            status_code=501,
            detail="SSE is not supported on serverless. Use /api/notifications/poll instead.",
        )

    async def event_generator():
        # SSE Loop
        while True:
            # Recreate session in loop because SSE connections are long-lived
            # keeping a single session open forever can cause staleness/locks.
            from database import SessionLocal
            db = SessionLocal()
            try:
                unread_count = db.query(Notification).filter(
                    Notification.owner_id == current_user.id, 
                    Notification.is_read == False
                ).count()
                
                latest_notif = db.query(Notification).filter(
                    Notification.owner_id == current_user.id, 
                    Notification.is_read == False
                ).order_by(Notification.created_at.desc()).first()
                
                latest_data = None
                if latest_notif:
                    latest_data = {
                        "id": latest_notif.id,
                        "title": latest_notif.title,
                        "body": latest_notif.body,
                        "type": latest_notif.type,
                    }

                data = json.dumps({"unreadCount": unread_count, "latest": latest_data})
                yield f"data: {data}\n\n"
            finally:
                db.close()
                
            await asyncio.sleep(10)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
