#!/usr/bin/env python3
"""
Normalize init photo rows: object_key -> photos/{filename}, url/thumbnail -> S3 or CloudFront.

Run with the same environment as the target deployment (especially INIT_PHOTOS_BASE_URL
if you use CloudFront). Do not rely on default BASE_URL for public image URLs; this
script stores canonical URLs from build_photo_url_from_object_key(), not API proxy URLs.

Usage (container): python -m app.db.fix_photo_urls
"""

import sys
import os
import warnings

# Add the app directory to the path so we can import from app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
if os.path.isdir("/app"):
    sys.path.insert(0, "/app")

from app.core.database import SessionLocal
from app.models import Photo
from app.core.settings import settings
from app.services.photo_url import (
    build_photo_url_from_object_key,
    normalized_init_object_key,
)


def fix_photo_urls():
    """Normalize init photo object_keys and persist S3/CloudFront URLs."""
    default_base = "http://pakalspot.local"
    if (settings.BASE_URL or "").rstrip("/") == default_base and os.environ.get(
        "ALLOW_DEFAULT_BASE_URL_FOR_FIX"
    ) != "1":
        warnings.warn(
            "BASE_URL is still the default http://pakalspot.local. "
            "Set BASE_URL, or set ALLOW_DEFAULT_BASE_URL_FOR_FIX=1 if intentional. "
            "This script no longer writes API proxy URLs; it only matters for DB_URL etc.",
            UserWarning,
            stacklevel=2,
        )

    print("Normalizing init photo object_keys and URLs (S3/CloudFront)...")

    db = SessionLocal()

    try:
        photos = db.query(Photo).all()
        updated_count = 0

        for photo in photos:
            nkey = normalized_init_object_key(photo)
            if not nkey:
                continue

            new_url = build_photo_url_from_object_key(nkey)
            changed = False
            if photo.object_key != nkey:
                print(f"object_key: {photo.object_key} -> {nkey}")
                photo.object_key = nkey
                changed = True
            if photo.url != new_url:
                print(f"url: {photo.url} -> {new_url}")
                photo.url = new_url
                changed = True
            if photo.thumbnail_url != new_url:
                print(f"thumbnail_url: {photo.thumbnail_url} -> {new_url}")
                photo.thumbnail_url = new_url
                changed = True

            if changed:
                updated_count += 1

        db.commit()
        print(f"\nUpdated {updated_count} of {len(photos)} photo record(s).")

    except Exception as e:
        print(f"Error updating photo URLs: {e}")
        import traceback

        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    fix_photo_urls()
