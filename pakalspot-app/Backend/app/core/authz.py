"""Authorization helpers (admin checks, etc.)."""

from typing import Optional

from fastapi import Depends, HTTPException, status

from app import models
from app.core.settings import settings
from app.core.security import get_current_user


def user_is_admin(user: Optional[models.User]) -> bool:
    if not user or not getattr(user, "email", None):
        return False
    admin = (settings.ADMIN_EMAIL or "").strip().lower()
    return (user.email or "").strip().lower() == admin


def get_current_admin_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if not user_is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user
