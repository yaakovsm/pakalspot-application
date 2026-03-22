from typing import List, Optional
import os
import uuid
import logging

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Query, Form, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.database import get_db
from app.core.security import get_current_user, decode_access_token
from app.core.settings import settings
from app.models import parse_spot_type
from app.services.geocoding import geocoding_service
from app.services.photo_url import build_photo_url
from app.core.authz import user_is_admin

router = APIRouter(prefix="/spots", tags=["spots"])
logger = logging.getLogger(__name__)


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
    if photo.thumbnail_url and "pakalspot.local" in photo.thumbnail_url:
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
    spot = models.Spot(
        title=title,
        description=description,
        subtitle=subtitle,
        how_to_get_there=how_to_get_there,
        spot_type=spot_type,
        location_name=location_name,
        geom=point,
        user_id=current_user.id,
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

    return {
        "id": spot.id,
        "title": spot.title,
        "description": spot.description,
        "subtitle": spot.subtitle,
        "how_to_get_there": spot.how_to_get_there,
        "spot_type": spot.spot_type,
        "lat": lat,
        "lon": lon,
        "location_name": spot.location_name,
        "created_at": spot.created_at,
        "owner_id": spot.user_id,
        "photos": photos_data,
        "is_favorited": is_favorited,
        "isFavorited": is_favorited,  # Also include camelCase for frontend compatibility
    }


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
                    # Delete from whichever bucket is relevant (best effort)
                    if existing_photo.object_key.startswith("photos/") or existing_photo.object_key.startswith("pakalspot-init-photos/"):
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
    
    # Check if user has favorited this spot
    is_favorited = _check_if_favorited(db, spot.id, current_user.id)

    return {
        "id": spot.id,
        "title": spot.title,
        "description": spot.description,
        "subtitle": spot.subtitle,
        "how_to_get_there": spot.how_to_get_there,
        "spot_type": spot.spot_type,
        "lat": lat,
        "lon": lon,
        "location_name": spot.location_name,
        "created_at": spot.created_at,
        "owner_id": spot.user_id,
        "photos": photos_data,
        "is_favorited": is_favorited,
        "isFavorited": is_favorited,  # Also include camelCase for frontend compatibility
    }


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

    s3_client = get_s3_client()
    bucket_default = settings.S3_BUCKET

    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    for photo in photos:
        if photo.object_key:
            try:
                if photo.object_key.startswith("photos/") or photo.object_key.startswith("pakalspot-init-photos/"):
                    bucket_name = settings.INIT_SEED_BUCKET
                    key = photo.object_key.replace("pakalspot-init-photos/", "")
                else:
                    bucket_name = bucket_default
                    key = photo.object_key
                s3_client.delete_object(Bucket=bucket_name, Key=key)
            except ClientError:
                pass
        db.delete(photo)

    db.delete(spot)
    db.commit()
    return {"message": "Spot deleted successfully"}


@router.get("/", response_model=List[schemas.SpotOut])
def list_spots(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional)
):
    spots = db.query(models.Spot).join(models.User).all()
    result = []
    user_id = current_user.id if current_user else None

    for spot in spots:
        lat, lon = _spot_coords(db, spot, 0.0, 0.0)

        photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        photos_data = [_photo_out_from_db(p) for p in photos]

        user = db.query(models.User).filter(models.User.id == spot.user_id).first()
        user_data = _user_out_from_db(user)

        is_favorited = _check_if_favorited(db, spot.id, user_id)

        result.append(
            {
                "id": spot.id,
                "title": spot.title,
                "description": spot.description,
                "subtitle": spot.subtitle,
                "how_to_get_there": spot.how_to_get_there,
                "spot_type": spot.spot_type,
                "lat": lat,
                "lon": lon,
                "location_name": spot.location_name,
                "createdAt": spot.created_at,
                "created_at": spot.created_at,
                "owner_id": spot.user_id,
                "createdBy": user_data,
                "photos": photos_data,
                "is_favorited": is_favorited,
                "isFavorited": is_favorited,  # Also include camelCase for frontend compatibility
            }
        )

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
        
        lat, lon = _spot_coords(db, spot, 0.0, 0.0)
        
        photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        photos_data = [_photo_out_from_db(p) for p in photos]
        
        user = db.query(models.User).filter(models.User.id == spot.user_id).first()
        user_data = _user_out_from_db(user)
        
        result.append(
            {
                "id": spot.id,
                "title": spot.title,
                "description": spot.description,
                "subtitle": spot.subtitle,
                "how_to_get_there": spot.how_to_get_there,
                "spot_type": spot.spot_type,
                "lat": lat,
                "lon": lon,
                "location_name": spot.location_name,
                "createdAt": spot.created_at,
                "created_at": spot.created_at,
                "owner_id": spot.user_id,
                "createdBy": user_data,
                "photos": photos_data,
                "is_favorited": True,  # All spots in favorites are favorited
                "isFavorited": True,  # All spots in favorites are favorited (camelCase for frontend)
            }
        )
    
    logger.info(f"User {current_user.id} fetched {len(result)} favorites")
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

    lat, lon = _spot_coords(db, spot, 0.0, 0.0)

    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    photos_data = [_photo_out_from_db(p) for p in photos]

    user = db.query(models.User).filter(models.User.id == spot.user_id).first()
    user_data = _user_out_from_db(user)

    user_id = current_user.id if current_user else None
    is_favorited = _check_if_favorited(db, spot.id, user_id)

    return {
        "id": spot.id,
        "title": spot.title,
        "description": spot.description,
        "subtitle": spot.subtitle,
        "how_to_get_there": spot.how_to_get_there,
        "spot_type": spot.spot_type,
        "lat": lat,
        "lon": lon,
        "location_name": spot.location_name,
        "createdAt": spot.created_at,
        "created_at": spot.created_at,
        "owner_id": spot.user_id,
        "createdBy": user_data,
        "photos": photos_data,
        "is_favorited": is_favorited,
        "isFavorited": is_favorited,  # Also include camelCase for frontend compatibility
    }


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

    like = models.Like(user_id=current_user.id, spot_id=spot.id, value=like_in.value)
    db.merge(like)
    db.commit()
    return {"message": "Like updated"}


@router.post("/{spot_id}/favorite")
def favorite_spot(
    spot_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
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
