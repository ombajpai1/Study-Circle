from datetime import date, timedelta
import pytest
from unittest.mock import AsyncMock
from app.services.streak import recalculate_streak
from app.models.user import User
from app.models.subject import Subject
from app.models.cheers import Cheers
from app.models.friendship import Friendship
from app.models.goals import Goal
from app.models.notification import Notification
from app.models.session import StudySession

@pytest.mark.asyncio
async def test_streak_increment_on_consecutive_days():
    # Arrange
    user = User(
        current_streak=5,
        longest_streak=10,
        last_study_date=date.today() - timedelta(days=1)
    )
    mock_db = AsyncMock()
    
    # Act
    await recalculate_streak(user, mock_db)
    
    # Assert (Section 7.2)
    assert user.current_streak == 6
    assert user.longest_streak == 10  # Haven't broken the personal best yet

@pytest.mark.asyncio
async def test_streak_breaks_longest_streak_record():
    # Arrange
    user = User(
        current_streak=5,
        longest_streak=5,
        last_study_date=date.today() - timedelta(days=1)
    )
    mock_db = AsyncMock()
    
    # Act
    await recalculate_streak(user, mock_db)
    
    # Assert (Section 7.2)
    assert user.current_streak == 6
    assert user.longest_streak == 6  # New record achieved!

@pytest.mark.asyncio
async def test_streak_resets_if_days_missed():
    # Arrange
    user = User(
        current_streak=5,
        longest_streak=5,
        last_study_date=date.today() - timedelta(days=4)  # Corrected typo here
    )
    mock_db = AsyncMock()
    
    # Act
    await recalculate_streak(user, mock_db)
    
    # Assert (Section 7.2)
    assert user.current_streak == 1  # Resets to day one of new tracking block   