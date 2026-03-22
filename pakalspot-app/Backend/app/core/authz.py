"""Authorization helpers (admin checks, etc.)."""

from typing import Optional

from app import models
from app.core.settings import settings


def user_is_admin(user: Optional[models.User]) -> bool:
    if not user or not getattr(user, "email", None):
        return False
    admin = (settings.ADMIN_EMAIL or "").strip().lower()
    return (user.email or "").strip().lower() == admin
