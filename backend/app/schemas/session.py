import uuid
from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field
from app.schemas.subject import SubjectPublic

class SessionCreate(BaseModel):
    subject_id: Optional[uuid.UUID] = None  
    duration_seconds: int = Field(..., ge=60)  
    planned_seconds: int = Field(..., ge=60)
    phase: Literal["focus", "break"]  
    started_at: datetime
    note: Optional[str] = None

class SessionPublic(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    subject: Optional[SubjectPublic] = None
    duration_seconds: int
    planned_seconds: int
    phase: Literal["focus", "break"]
    started_at: datetime
    ended_at: datetime
    note: Optional[str] = None

    model_config = {
        "from_attributes": True
    }


class SessionStart(BaseModel):
    subject_name: str
    subject_emoji: str
    focus_duration_seconds: int    