from fastapi import APIRouter, Depends, HTTPException, Query, Form, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user
from app import models, schemas
from app.services.geocoding import geocoding_service
from typing import List, Optional
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
import os
import uuid
import boto3
from botocore.exceptions import ClientError
from app.models import SpotType, parse_spot_type
from app.core.settings import settings

router = APIRouter(prefix="/spots", tags=["spots"])


def is_admin_user(user: models.User) -> bool:
    """Check if user is an admin user."""
    return user.email == "yaakovsm@gmail.com"


def get_s3_client():
    """Get S3 client for uploading photos."""
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
    )


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
    # Convert frontend field names to backend enum values
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
    
    # Handle photo uploads if provided
    if photos:
        s3_client = get_s3_client()
        
        for photo in photos:
            if photo and photo.filename:
                try:
                    # Generate unique filename and S3 object key
                    file_extension = os.path.splitext(photo.filename)[1] or ".jpg"
                    unique_filename = f"{uuid.uuid4()}{file_extension}"
                    object_key = f"{spot.id}/{unique_filename}"
                    
                    # Read photo content
                    content = await photo.read()
                    
                    # Determine content type
                    content_type = photo.content_type or "image/jpeg"
                    if not content_type.startswith("image/"):
                        content_type = "image/jpeg"
                    
                    # Upload to S3
                    s3_client.put_object(
                        Bucket=settings.S3_BUCKET,
                        Key=object_key,
                        Body=content,
                        ContentType=content_type,
                    )
                    
                    # Create photo record in database
                    # URL uses media proxy route which will fetch from S3
                    filename_for_url = unique_filename
                    photo_url = f"{settings.BASE_URL}/media/{filename_for_url}"
                    photo_record = models.Photo(
                        spot_id=spot.id,
                        object_key=object_key,
                        url=photo_url,
                        thumbnail_url=photo_url  # Using same URL for thumbnail for now
                    )
                    db.add(photo_record)
                except ClientError as e:
                    # Log error but continue with other photos
                    print(f"Error uploading photo to S3: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Error uploading photo: {str(e)}")
                except Exception as e:
                    print(f"Unexpected error uploading photo: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Error uploading photo: {str(e)}")
        
        db.commit()
    
    # Extract coordinates from geometry for response
    try:
        # Convert geometry to shapely Point to extract coordinates
        from shapely.wkt import loads
        geom_wkt = db.execute(func.ST_AsText(spot.geom)).scalar()
        point = loads(geom_wkt)
        lon, lat = point.x, point.y
    except Exception:
        # Use the original coordinates as fallback
        lon, lat = longitude, latitude
    
    # Return the spot data in the expected format
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
        "owner_id": spot.user_id
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
    """Update a spot. Only the owner or admin can edit."""
    # Get the spot
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    
    # Check authorization: owner or admin
    if spot.user_id != current_user.id and not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to edit this spot")
    
    # Convert frontend field names to backend enum values
    try:
        spot_type = parse_spot_type(type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid spot type: {type}")
    
    # Update spot fields
    spot.title = title
    spot.description = description
    spot.subtitle = subtitle
    spot.how_to_get_there = how_to_get_there
    spot.spot_type = spot_type
    spot.location_name = location_name
    
    # Update geometry
    point = from_shape(Point(longitude, latitude), srid=4326)
    spot.geom = point
    
    db.commit()
    db.refresh(spot)
    
    # Handle photo uploads if provided
    if photos:
        s3_client = get_s3_client()
        
        # Delete existing photos for this spot (from database and S3)
        existing_photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        for existing_photo in existing_photos:
            # Delete from S3 if it's an S3 object (not local file)
            if existing_photo.object_key and not existing_photo.object_key.startswith("media/"):
                try:
                    # Determine bucket based on object_key
                    if existing_photo.object_key.startswith("pakalspot-init-photos/"):
                        bucket_name = "pakalspot-init-photos"
                    else:
                        bucket_name = settings.S3_BUCKET
                    s3_client.delete_object(Bucket=bucket_name, Key=existing_photo.object_key)
                except ClientError:
                    pass  # Ignore S3 deletion errors (object may not exist)
            # Delete from database
            db.delete(existing_photo)
        
        for photo in photos:
            if photo and photo.filename:
                try:
                    # Generate unique filename and S3 object key
                    file_extension = os.path.splitext(photo.filename)[1] or ".jpg"
                    unique_filename = f"{uuid.uuid4()}{file_extension}"
                    object_key = f"{spot.id}/{unique_filename}"
                    
                    # Read photo content
                    content = await photo.read()
                    
                    # Determine content type
                    content_type = photo.content_type or "image/jpeg"
                    if not content_type.startswith("image/"):
                        content_type = "image/jpeg"
                    
                    # Upload to S3
                    s3_client.put_object(
                        Bucket=settings.S3_BUCKET,
                        Key=object_key,
                        Body=content,
                        ContentType=content_type,
                    )
                    
                    # Create photo record in database
                    # URL uses media proxy route which will fetch from S3
                    filename_for_url = unique_filename
                    photo_url = f"{settings.BASE_URL}/media/{filename_for_url}"
                    photo_record = models.Photo(
                        spot_id=spot.id,
                        object_key=object_key,
                        url=photo_url,
                        thumbnail_url=photo_url  # Using same URL for thumbnail for now
                    )
                    db.add(photo_record)
                except ClientError as e:
                    # Log error but continue with other photos
                    print(f"Error uploading photo to S3: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Error uploading photo: {str(e)}")
                except Exception as e:
                    print(f"Unexpected error uploading photo: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Error uploading photo: {str(e)}")
        
        db.commit()
    
    # Extract coordinates from geometry for response
    try:
        # Convert geometry to shapely Point to extract coordinates
        from shapely.wkt import loads
        geom_wkt = db.execute(func.ST_AsText(spot.geom)).scalar()
        point = loads(geom_wkt)
        lon, lat = point.x, point.y
    except Exception:
        # Use the original coordinates as fallback
        lon, lat = longitude, latitude
    
    # Return the spot data in the expected format
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
        "owner_id": spot.user_id
    }


