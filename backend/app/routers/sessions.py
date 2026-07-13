from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User
from app.models.session import StudySession 
from app.models.friendship import Friendship
from app.schemas.session import SessionCreate, SessionPublic, SessionStart
from dependencies import get_current_user
from app.services.streak import recalculate_streak
import json  
import uuid
from app.redis_client import redis_client
from app.websocket.manager import manager

router = APIRouter(prefix="/sessions", tags=["Sessions"])

async def broadcast_to_friends(user_id: uuid.UUID, message: dict, db: AsyncSession):
    stmt = select(Friendship).where(
        Friendship.status == "accepted",
        or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id)
    )
    result = await db.execute(stmt)
    friendships = result.scalars().all()
    for f in friendships:
        friend_id = f.addressee_id if f.requester_id == user_id else f.requester_id
        await manager.broadcast_to_user(friend_id, message)


@router.post("/", response_model=SessionPublic, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_utc_time = datetime.now(timezone.utc) 

    new_session = StudySession(
        user_id=current_user.id,
        subject_id=payload.subject_id,
        duration_seconds=payload.duration_seconds,
        planned_seconds=payload.planned_seconds,
        phase=payload.phase,
        started_at=payload.started_at,
        ended_at=current_utc_time,  
        note=payload.note
    )
    
    current_user.last_study_date = current_utc_time.date()
    
    db.add(new_session)
    await recalculate_streak(current_user, db)

    current_user.last_study_date = current_utc_time.date()
    db.add(current_user)  
    
    await db.commit()

    # Eagerly load the created session with its subject to prevent lazy loading validation error
    stmt = (
        select(StudySession)
        .options(selectinload(StudySession.subject))
        .where(StudySession.id == new_session.id)
    )
    result = await db.execute(stmt)
    db_session = result.scalars().first()

    # Clean up Redis active focus presence key
    redis_key = f"online:{current_user.id}"
    await redis_client.delete(redis_key)

    # Broadcast session completion/end to friends
    await broadcast_to_friends(
        current_user.id,
        {"type": "session_ended", "payload": {"user_id": str(current_user.id)}},
        db
    )
    
    return db_session


@router.post("/start", status_code=200)
async def start_session(
    payload: SessionStart,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    redis_key = f"online:{current_user.id}"

    presence_data = {
        "user_id": str(current_user.id),
        "username": current_user.username,
        "display_name": current_user.display_name,
        "avatar_color": current_user.avatar_color,
        "subject_name": payload.subject_name,
        "subject_emoji": payload.subject_emoji,
    }

    json_payload = json.dumps(presence_data)
    ttl_seconds = payload.focus_duration_seconds + 60

    await redis_client.set(
        name=redis_key,
        value=json_payload,
        ex=ttl_seconds
    )
    
    # Broadcast session start to friends
    await broadcast_to_friends(
        current_user.id,
        {"type": "session_started", "payload": presence_data},
        db
    )

    return {"status": "success", "message": "Timer started and presence broadcasted to friends"}


@router.get("/active", status_code=200)
async def get_active_session(
    current_user: User = Depends(get_current_user)
):
    redis_key = f"online:{current_user.id}"
    session_data = await redis_client.get(redis_key)
    if not session_data:
        return {"active": False}
    
    try:
        data = json.loads(session_data)
        ttl = await redis_client.ttl(redis_key)
        return {
            "active": True,
            "subject_name": data.get("subject_name"),
            "subject_emoji": data.get("subject_emoji"),
            "time_left_seconds": ttl if ttl > 0 else 0
        }
    except Exception:
        return {"active": False}


@router.delete("/active", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    redis_key = f"online:{current_user.id}"
    await redis_client.delete(redis_key)

    # Broadcast session cancellation to friends
    await broadcast_to_friends(
        current_user.id,
        {"type": "session_ended", "payload": {"user_id": str(current_user.id)}},
        db
    )

    return None


  