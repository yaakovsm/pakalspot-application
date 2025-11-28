from fastapi import APIRouter, HTTPException, Response, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app import models
import boto3
from botocore.exceptions import ClientError
from app.core.settings import settings
import os

router = APIRouter(tags=["media"])


def get_s3_client():
    """Get S3 client for accessing images."""
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
    )


@router.get("/media/{filename}")
async def serve_media(filename: str, db: Session = Depends(get_db)):
    """
    Serve media files from S3 by proxying through the backend.
    
    Looks up the photo in the database by matching the filename to object_key,
    then downloads and serves the image from S3.
    """
    try:
        # Query database to find photo by filename
        # object_key format can be: "pakalspot-init-photos/IMG_5307.JPG" or "spot_id/uuid.jpg"
        # We need to match where object_key ends with the filename
        photo = db.query(models.Photo).filter(
            models.Photo.object_key.like(f"%/{filename}")
        ).first()
        
        # Also try direct match in case object_key is just the filename
        if not photo:
            photo = db.query(models.Photo).filter(
                models.Photo.object_key == filename
            ).first()
        
        if not photo:
            # Photo not found in DB - try to serve from local filesystem as fallback
            local_path = os.path.join("media", filename)
            if os.path.exists(local_path):
                with open(local_path, "rb") as f:
                    image_data = f.read()
                # Determine content type from file extension
                if filename.lower().endswith(('.png',)):
                    content_type = 'image/png'
                elif filename.lower().endswith(('.gif',)):
                    content_type = 'image/gif'
                else:
                    content_type = 'image/jpeg'
                return Response(
                    content=image_data,
                    media_type=content_type,
                    headers={"Cache-Control": "public, max-age=3600"}
                )
            raise HTTPException(status_code=404, detail=f"Image not found: {filename}")
        
        # If object_key starts with "media/", it's a local file - serve from filesystem
        if photo.object_key.startswith("media/"):
            local_path = photo.object_key  # Already includes "media/" prefix
            if os.path.exists(local_path):
                with open(local_path, "rb") as f:
                    image_data = f.read()
                # Determine content type from file extension
                if filename.lower().endswith(('.png',)):
                    content_type = 'image/png'
                elif filename.lower().endswith(('.gif',)):
                    content_type = 'image/gif'
                else:
                    content_type = 'image/jpeg'
                return Response(
                    content=image_data,
                    media_type=content_type,
                    headers={"Cache-Control": "public, max-age=3600"}
                )
            else:
                raise HTTPException(status_code=404, detail=f"Local image file not found: {filename}")
        
        # Determine which S3 bucket to use
        # If object_key starts with "pakalspot-init-photos/", use that bucket
        # Otherwise use the configured S3_BUCKET
        if photo.object_key.startswith("pakalspot-init-photos/"):
            bucket_name = "pakalspot-init-photos"
            object_key = photo.object_key
        else:
            bucket_name = settings.S3_BUCKET
            object_key = photo.object_key
        
        # Download image from S3
        s3_client = get_s3_client()
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
            image_data = response['Body'].read()
            content_type = response.get('ContentType', 'image/jpeg')
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == 'NoSuchKey':
                raise HTTPException(status_code=404, detail=f"Image not found in S3: {filename}")
            else:
                raise HTTPException(status_code=500, detail=f"Error fetching image from S3: {str(e)}")
        
        # Return image with proper headers
        return Response(
            content=image_data,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

