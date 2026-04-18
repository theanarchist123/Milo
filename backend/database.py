from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
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

if _is_sqlite:
    # check_same_thread is required for SQLite in multi-threaded FastAPI apps
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    # Postgres (or any other DB) — use connection pooling best-practices
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,       # verify connections before checkout
        pool_size=5,              # keep 5 connections open
        max_overflow=10,          # allow 10 more under load
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
