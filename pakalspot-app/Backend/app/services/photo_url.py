"""
Photo URL building helper - DRY centralized URL generation.

Detects init photos by object_key prefix pattern ("photos/") and uses
INIT_PHOTOS_BASE_URL (CloudFront domain) for init photos, otherwise
uses existing logic for user-uploaded photos.
"""

from app import models
from app.core.settings import settings


def build_photo_url(photo: models.Photo) -> str:
    """
    Build photo URL based on photo source.
    
    - Init photos (object_key starts with "photos/"): Use INIT_PHOTOS_BASE_URL
    - User uploads: Use existing photo.url (presigned URL or S3 URL)
    
    Args:
        photo: Photo model instance
        
    Returns:
        Full URL string for the photo
    """
    # Check if this is an init photo by object_key prefix
    if photo.object_key.startswith("photos/"):
        # Init photo - use CloudFront base URL if available, otherwise use direct S3 URL
        if not settings.INIT_PHOTOS_BASE_URL:
            # Fallback: use direct S3 URL for public bucket
            # object_key format: "photos/IMG_5307.JPG"
            return f"https://pakalspot-init-photos.s3.amazonaws.com/{photo.object_key}"
        
        # Build URL: INIT_PHOTOS_BASE_URL + "/" + object_key
        # e.g., "https://d1234.cloudfront.net/photos/IMG_5307.JPG"
        base_url = settings.INIT_PHOTOS_BASE_URL.rstrip("/")
        object_key = photo.object_key
        return f"{base_url}/{object_key}"
    else:
        # User-uploaded photo - use existing URL logic
        # This preserves presigned URLs or existing S3 URLs
        return photo.url


def build_photo_url_from_object_key(object_key: str, existing_url: str | None = None) -> str:
    """
    Build photo URL from object_key (for new photos not yet in DB).
    
    Args:
        object_key: S3 object key
        existing_url: Optional existing URL to use for user uploads
        
    Returns:
        Full URL string for the photo
    """
    # Check if this is an init photo by object_key prefix
    if object_key.startswith("photos/"):
        # Init photo - use CloudFront base URL if available, otherwise use direct S3 URL
        if not settings.INIT_PHOTOS_BASE_URL:
            # Fallback: use direct S3 URL for public bucket
            # object_key format: "photos/IMG_5307.JPG"
            return f"https://pakalspot-init-photos.s3.amazonaws.com/{object_key}"
        
        # Build URL: INIT_PHOTOS_BASE_URL + "/" + object_key
        base_url = settings.INIT_PHOTOS_BASE_URL.rstrip("/")
        return f"{base_url}/{object_key}"
    else:
        # User-uploaded photo - use existing URL or build S3 URL
        if existing_url:
            return existing_url
        # Fallback: build S3 URL
        return f"https://{settings.S3_BUCKET}.s3.amazonaws.com/{object_key}"

