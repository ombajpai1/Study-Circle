import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_
from app.database import get_db
from app.models.user import User
from app.models.friendship import Friendship
from app.models.message import Message
from dependencies import get_current_user
from app.websocket.manager import manager

router = APIRouter(prefix="/messages", tags=["Messages"])


class MessageCreate(BaseModel):
    recipient_id: str
    content: str = Field(..., min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id: uuid.UUID
    sender_id: uuid.UUID
    recipient_id: uuid.UUID
    content: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True


@router.post("/", response_model=MessageResponse)
async def send_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        recipient_uuid = uuid.UUID(payload.recipient_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recipient ID format."
        )

    if recipient_uuid == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot message yourself."
        )

    # Verify they are accepted friends
    friendship_stmt = select(Friendship).where(
        Friendship.status == "accepted",
        or_(
            and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == recipient_uuid),
            and_(Friendship.requester_id == recipient_uuid, Friendship.addressee_id == current_user.id)
        )
    )
    friendship_res = await db.execute(friendship_stmt)
    if not friendship_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only send messages to accepted friends."
        )

    # Save to Database
    new_msg = Message(
        sender_id=current_user.id,
        recipient_id=recipient_uuid,
        content=payload.content.strip()
    )
    db.add(new_msg)
    await db.commit()
    await db.refresh(new_msg)

    # Broadcast via WebSocket if recipient is online
    msg_payload = {
        "type": "chat_message",
        "payload": {
            "id": str(new_msg.id),
            "sender_id": str(new_msg.sender_id),
            "recipient_id": str(new_msg.recipient_id),
            "content": new_msg.content,
            "created_at": new_msg.created_at.isoformat(),
            "is_read": new_msg.is_read
        }
    }
    await manager.broadcast_to_user(recipient_uuid, msg_payload)

    return new_msg


@router.get("/{friend_id}", response_model=List[MessageResponse])
async def get_messages(
    friend_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        friend_uuid = uuid.UUID(friend_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid friend ID format."
        )

    # Retrieve all messages in the conversation thread
    stmt = (
        select(Message)
        .where(
            or_(
                and_(Message.sender_id == current_user.id, Message.recipient_id == friend_uuid),
                and_(Message.sender_id == friend_uuid, Message.recipient_id == current_user.id)
            )
        )
        .order_by(Message.created_at.asc())
    )
    res = await db.execute(stmt)
    messages = res.scalars().all()

    # Mark incoming unread messages as read
    unread_stmt = select(Message).where(
        Message.sender_id == friend_uuid,
        Message.recipient_id == current_user.id,
        Message.is_read == False
    )
    unread_res = await db.execute(unread_stmt)
    unread_messages = unread_res.scalars().all()
    for m in unread_messages:
        m.is_read = True

    if unread_messages:
        await db.commit()

    return messages
