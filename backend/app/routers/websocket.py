import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, Depends, Query
from jose import JWTError, jwt
from app.config import settings
from app.websocket.manager import manager
from app.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.models.friendship import Friendship
from app.models.user import User
from app.models.room import StudyRoom, RoomParticipant
from app.websocket.room_manager import room_manager

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


async def handle_room_message(room_id: str, sender_id: str, data: dict, db: AsyncSession):
    msg_type = data.get("type")

    # ── WebRTC signaling (relay to specific peer) ──────
    if msg_type in ("offer", "answer", "ice_candidate"):
        target = data.get("target_id")
        if target:
            await room_manager.send_to_user(room_id, target, {
                **data,
                "sender_id": sender_id,
            })

    # ── Chat message (broadcast to room) ───────────────
    elif msg_type == "chat":
        await room_manager.broadcast_room(room_id, {
            "type": "chat",
            "sender_id": sender_id,
            "text": data.get("text", "")[:500],
        }, exclude_user_id=sender_id)

    # ── Reaction (broadcast) ────────────────────────────
    elif msg_type == "reaction":
        await room_manager.broadcast_room(room_id, {
            "type": "reaction",
            "sender_id": sender_id,
            "emoji": data.get("emoji"),
        })

    # ── Timer control (host only) ────────────────────────
    elif msg_type == "timer_start":
        room_stmt = select(StudyRoom).where(StudyRoom.id == uuid.UUID(room_id))
        room_res = await db.execute(room_stmt)
        room = room_res.scalars().first()
        if room and str(room.host_id) == sender_id:
            room.timer_state = data.get("phase", "focus")
            room.timer_started_at = datetime.now(timezone.utc)
            await db.commit()
            await room_manager.broadcast_room(room_id, {
                "type": "timer_sync",
                "phase": room.timer_state,
                "started_at": room.timer_started_at.isoformat(),
                "focus_minutes": room.focus_minutes,
                "break_minutes": room.break_minutes,
            })

    elif msg_type == "timer_stop":
        room_stmt = select(StudyRoom).where(StudyRoom.id == uuid.UUID(room_id))
        room_res = await db.execute(room_stmt)
        room = room_res.scalars().first()
        if room and str(room.host_id) == sender_id:
            room.timer_state = "idle"
            room.timer_started_at = None
            await db.commit()
            await room_manager.broadcast_room(room_id, { "type": "timer_stopped" })

    # ── Keepalive ────────────────────────────────────────
    elif msg_type == "ping":
        await room_manager.send_to_user(room_id, sender_id, { "type": "pong" })


@router.websocket("/ws/room/{room_id}")
async def room_websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    # 1. Validate JWT
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
        user_id_str = payload.get("sub")
        token_type = payload.get("type")
        if user_id_str is None or token_type != "access":
            await websocket.close(code=4001)
            return
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError, KeyError):
        await websocket.close(code=4001)
        return

    # 2. Confirm active participant status
    try:
        room_uuid = uuid.UUID(room_id)
    except ValueError:
        await websocket.close(code=4002)
        return

    part_stmt = select(RoomParticipant).where(
        RoomParticipant.room_id == room_uuid,
        RoomParticipant.user_id == user_id,
        RoomParticipant.left_at == None
    )
    part_result = await db.execute(part_stmt)
    participant = part_result.scalars().first()
    if not participant:
        await websocket.close(code=4003)
        return

    # Fetch user for display name/avatar
    user_stmt = select(User).where(User.id == user_id)
    user_result = await db.execute(user_stmt)
    user = user_result.scalars().first()
    if not user:
        await websocket.close(code=4004)
        return

    # 3. Accept and register connection
    await room_manager.connect(room_id, str(user_id), websocket)

    # 4. Notify newcomer of active peers
    existing_peers = room_manager.get_peers(room_id, str(user_id))
    await websocket.send_json({
        "type": "room_joined",
        "your_id": str(user_id),
        "peers": existing_peers,
    })

    # 5. Notify existing peers of newcomer
    await room_manager.broadcast_room(room_id, {
        "type": "peer_joined",
        "peer_id": str(user_id),
        "display_name": user.display_name or user.username,
        "avatar_color": user.avatar_color or "#3B82F6",
    }, exclude_user_id=str(user_id))

    # 6. Message receive loop
    try:
        while True:
            data = await websocket.receive_json()
            await handle_room_message(room_id, str(user_id), data, db)
    except Exception:
        pass
    finally:
        room_manager.disconnect(room_id, str(user_id))
        await room_manager.broadcast_room(room_id, {
            "type": "peer_left",
            "peer_id": str(user_id),
        })


