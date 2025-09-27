#!/usr/bin/env python3
"""
Database seeding script for PakalSpot project.
This script creates initial data including an admin user, spots, and photos.
"""

import sys
import os
from sqlalchemy.orm import Session
from geoalchemy2 import WKTElement

# Add the app directory to the path so we can import from app
sys.path.append('/app')

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import User, Spot, Photo, SpotType, Region
import hashlib


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
    """Create initial spots if they don't exist."""
    spots_data = [
        {
            "title": "בריכת משושים",
            "description": "בריכה יפיפיה בשמורת הטבע יהודיה, הליכה של כשעה עד לבריכה נדירה שאפשר להכין לידה קפה",
            "spot_type": SpotType.spring,
            "region": Region.golan,
            "location_name": "בריכת משושים",
            "latitude": 33.4167,
            "longitude": 35.8500,
            "photo": "IMG_5307.JPG"
        },
        {
            "title": "תצפית מעל הים",
            "description": "תצפית מדהימה מעל הים, מושלמת להכין לידה קפה.",
            "spot_type": SpotType.viewpoint,
            "region": Region.sharon,
            "location_name": "ארסוף",
            "latitude": 32.20630,
            "longitude": 34.81124,
            "photo": "IMG_1936.JPG"
        }
    ]
    
    created_spots = []
    
    for spot_data in spots_data:
        # Check if spot already exists
        existing_spot = db.query(Spot).filter(Spot.title == spot_data["title"]).first()
        if existing_spot:
            print(f"Spot '{spot_data['title']}' already exists")
            created_spots.append(existing_spot)
            continue
        
        # Create geometry point from latitude and longitude
        geom = WKTElement(f"POINT({spot_data['longitude']} {spot_data['latitude']})", srid=4326)
        
        # Create spot
        spot = Spot(
            user_id=admin_user.id,
            title=spot_data["title"],
            description=spot_data["description"],
            spot_type=spot_data["spot_type"],
            region=spot_data["region"],
            location_name=spot_data["location_name"],
            geom=geom
        )
        
        db.add(spot)
        db.commit()
        db.refresh(spot)
        created_spots.append(spot)
        print(f"Created spot: {spot.title}")
    
    return created_spots, spots_data


def create_photos(db: Session, spots: list[Spot], spots_data: list[dict]) -> None:
    """Create photos for each spot if they don't exist."""
    
    for i, spot in enumerate(spots):
        # Check if photos already exist for this spot
        existing_photos = db.query(Photo).filter(Photo.spot_id == spot.id).first()
        if existing_photos:
            print(f"Photos already exist for spot '{spot.title}'")
            continue
        
        # Get the specific photo for this spot from the spots_data
        photo_filename = spots_data[i]["photo"]
        photo_url = f"http://localhost:8000/media/{photo_filename}"
        
        photo = Photo(
            spot_id=spot.id,
            object_key=f"media/{photo_filename}",
            url=photo_url,
            thumbnail_url=photo_url  # Using same URL for thumbnail for now
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
        
        print("Database seeded successfully! 🚀")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
