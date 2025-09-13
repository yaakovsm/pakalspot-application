from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app import models, schemas
from typing import List
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

router = APIRouter(prefix="/spots", tags=["spots"])


@router.post("/", response_model=schemas.SpotOut)
def create_spot(
    spot_in: schemas.SpotCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    point = from_shape(Point(spot_in.lon, spot_in.lat), srid=4326)
    spot = models.Spot(
        title=spot_in.title,
        description=spot_in.description,
        spot_type=spot_in.spot_type,
        region=spot_in.region,
        geom=point,
        owner=current_user,
    )
    db.add(spot)
    db.commit()
    db.refresh(spot)
    return spot


@router.get("/", response_model=List[schemas.SpotOut])
def list_spots(db: Session = Depends(get_db)):
    return db.query(models.Spot).all()


@router.get("/{spot_id}", response_model=schemas.SpotOut)
def get_spot(spot_id: str, db: Session = Depends(get_db)):
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")
    return spot


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
