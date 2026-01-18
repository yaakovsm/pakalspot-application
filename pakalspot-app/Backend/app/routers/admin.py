"""
Admin router for administrative operations.

Provides secure endpoints for seeding and maintenance tasks.
"""

from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from typing import Annotated

from app.core.database import get_db
from app.core.settings import settings
from app.services.seed_service import seed_init_spots

router = APIRouter(prefix="/admin", tags=["admin"])


def verify_seed_key(x_seed_key: str | None = None) -> None:
    """
    Verify X-Seed-Key header matches ADMIN_SEED_API_KEY.
    
    Args:
        x_seed_key: Value from X-Seed-Key header
        
    Raises:
        HTTPException: 401 if key is missing or invalid
    """
    if not settings.ADMIN_SEED_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ADMIN_SEED_API_KEY not configured"
        )
    
    if not x_seed_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Seed-Key header required"
        )
    
    if x_seed_key != settings.ADMIN_SEED_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-Seed-Key"
        )


@router.post("/migrations/upgrade")
def run_migrations_endpoint(
    x_seed_key: Annotated[str | None, Header(alias="X-Seed-Key")] = None,
):
    """
    Run database migrations (alembic upgrade head).
    
    Requires:
    - X-Seed-Key header matching ADMIN_SEED_API_KEY
    
    Returns:
        JSON with migration status and output
    """
    # Verify API key
    verify_seed_key(x_seed_key)
    
    # Run migrations
    try:
        import subprocess
        import sys
        
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            cwd="/app"
        )
        
        if result.returncode == 0:
            return {
                "status": "success",
                "output": result.stdout,
                "stderr": result.stderr
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Migration failed: {result.stderr}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Migration operation failed: {str(e)}"
        )


@router.post("/seed/init-spots")
def seed_init_spots_endpoint(
    x_seed_key: Annotated[str | None, Header(alias="X-Seed-Key")] = None,
    db: Session = Depends(get_db)
):
    """
    Seed database with initial spots and photos from S3.
    
    Requires:
    - X-Seed-Key header matching ADMIN_SEED_API_KEY
    - SEED_ENABLED must be True
    
    Returns:
        JSON report with:
        - created_spots: int
        - updated_spots: int
        - skipped_spots: int
        - created_photos: int
        - skipped_photos: int
        - errors: List[str]
    """
    # Check if seeding is enabled
    if not settings.SEED_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seeding is disabled (SEED_ENABLED=false)"
        )
    
    # Verify API key
    verify_seed_key(x_seed_key)
    
    # Run seed service
    try:
        report = seed_init_spots(db)
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Seed operation failed: {str(e)}"
        )

