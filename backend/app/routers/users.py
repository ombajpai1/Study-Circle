from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserPublic
from dependencies import get_current_user
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/users", tags=["Users"])

class UserUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    daily_goal_minutes: Optional[int] = Field(None, ge=10, le=1440)
    avatar_color: Optional[str] = Field(None, max_length=20)

@router.get("/me", response_model=UserPublic)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.patch("/me", response_model=UserPublic)
async def update_me(
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.display_name is not None:
        current_user.display_name = payload.display_name
    if payload.daily_goal_minutes is not None:
        current_user.daily_goal_minutes = payload.daily_goal_minutes
    if payload.avatar_color is not None:
        current_user.avatar_color = payload.avatar_color

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/search", response_model=list[UserPublic])
async def search_users(
    q: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not q or not q.strip():
        return []
    stmt = (
        select(User)
        .where(
            User.id != current_user.id,
            (User.username.ilike(f"%{q.strip()}%")) | (User.display_name.ilike(f"%{q.strip()}%"))
        )
        .limit(10)
    )
    result = await db.execute(stmt)
    users = result.scalars().all()
    return users
