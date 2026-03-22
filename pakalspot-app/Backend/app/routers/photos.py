from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app import models, schemas
import boto3
from botocore.exceptions import ClientError
from uuid import uuid4
from app.core.settings import settings
from app.services.photo_url import build_photo_url_from_object_key

router = APIRouter(prefix="/photos", tags=["photos"])


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
    )


@router.post("/upload-url")
def generate_upload_url(
    spot_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Check spot exists
    spot = db.query(models.Spot).filter(models.Spot.id == spot_id).first()
    if not spot:
        raise HTTPException(status_code=404, detail="Spot not found")

    key = f"{spot_id}/{uuid4()}.jpg"
    s3_client = get_s3_client()

    try:
        presigned_post = s3_client.generate_presigned_post(
            Bucket=settings.S3_BUCKET,
            Key=key,
            Fields={"Content-Type": "image/jpeg"},
            Conditions=[
                {"Content-Type": "image/jpeg"},
            ],
            ExpiresIn=3600,
        )
    except ClientError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Save photo metadata in DB
    # Use photo URL helper for consistent URL building
    existing_url = f"{settings.BASE_URL}/media/{key.split('/')[-1]}"
    url = build_photo_url_from_object_key(key, existing_url)
    photo = models.Photo(spot_id=spot.id, object_key=key, url=url, thumbnail_url=url)
    db.add(photo)
    db.commit()
    db.refresh(photo)

    return {"upload": presigned_post, "photo": schemas.PhotoOut.from_orm(photo)}
