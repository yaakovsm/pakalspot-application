#!/usr/bin/env python3
"""
Deprecated: this script hardcodes http://pakalspot.local and overwrites every row.

Use app.db.fix_photo_urls (normalizes init keys + S3/CloudFront URLs) and rely on
app.services.photo_url.build_photo_url for API responses instead.
"""

import sys
import os

# Add the app directory to the path so we can import from app
sys.path.append('/app')

from app.core.database import SessionLocal
from app.models import Photo

def update_photo_urls():
    """Update photo URLs to use the correct backend URL."""
    print("Updating photo URLs...")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Get all photos
        photos = db.query(Photo).all()
        
        for photo in photos:
            # Update the URL to use the correct backend URL
            old_url = photo.url
            photo.url = f"http://pakalspot.local/media/{photo.object_key.split('/')[-1]}"
            photo.thumbnail_url = photo.url
            
            print(f"Updated photo URL: {old_url} -> {photo.url}")
        
        # Commit the changes
        db.commit()
        print(f"Updated {len(photos)} photo URLs successfully! 🚀")
        
    except Exception as e:
        print(f"Error updating photo URLs: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    update_photo_urls()
