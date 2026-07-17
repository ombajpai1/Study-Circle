import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base

class StudyRoom(Base):
    __tablename__ = 'study_rooms'
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code             = Column(String(8), unique=True, nullable=False,
                             default=lambda: secrets.token_urlsafe(6)[:8].upper())
    host_id          = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    subject_id       = Column(UUID(as_uuid=True), ForeignKey('subjects.id'), nullable=True)
    name             = Column(String(100), nullable=False)
    max_participants = Column(Integer, default=6)
    password_hash    = Column(String, nullable=True)
    focus_minutes    = Column(Integer, default=25)
    break_minutes    = Column(Integer, default=5)
    timer_state      = Column(String(20), default='idle')
    timer_started_at = Column(DateTime(timezone=True), nullable=True)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class RoomParticipant(Base):
    __tablename__ = 'room_participants'
    id        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    room_id   = Column(UUID(as_uuid=True), ForeignKey('study_rooms.id', ondelete='CASCADE'), nullable=False)
    user_id   = Column(UUID(as_uuid=True), ForeignKey('users.id',       ondelete='CASCADE'), nullable=False)
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    left_at   = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index(
            'idx_room_active_participant',
            'room_id', 'user_id',
            unique=True,
            postgresql_where=left_at == None
        ),
    )
