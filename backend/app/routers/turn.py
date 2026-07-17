import hmac
import hashlib
import base64
import time
from fastapi import APIRouter, Depends
from dependencies import get_current_user
from app.config import settings
from app.models.user import User

router = APIRouter(prefix="/turn-credentials", tags=["TURN"])

@router.get("")
async def get_turn_credentials(user: User = Depends(get_current_user)):
    ttl = 3600
    timestamp = int(time.time()) + ttl
    username = f"{timestamp}:{str(user.id)}"

    secret = settings.TURN_SECRET.encode()
    credential = base64.b64encode(
        hmac.new(secret, username.encode(), hashlib.sha1).digest()
    ).decode()

    return {
        "username": username,
        "credential": credential,
        "urls": [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
            "stun:turn.studycircle.app:3478",
            "turn:turn.studycircle.app:3478?transport=udp",
            "turn:turn.studycircle.app:3478?transport=tcp",
            "turns:turn.studycircle.app:5349?transport=tcp"
        ]
    }
