# backend/init_db.py
import asyncio
from app.database import engine
from app.models.user import User
from app.models.subject import Subject
from app.models.session import StudySession
from app.models.friendship import Friendship

async def init_models():
    async with engine.begin() as conn:
        # This tells SQLAlchemy to physically build all your tables in Postgres
        await conn.run_sync(User.metadata.create_all)
    print("🚀 All database tables created successfully in Postgres!")

if __name__ == "__main__":
    asyncio.run(init_models())