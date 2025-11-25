"""
Seed initial data for PakalSpot using the public API.

- Creates / logs in an admin user
- Creates initial spots from init_spots.json
- Uploads photos for each spot from SEED_IMAGE_DIR

Environment variables:

BACKEND_BASE_URL   - e.g. http://localhost:8000/api or http://pakalspot-backend.pakalspot-dev.svc.cluster.local/api
ADMIN_EMAIL        - admin user email
ADMIN_PASSWORD     - admin user password
SEED_IMAGE_DIR     - path inside the container with seed images (e.g. /app/seed_images)
SPOTS_JSON_PATH    - optional override for init_spots.json location

This script is safe to run multiple times in a simple way
(if the backend prevents exact duplicates or you run it only once per env).
"""

import os
import json
from pathlib import Path

import requests

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000/api")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@pakalspot.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme123")
SEED_IMAGE_DIR = Path(os.getenv("SEED_IMAGE_DIR", "/app/seed_images"))
SPOTS_JSON_PATH = os.getenv("SPOTS_JSON_PATH", "")


def log(msg: str) -> None:
    print(f"[seed_cloud] {msg}")


def load_spots_data() -> list[dict]:
    """
    Load spots data from init_spots.json, similar to the local seed.py logic.
    Supports both:
    {
      "spots": [ ... ]
    }
    and:
    [ ... ]
    """
    possible_paths = []

    # If user provided explicit path – try it first
    if SPOTS_JSON_PATH:
        possible_paths.append(Path(SPOTS_JSON_PATH))

    # Default paths (like in seed.py)
    possible_paths.extend(
        [
            Path("/app/app/db/init_spots.json"),
            Path(__file__).parent / "init_spots.json",
            Path("app/db/init_spots.json"),
        ]
    )

    spots_data = None
    for path in possible_paths:
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
                spots_data = data.get("spots", data)
            log(f"Loaded spots data from {path}")
            break

    if spots_data is None:
        log("Warning: init_spots.json not found, using empty list")
        return []

    return spots_data


def get_token() -> str:
    """
    Try to login. If login fails with 401, try to register and then login.
    Adjust endpoints if yours are different.
    """
    login_url = f"{BACKEND_BASE_URL}/auth/login"
    register_url = f"{BACKEND_BASE_URL}/auth/register"

    payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

    # Try login first
    resp = requests.post(login_url, json=payload)
    if resp.status_code == 200:
        data = resp.json()
        token = data.get("access_token") or data.get("token")
        if not token:
            raise RuntimeError("Login succeeded but no token found in response")
        log("Logged in as existing admin user")
        return token

    # If unauthorized, try to register
    if resp.status_code == 401:
        log("Login failed, trying to register admin user...")
        reg_payload = {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "full_name": "PakalSpot Admin",
        }
        reg_resp = requests.post(register_url, json=reg_payload)
        if reg_resp.status_code not in (200, 201):
            raise RuntimeError(
                f"Failed to register admin user: {reg_resp.status_code} {reg_resp.text}"
            )

        log("Admin user registered, logging in...")
        resp = requests.post(login_url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token") or data.get("token")
        if not token:
            raise RuntimeError("Login after register succeeded but no token in response")
        return token

    raise RuntimeError(f"Unexpected login error: {resp.status_code} {resp.text}")


def create_spot(session: requests.Session, token: str, spot_data: dict) -> str:
    """
    Create a spot via API from a JSON record similar to init_spots.json.

    JSON example:
    {
      "title": "...",
      "subtitle": "...",
      "location_name": "...",
      "description": "...",
      "how_to_get_there": "...",
      "spot_type": "spring",
      "latitude": 32.9,
      "longitude": 35.6,
      "photos": [...]
    }

    API payload is adapted from this structure.
    """
    url = f"{BACKEND_BASE_URL}/spots"
    headers = {"Authorization": f"Bearer {token}"}

    # Support both latitude/longitude and lat/lon
    lat = spot_data.get("latitude", spot_data.get("lat"))
    lon = spot_data.get("longitude", spot_data.get("lon"))

    if lat is None or lon is None:
        raise RuntimeError(f"Spot is missing coordinates: {spot_data}")

    # Use title as the main "name" for the API
    name = spot_data.get("title") or spot_data.get("name") or "Unnamed spot"

    # Region may not exist in init_spots.json – fall back to generic value
    region = spot_data.get("region", "unknown")

    payload = {
        "name": name,
        "description": spot_data.get("description", ""),
        "latitude": lat,
        "longitude": lon,
        "region": region,
        "spot_type": spot_data.get("spot_type", "viewpoint"),
        # אפשר להרחיב פה אם יש שדות נוספים ב־SpotCreate
        # למשל: "location_name": spot_data.get("location_name")
    }

    resp = session.post(url, json=payload, headers=headers)
    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Failed to create spot {name}: {resp.status_code} {resp.text}"
        )

    data = resp.json()
    spot_id = str(data.get("id") or data.get("spot_id"))
    if not spot_id:
        raise RuntimeError("Spot created but no id returned")
    log(f"Created spot '{name}' -> id={spot_id}")
    return spot_id


