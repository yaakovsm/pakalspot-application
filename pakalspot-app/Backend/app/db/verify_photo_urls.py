#!/usr/bin/env python3
"""
List photo rows that may be misconfigured (legacy keys, pakalspot.local in url).

Use against any environment to verify data before/after fix_photo_urls.py.

Usage:
  python -m app.db.verify_photo_urls
  python -m app.db.verify_photo_urls --filename IMG_5307.JPG
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
if os.path.isdir("/app"):
    sys.path.insert(0, "/app")

from app.core.database import SessionLocal
from app.models import Photo
from app.services.photo_url import build_photo_url, normalized_init_object_key


def main():
    parser = argparse.ArgumentParser(description="Inspect photo URL / object_key rows")
    parser.add_argument(
        "--filename",
        help="Only rows whose object_key or url contains this filename",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Print every photo row (id, object_key, url snippet)",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        q = db.query(Photo)
        rows = q.all()
        suspicious = []
        for p in rows:
            if args.filename:
                fn = args.filename
                if (
                    fn not in (p.object_key or "")
                    and fn not in (p.url or "")
                    and fn not in (p.thumbnail_url or "")
                ):
                    continue
            nkey = normalized_init_object_key(p)
            built = build_photo_url(p)
            bad = (
                "pakalspot.local" in (p.url or "")
                or "pakalspot.local" in (p.thumbnail_url or "")
                or (p.object_key or "").startswith("pakalspot-init-photos/")
            )
            if bad or args.all:
                suspicious.append((p, nkey, built))

        print(f"Total photos: {len(rows)}")
        print(f"Rows shown: {len(suspicious)}")
        for p, nkey, built in suspicious:
            print("---")
            print(f"  id:            {p.id}")
            print(f"  spot_id:       {p.spot_id}")
            print(f"  object_key:    {p.object_key}")
            print(f"  url (db):      {p.url}")
            print(f"  thumbnail_url: {p.thumbnail_url}")
            print(f"  normalized_init_object_key: {nkey}")
            print(f"  build_photo_url (api):      {built}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
