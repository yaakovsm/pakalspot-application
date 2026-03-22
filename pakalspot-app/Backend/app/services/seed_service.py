"""
Seed service for initializing database with spots and photos from S3.

Reads init_spots.json from S3 bucket and seeds the database idempotently.
"""

import json
import logging
from typing import Dict, List
import boto3
from botocore.exceptions import ClientError
from sqlalchemy.orm import Session
from sqlalchemy import text
from geoalchemy2 import WKTElement

from app import models
from app.core.settings import settings
from app.core.security import get_password_hash
from app.models import parse_spot_type
from app.services.photo_url import build_photo_url_from_object_key

logger = logging.getLogger(__name__)


def get_s3_client():
    """Get S3 client for accessing init bucket."""
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION,
    )


def read_init_spots_json() -> dict:
    """
    Read init_spots.json from S3 bucket.
    
    Returns:
        Parsed JSON dictionary with "spots" key
        
    Raises:
        Exception: If S3 read or JSON parsing fails
    """
    s3_client = get_s3_client()
    bucket = settings.INIT_SEED_BUCKET
    key = settings.INIT_SEED_JSON_KEY
    
    try:
        response = s3_client.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read().decode('utf-8')
        data = json.loads(content)
        
        # Support both {"spots": [...]} and [...] formats
        if isinstance(data, list):
            return {"spots": data}
        return data
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        if error_code == 'NoSuchKey':
            raise Exception(f"JSON file not found in S3: s3://{bucket}/{key}")
        raise Exception(f"Error reading from S3: {str(e)}")
    except json.JSONDecodeError as e:
        raise Exception(f"Invalid JSON in S3 file: {str(e)}")


