from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
import secrets
from app.core.database import get_db
from app import models, schemas
from app.core.security import create_access_token, verify_password, get_password_hash
from app.core.security import get_current_user
from app.core.settings import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        display_name=user_in.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token(subject=str(user.id))
    user_out = schemas.UserOut.from_orm(user)
    return {"user": user_out, "token": token}


@router.post("/login")
def login(user_in: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_access_token(subject=str(user.id))
    user_out = schemas.UserOut.from_orm(user)
    return {"user": user_out, "token": token}


@router.post("/google")
def login_with_google(body: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured",
        )

    try:
        id_info = google_id_token.verify_oauth2_token(
            body.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    issuer = id_info.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token issuer",
        )

    email = id_info.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account email is missing",
        )

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        display_name = (id_info.get("name") or email.split("@")[0]).strip() or "Google User"
        random_password = secrets.token_urlsafe(48)
        user = models.User(
            email=email,
            password_hash=get_password_hash(random_password),
            display_name=display_name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(subject=str(user.id))
    user_out = schemas.UserOut.from_orm(user)
    return {"user": user_out, "token": token}


@router.get("/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return schemas.UserOut.from_orm(current_user)


@router.patch("/me", response_model=schemas.UserOut)
def update_me(
    body: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if body.display_name is None and body.avatar is None:
        return schemas.UserOut.from_orm(current_user)
    if body.display_name is not None:
        current_user.display_name = body.display_name.strip()
    if body.avatar is not None:
        av = body.avatar.strip()
        current_user.avatar_url = av or None
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return schemas.UserOut.from_orm(current_user)


@router.post("/change-password")
def change_password(
    body: schemas.PasswordChangeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    current_user.password_hash = get_password_hash(body.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password updated"}
