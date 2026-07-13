from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.notification import Notification

async def recalculate_streak(user: User, db: AsyncSession) -> None:
    today = date.today()
    yesterday = today - timedelta(days=1)
    
    if user.last_study_date is None:
        user.current_streak = 1

    elif user.last_study_date == today:
        return
    
    elif user.last_study_date == yesterday:
        user.current_streak += 1

    else:
        user.current_streak = 1


    if user.current_streak > user.longest_streak:
        user.longest_streak = user.current_streak


    milestones = {7, 14, 30, 60, 100}
    if user.current_streak in milestones:
        streak_notification = Notification(
            user_id=user.id,
            type="streak",
            payload={
                "streak_days": user.current_streak,
                "is_personal_best": user.current_streak == user.longest_streak
            }
        )
        db.add(streak_notification)