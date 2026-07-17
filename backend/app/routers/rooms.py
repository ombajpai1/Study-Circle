import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy import func
from app.database import get_db
from app.models.room import StudyRoom, RoomParticipant
from app.schemas.room import RoomCreate, RoomJoin, RoomPublic
from dependencies import get_current_user
from app.services.auth_utils import pwd_context
from app.websocket.room_manager import room_manager
from app.models.user import User

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.post("/", response_model=RoomPublic, status_code=status.HTTP_201_CREATED)
async def create_room(
    payload: RoomCreate,
    db = Depends(get_db),
    user: User = Depends(get_current_user)
):
    room = StudyRoom(
        host_id=user.id,
        name=payload.name,
        subject_id=payload.subject_id,
        focus_minutes=payload.focus_minutes or 25,
        break_minutes=payload.break_minutes or 5,
        max_participants=min(payload.max_participants or 6, 6),
        password_hash=pwd_context.hash(payload.password) if payload.password else None,
    )
    db.add(room)
    await db.flush() # Populate room.id
    
    # Host automatically joins
    participant = RoomParticipant(room_id=room.id, user_id=user.id)
    db.add(participant)
    
    await db.commit()
    await db.refresh(room)
    return room

@router.post("/join", response_model=RoomPublic)
async def join_room(
    payload: RoomJoin,
    db = Depends(get_db),
    user: User = Depends(get_current_user)
):
    stmt = select(StudyRoom).where(
        StudyRoom.code == payload.code.upper(),
        StudyRoom.is_active == True
    )
    result = await db.execute(stmt)
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found or has ended")

    # Check if user is already an active participant (idempotency)
    part_stmt = select(RoomParticipant).where(
        RoomParticipant.room_id == room.id,
        RoomParticipant.user_id == user.id,
        RoomParticipant.left_at == None
    )
    part_result = await db.execute(part_stmt)
    existing_participant = part_result.scalars().first()
    if existing_participant:
        return room

    # Count current active participants
    count_stmt = select(func.count(RoomParticipant.id)).where(
        RoomParticipant.room_id == room.id,
        RoomParticipant.left_at == None
    )
    count_result = await db.execute(count_stmt)
    current_count = count_result.scalar() or 0
    if current_count >= room.max_participants:
        raise HTTPException(status_code=409, detail="Room is full")

    # Password check
    if room.password_hash:
        if not payload.password or not pwd_context.verify(payload.password, room.password_hash):
            raise HTTPException(status_code=403, detail="Incorrect room password")

    db.add(RoomParticipant(room_id=room.id, user_id=user.id))
    await db.commit()
    return room

@router.delete("/{room_id}/leave")
async def leave_room(
    room_id: uuid.UUID,
    db = Depends(get_db),
    user: User = Depends(get_current_user)
):
    stmt = select(RoomParticipant).where(
        RoomParticipant.room_id == room_id,
        RoomParticipant.user_id == user.id,
        RoomParticipant.left_at == None
    )
    result = await db.execute(stmt)
    participant = result.scalars().first()
    if participant:
        participant.left_at = datetime.now(timezone.utc)
        
    # If host left, end the room
    room = await db.get(StudyRoom, room_id)
    if room and room.host_id == user.id:
        room.is_active = False
        await db.commit()
        # Broadcast room ended to all WebSocket connections in the room
        await room_manager.broadcast_room(str(room_id), {"type": "room_ended"})
    else:
        await db.commit()
        
    return {"ok": True}

@router.get("/active", response_model=List[RoomPublic])
async def get_active_rooms(
    db = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Only list public rooms (where password_hash is NULL) and is_active is True
    stmt = select(StudyRoom).where(
        StudyRoom.is_active == True,
        StudyRoom.password_hash == None
    ).order_by(StudyRoom.created_at.desc())
    result = await db.execute(stmt)
    rooms = result.scalars().all()
    return rooms
