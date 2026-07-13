from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.user import User
from app.schemas.auth import UserRegister, UserPublic, UserLogin,TokenResponse
from app.services.auth_utils import hash_password,verify_password,create_jwt_token
from datetime import timedelta
from app.config import settings
from pydantic import BaseModel, Field, field_validator
from jose import JWTError, jwt
import uuid
router = APIRouter(prefix="/auth", tags=["Authentication"]) #

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED) #
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)): #
    # 1. Check if username OR email already exists using modern async SELECT (Section 3.1)
    query = select(User).where((User.username == payload.username) | (User.email == payload.email))
    result = await db.execute(query) #
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this username or email already exists."
        )
    
    # 2. Hash the raw password using our pure math utility (Section 6.2)
    secure_hash = hash_password(payload.password)
    
    # Normalize security answer and hash it
    normalized_answer = payload.security_answer.strip().lower()
    answer_hash = hash_password(normalized_answer)
    
    # 3. Create the SQLAlchemy model instance
    new_user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=secure_hash, # Matched exact DB column name
        display_name=payload.display_name,
        security_question=payload.security_question,
        security_answer_hash=answer_hash
    )
    
    # 4. Stage and commit the transaction asynchronously (Section 2.2)
    db.add(new_user)
    await db.commit() # Saves data permanently to PG
    await db.refresh(new_user) # Fetches generated fields like id and created_at from PG
    
    return new_user # FastAPI automatically converts this model instance into a UserPublic JSON payload


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    # 1. Search for the user by username or email
    query = select(User).where((User.username == payload.username) | (User.email == payload.username))
    result = await db.execute(query)
    user = result.scalars().first()    

    # 2. Guard clause: Verify user existence FIRST, then check the password
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,  # 401 is structurally correct for bad credentials
            detail="Incorrect username, email, or password."
        )
    
    # 3. Define token lifetimes based on the app specification (Section 6.1)
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    # 4. Generate the token payloads containing the user's ID string
    access_token = create_jwt_token(
        data={"sub": str(user.id)}, 
        expires_delta=access_token_expires, 
        token_type="access"
    )
    refresh_token = create_jwt_token(
        data={"sub": str(user.id)}, 
        expires_delta=refresh_token_expires, 
        token_type="refresh"
    )
    
    # 5. Return the exact structure matching TokenResponse schema (Section 8.6)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user  # Pydantic formats this via from_attributes automatically
    }


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(payload: TokenRefreshRequest, db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        decoded_payload = jwt.decode(
            payload.refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id_str: str = decoded_payload.get("sub")
        token_type: str = decoded_payload.get("type")
        
        if user_id_str is None or token_type != "refresh":
            raise credentials_exception
            
        user_id = uuid.UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalars().first()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or account is deactivated"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    new_access_token = create_jwt_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires,
        token_type="access"
    )
    new_refresh_token = create_jwt_token(
        data={"sub": str(user.id)},
        expires_delta=refresh_token_expires,
        token_type="refresh"
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


class RecoveryQuestionRequest(BaseModel):
    username_or_email: str


class RecoveryQuestionResponse(BaseModel):
    security_question: str


class RecoveryUsernameRequest(BaseModel):
    email: str
    security_answer: str


class RecoveryUsernameResponse(BaseModel):
    username: str


class RecoveryResetPasswordRequest(BaseModel):
    username_or_email: str
    security_answer: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(char.isdigit() for char in v):
            raise ValueError("Password must contain at least one digit.")
        if not any(char.isupper() for char in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        return v


@router.post("/recovery/question", response_model=RecoveryQuestionResponse)
async def get_recovery_question(payload: RecoveryQuestionRequest, db: AsyncSession = Depends(get_db)):
    query = select(User).where((User.username == payload.username_or_email) | (User.email == payload.username_or_email))
    result = await db.execute(query)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this username or email."
        )
    
    if not user.security_question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account does not have a security question set up."
        )
        
    return {"security_question": user.security_question}


@router.post("/recovery/username", response_model=RecoveryUsernameResponse)
async def recover_username(payload: RecoveryUsernameRequest, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == payload.email)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account associated with this email address."
        )
        
    if not user.security_answer_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account does not have a security question configured."
        )
        
    normalized_answer = payload.security_answer.strip().lower()
    if not verify_password(normalized_answer, user.security_answer_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect security question answer."
        )
        
    return {"username": user.username}


@router.post("/recovery/reset-password")
async def reset_password_with_question(payload: RecoveryResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    query = select(User).where((User.username == payload.username_or_email) | (User.email == payload.username_or_email))
    result = await db.execute(query)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this username or email."
        )
        
    if not user.security_answer_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account does not have a security question configured."
        )
        
    normalized_answer = payload.security_answer.strip().lower()
    if not verify_password(normalized_answer, user.security_answer_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect security question answer."
        )
        
    # Reset password
    secure_hash = hash_password(payload.new_password)
    user.hashed_password = secure_hash
    await db.commit()
    
    return {"message": "Password has been successfully updated."}