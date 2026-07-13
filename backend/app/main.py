import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Explicitly import all database models at startup to register them with SQLAlchemy mapper registry
from app.models.user import User
from app.models.subject import Subject
from app.models.session import StudySession
from app.models.goals import Goal
from app.models.friendship import Friendship
from app.models.cheers import Cheers
from app.models.notification import Notification
from app.models.message import Message

from sqlalchemy import text
from app.database import engine

from app.routers import auth, sessions, subjects, friends, websocket, users, stats, cheers, messages

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Study Circle social focus & study-tracking application",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(User.metadata.create_all)
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question VARCHAR(255)"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_hash VARCHAR(255)"))
    try:
        print("🚀 System Verification Complete: All PostgreSQL tables synchronized successfully.")
    except UnicodeEncodeError:
        print("System Verification Complete: All PostgreSQL tables synchronized successfully.")

# Register API Routers under /api/v1 prefix
app.include_router(auth.router, prefix="/api/v1")
app.include_router(sessions.router, prefix="/api/v1")
app.include_router(subjects.router, prefix="/api/v1")
app.include_router(friends.router, prefix="/api/v1")
app.include_router(websocket.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(cheers.router, prefix="/api/v1")
app.include_router(messages.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API!",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
