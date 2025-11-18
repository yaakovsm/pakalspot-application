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
    SmallInteger,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from geoalchemy2 import Geometry


# ----------------------
# Base class
# ----------------------
class Base(DeclarativeBase):
    pass


# ----------------------
# Enums
# ----------------------
class SpotType(enum.Enum):
    waterfall = "waterfall"
    spring = "spring"
    viewpoint = "viewpoint"
    forest = "forest"
    desert = "desert"


class Region(enum.Enum):
    negev = "Negev"
    galilee_elion = "Galilee Elion"
    galilee_tahton = "Galilee Tahton"
    golan = "Golan"
    shfela = "Shfela"
    sharon = "Sharon"
    shomron = "Shomron"
    jerusalem = "Jerusalem"
    arava = "Arava"


# ----------------------
# Models
# ----------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
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

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    spot_type: Mapped[SpotType] = mapped_column(Enum(SpotType), nullable=False)
    region: Mapped[Region] = mapped_column(
    Enum(Region, values_callable=lambda x: [e.value for e in x]),
    nullable=False
)
    location_name: Mapped[str] = mapped_column(Text, nullable=True)  # Optional location name
    geom: Mapped[str] = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    owner = relationship("User", back_populates="spots")
    photos = relationship("Photo", back_populates="spot", cascade="all, delete-orphan")
    likers = relationship("Like", back_populates="spot", cascade="all, delete-orphan")
    favorited_by = relationship(
        "Favorite", back_populates="spot", cascade="all, delete-orphan"
    )


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    spot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spots.id", ondelete="CASCADE")
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

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    spot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spots.id", ondelete="CASCADE"), primary_key=True
    )
    value: Mapped[int] = mapped_column(
        SmallInteger, nullable=False
    )  # +1 = like, -1 = dislike

    user = relationship("User", back_populates="likes")
    spot = relationship("Spot", back_populates="likers")


class Favorite(Base):
    __tablename__ = "favorites"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    spot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("spots.id", ondelete="CASCADE"), primary_key=True
    )

    user = relationship("User", back_populates="favorites")
    spot = relationship("Spot", back_populates="favorited_by")
