from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.subject import Subject
from app.models.user import User
from app.schemas.subject import SubjectCreate, SubjectPublic
from dependencies import get_current_user  # Protecting our route 
from typing import List
import uuid

router = APIRouter(prefix="/subjects", tags=["Subjects"]) # [cite: 89]

@router.post("/", response_model=SubjectPublic, status_code=status.HTTP_201_CREATED) # 
async def create_subject(
    payload: SubjectCreate,  # Expect a creation payload from frontend 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Locks route down to authenticated users [cite: 46, 80]
): 
    # 1. Check if the user already has a subject with this exact name (prevent duplicates for same user)
    query = select(Subject).where((Subject.user_id == current_user.id) & (Subject.name == payload.name))
    result = await db.execute(query)
    existing_subject = result.scalars().first()
    
    if existing_subject:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already created a subject with this name."
        )
    
    # 2. Map payload parameters into our database model instance 
    new_subject = Subject(
        user_id=current_user.id,  # Set securely by backend, not passed blindly by client 
        name=payload.name,
        emoji=payload.emoji,
        color_hex=payload.color_hex
    )

    # 3. Save to database asynchronously [cite: 26, 60]
    db.add(new_subject)
    await db.commit()
    await db.refresh(new_subject) 
    
    return new_subject

@router.get("/", response_model=List[SubjectPublic])
async def get_subjects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Subject).where(Subject.user_id == current_user.id)
    res = await db.execute(query)
    subjects = res.scalars().all()
    return subjects

@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Subject).where(Subject.id == subject_id, Subject.user_id == current_user.id)
    res = await db.execute(query)
    subject = res.scalar()
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subject not found or unauthorized to delete."
        )
    await db.delete(subject)
    await db.commit()
    return None