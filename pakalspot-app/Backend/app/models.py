import enum
import uuid
from datetime import datetime
from sqlalchemy import (
    String,
    Text,
    Enum,
    ForeignKey,
    DateTime,
    func,
    Boolean,
    JSON,
    Integer,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from geoalchemy2 import Geometry
from sqlalchemy import TypeDecorator


# ----------------------
# Base class
# ----------------------
class Base(DeclarativeBase):
    pass


# ----------------------
# Enums
# ----------------------
class EnumValueType(TypeDecorator):
    """Store enum as its value (string) instead of name."""
    impl = String
    cache_ok = True
    
    def __init__(self, enum_class, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enum_class = enum_class
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, self.enum_class):
            return value.value
        return value
    
    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            # Try to find enum by value first
            for enum_item in self.enum_class:
                if enum_item.value == value:
                    return enum_item
            # Fallback to name lookup
            try:
                return self.enum_class[value]
            except KeyError:
                return None
        return value
        
class SpotType(enum.Enum):
    waterfall = "waterfall"
    spring = "spring"
    viewpoint = "viewpoint"
    forest = "forest"
    desert = "desert"
    river = "river"
    lake = "lake"
    beach = "beach"
    park = "park"


def parse_spot_type(spot_type_str: str) -> SpotType:
    """
    Parse spot type string into SpotType enum (case-insensitive).
    For multiple types (viewpoint|forest), uses the first valid one.
    """
    if not spot_type_str:
        return SpotType.viewpoint
    
    spot_type_str = spot_type_str.strip()
    
    # Handle multiple types separated by |
    if '|' in spot_type_str:
        types = [t.strip() for t in spot_type_str.split('|')]
        for t in types:
            try:
                return SpotType[t]
            except KeyError:
                try:
                    for st in SpotType:
                        if st.name.lower() == t.lower():
                            return st
                except:
                    continue
        return SpotType.viewpoint
    
    # Single type - try exact match
    try:
        return SpotType[spot_type_str]
    except KeyError:
        pass
    
    # Try case-insensitive match
    spot_type_lower = spot_type_str.lower()
    for st in SpotType:
        if st.name.lower() == spot_type_lower or st.value.lower() == spot_type_lower:
            return st
    
    # Default fallback
    print(f"Warning: Unknown spot type '{spot_type_str}', defaulting to viewpoint")
    return SpotType.viewpoint


class SpotApprovalStatus(enum.Enum):
    approved = "approved"
    pending = "pending"


# ----------------------
# Models
# ----------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    spots = relationship("Spot", back_populates="owner", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship(
        "Favorite", back_populates="user", cascade="all, delete-orphan"
    )


class Spot(Base):
    __tablename__ = "spots"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    subtitle: Mapped[str] = mapped_column(Text, nullable=True)  # Optional subtitle
    how_to_get_there: Mapped[str] = mapped_column(Text, nullable=True)  # Optional directions
    spot_type: Mapped[SpotType] = mapped_column("type", EnumValueType(SpotType, length=50), nullable=False)  # Maps to 'type' column in DB
    location_name: Mapped[str] = mapped_column(Text, nullable=True)  # Optional location name
    title_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    subtitle_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    how_to_get_there_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    location_name_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    geom: Mapped[str] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    approval_status: Mapped[SpotApprovalStatus] = mapped_column(
        EnumValueType(SpotApprovalStatus, length=20),
        nullable=False,
        default=SpotApprovalStatus.approved,
    )
    pending_revision: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    has_pending_revision: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    popularity: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    owner = relationship("User", back_populates="spots")
    photos = relationship("Photo", back_populates="spot", cascade="all, delete-orphan")
    likers = relationship("Like", back_populates="spot", cascade="all, delete-orphan")
    favorited_by = relationship(
        "Favorite", back_populates="spot", cascade="all, delete-orphan"
    )


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    spot_id: Mapped[str] = mapped_column(
        String, ForeignKey("spots.id", ondelete="CASCADE")
    )
    object_key: Mapped[str] = mapped_column(Text, nullable=False)  # S3 key
    url: Mapped[str] = mapped_column(Text, nullable=False)  # Full URL
    thumbnail_url: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    spot = relationship("Spot", back_populates="photos")


class Like(Base):
    __tablename__ = "likes"

    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    spot_id: Mapped[str] = mapped_column(
        String, ForeignKey("spots.id", ondelete="CASCADE"), primary_key=True
    )
    # DB column is `is_like` (see alembic 20250911_000001); API still accepts +/-1 as "value"
    is_like: Mapped[bool] = mapped_column(Boolean, nullable=False)

    user = relationship("User", back_populates="likes")
    spot = relationship("Spot", back_populates="likers")


class Favorite(Base):
    __tablename__ = "favorites"

    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    spot_id: Mapped[str] = mapped_column(
        String, ForeignKey("spots.id", ondelete="CASCADE"), primary_key=True
    )

    user = relationship("User", back_populates="favorites")
    spot = relationship("Spot", back_populates="favorited_by")


class ContactSubmission(Base):
    __tablename__ = "contact_submissions"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    issue: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
