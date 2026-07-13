import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, Depends
from jose import JWTError, jwt
from app.config import settings
from app.websocket.manager import manager
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.models.friendship import Friendship

router = APIRouter()

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM

async def notify_friends_presence(user_id: uuid.UUID, is_online: bool, db: AsyncSession):
    stmt = select(Friendship).where(
        Friendship.status == "accepted",
        or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id)
    )
    result = await db.execute(stmt)
    friendships = result.scalars().all()
    
    event_type = "friend_online" if is_online else "friend_offline"
    message = {"type": event_type, "payload": {"user_id": str(user_id)}}
    
    for f in friendships:
        friend_id = f.addressee_id if f.requester_id == user_id else f.requester_id
        await manager.broadcast_to_user(friend_id, message)


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = uuid.UUID(payload["sub"])

    except (JWTError, ValueError, KeyError):
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION
        )
        return

    await manager.connect(user_id, websocket)
    await notify_friends_presence(user_id, True, db)

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        pass

    finally:
        await manager.disconnect(user_id)
        # Use a new database context or connection if transaction is completed, 
        # but in websocket endpoint, the injected session db remains valid.
        await notify_friends_presence(user_id, False, db)

