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

router = APIRouter(prefix="/spots", tags=["spots"])


@router.post("/", response_model=schemas.SpotOut)
def create_spot(
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


@router.get("/", response_model=List[schemas.SpotOut])
def list_spots(db: Session = Depends(get_db)):
    spots = db.query(models.Spot).all()
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
            
        result.append({
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
