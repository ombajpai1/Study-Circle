from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.models.user import User
from app.models.session import StudySession
from app.models.subject import Subject
from dependencies import get_current_user
from datetime import datetime, date, timedelta, timezone
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/stats", tags=["Stats"])

class StatsSummaryResponse(BaseModel):
    today_minutes: int
    current_streak: int
    weekly_total_minutes: int
    session_count: int

class DailyStatResponse(BaseModel):
    date: str
    minutes: int

class SubjectStatResponse(BaseModel):
    subject_name: str
    color_hex: str
    minutes: int

@router.get("/summary", response_model=StatsSummaryResponse)
async def get_summary_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now_utc = datetime.now(timezone.utc)
    today_start = datetime.combine(now_utc.date(), datetime.min.time(), tzinfo=timezone.utc)
    seven_days_ago = today_start - timedelta(days=7)

    # 1. Today's Minutes
    today_query = select(func.sum(StudySession.duration_seconds)).where(
        StudySession.user_id == current_user.id,
        StudySession.phase == "focus",
        StudySession.ended_at >= today_start
    )
    today_res = await db.execute(today_query)
    today_seconds = today_res.scalar() or 0
    today_minutes = MathRoundMins(today_seconds)

    # 2. Weekly Total Minutes
    weekly_query = select(func.sum(StudySession.duration_seconds)).where(
        StudySession.user_id == current_user.id,
        StudySession.phase == "focus",
        StudySession.ended_at >= seven_days_ago
    )
    weekly_res = await db.execute(weekly_query)
    weekly_seconds = weekly_res.scalar() or 0
    weekly_total_minutes = MathRoundMins(weekly_seconds)

    # 3. Session Count
    count_query = select(func.count(StudySession.id)).where(
        StudySession.user_id == current_user.id,
        StudySession.phase == "focus"
    )
    count_res = await db.execute(count_query)
    session_count = count_res.scalar() or 0

    return StatsSummaryResponse(
        today_minutes=today_minutes,
        current_streak=current_user.current_streak,
        weekly_total_minutes=weekly_total_minutes,
        session_count=session_count
    )

@router.get("/daily", response_model=List[DailyStatResponse])
async def get_daily_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now_utc = datetime.now(timezone.utc)
    today = now_utc.date()
    
    daily_stats = []
    # Query last 7 days individually to get exact daily stats
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        day_start = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
        day_end = datetime.combine(target_date, datetime.max.time(), tzinfo=timezone.utc)
        
        query = select(func.sum(StudySession.duration_seconds)).where(
            StudySession.user_id == current_user.id,
            StudySession.phase == "focus",
            StudySession.ended_at >= day_start,
            StudySession.ended_at <= day_end
        )
        res = await db.execute(query)
        seconds = res.scalar() or 0
        minutes = MathRoundMins(seconds)
        
        # Format date as day name e.g. "Mon"
        day_name = target_date.strftime("%a")
        daily_stats.append(DailyStatResponse(date=day_name, minutes=minutes))
        
    return daily_stats

@router.get("/subjects", response_model=List[SubjectStatResponse])
async def get_subject_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Group sessions by subject_id
    query = (
        select(
            StudySession.subject_id,
            func.sum(StudySession.duration_seconds).label("total_seconds")
        )
        .where(
            StudySession.user_id == current_user.id,
            StudySession.phase == "focus"
        )
        .group_by(StudySession.subject_id)
    )
    res = await db.execute(query)
    rows = res.all()

    subject_stats = []
    for subject_id, total_seconds in rows:
        minutes = MathRoundMins(total_seconds)
        
        if subject_id is None:
            subject_stats.append(SubjectStatResponse(
                subject_name="General Focus",
                color_hex="#64748B",
                minutes=minutes
            ))
        else:
            # Query Subject details
            sub_query = select(Subject).where(Subject.id == subject_id)
            sub_res = await db.execute(sub_query)
            subject = sub_res.scalar()
            if subject:
                subject_stats.append(SubjectStatResponse(
                    subject_name=f"{subject.emoji} {subject.name}",
                    color_hex=subject.color_hex,
                    minutes=minutes
                ))
            else:
                subject_stats.append(SubjectStatResponse(
                    subject_name="Unknown Subject",
                    color_hex="#64748B",
                    minutes=minutes
                ))

    return subject_stats

def MathRoundMins(seconds: int) -> int:
    return int(round(seconds / 60.0))
