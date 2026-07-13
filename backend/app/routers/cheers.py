import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.user import User
from app.models.cheers import Cheers
from app.models.session import StudySession
from dependencies import get_current_user
from app.websocket.manager import manager
from pydantic import BaseModel

router = APIRouter(prefix="/cheers", tags=["Cheers"])

class CheerCreate(BaseModel):
    session_id: uuid.UUID

@router.post("/", status_code=status.HTTP_201_CREATED)
async def send_cheer(
    payload: CheerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Verify that the target study session exists
    query = select(StudySession).where(StudySession.id == payload.session_id)
    res = await db.execute(query)
    session = res.scalar()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Study session not found."
        )

    # 2. Prevent users from cheering their own session
    if session.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot cheer your own study session."
        )

    # 3. Create the Cheer model instance
    new_cheer = Cheers(
        sender_id=current_user.id,
        recipient_id=session.user_id,
        session_id=payload.session_id
    )

    db.add(new_cheer)
    await db.commit()
    await db.refresh(new_cheer)

    # 4. Broadcast the real-time WebSocket event to the session owner
    await manager.broadcast_to_user(
        session.user_id,
        {
            "type": "cheer_received",
            "payload": {
                "sender_username": current_user.username,
                "sender_display_name": current_user.display_name or current_user.username,
                "session_id": str(payload.session_id)
            }
        }
    )

    return {"status": "success", "message": "Cheer sent and presence broadcasted"}
