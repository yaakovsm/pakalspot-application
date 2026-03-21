"""
Photo URL building helper - DRY centralized URL generation.

Detects init photos by object_key prefix pattern ("photos/") and uses
INIT_PHOTOS_BASE_URL (CloudFront domain) for init photos, otherwise
uses existing logic for user-uploaded photos.

Also recognizes legacy rows (pakalspot-init-photos/ keys, stale pakalspot.local
URLs) so the API does not echo dev hostnames from the database.
"""

from urllib.parse import unquote, urlparse

from app import models
from app.core.settings import settings


def _filename_from_object_key(object_key: str) -> str:
    parts = object_key.strip().split("/")
    return parts[-1] if parts else object_key


def _filename_from_media_url(url: str) -> str | None:
    if not url:
        return None
    path = urlparse(url).path
    segments = [s for s in path.split("/") if s]
    if not segments:
        return None
    return unquote(segments[-1])


def _path_from_init_bucket_url(url: str) -> str | None:
    """If url points at the init seed bucket, return object key path like photos/IMG.JPG."""
    if not url or "pakalspot-init-photos" not in url or ".s3" not in url:
        return None
    path = urlparse(url).path.lstrip("/")
    if not path:
        return None
    if path.startswith("photos/"):
        return path
    # Single segment at bucket root
    if "/" not in path:
        return f"photos/{path}"
    return f"photos/{path.split('/')[-1]}"


def normalized_init_object_key(photo: models.Photo) -> str | None:
    """
    Return canonical init key ``photos/{filename}`` if this row is a seeded init photo.

    Returns None for user-uploaded photos so callers keep using ``photo.url``.
    """
    ok = (photo.object_key or "").strip()
    url = photo.url or ""

    if ok.startswith("photos/"):
        return ok
    if ok.startswith("pakalspot-init-photos/"):
        return f"photos/{_filename_from_object_key(ok)}"

    path_from_url = _path_from_init_bucket_url(url)
    if path_from_url:
        return path_from_url

    # Stale dev / mis-seeded URLs: backend proxy was written with default BASE_URL
    if "pakalspot.local" in url and "/media/" in url:
        fn = _filename_from_media_url(url)
        if not fn:
            return None
        if not ok or ok.endswith(fn) or ok == fn or ok.endswith(f"/{fn}"):
            return f"photos/{fn}"
        return None

    return None


def build_photo_url(photo: models.Photo) -> str:
    """
    Build photo URL based on photo source.

    - Init photos: INIT_PHOTOS_BASE_URL (CloudFront) or direct S3 for public bucket
    - User uploads: existing photo.url (presigned URL or S3 URL)
    """
    init_key = normalized_init_object_key(photo)
    if init_key:
        if not settings.INIT_PHOTOS_BASE_URL:
            return f"https://pakalspot-init-photos.s3.amazonaws.com/{init_key}"
        base_url = settings.INIT_PHOTOS_BASE_URL.rstrip("/")
        return f"{base_url}/{init_key}"
    return photo.url


def build_photo_url_from_object_key(object_key: str, existing_url: str | None = None) -> str:
    """
    Build photo URL from object_key (for new photos not yet in DB).

    Accepts legacy ``pakalspot-init-photos/{filename}`` keys.
    """
    ok = (object_key or "").strip()
    if ok.startswith("pakalspot-init-photos/"):
        ok = f"photos/{_filename_from_object_key(ok)}"

    if ok.startswith("photos/"):
        if not settings.INIT_PHOTOS_BASE_URL:
            return f"https://pakalspot-init-photos.s3.amazonaws.com/{ok}"
        base_url = settings.INIT_PHOTOS_BASE_URL.rstrip("/")
        return f"{base_url}/{ok}"
    if existing_url:
        return existing_url
    return f"https://{settings.S3_BUCKET}.s3.amazonaws.com/{ok}"
