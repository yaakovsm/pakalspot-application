#!/usr/bin/env python3
"""
Update photo URLs in the database to use the correct backend URL.
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
            photo.url = f"http://172.26.102.44:30081/media/{photo.object_key.split('/')[-1]}"
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
