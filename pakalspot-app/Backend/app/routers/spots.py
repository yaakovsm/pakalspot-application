from typing import List, Optional
import os
import uuid

import boto3
from botocore.exceptions import ClientError
from fastapi import APIRouter, Depends, HTTPException, Query, Form, UploadFile, File
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.settings import settings
from app.models import parse_spot_type
from app.services.geocoding import geocoding_service
from app.services.photo_url import build_photo_url_from_object_key

router = APIRouter(prefix="/spots", tags=["spots"])


def is_admin_user(user: models.User) -> bool:
    return user.email == "yaakovsm@gmail.com"


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
    )


def build_s3_url(bucket: str, object_key: str) -> str:
    return f"https://{bucket}.s3.amazonaws.com/{object_key}"


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
    # map frontend type -> SpotType enum
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
    db.commit()
    db.refresh(spot)

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

                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=object_key,
                    Body=content,
                    ContentType=content_type,
                    ACL="public-read",
                )

                # Use photo URL helper for consistent URL building
                url = build_photo_url_from_object_key(object_key, build_s3_url(bucket_name, object_key))

                photo_record = models.Photo(
                    spot_id=spot.id,
                    object_key=object_key,
                    url=url,
                    thumbnail_url=url,
                )
                db.add(photo_record)
            except ClientError as e:
                print(f"Error uploading photo to S3: {str(e)}")
                raise HTTPException(status_code=500, detail="Error uploading photo")
            except Exception as e:
                print(f"Unexpected error uploading photo: {str(e)}")
                raise HTTPException(status_code=500, detail="Error uploading photo")

        db.commit()

    # coordinates for response
    try:
        from shapely.wkt import loads

        geom_wkt = db.execute(func.ST_AsText(spot.geom)).scalar()
        pt = loads(geom_wkt)
        lon, lat = pt.x, pt.y
    except Exception:
        lon, lat = longitude, latitude

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

    if spot.user_id != current_user.id and not is_admin_user(current_user):
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

    point = from_shape(Point(longitude, latitude), srid=4326)
    spot.geom = point

    db.commit()
    db.refresh(spot)

    if photos:
        s3_client = get_s3_client()
        bucket_default = settings.S3_BUCKET

        # delete old photos from S3 and DB
        existing_photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        for existing_photo in existing_photos:
            if existing_photo.object_key:
                try:
                    if existing_photo.object_key.startswith("pakalspot-init-photos/"):
                        bucket_name = "pakalspot-init-photos"
                    else:
                        bucket_name = bucket_default
                    s3_client.delete_object(Bucket=bucket_name, Key=existing_photo.object_key)
                except ClientError:
                    pass
            db.delete(existing_photo)

        # upload new photos
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
                    ACL="public-read",
                )

                # Use photo URL helper for consistent URL building
                url = build_photo_url_from_object_key(object_key, build_s3_url(bucket_default, object_key))

                photo_record = models.Photo(
                    spot_id=spot.id,
                    object_key=object_key,
                    url=url,
                    thumbnail_url=url,
                )
                db.add(photo_record)
            except ClientError as e:
                print(f"Error uploading photo to S3: {str(e)}")
                raise HTTPException(status_code=500, detail="Error uploading photo")
            except Exception as e:
                print(f"Unexpected error uploading photo: {str(e)}")
                raise HTTPException(status_code=500, detail="Error uploading photo")

        db.commit()

    # coordinates for response
    try:
        from shapely.wkt import loads

        geom_wkt = db.execute(func.ST_AsText(spot.geom)).scalar()
        pt = loads(geom_wkt)
        lon, lat = pt.x, pt.y
    except Exception:
        lon, lat = longitude, latitude

    photos_db = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    photos_data = [
        {
            "id": p.id,
            "spot_id": p.spot_id,
            "url": p.url,
            "thumbnail_url": p.thumbnail_url,
            "created_at": p.created_at,
        }
        for p in photos_db
    ]

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

    if spot.user_id != current_user.id and not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to delete this spot")

    s3_client = get_s3_client()
    bucket_default = settings.S3_BUCKET

    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    for photo in photos:
        if photo.object_key:
            try:
                if photo.object_key.startswith("pakalspot-init-photos/"):
                    bucket_name = "pakalspot-init-photos"
                else:
                    bucket_name = bucket_default
                s3_client.delete_object(Bucket=bucket_name, Key=photo.object_key)
            except ClientError:
                pass
        db.delete(photo)

    db.delete(spot)
    db.commit()

    return {"message": "Spot deleted successfully"}


@router.get("/", response_model=List[schemas.SpotOut])
def list_spots(db: Session = Depends(get_db)):
    spots = db.query(models.Spot).join(models.User).all()
    result = []

    for spot in spots:
        try:
            from shapely.wkt import loads

            geom_wkt = db.execute(func.ST_AsText(spot.geom)).scalar()
            pt = loads(geom_wkt)
            lon, lat = pt.x, pt.y
        except Exception:
            continue

        photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        photos_data = [
            {
                "id": p.id,
                "spot_id": p.spot_id,
                "url": p.url,
                "thumbnail_url": p.thumbnail_url,
                "created_at": p.created_at,
            }
            for p in photos
        ]

        user = db.query(models.User).filter(models.User.id == spot.user_id).first()
        user_data = None
        if user:
            user_data = {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name,
                "username": user.display_name,
                "created_at": user.created_at,
            }

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
            }
        )

    return result


@router.get("/{spot_id}", response_model=schemas.SpotOut)
def get_spot(spot_id: str, db: Session = Depends(get_db)):
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")

    try:
        from shapely.wkt import loads

        geom_wkt = db.execute(func.ST_AsText(spot.geom)).scalar()
        pt = loads(geom_wkt)
        lon, lat = pt.x, pt.y
    except Exception:
        raise HTTPException(status_code=500, detail="Error extracting coordinates")

    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    photos_data = [
        {
            "id": p.id,
            "spot_id": p.spot_id,
            "url": p.url,
            "thumbnail_url": p.thumbnail_url,
            "created_at": p.created_at,
        }
        for p in photos
    ]

    user = db.query(models.User).filter(models.User.id == spot.user_id).first()
    user_data = None
    if user:
        user_data = {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "username": user.display_name,
            "created_at": user.created_at,
        }

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
    return {"message": "Spot added to favorites"}


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
