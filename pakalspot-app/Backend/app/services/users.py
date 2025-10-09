from sqlalchemy.orm import Session
from .. import models
from ..core.security import hash_password
from ..schemas import UserCreate
import uuid


def create_user(db: Session, payload: UserCreate) -> models.User:
	user = models.User(
		id=str(uuid.uuid4()),
		email=payload.email,
		display_name=payload.display_name,
		password_hash=hash_password(payload.password),
	)
	db.add(user)
	db.commit()
	db.refresh(user)
	return user


def get_user_by_email(db: Session, email: str) -> models.User | None:
	return db.query(models.User).filter(models.User.email == email).first()


