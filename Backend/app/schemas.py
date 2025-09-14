import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from enum import Enum


# ----------------------
# Enums
# ----------------------
class SpotType(str, Enum):
    waterfall = "waterfall"
    spring = "spring"
    viewpoint = "viewpoint"
    forest = "forest"
    desert = "desert"


class Region(str, Enum):
    negev = "Negev"
    galilee = "Galilee"
    golan = "Golan"
    shfela = "Shfela"
    sharon = "Sharon"
    shomron = "Shomron"
    jerusalem = "Jerusalem"
    arava = "Arava"


# ----------------------
# User Schemas
# ----------------------
class UserBase(BaseModel):
    email: EmailStr
    display_name: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: uuid.UUID
    username: str  # Alias for display_name to match frontend
    created_at: datetime

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, user):
        """Custom from_orm to map display_name to username"""
        return cls(
            id=user.id,
            email=user.email,
            display_name=user.display_name,
            username=user.display_name,  # Map display_name to username
            created_at=user.created_at
        )


# ----------------------
# Spot Schemas
# ----------------------
class SpotBase(BaseModel):
    title: str
    description: str
    spot_type: SpotType
    region: Region
    lat: float
    lon: float


class SpotCreate(SpotBase):
    pass


class SpotUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    spot_type: Optional[SpotType] = None
    region: Optional[Region] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class SpotOut(SpotBase):
    id: uuid.UUID
    created_at: datetime
    owner_id: uuid.UUID

    class Config:
        from_attributes = True


# ----------------------
# Photo Schemas
# ----------------------
class PhotoBase(BaseModel):
    url: str
    thumbnail_url: Optional[str] = None


class PhotoCreate(PhotoBase):
    spot_id: uuid.UUID
    object_key: str


class PhotoOut(PhotoBase):
    id: uuid.UUID
    spot_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------------
# Like Schemas
# ----------------------
class LikeBase(BaseModel):
    value: int  # +1 = like, -1 = dislike


class LikeCreate(LikeBase):
    spot_id: uuid.UUID


class LikeOut(LikeBase):
    user_id: uuid.UUID
    spot_id: uuid.UUID

    class Config:
        from_attributes = True


# ----------------------
# Favorite Schemas
# ----------------------
class FavoriteBase(BaseModel):
    spot_id: uuid.UUID


class FavoriteOut(FavoriteBase):
    user_id: uuid.UUID
    spot_id: uuid.UUID

    class Config:
        from_attributes = True
