from typing import List, Optional, Set
import os
import uuid
import logging
import math

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Query, Form, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app import models, schemas
from app.core.database import get_db
from app.core.security import get_current_user, decode_access_token
from app.core.settings import settings
from app.models import parse_spot_type, SpotApprovalStatus
from app.services.geocoding import geocoding_service
from app.services.photo_url import build_photo_url, normalized_init_object_key
from app.core.authz import user_is_admin, get_current_admin_user

router = APIRouter(prefix="/spots", tags=["spots"])
logger = logging.getLogger(__name__)


def _parse_type_filter_param(type_param: Optional[str]) -> List[models.SpotType]:
    """Comma-separated spot types for GET /spots/; invalid tokens skipped."""
    if not type_param or not str(type_param).strip():
        return []
    out: List[models.SpotType] = []
    seen: Set[models.SpotType] = set()
    for part in str(type_param).split(","):
        p = part.strip()
        if not p:
            continue
        pl = p.lower()
        match: Optional[models.SpotType] = None
        for st in models.SpotType:
            if st.value.lower() == pl or st.name.lower() == pl:
                match = st
                break
        if match is not None and match not in seen:
            seen.add(match)
            out.append(match)
    return out


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometers."""
    rlat1, rlon1, rlat2, rlon2 = map(math.radians, (lat1, lon1, lat2, lon2))
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(min(1.0, math.sqrt(a)))
    return 6371.0 * c


def get_s3_client():
    kwargs = {
        "region_name": settings.S3_REGION,
    }

    if settings.S3_ENDPOINT:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT

    if settings.S3_ACCESS_KEY and settings.S3_SECRET_KEY:
        kwargs["aws_access_key_id"] = settings.S3_ACCESS_KEY
        kwargs["aws_secret_access_key"] = settings.S3_SECRET_KEY

    return boto3.client("s3", **kwargs)


def build_s3_url(bucket: str, object_key: str) -> str:
    return f"https://{bucket}.s3.amazonaws.com/{object_key}"


def _filename_from_object_key(object_key: Optional[str]) -> Optional[str]:
    if not object_key:
        return None
    return object_key.split("/")[-1]


def _photo_api_url(filename: str) -> str:
    # Always serve via backend proxy to support private buckets
    base = settings.BASE_URL.rstrip("/")
    api_prefix = settings.API_PREFIX.rstrip("/")
    return f"{base}{api_prefix}/media/{filename}"


def _photo_out_from_db(photo: models.Photo) -> dict:
    # build_photo_url: init photos -> CloudFront (if set) or public S3; user uploads -> stored url
    url = build_photo_url(photo)
    thumb = photo.thumbnail_url or url
    # Keep seeded-init thumbnails aligned with computed URL to avoid stale persisted hosts.
    if normalized_init_object_key(photo):
        thumb = url
    elif photo.thumbnail_url and "pakalspot.local" in photo.thumbnail_url:
        thumb = url

    return {
        "id": photo.id,
        "spot_id": photo.spot_id,
        "url": url,
        "thumbnail_url": thumb,
        "created_at": photo.created_at,
    }


def _user_out_from_db(user: Optional[models.User]) -> Optional[dict]:
    if not user:
        return None
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "username": user.display_name,
        "avatar": getattr(user, "avatar_url", None),
        "created_at": user.created_at,
        "is_admin": user_is_admin(user),
    }


def _spot_coords(db: Session, spot: models.Spot, fallback_lat: float, fallback_lon: float):
    try:
        from shapely.wkt import loads

        geom_wkt = db.execute(func.ST_AsText(spot.geom)).scalar()
        pt = loads(geom_wkt)
        lon, lat = pt.x, pt.y
        return lat, lon
    except Exception:
        return fallback_lat, fallback_lon


def _check_if_favorited(db: Session, spot_id: str, user_id: Optional[str]) -> bool:
    """Check if a spot is favorited by a user. Returns False if user_id is None."""
    if not user_id:
        return False
    favorite = db.query(models.Favorite).filter(
        models.Favorite.user_id == user_id,
        models.Favorite.spot_id == spot_id
    ).first()
    return favorite is not None


def _approval_status_str(spot: models.Spot) -> str:
    s = getattr(spot, "approval_status", None)
    if s is None:
        return SpotApprovalStatus.approved.value
    if isinstance(s, SpotApprovalStatus):
        return s.value
    return str(s)


def _spot_visible_to_user(spot: models.Spot, user: Optional[models.User]) -> bool:
    if _approval_status_str(spot) == SpotApprovalStatus.approved.value:
        return True
    if not user:
        return False
    if user_is_admin(user):
        return True
    return spot.user_id == user.id


def _spot_payload(
    spot: models.Spot,
    db: Session,
    *,
    lat: float,
    lon: float,
    photos_data: list,
    user_data: Optional[dict],
    is_favorited: bool,
    expose_pending: bool = False,
) -> dict:
    approval = _approval_status_str(spot)
    has_pr = bool(getattr(spot, "has_pending_revision", False))
    rev = getattr(spot, "pending_revision", None)
    return {
        "id": spot.id,
        "title": spot.title,
        "description": spot.description,
        "subtitle": spot.subtitle,
        "how_to_get_there": spot.how_to_get_there,
        "spot_type": spot.spot_type.value
        if hasattr(spot.spot_type, "value")
        else spot.spot_type,
        "lat": lat,
        "lon": lon,
        "location_name": spot.location_name,
        "title_en": getattr(spot, "title_en", None),
        "description_en": getattr(spot, "description_en", None),
        "subtitle_en": getattr(spot, "subtitle_en", None),
        "how_to_get_there_en": getattr(spot, "how_to_get_there_en", None),
        "location_name_en": getattr(spot, "location_name_en", None),
        "createdAt": spot.created_at,
        "created_at": spot.created_at,
        "owner_id": spot.user_id,
        "approval_status": approval,
        "approvalStatus": approval,
        "has_pending_revision": has_pr if expose_pending else False,
        "hasPendingRevision": has_pr if expose_pending else False,
        "pending_revision": rev if expose_pending else None,
        "pendingRevision": rev if expose_pending else None,
        "createdBy": user_data,
        "photos": photos_data,
        "is_favorited": is_favorited,
        "isFavorited": is_favorited,
    }


def _cleanup_s3_keys(s3_client, keys: list, bucket_name: str) -> None:
    for key in keys or []:
        if not key:
            continue
        try:
            s3_client.delete_object(Bucket=bucket_name, Key=key)
        except ClientError:
            pass


def _discard_pending_revision_assets(s3_client, spot: models.Spot) -> None:
    rev = spot.pending_revision
    if not rev or not isinstance(rev, dict):
        return
    keys = rev.get("photo_object_keys")
    if keys:
        _cleanup_s3_keys(s3_client, keys, settings.S3_BUCKET)


def _delete_all_spot_photos_db_and_s3(db: Session, spot: models.Spot, s3_client) -> None:
    bucket_default = settings.S3_BUCKET
    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    for photo in photos:
        if photo.object_key:
            try:
                if photo.object_key.startswith("photos/") or photo.object_key.startswith(
                    "pakalspot-init-photos/"
                ):
                    bucket_name = settings.INIT_SEED_BUCKET
                    key = photo.object_key.replace("pakalspot-init-photos/", "")
                else:
                    bucket_name = bucket_default
                    key = photo.object_key
                s3_client.delete_object(Bucket=bucket_name, Key=key)
            except ClientError:
                pass
        db.delete(photo)


def _merge_pending_revision_into_spot(db: Session, spot: models.Spot, s3_client) -> None:
    rev = spot.pending_revision
    if not rev or not isinstance(rev, dict):
        spot.has_pending_revision = False
        spot.pending_revision = None
        return
    spot.title = rev["title"]
    spot.description = rev["description"]
    spot.subtitle = rev.get("subtitle")
    spot.how_to_get_there = rev.get("how_to_get_there")
    spot.location_name = rev.get("location_name")
    spot.spot_type = parse_spot_type(rev.get("spot_type") or "viewpoint")
    spot.geom = from_shape(Point(rev["longitude"], rev["latitude"]), srid=4326)
    if "photo_object_keys" in rev:
        _delete_all_spot_photos_db_and_s3(db, spot, s3_client)
        bucket_default = settings.S3_BUCKET
        for key in rev.get("photo_object_keys") or []:
            db_url = build_s3_url(bucket_default, key)
            db.add(
                models.Photo(
                    spot_id=spot.id,
                    object_key=key,
                    url=db_url,
                    thumbnail_url=db_url,
                )
            )
    spot.has_pending_revision = False
    spot.pending_revision = None
    spot.approval_status = SpotApprovalStatus.approved


def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """Get current user if authenticated, otherwise return None."""
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(models.User).filter(models.User.id == user_id).first()
        return user
    except Exception:
        return None


@router.post("/", response_model=schemas.SpotOut)
async def create_spot(
    title: str = Form(...),
    description: str = Form(...),
    type: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    subtitle: Optional[str] = Form(None),
    how_to_get_there: Optional[str] = Form(None),
    location_name: Optional[str] = Form(None),
    photos: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        spot_type = parse_spot_type(type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid spot type: {type}")

    point = from_shape(Point(longitude, latitude), srid=4326)
    # All new spots go through the same moderation queue (including admins).
    approval = SpotApprovalStatus.pending
    spot = models.Spot(
        title=title,
        description=description,
        subtitle=subtitle,
        how_to_get_there=how_to_get_there,
        spot_type=spot_type,
        location_name=location_name,
        geom=point,
        user_id=current_user.id,
        approval_status=approval,
    )
    db.add(spot)
    db.flush()  # Flush to get spot.id without committing
    db.refresh(spot)

    # Upload photos before committing the spot
    # If photo upload fails, the transaction will roll back
    uploaded_photos = []
    if photos:
        s3_client = get_s3_client()
        bucket_name = settings.S3_BUCKET

        for photo in photos:
            if not photo or not photo.filename:
                continue

            try:
                ext = os.path.splitext(photo.filename)[1] or ".jpg"
                unique_filename = f"{uuid.uuid4()}{ext}"
                object_key = f"{spot.id}/{unique_filename}"

                content = await photo.read()

                content_type = photo.content_type or "image/jpeg"
                if not content_type.startswith("image/"):
                    content_type = "image/jpeg"

                # Upload to S3
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=object_key,
                    Body=content,
                    ContentType=content_type,
                )

                # Store photo record in DB
                db_url = build_s3_url(bucket_name, object_key)
                photo_record = models.Photo(
                    spot_id=spot.id,
                    object_key=object_key,
                    url=db_url,
                    thumbnail_url=db_url,
                )
                db.add(photo_record)
                uploaded_photos.append(photo_record)

            except ClientError as e:
                db.rollback()
                logger.error(f"S3 upload error: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error uploading photo to S3: {str(e)}")
            except Exception as e:
                db.rollback()
                logger.error(f"Unexpected error uploading photo: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Unexpected error uploading photo: {str(e)}")

    # Commit everything together (spot + photos)
    try:
        db.commit()
        db.refresh(spot)
    except Exception as e:
        db.rollback()
        logger.error(f"Database commit error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving spot: {str(e)}")

    lat, lon = _spot_coords(db, spot, latitude, longitude)
    
    # Check if user has favorited this spot (unlikely for newly created, but include for consistency)
    is_favorited = _check_if_favorited(db, spot.id, current_user.id)

    # Build photos array for response
    photos_data = [_photo_out_from_db(p) for p in uploaded_photos]

    return _spot_payload(
        spot,
        db,
        lat=lat,
        lon=lon,
        photos_data=photos_data,
        user_data=_user_out_from_db(current_user),
        is_favorited=is_favorited,
    )


@router.put("/{spot_id}", response_model=schemas.SpotOut)
async def update_spot(
    spot_id: str,
    title: str = Form(...),
    description: str = Form(...),
    type: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    subtitle: Optional[str] = Form(None),
    how_to_get_there: Optional[str] = Form(None),
    location_name: Optional[str] = Form(None),
    photos: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")

    if spot.user_id != current_user.id and not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to edit this spot")

    try:
        spot_type = parse_spot_type(type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid spot type: {type}")

    is_admin = user_is_admin(current_user)
    published = _approval_status_str(spot) == SpotApprovalStatus.approved.value

    expose_pending = is_admin or (current_user.id == spot.user_id)

    # Published spot, non-admin: store edits as pending revision; public snapshot unchanged.
    if published and not is_admin:
        s3_client = get_s3_client()
        _discard_pending_revision_assets(s3_client, spot)

        st_val = spot_type.value if hasattr(spot_type, "value") else str(spot_type)
        rev = {
            "title": title,
            "description": description,
            "subtitle": subtitle,
            "how_to_get_there": how_to_get_there,
            "spot_type": st_val,
            "location_name": location_name,
            "latitude": latitude,
            "longitude": longitude,
        }
        photo_keys: list = []
        if photos:
            bucket_default = settings.S3_BUCKET
            for photo in photos:
                if not photo or not photo.filename:
                    continue
                try:
                    ext = os.path.splitext(photo.filename)[1] or ".jpg"
                    unique_filename = f"{uuid.uuid4()}{ext}"
                    object_key = f"{spot.id}/pending_rev/{unique_filename}"
                    content = await photo.read()
                    content_type = photo.content_type or "image/jpeg"
                    if not content_type.startswith("image/"):
                        content_type = "image/jpeg"
                    s3_client.put_object(
                        Bucket=bucket_default,
                        Key=object_key,
                        Body=content,
                        ContentType=content_type,
                    )
                    photo_keys.append(object_key)
                except ClientError as e:
                    raise HTTPException(
                        status_code=500, detail=f"Error uploading photo to S3: {str(e)}"
                    ) from e
                except Exception as e:
                    raise HTTPException(
                        status_code=500, detail=f"Unexpected error uploading photo: {str(e)}"
                    ) from e
            rev["photo_object_keys"] = photo_keys

        spot.pending_revision = rev
        spot.has_pending_revision = True
        db.commit()
        db.refresh(spot)

        lat, lon = _spot_coords(db, spot, latitude, longitude)
        photos_db = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        photos_data = [_photo_out_from_db(p) for p in photos_db]
        is_favorited = _check_if_favorited(db, spot.id, current_user.id)
        user = db.query(models.User).filter(models.User.id == spot.user_id).first()
        return _spot_payload(
            spot,
            db,
            lat=lat,
            lon=lon,
            photos_data=photos_data,
            user_data=_user_out_from_db(user),
            is_favorited=is_favorited,
            expose_pending=expose_pending,
        )

    # Admin or unpublished spot: apply directly to row (and optional photo replace)
    if is_admin:
        s3_client = get_s3_client()
        _discard_pending_revision_assets(s3_client, spot)
        spot.has_pending_revision = False
        spot.pending_revision = None

    spot.title = title
    spot.description = description
    spot.subtitle = subtitle
    spot.how_to_get_there = how_to_get_there
    spot.spot_type = spot_type
    spot.location_name = location_name
    spot.geom = from_shape(Point(longitude, latitude), srid=4326)

    db.commit()
    db.refresh(spot)

    if photos:
        s3_client = get_s3_client()
        bucket_default = settings.S3_BUCKET

        existing_photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        for existing_photo in existing_photos:
            if existing_photo.object_key:
                try:
                    if existing_photo.object_key.startswith("photos/") or existing_photo.object_key.startswith(
                        "pakalspot-init-photos/"
                    ):
                        bucket_name = settings.INIT_SEED_BUCKET
                        key = existing_photo.object_key.replace("pakalspot-init-photos/", "")
                    else:
                        bucket_name = bucket_default
                        key = existing_photo.object_key
                    s3_client.delete_object(Bucket=bucket_name, Key=key)
                except ClientError:
                    pass
            db.delete(existing_photo)

        for photo in photos:
            if not photo or not photo.filename:
                continue

            try:
                ext = os.path.splitext(photo.filename)[1] or ".jpg"
                unique_filename = f"{uuid.uuid4()}{ext}"
                object_key = f"{spot.id}/{unique_filename}"

                content = await photo.read()

                content_type = photo.content_type or "image/jpeg"
                if not content_type.startswith("image/"):
                    content_type = "image/jpeg"

                s3_client.put_object(
                    Bucket=bucket_default,
                    Key=object_key,
                    Body=content,
                    ContentType=content_type,
                )

                db_url = build_s3_url(bucket_default, object_key)

                photo_record = models.Photo(
                    spot_id=spot.id,
                    object_key=object_key,
                    url=db_url,
                    thumbnail_url=db_url,
                )
                db.add(photo_record)

            except ClientError as e:
                raise HTTPException(status_code=500, detail=f"Error uploading photo to S3: {str(e)}")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Unexpected error uploading photo: {str(e)}")

        db.commit()

    lat, lon = _spot_coords(db, spot, latitude, longitude)

    photos_db = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    photos_data = [_photo_out_from_db(p) for p in photos_db]

    is_favorited = _check_if_favorited(db, spot.id, current_user.id)

    user = db.query(models.User).filter(models.User.id == spot.user_id).first()
    return _spot_payload(
        spot,
        db,
        lat=lat,
        lon=lon,
        photos_data=photos_data,
        user_data=_user_out_from_db(user),
        is_favorited=is_favorited,
        expose_pending=expose_pending,
    )


@router.delete("/{spot_id}")
def delete_spot(
    spot_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")

    if spot.user_id != current_user.id and not user_is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to delete this spot")

    try:
        # Remove dependent rows explicitly (avoids FK / session ordering issues on some DBs)
        db.query(models.Like).filter(models.Like.spot_id == spot.id).delete(
            synchronize_session=False
        )
        db.query(models.Favorite).filter(models.Favorite.spot_id == spot.id).delete(
            synchronize_session=False
        )

        s3_client = get_s3_client()
        bucket_default = settings.S3_BUCKET

        photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        for photo in photos:
            if photo.object_key:
                try:
                    if photo.object_key.startswith("photos/") or photo.object_key.startswith(
                        "pakalspot-init-photos/"
                    ):
                        bucket_name = settings.INIT_SEED_BUCKET
                        key = photo.object_key.replace("pakalspot-init-photos/", "")
                    else:
                        bucket_name = bucket_default
                        key = photo.object_key
                    s3_client.delete_object(Bucket=bucket_name, Key=key)
                except ClientError:
                    pass
                except Exception as e:
                    logger.warning("S3 delete_object skipped for %s: %s", photo.object_key, e)
            db.delete(photo)

        db.delete(spot)
        db.commit()
    except IntegrityError as e:
        db.rollback()
        logger.exception("delete_spot integrity error: %s", e)
        raise HTTPException(
            status_code=409,
            detail="Could not delete spot due to related data. Try again or contact support.",
        ) from e
    except Exception as e:
        db.rollback()
        logger.exception("delete_spot failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Failed to delete spot",
        ) from e

    return {"message": "Spot deleted successfully"}


@router.get("/", response_model=List[schemas.SpotOut])
def list_spots(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    radius: Optional[float] = Query(
        None, description="Search radius in kilometers; omit or use >= 100 for no radius limit"
    ),
    type_filter: Optional[str] = Query(
        None,
        alias="type",
        description="Comma-separated spot types (e.g. spring,viewpoint)",
    ),
    sortBy: Optional[str] = Query(None, description="distance, popularity, newest, oldest"),
):
    q = (
        db.query(models.Spot)
        .join(models.User)
        .filter(models.Spot.approval_status == SpotApprovalStatus.approved)
    )

    type_list = _parse_type_filter_param(type_filter)
    if type_list:
        q = q.filter(models.Spot.spot_type.in_(type_list))

    dialect_name = db.get_bind().dialect.name
    apply_radius = (
        lat is not None
        and lng is not None
        and radius is not None
        and float(radius) > 0
        and float(radius) < 100
    )
    if apply_radius and dialect_name == "postgresql":
        radius_m = int(float(radius) * 1000)
        q = q.filter(
            text(
                "ST_DWithin(spots.geom::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radius_m)"
            ).bindparams(lng=lng, lat=lat, radius_m=radius_m)
        )

    spots: List[models.Spot] = q.all()

    if apply_radius and dialect_name != "postgresql":
        filtered: List[models.Spot] = []
        r_km = float(radius)
        for spot in spots:
            slat, slon = _spot_coords(db, spot, 0.0, 0.0)
            if _haversine_km(lat, lng, slat, slon) <= r_km:
                filtered.append(spot)
        spots = filtered

    sort_key = (sortBy or "distance").lower()
    if sort_key == "newest":
        spots = sorted(spots, key=lambda s: s.created_at, reverse=True)
    elif sort_key == "oldest":
        spots = sorted(spots, key=lambda s: s.created_at)
    elif sort_key == "popularity":
        spots = sorted(spots, key=lambda s: getattr(s, "popularity", 0) or 0, reverse=True)
    elif sort_key == "distance" and lat is not None and lng is not None:
        def dist_key(sp: models.Spot) -> float:
            slat, slon = _spot_coords(db, sp, 0.0, 0.0)
            return _haversine_km(lat, lng, slat, slon)

        spots = sorted(spots, key=dist_key)
    else:
        spots = sorted(spots, key=lambda s: s.created_at, reverse=True)

    result = []
    user_id = current_user.id if current_user else None

    for spot in spots:
        slat, slon = _spot_coords(db, spot, 0.0, 0.0)

        photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        photos_data = [_photo_out_from_db(p) for p in photos]

        user = db.query(models.User).filter(models.User.id == spot.user_id).first()
        user_data = _user_out_from_db(user)

        is_favorited = _check_if_favorited(db, spot.id, user_id)

        row = _spot_payload(
            spot,
            db,
            lat=slat,
            lon=slon,
            photos_data=photos_data,
            user_data=user_data,
            is_favorited=is_favorited,
        )
        if lat is not None and lng is not None:
            row["distance"] = _haversine_km(lat, lng, slat, slon)
        result.append(row)

    return result


@router.get("/favorites", response_model=List[schemas.SpotOut])
def get_favorites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Query all favorites for the current user
    favorites = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id
    ).all()
    
    result = []
    
    for favorite in favorites:
        # Get the spot for this favorite
        spot = db.query(models.Spot).filter(models.Spot.id == favorite.spot_id).first()
        if not spot:
            continue  # Skip if spot doesn't exist
        if _approval_status_str(spot) != SpotApprovalStatus.approved.value:
            continue

        lat, lon = _spot_coords(db, spot, 0.0, 0.0)
        
        photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        photos_data = [_photo_out_from_db(p) for p in photos]
        
        user = db.query(models.User).filter(models.User.id == spot.user_id).first()
        user_data = _user_out_from_db(user)
        
        result.append(
            _spot_payload(
                spot,
                db,
                lat=lat,
                lon=lon,
                photos_data=photos_data,
                user_data=user_data,
                is_favorited=True,
            )
        )
    
    logger.info(f"User {current_user.id} fetched {len(result)} favorites")
    return result


@router.get("/pending", response_model=List[schemas.SpotOut])
def list_pending_spots(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin_user),
):
    spots = (
        db.query(models.Spot)
        .join(models.User)
        .filter(
            or_(
                models.Spot.approval_status == SpotApprovalStatus.pending,
                models.Spot.has_pending_revision.is_(True),
            )
        )
        .order_by(models.Spot.created_at.asc())
        .all()
    )
    result = []
    for spot in spots:
        lat, lon = _spot_coords(db, spot, 0.0, 0.0)
        photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        photos_data = [_photo_out_from_db(p) for p in photos]
        user = db.query(models.User).filter(models.User.id == spot.user_id).first()
        user_data = _user_out_from_db(user)
        result.append(
            _spot_payload(
                spot,
                db,
                lat=lat,
                lon=lon,
                photos_data=photos_data,
                user_data=user_data,
                is_favorited=False,
                expose_pending=True,
            )
        )
    return result


def _normalize_optional_en_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    return stripped if stripped else None


@router.patch("/{spot_id}/translations", response_model=schemas.SpotOut)
def update_spot_translations(
    spot_id: str,
    body: schemas.SpotTranslationUpdate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin_user),
):
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    if _approval_status_str(spot) != SpotApprovalStatus.pending.value:
        raise HTTPException(
            status_code=400,
            detail="English translations can only be edited while the spot is pending approval.",
        )
    patch = body.model_dump(exclude_unset=True)
    for key in (
        "title_en",
        "description_en",
        "subtitle_en",
        "how_to_get_there_en",
        "location_name_en",
    ):
        if key in patch:
            setattr(spot, key, _normalize_optional_en_text(patch[key]))
    db.commit()
    db.refresh(spot)

    lat, lon = _spot_coords(db, spot, 0.0, 0.0)
    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    photos_data = [_photo_out_from_db(p) for p in photos]
    user = db.query(models.User).filter(models.User.id == spot.user_id).first()
    user_data = _user_out_from_db(user)
    return _spot_payload(
        spot,
        db,
        lat=lat,
        lon=lon,
        photos_data=photos_data,
        user_data=user_data,
        is_favorited=False,
        expose_pending=True,
    )


@router.post("/{spot_id}/approve", response_model=schemas.SpotOut)
def approve_spot(
    spot_id: str,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_current_admin_user),
):
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    s3_client = get_s3_client()
    if spot.has_pending_revision and spot.pending_revision:
        _merge_pending_revision_into_spot(db, spot, s3_client)
    else:
        spot.approval_status = SpotApprovalStatus.approved
    db.commit()
    db.refresh(spot)

    lat, lon = _spot_coords(db, spot, 0.0, 0.0)
    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    photos_data = [_photo_out_from_db(p) for p in photos]
    user = db.query(models.User).filter(models.User.id == spot.user_id).first()
    user_data = _user_out_from_db(user)
    return _spot_payload(
        spot,
        db,
        lat=lat,
        lon=lon,
        photos_data=photos_data,
        user_data=user_data,
        is_favorited=False,
        expose_pending=True,
    )


@router.get("/mine", response_model=List[schemas.SpotOut])
def list_my_spots(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    spots = (
        db.query(models.Spot)
        .filter(models.Spot.user_id == current_user.id)
        .order_by(models.Spot.created_at.desc())
        .all()
    )
    result = []
    for spot in spots:
        lat, lon = _spot_coords(db, spot, 0.0, 0.0)
        photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        photos_data = [_photo_out_from_db(p) for p in photos]
        user = db.query(models.User).filter(models.User.id == spot.user_id).first()
        user_data = _user_out_from_db(user)
        is_favorited = _check_if_favorited(db, spot.id, current_user.id)
        result.append(
            _spot_payload(
                spot,
                db,
                lat=lat,
                lon=lon,
                photos_data=photos_data,
                user_data=user_data,
                is_favorited=is_favorited,
                expose_pending=True,
            )
        )
    return result


@router.get("/{spot_id}", response_model=schemas.SpotOut)
def get_spot(
    spot_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")

    if not _spot_visible_to_user(spot, current_user):
        raise HTTPException(status_code=404, detail="Spot not found")

    lat, lon = _spot_coords(db, spot, 0.0, 0.0)

    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    photos_data = [_photo_out_from_db(p) for p in photos]

    user = db.query(models.User).filter(models.User.id == spot.user_id).first()
    user_data = _user_out_from_db(user)

    user_id = current_user.id if current_user else None
    is_favorited = _check_if_favorited(db, spot.id, user_id)

    expose_pending = bool(
        current_user
        and (spot.user_id == current_user.id or user_is_admin(current_user))
    )

    return _spot_payload(
        spot,
        db,
        lat=lat,
        lon=lon,
        photos_data=photos_data,
        user_data=user_data,
        is_favorited=is_favorited,
        expose_pending=expose_pending,
    )


@router.post("/{spot_id}/like")
def like_spot(
    spot_id: str,
    like_in: schemas.LikeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    if _approval_status_str(spot) != SpotApprovalStatus.approved.value:
        raise HTTPException(status_code=403, detail="Spot is not approved yet")

    is_like = like_in.value > 0
    like = models.Like(
        user_id=current_user.id, spot_id=spot.id, is_like=is_like
    )
    db.merge(like)
    db.commit()
    return {"message": "Like updated"}


@router.post("/{spot_id}/favorite")
def favorite_spot(
    spot_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    if _approval_status_str(spot) != SpotApprovalStatus.approved.value:
        raise HTTPException(status_code=403, detail="Spot is not approved yet")

    fav = models.Favorite(user_id=current_user.id, spot_id=spot_id)
    db.merge(fav)
    db.commit()
    logger.info(f"User {current_user.id} favorited spot {spot_id}")
    return {"message": "Spot added to favorites"}


@router.delete("/{spot_id}/favorite")
def unfavorite_spot(
    spot_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    favorite = db.query(models.Favorite).filter(
        models.Favorite.user_id == current_user.id,
        models.Favorite.spot_id == spot_id
    ).first()
    
    if favorite:
        db.delete(favorite)
        db.commit()
        logger.info(f"User {current_user.id} unfavorited spot {spot_id}")
        return {"message": "Spot removed from favorites"}
    else:
        # Already not favorited, return success anyway
        logger.debug(f"User {current_user.id} attempted to unfavorite spot {spot_id} that was not favorited")
        return {"message": "Spot was not in favorites"}


@router.get("/search/locations", response_model=schemas.LocationSearchResponse)
def search_locations(
    q: str = Query(..., description="Location search query"),
    limit: int = Query(10, ge=1, le=20, description="Maximum number of results"),
):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    results = geocoding_service.search_locations(q.strip(), limit)
    return schemas.LocationSearchResponse(results=results)


@router.get("/geocode", response_model=schemas.GeocodeResult)
def geocode_location(
    location: str = Query(..., description="Location name to geocode"),
):
    if not location.strip():
        raise HTTPException(status_code=400, detail="Location cannot be empty")

    result = geocoding_service.geocode_location(location.strip())
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")

    return schemas.GeocodeResult(**result)


@router.get("/reverse-geocode", response_model=schemas.GeocodeResult)
def reverse_geocode(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
):
    result = geocoding_service.reverse_geocode(lat, lng)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found for these coordinates")

    return schemas.GeocodeResult(**result)
