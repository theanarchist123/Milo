import asyncio
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from api.auth import get_current_user
from models import User, Notification
from database import get_db
from sqlalchemy.orm import Session
import json

router = APIRouter()

@router.get("/notifications/stream")
async def notification_stream(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Server-Sent Events endpoint for real-time notification push."""
    
    async def event_generator():
        # Keep track of the last seen notification ID to only send new ones
        last_seen_id = None
        
        # Initially, find the latest notification to establish a baseline
        latest = db.query(Notification).filter(Notification.owner_id == current_user.id).order_by(Notification.created_at.desc()).first()
        if latest:
            last_seen_id = latest.id

        while True:
            # Poll for new notifications
            query = db.query(Notification).filter(Notification.owner_id == current_user.id)
            if last_seen_id:
                # We need a proper created_at comparison in a real app, but for simplicity we rely on the DB adding at the end
                # Actually, filtering by unread and created recently is better. Let's just poll unread that were created in the last 10 seconds.
                pass
            
            # Better approach: Just check if there's any unread notification created after our connection started (or since last check).
            # To keep it completely simple and robust: we will yield a "ping" every 15 seconds to keep connection alive.
            # And query for any unread notifications. If count changes, send a "refresh" event.
            
            unread_count = db.query(Notification).filter(Notification.owner_id == current_user.id, Notification.is_read == False).count()
            
            data = json.dumps({"unreadCount": unread_count})
            yield f"data: {data}\n\n"
            
            await asyncio.sleep(10)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
