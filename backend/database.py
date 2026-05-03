from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

# Load local overrides first (untracked), then fallback defaults from .env.
load_dotenv(dotenv_path=".env.local", override=False)
load_dotenv(override=False)

# Build the connection URL
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./miro.db")

# ─── Engine configuration ────────────────────────────────────────────────────
# Detect the database backend from the URL to apply the right connect_args.
_is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")
_is_vercel = bool(os.getenv("VERCEL"))

if _is_sqlite:
    # check_same_thread is required for SQLite in multi-threaded FastAPI apps
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
elif _is_vercel:
    # ── Vercel serverless ────────────────────────────────────────────────
    # Each invocation is an isolated process. Connection pools are useless
    # because they can't be shared across processes — each one opens its own
    # pool, and Supabase's session-mode pooler has a hard limit (e.g. 15).
    # NullPool: creates a fresh connection per request and disposes it
    # immediately after, keeping the total connection count low.
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        poolclass=NullPool,
        pool_pre_ping=True,
    )
else:
    # ── Local / long-running server ──────────────────────────────────────
    # Keep a small pool; connections are reused across requests.
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,       # verify connections before checkout
        pool_size=3,              # keep 3 connections open (reduced from 5)
        max_overflow=5,           # allow 5 more under load (reduced from 10)
        pool_recycle=300,         # recycle connections after 5 min
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

