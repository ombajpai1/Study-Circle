import uuid
from datetime import date, datetime
from typing import Optional
from sqlalchemy import String, DateTime, Date, ForeignKey, Numeric, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.user import User

class Goal(Base):
    __tablename__ = "goals"  # [cite: 75]

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # [cite: 75]
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # 'daily_hours' | 'streak' | etc. 
    target_value: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)  # Accurate precision 
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)  # 
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)  # 
    is_active: Mapped[bool] = mapped_column(default=True)  # 
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))  # 

    user: Mapped["User"] = relationship(back_populates="goals")