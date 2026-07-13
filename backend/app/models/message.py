import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    sender_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))
    is_read: Mapped[bool] = mapped_column(default=False)

    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
    recipient: Mapped["User"] = relationship("User", foreign_keys=[recipient_id])