def upload_photo(session, token: str, spot_id: str, image_path: Path) -> None:
    """
    Upload a single photo to a specific spot via API.
    """
    url = f"{BACKEND_BASE_URL}/spots/{spot_id}/photos"
    headers = {"Authorization": f"Bearer {token}"}

    if not image_path.exists():
        log(f"Image file not found: {image_path}, skipping")
        return

    with image_path.open("rb") as f:
        files = {"file": (image_path.name, f, "image/jpeg")}
        resp = session.post(url, files=files, headers=headers)

    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Failed to upload photo {image_path.name} for spot {spot_id}: "
            f"{resp.status_code} {resp.text}"
        )

    log(f"Uploaded photo {image_path.name} for spot {spot_id}")


def upload_photos_for_spot(
    session: requests.Session, token: str, spot_id: str, spot_data: dict
) -> None:
    """
    Upload all photos defined for a spot in init_spots.json.
    Supports:
      "photos": ["IMG_1.JPG", "IMG_2.JPG"]
    or
      "photo": "IMG_1.JPG, IMG_2.JPG"
    """
    photos_field = spot_data.get("photos")

    if isinstance(photos_field, list):
        filenames = photos_field
    elif isinstance(photos_field, str) and photos_field.strip():
        filenames = [p.strip() for p in photos_field.split(",")]
    else:
        # Fallback to legacy "photo" field
        legacy = spot_data.get("photo", "")
        if legacy:
            filenames = [p.strip() for p in legacy.split(",")]
        else:
            log(f"No photos defined for spot '{spot_data.get('title', 'Unnamed')}'")
            return

    for filename in filenames:
        if not filename:
            continue
        img_path = SEED_IMAGE_DIR / filename
        try:
            upload_photo(session, token, spot_id, img_path)
        except Exception as e:
            log(f"Error uploading photo {filename} for spot '{spot_data.get('title')}': {e}")


def main() -> None:
    log(f"Using BACKEND_BASE_URL={BACKEND_BASE_URL}")
    log(f"Using SEED_IMAGE_DIR={SEED_IMAGE_DIR}")
    token = get_token()
    session = requests.Session()

    spots = load_spots_data()
    if not spots:
        log("No spots found in init_spots.json, nothing to seed.")
        return

    for spot_data in spots:
        try:
            spot_id = create_spot(session, token, spot_data)
        except Exception as e:
            log(f"Error creating spot '{spot_data.get('title', 'Unnamed')}': {e}")
            continue

        try:
            upload_photos_for_spot(session, token, spot_id, spot_data)
        except Exception as e:
            log(
                f"Error uploading photos for spot '{spot_data.get('title', 'Unnamed')}': {e}"
            )

    log("Seeding completed")


if __name__ == "__main__":
    main()
