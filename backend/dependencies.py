import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.database import get_db
from app.models.user import User

oauth2_scheme=OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
        token:str=Depends(oauth2_scheme),
        db:AsyncSession=Depends(get_db)
)->User:
    credentials_exception=HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could Not validate Credentials",
        headers={"WWW-Authenticate":"Bearer"},
    )

    try:

        # 1. Decode the JWT token (Section 5.1, 6.1)
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        
        # 2. Extract standard token claims (Section 6.1)
        user_id_str: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id_str is None or token_type != "access":
            raise credentials_exception
            
        # Convert string sub claim back to structural UUID
        user_id = uuid.UUID(user_id_str)
            
    except (JWTError, ValueError):
        raise credentials_exception

    # 3. Query the database to find the user row asynchronously (Section 2.2)
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalars().first()

    # 4. Guard clause: Ensure user exists and is not soft-deleted (Section 3.1)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or account is deactivated"
        )
        
    return user    