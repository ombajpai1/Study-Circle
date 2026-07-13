import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.user import User


class Friendship(Base):
    __tablename__ = "friendships"  # [cite: 71]

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    requester_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # [cite: 71]
    addressee_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # [cite: 71]
    status: Mapped[str] = mapped_column(String(20), default="pending")  # 'pending' | 'accepted' | 'blocked' [cite: 71]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))  # [cite: 71]
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"), onupdate=text("NOW()"))  # [cite: 71]

    # Enforcement check required by Section 3.4
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_request"),  # [cite: 72]
    )

    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_id], back_populates="friendships_initiated")
    addressee: Mapped["User"] = relationship("User", foreign_keys=[addressee_id], back_populates="friendships_received")
