import uuid
from datetime import date, datetime
from typing import List
from sqlalchemy import String, Date, DateTime, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base



class User(Base):
    __tablename__ = "users"  # Matching spec 3.1 [cite: 64]

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)  # [cite: 65]
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)  # [cite: 65]
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)  # [cite: 65]
    display_name: Mapped[str | None] = mapped_column(String(100))  # [cite: 65]
    avatar_color: Mapped[str | None] = mapped_column(String(20))  # [cite: 65]
    daily_goal_minutes: Mapped[int] = mapped_column(default=240)  # Default 4 hours [cite: 65]
    current_streak: Mapped[int] = mapped_column(default=0)  # [cite: 65]
    longest_streak: Mapped[int] = mapped_column(default=0)  # [cite: 65]
    last_study_date: Mapped[date | None] = mapped_column(Date)  # [cite: 65]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))  # [cite: 65]
    is_active: Mapped[bool] = mapped_column(default=True)  # [cite: 65]
    security_question: Mapped[str | None] = mapped_column(String(255), nullable=True)
    security_answer_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # One-to-Many: Custom Subjects created by the user [cite: 67]
    subjects: Mapped[List["Subject"]] = relationship(
        back_populates="user", 
        cascade="all, delete-orphan"
    )

    # One-to-Many: Study sessions completed by the user [cite: 69]
    study_sessions: Mapped[List["StudySession"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )

    # One-to-Many: Goals set by the user [cite: 76]
    goals: Mapped[List["Goal"]] = relationship(
        back_populates="user", 
        cascade="all, delete-orphan"
    )    
    
    # Friendships Initiated vs Received (Disambiguated mapping to section 3.4) 
    friendships_initiated: Mapped[List["Friendship"]] = relationship(
        "Friendship",
        foreign_keys="[Friendship.requester_id]",
        back_populates="requester",
        cascade="all, delete-orphan"
    )    
    friendships_received: Mapped[List["Friendship"]] = relationship(
        "Friendship",
        foreign_keys="[Friendship.addressee_id]",
        back_populates="addressee",
        cascade="all, delete-orphan"
    )    

    # Cheers Sent vs Received (Disambiguated mapping to section 3.5) 
    cheers_sent: Mapped[List["Cheers"]] = relationship(
        "Cheers",
        foreign_keys="[Cheers.sender_id]",
        back_populates="sender",
        cascade="all, delete-orphan"
    )    
    cheers_received: Mapped[List["Cheers"]] = relationship(
        "Cheers",
        foreign_keys="[Cheers.recipient_id]",
        back_populates="recipient",
        cascade="all, delete-orphan"
    )    

    # One-to-Many: Notifications targeting this user [cite: 78]
    notifications: Mapped[List["Notification"]] = relationship(
        back_populates="user", 
        cascade="all, delete-orphan"
    )