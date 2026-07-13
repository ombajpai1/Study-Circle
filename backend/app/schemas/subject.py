import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class SubjectCreate(BaseModel):
    name: str = Field(..., max_length=100) # 
    emoji: Optional[str] = Field("📖", max_length=10) 
    color_hex: str = Field(..., min_length=7, max_length=7) 

class SubjectPublic(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    emoji: Optional[str]
    color_hex: str
    created_at: datetime

    model_config = {
        "from_attributes": True  # Essential for FastAPI to read SQLAlchemy attributes automatically
    }