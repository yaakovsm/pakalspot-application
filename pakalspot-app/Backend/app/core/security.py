from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .settings import settings
from .database import get_db
from .. import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def get_password_hash(password: str) -> str:
	return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
	# Try bcrypt first
	try:
		return pwd_context.verify(plain_password, hashed_password)
	except Exception:
		# Fallback to SHA256 for development
		import hashlib
		sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
		return sha256_hash == hashed_password


def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
	expires_delta = timedelta(minutes=expires_minutes or settings.JWT_EXPIRY)
	exp = datetime.now(timezone.utc) + expires_delta
	to_encode = {"sub": subject, "exp": exp}
	return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def decode_access_token(token: str) -> dict:
	return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user 


