#!/usr/bin/env python3
"""
Database seeding script for PakalSpot project.
This script creates initial data including an admin user, spots, and photos.
"""

import sys
import os
import json
from pathlib import Path

# Add the app directory to the path so we can import from app
sys.path.append('/app')

from sqlalchemy.orm import Session
from sqlalchemy import cast, String
from geoalchemy2 import WKTElement
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import User, Spot, Photo, SpotType, parse_spot_type
from app.core.settings import Settings
import hashlib


def load_spots_data() -> list[dict]:
    """Load spots data from JSON file."""
    # Try multiple possible paths
    possible_paths = [
        Path('/app/app/db/init_spots.json'),
        Path(__file__).parent / 'init_spots.json',
        Path('app/db/init_spots.json'),
    ]
    
    spots_data = None
    for path in possible_paths:
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                spots_data = data.get('spots', data)  # Support both {'spots': [...]} and [...]
            print(f"Loaded spots data from {path}")
            break
    
    if spots_data is None:
        print("Warning: init_spots.json not found, using empty list")
        return []
    
    return spots_data


def create_admin_user(db: Session) -> User:
    """Create admin user if it doesn't exist."""
    # Check if admin user already exists
    existing_user = db.query(User).filter(User.email == "yaakovsm@gmail.com").first()
    if existing_user:
        print("Admin user already exists")
        return existing_user
    
    # Create admin user with a workaround for bcrypt issues
    try:
        password_hash = get_password_hash("admin123")
    except Exception as e:
        print(f"Bcrypt hashing failed: {e}")
        # Use a simple hash as fallback
        password_hash = hashlib.sha256("admin123".encode()).hexdigest()
        print("Using SHA256 hash as fallback")
    
    admin_user = User(
        email="yaakovsm@gmail.com",
        password_hash=password_hash,
        display_name="JCoffeeBrew"
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    print(f"Created admin user: {admin_user.display_name} ({admin_user.email})")
    return admin_user


def create_spots(db: Session, admin_user: User) -> tuple[list[Spot], list[dict]]:
    """Create initial spots (idempotent - skips existing spots)."""
    # Load spots data from external file
    spots_data = load_spots_data()
    
    if not spots_data:
        print("No spots data found. Skipping spot creation.")
        return [], []
    
    created_spots = []
    
    for spot_data in spots_data:
        spot_title = spot_data["title"]
        
        # Check if spot already exists (by title and user_id for idempotency)
        # Cast user_id to string for comparison since DB column is VARCHAR
        # but admin_user.id is UUID type
        existing_spot = db.query(Spot).filter(
            Spot.title == spot_title,
            cast(Spot.user_id, String) == str(admin_user.id)
        ).first()
        
        if existing_spot:
            print(f"Spot '{spot_title}' already exists, skipping creation")
            created_spots.append(existing_spot)
            continue
        
        try:
            # Parse enums from strings
            spot_type = parse_spot_type(spot_data["spot_type"])
            
            # Create geometry point from latitude and longitude
            geom = WKTElement(f"POINT({spot_data['longitude']} {spot_data['latitude']})", srid=4326)
            
            # Create new spot
            spot = Spot(
                user_id=admin_user.id,
                title=spot_data["title"],
                description=spot_data["description"],
                subtitle=spot_data.get("subtitle"),
                how_to_get_there=spot_data.get("how_to_get_there"),
                spot_type=spot_type,
                location_name=spot_data.get("location_name"),
                geom=geom
            )
            
            db.add(spot)
            db.commit()
            db.refresh(spot)
            created_spots.append(spot)
            print(f"Created spot: {spot.title}")
        except Exception as e:
            print(f"Error creating spot '{spot_title}': {e}")
            db.rollback()
            # Continue with next spot instead of failing completely
            continue
    
    return created_spots, spots_data


def create_photos(db: Session, spots: list[Spot], spots_data: list[dict]) -> None:
    """Create photos for each spot if they don't exist."""
    # Get BASE_URL from settings (should be frontend URL)
    settings = Settings()
    base_url = settings.BASE_URL.rstrip('/')  # Remove trailing slash if present
    
    # Photos are in frontend public directory
    photo_base_path = "/PakalSpot init photos"
    
    for i, spot in enumerate(spots):
        # Check if photos already exist for this spot
        existing_photos = db.query(Photo).filter(Photo.spot_id == spot.id).first()
        if existing_photos:
            print(f"Photos already exist for spot '{spot.title}'")
            continue
        
        # Get photos for this spot - support both list and comma-separated string
        photos_data = spots_data[i].get("photos", [])
        if isinstance(photos_data, str):
            # Handle comma-separated string
            photo_filenames = [p.strip() for p in photos_data.split(',')]
        elif isinstance(photos_data, list):
            # Handle list
            photo_filenames = photos_data
        else:
            # Fallback: try to get from "photo" field (old format)
            photo_data = spots_data[i].get("photo", "")
            if photo_data:
                photo_filenames = [p.strip() for p in photo_data.split(',')]
            else:
                print(f"No photos found for spot '{spot.title}'")
                continue
        
        # Create photo records for each photo
        for photo_filename in photo_filenames:
            if not photo_filename:
                continue
            
            # Photos are in frontend public directory
            photo_url = f"{base_url}{photo_base_path}/{photo_filename}"
            
            photo = Photo(
                spot_id=spot.id,
                object_key=f"{photo_base_path}/{photo_filename}",
                url=photo_url,
                thumbnail_url=photo_url
            )
            
            db.add(photo)
            print(f"Created photo for spot '{spot.title}': {photo_filename}")
    
    db.commit()

def main():
    """Main seeding function."""
    print("Starting database seeding...")
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create admin user
        admin_user = create_admin_user(db)
        
        # Create spots
        spots, spots_data = create_spots(db, admin_user)
        
        # Create photos
        create_photos(db, spots, spots_data)
        
        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()