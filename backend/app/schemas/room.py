import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class RoomCreate(BaseModel):
    name: str = Field(..., max_length=100)
    password: Optional[str] = None
    subject_id: Optional[uuid.UUID] = None
    focus_minutes: Optional[int] = Field(25, ge=5, le=120)
    break_minutes: Optional[int] = Field(5, ge=1, le=60)
    max_participants: Optional[int] = Field(6, ge=2, le=6)

class RoomJoin(BaseModel):
    code: str = Field(..., min_length=4, max_length=8)
    password: Optional[str] = None

class RoomPublic(BaseModel):
    id: uuid.UUID
    code: str
    host_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    name: str
    max_participants: int
    focus_minutes: int
    break_minutes: int
    timer_state: str
    timer_started_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }

class RoomParticipantPublic(BaseModel):
    id: uuid.UUID
    room_id: uuid.UUID
    user_id: uuid.UUID
    joined_at: datetime
    left_at: Optional[datetime] = None

    model_config = {
        "from_attributes": True
    }
