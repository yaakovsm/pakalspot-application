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

router = APIRouter(prefix="/spots", tags=["spots"])


def is_admin_user(user: models.User) -> bool:
    """Check if user is an admin user."""
    return user.email == "yaakovsm@gmail.com"


@router.post("/", response_model=schemas.SpotOut)
async def create_spot(
    title: str = Form(...),
    description: str = Form(...),
    type: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    region: str = Form(...),
    location_name: Optional[str] = Form(None),
    photos: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Convert frontend field names to backend enum values
    try:
        spot_type = models.SpotType(type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid spot type: {type}")
    
    try:
        # Handle both lowercase and capitalized region names
        region_lower = region.lower()
        region_mapping = {
            'negev': models.Region.negev,
            'galilee': models.Region.galilee,
            'golan': models.Region.golan,
            'shfela': models.Region.shfela,
            'sharon': models.Region.sharon,
            'shomron': models.Region.shomron,
            'jerusalem': models.Region.jerusalem,
            'arava': models.Region.arava,
        }
        region_enum = region_mapping.get(region_lower)
        if not region_enum:
            raise ValueError(f"Invalid region: {region}")
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail=f"Invalid region: {region}")
    
    point = from_shape(Point(longitude, latitude), srid=4326)
    spot = models.Spot(
        title=title,
        description=description,
        spot_type=spot_type,
        region=region_enum,
        location_name=location_name,
        geom=point,
        user_id=current_user.id,
    )
    db.add(spot)
    db.commit()
    db.refresh(spot)
    
    # Handle photo uploads if provided
    if photos:
        import os
        import uuid
        from fastapi import UploadFile
        
        # Ensure media directory exists
        media_dir = "media"
        os.makedirs(media_dir, exist_ok=True)
        
        for photo in photos:
            if photo and photo.filename:
                # Generate unique filename
                file_extension = os.path.splitext(photo.filename)[1]
                unique_filename = f"{uuid.uuid4()}{file_extension}"
                file_path = os.path.join(media_dir, unique_filename)
                
                # Save file to disk
                with open(file_path, "wb") as buffer:
                    content = await photo.read()
                    buffer.write(content)
                
                # Create photo record in database
                photo_url = f"http://localhost:8000/media/{unique_filename}"
                photo_record = models.Photo(
                    spot_id=spot.id,
                    object_key=f"media/{unique_filename}",
                    url=photo_url,
                    thumbnail_url=photo_url  # Using same URL for thumbnail for now
                )
                db.add(photo_record)
        
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
        "spot_type": spot.spot_type,
        "region": spot.region,
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
    region: str = Form(...),
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
        spot_type = models.SpotType(type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid spot type: {type}")
    
    try:
        # Handle both lowercase and capitalized region names
        region_lower = region.lower()
        region_mapping = {
            'negev': models.Region.negev,
            'galilee': models.Region.galilee,
            'golan': models.Region.golan,
            'shfela': models.Region.shfela,
            'sharon': models.Region.sharon,
            'shomron': models.Region.shomron,
            'jerusalem': models.Region.jerusalem,
            'arava': models.Region.arava,
        }
        region_enum = region_mapping.get(region_lower)
        if not region_enum:
            raise ValueError(f"Invalid region: {region}")
    except (ValueError, KeyError):
        raise HTTPException(status_code=400, detail=f"Invalid region: {region}")
    
    # Update spot fields
    spot.title = title
    spot.description = description
    spot.spot_type = spot_type
    spot.region = region_enum
    spot.location_name = location_name
    
    # Update geometry
    point = from_shape(Point(longitude, latitude), srid=4326)
    spot.geom = point
    
    db.commit()
    db.refresh(spot)
    
    # Handle photo uploads if provided
    if photos:
        import os
        import uuid
        from fastapi import UploadFile
        
        # Ensure media directory exists
        media_dir = "media"
        os.makedirs(media_dir, exist_ok=True)
        
        # Delete existing photos for this spot
        existing_photos = db.query(models.Photo).filter(models.Photo.spot_id == spot.id).all()
        for photo in existing_photos:
            # Delete file from disk
            try:
                if os.path.exists(photo.object_key):
                    os.remove(photo.object_key)
            except Exception:
                pass  # Ignore file deletion errors
            db.delete(photo)
        
        for photo in photos:
            if photo and photo.filename:
                # Generate unique filename
                file_extension = os.path.splitext(photo.filename)[1]
                unique_filename = f"{uuid.uuid4()}{file_extension}"
                file_path = os.path.join(media_dir, unique_filename)
                
                # Save file to disk
                with open(file_path, "wb") as buffer:
                    content = await photo.read()
                    buffer.write(content)
                
                # Create photo record in database
                photo_url = f"http://localhost:8000/media/{unique_filename}"
                photo_record = models.Photo(
                    spot_id=spot.id,
                    object_key=f"media/{unique_filename}",
                    url=photo_url,
                    thumbnail_url=photo_url  # Using same URL for thumbnail for now
                )
                db.add(photo_record)
        
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
        "spot_type": spot.spot_type,
        "region": spot.region,
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
            "spot_type": spot.spot_type,
            "region": spot.region,
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
        "spot_type": spot.spot_type,
        "region": spot.region,
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
    """Geocode a location name to get coordinates and region"""
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
    if spot_update.region is not None:
        spot.region = spot_update.region
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
        "spot_type": spot.spot_type,
        "region": spot.region,
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
