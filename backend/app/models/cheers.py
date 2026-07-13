import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Cheers(Base):
    __tablename__ = "cheers"  # 

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # 
    recipient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # 
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("study_sessions.id", ondelete="CASCADE"), nullable=True)  # 
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))  # 

    # Dual mapping back to User to distinguish sender vs recipient
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id], back_populates="cheers_sent")
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_id], back_populates="cheers_received")
    study_session: Mapped[Optional["StudySession"]] = relationship(back_populates="cheers")