import uuid
from datetime import datetime
from typing import Any, Dict
from sqlalchemy import String, DateTime, ForeignKey, text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.user import User

class Notification(Base):
    __tablename__ = "notifications"  # [cite: 78]

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # [cite: 78]
    type: Mapped[str] = mapped_column(String(30), nullable=False)  # [cite: 78]
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)  # Native JSON object parsing [cite: 78]
    is_read: Mapped[bool] = mapped_column(default=False)  # [cite: 78]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))  # [cite: 78]

    user: Mapped["User"] = relationship(back_populates="notifications")