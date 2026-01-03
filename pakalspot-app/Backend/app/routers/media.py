from fastapi import APIRouter, HTTPException, Response, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app import models
import boto3
from botocore.exceptions import ClientError
from app.core.settings import settings
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["media"])


def is_local_environment() -> bool:
    """Check if running in local development environment."""
    env = (settings.ENVIRONMENT or "").lower()
    return env in {"development", "dev", "local"}


def get_content_type_from_filename(filename: str) -> str:
    """Determine content type from file extension."""
    if filename.lower().endswith(('.png',)):
        return 'image/png'
    elif filename.lower().endswith(('.gif',)):
        return 'image/gif'
    else:
        return 'image/jpeg'


def serve_from_local_filesystem(filename: str) -> Response | None:
    """Try to serve image from local filesystem. Returns Response if found, None otherwise."""
    local_path = os.path.join("media", "seed_images", filename)
    # Also try absolute path from /app (Docker working directory)
    absolute_path = os.path.join("/app", "media", "seed_images", filename)
    
    # Check both relative and absolute paths
    checked_path = None
    if os.path.exists(local_path):
        checked_path = local_path
    elif os.path.exists(absolute_path):
        checked_path = absolute_path
    else:
        # Log for debugging
        logger.debug(f"Local file not found. Tried: {local_path} and {absolute_path}")
        logger.debug(f"Current working directory: {os.getcwd()}")
        return None
    
    logger.info(f"Serving photo from local filesystem: {checked_path}")
    with open(checked_path, "rb") as f:
        image_data = f.read()
    content_type = get_content_type_from_filename(filename)
    return Response(
        content=image_data,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=3600"}
    )


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


