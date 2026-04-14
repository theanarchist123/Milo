import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from database import engine, Base
from api.router import router as api_router
from api.auth import router as auth_router
from api.sse import router as sse_router
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


def run_migrations():
    """
    Safe additive schema migrations for SQLite.
    Adds any missing columns to existing tables without dropping data.
    SQLite supports ADD COLUMN but raises OperationalError if the column already
    exists — we catch that silently so this is safe to run on every startup.
    """
    missing_columns = [
        # users table additions
        "ALTER TABLE users ADD COLUMN display_name VARCHAR",
        "ALTER TABLE users ADD COLUMN photo_url VARCHAR",
        "ALTER TABLE users ADD COLUMN google_access_token VARCHAR",
        "ALTER TABLE users ADD COLUMN google_refresh_token VARCHAR",
        "ALTER TABLE users ADD COLUMN auto_process_enabled BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN roll_number VARCHAR",
        "ALTER TABLE users ADD COLUMN auto_process_interval_minutes INTEGER DEFAULT 15",
        "ALTER TABLE users ADD COLUMN last_sync_time DATETIME",
        # course_items table additions
        "ALTER TABLE course_items ADD COLUMN owner_id VARCHAR REFERENCES users(id)",
        "ALTER TABLE course_items ADD COLUMN auto_processed BOOLEAN DEFAULT 0",
        # emails table additions
        "ALTER TABLE emails ADD COLUMN auto_processed BOOLEAN DEFAULT 0",
        # tasks table additions
        "ALTER TABLE tasks ADD COLUMN error_message TEXT",
    ]
    with engine.begin() as conn:
        for sql in missing_columns:
            try:
                conn.execute(text(sql))
            except Exception:
                pass  # Column already exists — safe to skip


# Create all tables (new tables only — won’t touch existing ones)
Base.metadata.create_all(bind=engine)
# Add any missing columns to already-existing tables
run_migrations()

# Ensure the media directory exists for file storage
# NOTE: uvicorn is run from d:\miro_ai\backend so paths are relative to that
os.makedirs("media/outputs", exist_ok=True)

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    logger.info("[App] Starting APScheduler...")
    scheduler.start()
    
    # We will register the job dynamically or from a service module
    from services.auto_processor import run_auto_processing_cycle
    # Run every 5 min by default to support the shortest UI interval. Individual user logic checks their own interval.
    scheduler.add_job(run_auto_processing_cycle, 'interval', minutes=5, id='auto_processor_job')
    
    yield
    # Shutdown logic
    logger.info("[App] Shutting down APScheduler...")
    scheduler.shutdown()

app = FastAPI(title="Miro AI", description="Academic Assistant Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # Match any localhost / 127.0.0.1 on any port — covers Vite on 5173, 5174, 5175 etc.
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth")
app.include_router(sse_router, prefix="/api")

# Serve the media files statically so the frontend can download generated PDFs
app.mount("/media", StaticFiles(directory="media"), name="media")

@app.get("/health")
def health_check():
    return {"status": "online", "db": "sqlite"}
