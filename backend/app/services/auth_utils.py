from datetime import datetime, timedelta, timezone
from typing import Any, Dict
from jose import jwt
from passlib.context import CryptContext
from app.config import settings

# Initialize the password hashing context using bcrypt (Section 6.2)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hashes a raw password string into a secure bcrypt string."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a stored bcrypt hash string."""
    return pwd_context.verify(plain_password, hashed_password)

def create_jwt_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    """
    Generates a signed HS256 JWT token.
    Includes standard sub (user_id), exp (expiration), and type claims (Section 6.1).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    
    # Inject standard claims required by the spec
    to_encode.update({
        "exp": expire,
        "type": token_type
    })
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt