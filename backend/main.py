import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from database import engine, Base, _is_sqlite
from api.router import router as api_router
from api.auth import router as auth_router
from api.sse import router as sse_router
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

# ─── Vercel detection ─────────────────────────────────────────────────────────
IS_VERCEL = bool(os.getenv("VERCEL"))


def run_migrations():
    """
    Safe additive schema migrations for SQLite.
    Adds any missing columns to existing tables without dropping data.
    SQLite supports ADD COLUMN but raises OperationalError if the column already
    exists — we catch that silently so this is safe to run on every startup.

    NOTE: This is skipped on Postgres/Vercel where schema is managed by
    create_all() which handles missing columns natively via metadata reflection.
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
        "ALTER TABLE course_items ADD COLUMN created_at TIMESTAMP",
        # emails table additions
        "ALTER TABLE emails ADD COLUMN auto_processed BOOLEAN DEFAULT 0",
        # tasks table additions
        "ALTER TABLE tasks ADD COLUMN error_message TEXT",
    ]
    for sql in missing_columns:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
        except Exception:
            pass  # Column already exists or other error — safe to skip


# Create all tables (new tables only — won't touch existing ones)
# On Vercel, tables already exist in Supabase. create_all is idempotent but
# costs a DB connection; wrap it so a transient connection error during cold-start
# doesn't crash the entire function before it can serve a single request.
try:
    Base.metadata.create_all(bind=engine)
except Exception as _e:
    logger.warning(f"[App] create_all failed (will retry on next request): {_e}")

# Run additive migrations unconditionally since create_all doesn't add missing columns
run_migrations()

# Ensure the media directory exists for file storage (local dev only)
# On Vercel the filesystem is read-only/ephemeral — skip this.
if not IS_VERCEL:
    os.makedirs("media/outputs", exist_ok=True)

scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # On Vercel serverless, avoid long-running background schedulers.
    if IS_VERCEL:
        logger.info("[App] Vercel runtime detected; APScheduler is disabled.")
    else:
        logger.info("[App] Starting APScheduler...")
        scheduler.start()

        # We will register the job dynamically or from a service module
        from services.auto_processor import run_auto_processing_cycle
        # Run every 5 min by default to support the shortest UI interval. Individual user logic checks their own interval.
        scheduler.add_job(run_auto_processing_cycle, 'interval', minutes=5, id='auto_processor_job')
    
    yield
    # Shutdown logic
    if not IS_VERCEL:
        logger.info("[App] Shutting down APScheduler...")
        scheduler.shutdown()

app = FastAPI(title="Miro AI", description="Academic Assistant Backend", lifespan=lifespan)

cors_allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
frontend_origin = os.getenv("FRONTEND_ORIGIN", "").strip()
if frontend_origin and frontend_origin not in cors_allowed_origins:
    cors_allowed_origins.append(frontend_origin)

cors_allowed_origin_regex = os.getenv(
    "CORS_ALLOWED_ORIGIN_REGEX",
    r"http://(localhost|127\.0\.0\.1)(:\d+)?",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allowed_origins,
    allow_origin_regex=cors_allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth")
app.include_router(sse_router, prefix="/api")

# Serve the media files statically so the frontend can download generated PDFs
# On Vercel, the filesystem is ephemeral so static file serving is meaningless.
if not IS_VERCEL:
    app.mount("/media", StaticFiles(directory="media"), name="media")

@app.get("/health")
def health_check():
    db_type = "postgres" if not _is_sqlite else "sqlite"
    return {"status": "online", "db": db_type, "runtime": "vercel" if IS_VERCEL else "local"}
