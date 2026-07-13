import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.config import settings

class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)  # Minimum 8 characters (Section 6.2)
    display_name: Optional[str] = Field(None, max_length=100)
    security_question: str = Field(..., min_length=5, max_length=255)
    security_answer: str = Field(..., min_length=2, max_length=255)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        # Check for at least one digit (Section 6.2)
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit.")
        # Check for at least one uppercase letter (Section 6.2)
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        return v

class UserLogin(BaseModel):
    username: str  # Can be username or email depending on router implementation
    password: str

class UserPublic(BaseModel):
    id: uuid.UUID
    username: str
    display_name: Optional[str] = None
    avatar_color: Optional[str] = None  # Matched exact spelling to DB model
    current_streak: int
    longest_streak: int
    daily_goal_minutes: int
    created_at: datetime

    # Configures Pydantic to cleanly serialize lazy-loaded SQLAlchemy ORM attributes
    model_config = {
        "from_attributes": True
    }

# Response wrapper matching Section 8.1 / 4.1 specifications
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic