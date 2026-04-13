import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from database import engine, Base
from api.router import router as api_router
from api.auth import router as auth_router


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
        # course_items table additions
        "ALTER TABLE course_items ADD COLUMN owner_id VARCHAR REFERENCES users(id)",
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

app = FastAPI(title="Miro AI", description="Academic Assistant Backend")

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

# Serve the media files statically so the frontend can download generated PDFs
app.mount("/media", StaticFiles(directory="media"), name="media")

@app.get("/health")
def health_check():
    return {"status": "online", "db": "sqlite"}