@router.get("/media/{filename}")
async def serve_media(filename: str, db: Session = Depends(get_db)):
    """
    Serve media files from S3 by proxying through the backend.
    
    Looks up the photo in the database by matching the filename to object_key,
    then downloads and serves the image from S3.
    """
    try:
        logger.info(f"Attempting to serve media file: {filename}")
        
        # Query database to find photo by filename
        # object_key format can be: "pakalspot-init-photos/IMG_5307.JPG", "photos/IMG_5307.JPG", or "spot_id/uuid.jpg"
        # We need to match where object_key ends with the filename
        photo = db.query(models.Photo).filter(
            models.Photo.object_key.like(f"%/{filename}")
        ).first()
        
        # Also try direct match in case object_key is just the filename
        if not photo:
            photo = db.query(models.Photo).filter(
                models.Photo.object_key == filename
            ).first()
        
        # Also try matching "photos/{filename}" format explicitly
        if not photo:
            photo = db.query(models.Photo).filter(
                models.Photo.object_key == f"photos/{filename}"
            ).first()
        
        if not photo:
            logger.warning(f"Photo not found in database for filename: {filename}")
            
            # Check if this looks like an init photo (IMG_*.JPG pattern)
            # If so, try to serve directly from S3 as fallback
            if filename.upper().startswith("IMG_") and filename.upper().endswith((".JPG", ".JPEG", ".PNG")):
                # In local mode, try local filesystem first
                is_local = is_local_environment()
                if is_local:
                    local_response = serve_from_local_filesystem(filename)
                    if local_response:
                        logger.info(f"Served init photo from local filesystem: {filename}")
                        return local_response
                
                logger.info(f"Attempting to serve init photo directly from S3: photos/{filename}")
                bucket_name = "pakalspot-init-photos"
                object_key = f"photos/{filename}"
                
                s3_client = get_s3_client()
                try:
                    response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
                    image_data = response['Body'].read()
                    content_type = response.get('ContentType', 'image/jpeg')
                    logger.info(f"Successfully served init photo from S3: {object_key}")
                    return Response(
                        content=image_data,
                        media_type=content_type,
                        headers={
                            "Cache-Control": "public, max-age=3600",
                        }
                    )
                except ClientError as e:
                    error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                    logger.error(f"Failed to fetch init photo from S3: {error_code} - {str(e)}")
                    if error_code == 'NoSuchKey':
                        logger.error(f"S3 key not found: {bucket_name}/{object_key}")
                    elif error_code == 'AccessDenied':
                        logger.error(f"Access denied to S3 bucket: {bucket_name}")
                    
                    # In local mode, try local filesystem as fallback after S3 error
                    if is_local:
                        local_response = serve_from_local_filesystem(filename)
                        if local_response:
                            logger.info(f"Fell back to local filesystem after S3 error: {filename}")
                            return local_response
            
            # Try to serve from local filesystem as last fallback
            local_response = serve_from_local_filesystem(filename)
            if local_response:
                return local_response
            
            # Log all attempted queries for debugging
            logger.error(f"Photo not found after all attempts. Filename: {filename}")
            logger.error(f"Tried queries: object_key LIKE '%/{filename}', object_key == '{filename}', object_key == 'photos/{filename}'")
            raise HTTPException(
                status_code=404, 
                detail=f"Image not found: {filename}. Checked database and S3 fallback."
            )
        
        # If object_key starts with "media/", it's a local file - serve from filesystem
        if photo.object_key.startswith("media/"):
            local_path = photo.object_key  # Already includes "media/" prefix
            if os.path.exists(local_path):
                with open(local_path, "rb") as f:
                    image_data = f.read()
                content_type = get_content_type_from_filename(filename)
                return Response(
                    content=image_data,
                    media_type=content_type,
                    headers={"Cache-Control": "public, max-age=3600"}
                )
            else:
                raise HTTPException(status_code=404, detail=f"Local image file not found: {filename}")
        
        # Determine which S3 bucket to use
        # If object_key starts with "pakalspot-init-photos/" or "photos/", use init photos bucket
        # Otherwise use the configured S3_BUCKET
        if photo.object_key.startswith("pakalspot-init-photos/"):
            bucket_name = "pakalspot-init-photos"
            object_key = photo.object_key
        elif photo.object_key.startswith("photos/"):
            # New format: "photos/{filename}" maps to "pakalspot-init-photos" bucket
            bucket_name = "pakalspot-init-photos"
            object_key = photo.object_key  # Keep "photos/{filename}" as the S3 key
        else:
            bucket_name = settings.S3_BUCKET
            object_key = photo.object_key
        
        # In local development mode, try local filesystem first for init photos
        is_local = is_local_environment()
        logger.info(f"Environment check: is_local={is_local}, ENVIRONMENT={settings.ENVIRONMENT}, object_key={photo.object_key}")
        if is_local and photo.object_key.startswith("photos/"):
            # Extract filename from object_key (e.g., "photos/IMG_6007.JPG" -> "IMG_6007.JPG")
            extracted_filename = object_key.split("/")[-1]
            logger.info(f"Attempting to serve from local filesystem in local mode: {extracted_filename}")
            local_response = serve_from_local_filesystem(extracted_filename)
            if local_response:
                logger.info(f"Served init photo from local filesystem in local mode: {extracted_filename}")
                return local_response
            # If local file doesn't exist, continue to try S3 (for mixed scenarios)
            logger.info(f"Local file not found for {extracted_filename}, trying S3...")
        
        # Download image from S3
        logger.info(f"Fetching photo from S3: bucket={bucket_name}, key={object_key}")
        s3_client = get_s3_client()
        try:
            response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
            image_data = response['Body'].read()
            content_type = response.get('ContentType', 'image/jpeg')
            logger.info(f"Successfully fetched photo from S3: {object_key}")
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"S3 error for {bucket_name}/{object_key}: {error_code} - {error_message}")
            
            # In local mode, fall back to local filesystem if S3 fails
            if is_local and photo.object_key.startswith("photos/"):
                extracted_filename = object_key.split("/")[-1]
                local_response = serve_from_local_filesystem(extracted_filename)
                if local_response:
                    logger.info(f"Fell back to local filesystem after S3 error: {extracted_filename}")
                    return local_response
                logger.warning(f"Both S3 and local filesystem failed for {extracted_filename}")
            
            # In production or if local fallback didn't work, raise appropriate error
            if error_code == 'NoSuchKey':
                raise HTTPException(
                    status_code=404, 
                    detail=f"Image not found in S3: {filename} (bucket: {bucket_name}, key: {object_key})"
                )
            elif error_code == 'AccessDenied':
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied to S3 bucket: {bucket_name}. Check IAM permissions."
                )
            else:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Error fetching image from S3: {error_code} - {error_message}"
                )
        
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

