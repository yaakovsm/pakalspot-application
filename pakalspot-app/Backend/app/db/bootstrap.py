"""One-time / idempotent DB fixes at application startup."""

import logging

from app import models
from app.core.database import SessionLocal
from app.core.settings import settings

logger = logging.getLogger(__name__)


def migrate_legacy_admin_email() -> None:
    """
    Lean/cloud seed used to create admin@pakalspot.com while is_admin checks used
    yaakovsm@gmail.com. Rename the legacy row so admin login matches ADMIN_EMAIL.
    """
    email = (settings.ADMIN_EMAIL or "").strip()
    if not email:
        return

    db = SessionLocal()
    try:
        legacy = (
            db.query(models.User)
            .filter(models.User.email == "admin@pakalspot.com")
            .first()
        )
        if not legacy:
            return

        taken = db.query(models.User).filter(models.User.email == email).first()
        if taken and taken.id != legacy.id:
            logger.warning(
                "Legacy admin migration skipped: %s already exists as a different user",
                email,
            )
            return

        legacy.email = email
        db.commit()
        logger.info("Migrated legacy admin user email to %s", email)
    except Exception as e:
        logger.warning("Legacy admin migration failed: %s", e)
        db.rollback()
    finally:
        db.close()
