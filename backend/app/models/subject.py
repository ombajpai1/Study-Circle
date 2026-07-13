# from sqlalchemy import Column,Integer,String,Numeric,Boolean,Float,DateTime,Date,ForeignKey,JSON,TIMESTAMP

# from sqlalchemy.orm import relationship
# from sqlalchemy.orm import declarative_base

# Base=declarative_base()

# class Subjects(Base):
#     __tablename__="Subject"

#     id=Column(Integer,primary_key=True,)
#     Userid=Column(Integer,ForeignKey(".user.id",ondelete="CASCADE"),unique=True)
#     Name=Column(String)
#     emoji=Column(String)
#     color_hex=Column(String)
#     created_at=Column(TIMESTAMP)



import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.user import User

class Subject(Base):
    __tablename__ = "subjects"  # Matching spec 3.2 [cite: 66]

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),  # References users.id string table name 
        nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    emoji: Mapped[str | None] = mapped_column(String(10))
    color_hex: Mapped[str | None] = mapped_column(String(7))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("NOW()"))

    # Relationship back to User
    user: Mapped["User"] = relationship(back_populates="subjects")