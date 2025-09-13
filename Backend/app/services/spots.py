from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
from .. import models
from ..schemas import SpotCreate
import uuid


def create_spot(db: Session, user_id: str, payload: SpotCreate) -> models.Spot:
	geom_point = from_shape(Point(payload.longitude, payload.latitude), srid=4326)
	spot = models.Spot(
		id=str(uuid.uuid4()),
		user_id=user_id,
		title=payload.title,
		description=payload.description,
		type=payload.type,
		region=payload.region,
		geom=geom_point,
	)
	db.add(spot)
	db.commit()
	db.refresh(spot)
	return spot


def search_spots(
	db: Session,
	lat: Optional[float] = None,
	lng: Optional[float] = None,
	radius_m: Optional[int] = None,
	type: Optional[str] = None,
	region: Optional[str] = None,
	sort_by: Optional[str] = None,
) -> List[models.Spot]:
	q = db.query(models.Spot)
	if type:
		q = q.filter(models.Spot.type == type)
	if region:
		q = q.filter(models.Spot.region == region)
	if lat is not None and lng is not None and radius_m is not None:
		# ST_DWithin(geom::geography, geography(Point(lng, lat)), radius)
		point = func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)
		q = q.filter(func.ST_DWithin(models.Spot.geom, point, radius_m))
	if sort_by == "popularity":
		q = q.order_by(models.Spot.popularity.desc())
	return q.all()


