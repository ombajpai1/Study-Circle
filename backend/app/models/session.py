import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, DateTime, ForeignKey, text, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

class StudySession(Base):
    __tablename__ = "study_sessions"  # 

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # 
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)  # 
    duration_seconds: Mapped[int] = mapped_column(nullable=False)  # 
    planned_seconds: Mapped[int] = mapped_column(nullable=False)  # 
    phase: Mapped[str] = mapped_column(String(10), default="focus")  # 'focus' or 'break' 
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)  # 
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))  # 
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 

    # Relationships
    user: Mapped["User"] = relationship(back_populates="study_sessions")
    subject: Mapped[Optional["Subject"]] = relationship()
    cheers: Mapped[List["Cheers"]] = relationship(back_populates="study_session", cascade="all, delete-orphan")
