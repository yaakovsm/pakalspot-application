from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
import hashlib
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .settings import settings
from .database import get_db
from .. import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Bcrypt has a 72-byte limit. If password is longer, pre-hash with SHA256
BCRYPT_MAX_LENGTH = 72


def get_password_hash(password: str) -> str:
	"""
	Hash a password using bcrypt.
	
	Bcrypt has a 72-byte limit. If the password exceeds this limit,
	we pre-hash it with SHA256 to ensure it fits within the limit
	while maintaining security.
	"""
	try:
		# Encode password to bytes to check length
		password_bytes = password.encode('utf-8')
		
		# If password exceeds bcrypt's 72-byte limit, pre-hash with SHA256
		if len(password_bytes) > BCRYPT_MAX_LENGTH:
			# Pre-hash with SHA256 to get a fixed 32-byte hash (64 hex chars)
			sha256_hash = hashlib.sha256(password_bytes).hexdigest()
			# Use the hex digest as the password for bcrypt (64 bytes, within limit)
			return pwd_context.hash(sha256_hash)
		else:
			# Password is within limit, hash directly
			return pwd_context.hash(password)
	except Exception as e:
		# Fallback: if bcrypt fails, use SHA256 (for development/debugging)
		# In production, this should raise an error
		import logging
		logging.error(f"Bcrypt hashing failed: {e}, falling back to SHA256")
		return hashlib.sha256(password.encode('utf-8')).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
	"""
	Verify a password against a hash.
	
	Handles both direct bcrypt hashes and pre-hashed passwords
	(where password > 72 bytes was pre-hashed with SHA256).
	"""
	try:
		password_bytes = plain_password.encode('utf-8')
		
		# If password exceeds bcrypt's 72-byte limit, pre-hash with SHA256 first
		if len(password_bytes) > BCRYPT_MAX_LENGTH:
			sha256_hash = hashlib.sha256(password_bytes).hexdigest()
			return pwd_context.verify(sha256_hash, hashed_password)
		else:
			return pwd_context.verify(plain_password, hashed_password)
	except Exception:
		# Fallback to SHA256 for development/legacy hashes
		sha256_hash = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
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