@router.delete("/{spot_id}")
def delete_spot(
    spot_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a spot. Only the owner or admin can delete."""
    # Get the spot
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    
    # Check authorization: owner or admin
    if spot.user_id != current_user.id and not is_admin_user(current_user):
        raise HTTPException(status_code=403, detail="Not authorized to delete this spot")
    
    # Delete associated photos from disk
    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    for photo in photos:
        try:
            if os.path.exists(photo.object_key):
                os.remove(photo.object_key)
        except Exception:
            pass  # Ignore file deletion errors
    
    # Delete the spot (photos will be deleted by cascade)
    db.delete(spot)
    db.commit()
    
    return {"message": "Spot deleted successfully"}


@router.get("/", response_model=List[schemas.SpotOut])
def list_spots(db: Session = Depends(get_db)):
    spots = db.query(models.Spot).join(models.User).all()
    result = []
    
    for spot in spots:
        # Extract coordinates from geometry
        try:
            from shapely.wkt import loads
            geom_wkt = db.execute(func.ST_AsText(spot.geom)).scalar()
            point = loads(geom_wkt)
            lon, lat = point.x, point.y
        except Exception:
            # If we can't extract coordinates, skip this spot
            continue
        
        # Get photos for this spot
        photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        photos_data = []
        for photo in photos:
            photos_data.append({
                "id": photo.id,
                "spot_id": photo.spot_id,
                "url": photo.url,
                "thumbnail_url": photo.thumbnail_url,
                "created_at": photo.created_at
            })
            
        # Get user information
        user = db.query(models.User).filter(models.User.id == spot.user_id).first()
        user_data = None
        if user:
            user_data = {
                "id": user.id,
                "email": user.email,
                "display_name": user.display_name,
                "username": user.display_name,  # Alias for frontend compatibility
                "created_at": user.created_at
            }
        
        result.append({
            "id": spot.id,
            "title": spot.title,
            "description": spot.description,
            "subtitle": spot.subtitle,
            "how_to_get_there": spot.how_to_get_there,
            "spot_type": spot.spot_type,
            "lat": lat,
            "lon": lon,
            "location_name": spot.location_name,
            "createdAt": spot.created_at,  # Use camelCase for frontend compatibility
            "created_at": spot.created_at,  # Keep snake_case for backend compatibility
            "owner_id": spot.user_id,
            "createdBy": user_data,
            "photos": photos_data
        })
    
    return result


@router.get("/{spot_id}", response_model=schemas.SpotOut)
def get_spot(spot_id: str, db: Session = Depends(get_db)):
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    
    # Extract coordinates from geometry
    try:
        from shapely.wkt import loads
        geom_wkt = db.execute(func.ST_AsText(spot.geom)).scalar()
        point = loads(geom_wkt)
        lon, lat = point.x, point.y
    except Exception:
        raise HTTPException(status_code=500, detail="Error extracting coordinates")
    
    # Get photos for this spot
    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    photos_data = []
    for photo in photos:
        photos_data.append({
            "id": photo.id,
            "spot_id": photo.spot_id,
            "url": photo.url,
            "thumbnail_url": photo.thumbnail_url,
            "created_at": photo.created_at
        })
    
    # Get user information
    user = db.query(models.User).filter(models.User.id == spot.user_id).first()
    user_data = None
    if user:
        user_data = {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "username": user.display_name,  # Alias for frontend compatibility
            "created_at": user.created_at
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
        "createdAt": spot.created_at,  # Use camelCase for frontend compatibility
        "created_at": spot.created_at,  # Keep snake_case for backend compatibility
        "owner_id": spot.user_id,
        "createdBy": user_data,
        "photos": photos_data
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

    like = models.Like(
        user_id=current_user.id, spot_id=spot.id, value=like_in.value
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
    fav = models.Favorite(user_id=current_user.id, spot_id=spot_id)
    db.merge(fav)
    db.commit()
    return {"message": "Spot added to favorites"}


@router.get("/search/locations", response_model=schemas.LocationSearchResponse)
def search_locations(
    q: str = Query(..., description="Location search query"),
    limit: int = Query(10, ge=1, le=20, description="Maximum number of results")
):
    """Search for locations by name"""
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    
    results = geocoding_service.search_locations(q.strip(), limit)
    return schemas.LocationSearchResponse(results=results)


@router.get("/geocode", response_model=schemas.GeocodeResult)
def geocode_location(
    location: str = Query(..., description="Location name to geocode")
):
    """Geocode a location name to get coordinates"""
    if not location.strip():
        raise HTTPException(status_code=400, detail="Location cannot be empty")
    
    result = geocoding_service.geocode_location(location.strip())
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")
    
    return schemas.GeocodeResult(**result)


@router.get("/reverse-geocode", response_model=schemas.GeocodeResult)
def reverse_geocode(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude")
):
    """Reverse geocode coordinates to get location name"""
    result = geocoding_service.reverse_geocode(lat, lng)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found for these coordinates")
    
    return schemas.GeocodeResult(**result)


@router.put("/{spot_id}", response_model=schemas.SpotOut)
def update_spot(
    spot_id: str,
    spot_update: schemas.SpotUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Update a spot (only by owner)"""
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    
    # Check if user is the owner
    if spot.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this spot")
    
    # Update fields if provided
    if spot_update.title is not None:
        spot.title = spot_update.title
    if spot_update.description is not None:
        spot.description = spot_update.description
    if spot_update.spot_type is not None:
        spot.spot_type = spot_update.spot_type
    if spot_update.lat is not None and spot_update.lon is not None:
        # Update geometry
        from shapely.geometry import Point
        point = from_shape(Point(spot_update.lon, spot_update.lat), srid=4326)
        spot.geom = point
    
    db.commit()
    db.refresh(spot)
    
    # Extract coordinates for response
    try:
        from shapely.wkt import loads
        geom_wkt = db.execute(func.ST_AsText(spot.geom)).scalar()
        point = loads(geom_wkt)
        lon, lat = point.x, point.y
    except Exception:
        raise HTTPException(status_code=500, detail="Error extracting coordinates")
    
    # Get photos for this spot
    photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
    photos_data = []
    for photo in photos:
        photos_data.append({
            "id": photo.id,
            "spot_id": photo.spot_id,
            "url": photo.url,
            "thumbnail_url": photo.thumbnail_url,
            "created_at": photo.created_at
        })
    
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
        "photos": photos_data
    }


@router.delete("/{spot_id}")
def delete_spot(
    spot_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Delete a spot (only by owner)"""
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    
    # Check if user is the owner
    if spot.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this spot")
    
    db.delete(spot)
    db.commit()
    
    return {"message": "Spot deleted successfully"}
