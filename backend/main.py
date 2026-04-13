import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, Base
from api.router import router as api_router

# Create all tables in the SQLite database automatically
Base.metadata.create_all(bind=engine)

# Ensure the media directory exists for file storage
os.makedirs("backend/media/outputs", exist_ok=True)

app = FastAPI(title="Miro AI", description="Academic Assistant Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

# Serve the media files statically so the frontend can download generated PDFs easily
app.mount("/media", StaticFiles(directory="backend/media"), name="media")

@app.get("/health")
def health_check():
    return {"status": "online", "db": "sqlite"}
