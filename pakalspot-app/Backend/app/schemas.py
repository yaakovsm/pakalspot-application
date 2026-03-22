import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from enum import Enum
from app.models import SpotType as SpotTypeEnum
from app.core.authz import user_is_admin

# ----------------------
# Enums
# ----------------------
class SpotType(str, Enum):
    waterfall = SpotTypeEnum.waterfall.value
    spring = SpotTypeEnum.spring.value
    viewpoint = SpotTypeEnum.viewpoint.value
    forest = SpotTypeEnum.forest.value
    desert = SpotTypeEnum.desert.value
    river = SpotTypeEnum.river.value

# ----------------------
# User Schemas
# ----------------------
class UserBase(BaseModel):
    email: EmailStr
    display_name: str


class UserCreate(UserBase):
    password: str = Field(
        ...,
        min_length=6,
        max_length=128,
        description="Password must be between 6 and 128 characters"
    )


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: uuid.UUID
    username: str  # Alias for display_name to match frontend
    created_at: datetime
    is_admin: bool = False

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
            created_at=user.created_at,
            is_admin=user_is_admin(user),
        )


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
# Spot Schemas
# ----------------------
class SpotBase(BaseModel):
    title: str
    description: str
    spot_type: SpotType
    lat: float
    lon: float
    location_name: Optional[str] = None


class SpotCreate(SpotBase):
    pass


class SpotUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    spot_type: Optional[SpotType] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class SpotOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    subtitle: Optional[str] = None
    how_to_get_there: Optional[str] = None
    spot_type: SpotType
    lat: float
    lon: float
    location_name: Optional[str] = None
    created_at: datetime
    owner_id: uuid.UUID
    createdBy: Optional[UserOut] = None  # User information
    photos: Optional[List[PhotoOut]] = []
    is_favorited: Optional[bool] = False  # Whether current user has favorited this spot

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


# ----------------------
# Location Search Schemas
# ----------------------
class LocationSearchResult(BaseModel):
    name: str
    lat: float
    lng: float
    type: str
    importance: float
    address: str


class LocationSearchResponse(BaseModel):
    results: List[LocationSearchResult]


class GeocodeResult(BaseModel):
    name: str
    lat: float
    lng: float
    address: str
