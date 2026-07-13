import json
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.database import get_db
from app.models.friendship import Friendship  
from app.models.user import User
from app.models.session import StudySession
from app.models.subject import Subject
from app.models.cheers import Cheers
from dependencies import get_current_user
from app.redis_client import redis_client
from app.websocket.manager import manager

router = APIRouter(prefix="/friends", tags=["Friends"])  

@router.get("/online")  
async def get_online_friends(
    current_user: User = Depends(get_current_user),  
    db: AsyncSession = Depends(get_db),
):
    """
    Scans the user's accepted friends list and checks Redis to aggregate 
    which connections are actively tracking an ongoing study session (Section 4.5, 5.4).
    """
    stmt = (
        select(Friendship)
        .where(
            Friendship.status == "accepted",
            (Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id)
        )
    )

    result = await db.execute(stmt)
    friendships = result.scalars().all()

    online_friends = []

    for friendship in friendships:
        friend_id = (
            friendship.addressee_id
            if friendship.requester_id == current_user.id
            else friendship.requester_id
        )

        redis_key = f"online:{friend_id}"

        session_data = await redis_client.get(redis_key)

        if session_data:
            online_friends.append(
                json.loads(session_data) 
            )

    return online_friends 

@router.get("/feed")
async def get_friends_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Scan accepted friendships to gather friend IDs
    stmt = (
        select(Friendship)
        .where(
            Friendship.status == "accepted",
            (Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id)
        )
    )
    res = await db.execute(stmt)
    friendships = res.scalars().all()
    
    friend_ids = []
    for f in friendships:
        fid = f.addressee_id if f.requester_id == current_user.id else f.requester_id
        friend_ids.append(fid)
        
    if not friend_ids:
        return []
        
    # 2. Query completed focus sessions of these friends
    session_stmt = (
        select(StudySession, User, Subject)
        .join(User, StudySession.user_id == User.id)
        .outerjoin(Subject, StudySession.subject_id == Subject.id)
        .where(
            StudySession.user_id.in_(friend_ids),
            StudySession.phase == "focus"
        )
        .order_by(StudySession.ended_at.desc())
        .limit(50)
    )
    session_res = await db.execute(session_stmt)
    results = session_res.all()
    
    feed = []
    for session, user, subject in results:
        # Get cheers count
        cheers_stmt = select(func.count(Cheers.id)).where(Cheers.session_id == session.id)
        cheers_res = await db.execute(cheers_stmt)
        cheer_count = cheers_res.scalar() or 0
        
        # Check if cheered by current user
        my_cheer_stmt = select(Cheers).where(Cheers.session_id == session.id, Cheers.sender_id == current_user.id)
        my_cheer_res = await db.execute(my_cheer_stmt)
        cheered_by_me = my_cheer_res.scalar() is not None
        
        feed.append({
            "id": str(session.id),
            "username": user.username,
            "display_name": user.display_name or user.username,
            "avatar_color": user.avatar_color or "#3B82F6",
            "subject_name": subject.name if subject else "General Focus",
            "subject_emoji": subject.emoji if subject else "⏱️",
            "duration_seconds": session.duration_seconds,
            "ended_at": session.ended_at.isoformat(),
            "cheer_count": cheer_count,
            "cheered_by_me": cheered_by_me
        })
        
    return feed 


class FriendActionRequest(BaseModel):
    action: str
    username: Optional[str] = None
    friend_id: Optional[str] = None


@router.get("/")
async def list_friends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Friendship)
        .where(
            (Friendship.requester_id == current_user.id) | (Friendship.addressee_id == current_user.id)
        )
    )
    result = await db.execute(stmt)
    friendships = result.scalars().all()
    
    friends_list = []
    for f in friendships:
        friend_id = f.addressee_id if f.requester_id == current_user.id else f.requester_id
        
        friend_stmt = select(User).where(User.id == friend_id)
        friend_res = await db.execute(friend_stmt)
        friend_user = friend_res.scalars().first()
        if not friend_user:
            continue
            
        if f.status == "accepted":
            status_val = "accepted"
        else:
            status_val = "pending_outgoing" if f.requester_id == current_user.id else "pending_incoming"
            
        is_online = friend_id in manager.active_connections
        current_subject = None
        current_emoji = None
        
        redis_key = f"online:{friend_id}"
        session_data = await redis_client.get(redis_key)
        if session_data:
            try:
                data = json.loads(session_data)
                current_subject = data.get("subject_name")
                current_emoji = data.get("subject_emoji")
            except Exception:
                pass
                
        friends_list.append({
            "id": str(friend_user.id),
            "username": friend_user.username,
            "display_name": friend_user.display_name or friend_user.username,
            "avatar_color": friend_user.avatar_color or "#3B82F6",
            "status": status_val,
            "is_online": is_online,
            "current_subject": current_subject,
            "current_emoji": current_emoji
        })
        
    return friends_list


@router.post("/")
async def handle_friend_action(
    payload: FriendActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if payload.action == "add":
        if not payload.username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is required for add action."
            )
            
        stmt = select(User).where(User.username == payload.username)
        res = await db.execute(stmt)
        target_user = res.scalars().first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found."
            )
            
        if target_user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot add yourself as a friend."
            )
            
        check_stmt = (
            select(Friendship)
            .where(
                ((Friendship.requester_id == current_user.id) & (Friendship.addressee_id == target_user.id)) |
                ((Friendship.requester_id == target_user.id) & (Friendship.addressee_id == current_user.id))
            )
        )
        check_res = await db.execute(check_stmt)
        existing = check_res.scalars().first()
        
        if existing:
            if existing.status == "accepted":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You are already friends with this user."
                )
            else:
                if existing.requester_id == current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Friend request already sent."
                    )
                else:
                    existing.status = "accepted"
                    await db.commit()
                    return {
                        "id": str(target_user.id),
                        "username": target_user.username,
                        "display_name": target_user.display_name or target_user.username,
                        "avatar_color": target_user.avatar_color or "#3B82F6",
                        "status": "accepted",
                        "is_online": False
                    }
                    
        new_friendship = Friendship(
            requester_id=current_user.id,
            addressee_id=target_user.id,
            status="pending"
        )
        db.add(new_friendship)
        await db.commit()
        
        return {
            "id": str(target_user.id),
            "username": target_user.username,
            "display_name": target_user.display_name or target_user.username,
            "avatar_color": target_user.avatar_color or "#3B82F6",
            "status": "pending_outgoing",
            "is_online": False
        }
        
    elif payload.action == "accept":
        if not payload.friend_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Friend ID is required for accept action."
            )
            
        try:
            target_uuid = uuid.UUID(payload.friend_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid friend ID format."
            )
            
        stmt = (
            select(Friendship)
            .where(
                Friendship.requester_id == target_uuid,
                Friendship.addressee_id == current_user.id,
                Friendship.status == "pending"
            )
        )
        res = await db.execute(stmt)
        friendship = res.scalars().first()
        if not friendship:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pending friend request not found."
            )
            
        friendship.status = "accepted"
        await db.commit()
        return {"message": "Friend invitation accepted"}
        
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action specified."
        )


