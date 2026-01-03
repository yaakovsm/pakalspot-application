#!/usr/bin/env python3
"""
Fix photo URLs and object_keys to use backend API proxy for init photos.

This script updates:
1. object_key from "pakalspot-init-photos/{filename}" to "photos/{filename}"
2. URL from S3 URLs to backend API URLs: "{BASE_URL}/api/media/{filename}"
"""

import sys
import os
import re

# Add the app directory to the path so we can import from app
sys.path.append('/app')

from app.core.database import SessionLocal
from app.models import Photo
from app.core.settings import settings

def extract_filename(object_key: str) -> str:
    """Extract filename from object_key."""
    # Handle formats like "pakalspot-init-photos/IMG_3821.JPG" or "photos/IMG_3821.JPG"
    parts = object_key.split('/')
    return parts[-1] if parts else object_key

def fix_photo_urls():
    """Fix photo URLs and object_keys to include /photos/ prefix."""
    print("Fixing photo URLs and object_keys...")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Get all photos
        photos = db.query(Photo).all()
        updated_count = 0
        
        for photo in photos:
            updated = False
            old_object_key = photo.object_key
            old_url = photo.url
            old_thumbnail_url = photo.thumbnail_url
            
            # Fix object_key: change "pakalspot-init-photos/{filename}" to "photos/{filename}"
            if photo.object_key.startswith("pakalspot-init-photos/"):
                filename = extract_filename(photo.object_key)
                photo.object_key = f"photos/{filename}"
                updated = True
                print(f"Updated object_key: {old_object_key} -> {photo.object_key}")
            
            # Fix URL: convert S3 URLs to backend API URLs for init photos
            # Check if URL is an S3 URL for init photos bucket or if object_key is "photos/"
            if (photo.object_key.startswith("photos/") or 
                "pakalspot-init-photos.s3.amazonaws.com" in photo.url):
                filename = extract_filename(photo.object_key)
                base_url = settings.BASE_URL.rstrip("/")
                expected_url = f"{base_url}/api/media/{filename}"
                
                if photo.url != expected_url:
                    photo.url = expected_url
                    updated = True
                    print(f"Updated URL: {old_url} -> {photo.url}")
            
            # Fix thumbnail_url: same logic as URL
            if (photo.object_key.startswith("photos/") or 
                (photo.thumbnail_url and "pakalspot-init-photos.s3.amazonaws.com" in photo.thumbnail_url)):
                filename = extract_filename(photo.object_key)
                base_url = settings.BASE_URL.rstrip("/")
                expected_thumbnail_url = f"{base_url}/api/media/{filename}"
                
                if photo.thumbnail_url != expected_thumbnail_url:
                    photo.thumbnail_url = expected_thumbnail_url
                    updated = True
                    print(f"Updated thumbnail_url: {old_thumbnail_url} -> {photo.thumbnail_url}")
            
            if updated:
                updated_count += 1
        
        # Commit the changes
        db.commit()
        print(f"\n✅ Updated {updated_count} out of {len(photos)} photo records successfully! 🚀")
        
    except Exception as e:
        print(f"❌ Error updating photo URLs: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    fix_photo_urls()

