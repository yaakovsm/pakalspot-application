from fastapi import APIRouter, Depends, HTTPException
from app.services.utils import sunrise_sunset

router = APIRouter(prefix="/utils", tags=["utils"])


@router.get("/sun-times")
def get_sun_times(lat: float, lon: float):
    try:
        return sunrise_sunset(lat, lon)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sun times: {str(e)}")
