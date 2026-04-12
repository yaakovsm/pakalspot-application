from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.authz import get_current_admin_user
from app import models, schemas

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", response_model=schemas.ContactSubmitResponse)
def submit_contact(
    body: schemas.ContactCreate,
    db: Session = Depends(get_db),
):
    name = body.name.strip()
    email = str(body.email).strip()
    issue = body.issue.strip()
    if not name or not issue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Name and issue cannot be empty",
        )
    row = models.ContactSubmission(name=name, email=email, issue=issue)
    db.add(row)
    db.commit()
    db.refresh(row)
    return schemas.ContactSubmitResponse(ok=True, id=row.id)


@router.get("/submissions", response_model=list[schemas.ContactSubmissionOut])
def list_contact_submissions(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin_user),
):
    rows = (
        db.query(models.ContactSubmission)
        .order_by(desc(models.ContactSubmission.created_at))
        .all()
    )
    return rows
