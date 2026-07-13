# from sqlalchemy.orm import sessionmaker
# from sqlalchemy import create_engine

# db_url="postgresql://postgres:474242@localhost5432/Demo1"

# engine=create_engine(db_url)
# Session=sessionmaker(
#     autocommit=False,
#     autoflush=False,
#     bind=engine)

# def get_db():
#     db=Session()
#     try:
#         yield db
#     finally:
#         db.close()



from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import settings

# 1. Create the asynchronous engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True if settings.ENVIRONMENT == "development" else False,
    future=True
)

# 2. Create the async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,  # Essential for async handling to prevent lazy-loading issues
    class_=AsyncSession
)

# 3. Async Dependency Injection function for routers
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