def get_or_create_admin_user(db: Session) -> models.User:
    """
    Find or create admin user by email (see settings.ADMIN_EMAIL).

    If the DB still has the legacy seed user admin@pakalspot.com, renames it to
    ADMIN_EMAIL so login matches backend admin checks.
    """
    admin_email = settings.ADMIN_EMAIL
    admin_password = settings.ADMIN_PASSWORD
    admin_display_name = settings.ADMIN_DISPLAY_NAME

    existing_user = db.query(models.User).filter(
        models.User.email == admin_email
    ).first()

    if existing_user:
        logger.info(f"Admin user already exists: {admin_email}")
        return existing_user

    legacy = db.query(models.User).filter(
        models.User.email == "admin@pakalspot.com"
    ).first()
    if legacy:
        legacy.email = admin_email
        db.commit()
        db.refresh(legacy)
        logger.info(f"Migrated legacy admin user to {admin_email}")
        return legacy

    # Create admin user
    try:
        password_hash = get_password_hash(admin_password)
    except Exception as e:
        logger.warning(f"Bcrypt hashing failed: {e}, using SHA256 fallback")
        import hashlib
        password_hash = hashlib.sha256(admin_password.encode()).hexdigest()
    
    admin_user = models.User(
        email=admin_email,
        password_hash=password_hash,
        display_name=admin_display_name
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    logger.info(f"Created admin user: {admin_display_name} ({admin_email})")
    
    return admin_user


def seed_init_spots(db: Session) -> Dict[str, int | List[str]]:
    """
    Seed database with initial spots and photos from S3.
    
    Idempotent: safe to run multiple times. Updates existing spots,
    creates missing photos, but doesn't delete user-uploaded photos.
    
    Args:
        db: Database session
        
    Returns:
        Report dictionary with:
        - created_spots: int
        - updated_spots: int
        - skipped_spots: int
        - created_photos: int
        - skipped_photos: int
        - errors: List[str]
    """
    report = {
        "created_spots": 0,
        "updated_spots": 0,
        "skipped_spots": 0,
        "created_photos": 0,
        "skipped_photos": 0,
        "errors": []
    }
    
    try:
        # Read JSON from S3
        logger.info(f"Reading init spots JSON from s3://{settings.INIT_SEED_BUCKET}/{settings.INIT_SEED_JSON_KEY}")
        data = read_init_spots_json()
        spots_data = data.get("spots", [])
        
        if not spots_data:
            logger.warning("No spots found in JSON file")
            return report
        
        # Get or create admin user
        admin_user = get_or_create_admin_user(db)
        
        # Process each spot
        for spot_data in spots_data:
            try:
                spot_title = spot_data.get("title")
                if not spot_title:
                    report["errors"].append("Spot missing title field")
                    continue
                
                # Check if spot exists (by title and user_id for idempotency)
                existing_spot = db.query(models.Spot).filter(
                    models.Spot.title == spot_title,
                    text("spots.user_id::text = :user_id")
                ).params(user_id=str(admin_user.id)).first()
                
                if existing_spot:
                    # Update existing spot
                    try:
                        spot_type = parse_spot_type(spot_data.get("spot_type", "viewpoint"))
                        geom = WKTElement(
                            f"POINT({spot_data.get('longitude', 0)} {spot_data.get('latitude', 0)})",
                            srid=4326
                        )
                        
                        existing_spot.description = spot_data.get("description", existing_spot.description)
                        existing_spot.subtitle = spot_data.get("subtitle", existing_spot.subtitle)
                        existing_spot.how_to_get_there = spot_data.get("how_to_get_there", existing_spot.how_to_get_there)
                        existing_spot.location_name = spot_data.get("location_name", existing_spot.location_name)
                        existing_spot.spot_type = spot_type
                        existing_spot.geom = geom
                        
                        db.commit()
                        db.refresh(existing_spot)
                        report["updated_spots"] += 1
                        logger.info(f"Updated spot: {spot_title}")
                        spot = existing_spot
                    except Exception as e:
                        report["errors"].append(f"Error updating spot '{spot_title}': {str(e)}")
                        db.rollback()
                        continue
                else:
                    # Create new spot
                    try:
                        spot_type = parse_spot_type(spot_data.get("spot_type", "viewpoint"))
                        geom = WKTElement(
                            f"POINT({spot_data.get('longitude', 0)} {spot_data.get('latitude', 0)})",
                            srid=4326
                        )
                        
                        spot = models.Spot(
                            user_id=admin_user.id,
                            title=spot_title,
                            description=spot_data.get("description", ""),
                            subtitle=spot_data.get("subtitle"),
                            how_to_get_there=spot_data.get("how_to_get_there"),
                            spot_type=spot_type,
                            location_name=spot_data.get("location_name"),
                            geom=geom
                        )
                        
                        db.add(spot)
                        db.commit()
                        db.refresh(spot)
                        report["created_spots"] += 1
                        logger.info(f"Created spot: {spot_title}")
                    except Exception as e:
                        report["errors"].append(f"Error creating spot '{spot_title}': {str(e)}")
                        db.rollback()
                        continue
                
                # Process photos for this spot
                photos = spot_data.get("photos", [])
                for photo_filename in photos:
                    if not photo_filename:
                        continue
                    
                    # object_key format: "photos/{filename}"
                    object_key = f"photos/{photo_filename}"
                    
                    # Check if photo already exists
                    existing_photo = db.query(models.Photo).filter(
                        models.Photo.spot_id == spot.id,
                        models.Photo.object_key == object_key
                    ).first()
                    
                    if existing_photo:
                        report["skipped_photos"] += 1
                        continue
                    
                    # Create new photo record
                    try:
                        # Build URL using helper (will use INIT_PHOTOS_BASE_URL for init photos)
                        url = build_photo_url_from_object_key(object_key)
                        
                        photo = models.Photo(
                            spot_id=spot.id,
                            object_key=object_key,
                            url=url,
                            thumbnail_url=url
                        )
                        
                        db.add(photo)
                        db.commit()
                        report["created_photos"] += 1
                        logger.info(f"Created photo: {object_key} for spot {spot_title}")
                    except Exception as e:
                        report["errors"].append(f"Error creating photo '{object_key}' for spot '{spot_title}': {str(e)}")
                        db.rollback()
                        continue
                        
            except Exception as e:
                report["errors"].append(f"Error processing spot: {str(e)}")
                logger.error(f"Error processing spot: {e}", exc_info=True)
                continue
        
        logger.info(f"Seed completed: {report['created_spots']} created, {report['updated_spots']} updated, "
                   f"{report['created_photos']} photos created")
        
    except Exception as e:
        error_msg = f"Fatal error in seed_init_spots: {str(e)}"
        report["errors"].append(error_msg)
        logger.error(error_msg, exc_info=True)
    
    return report

