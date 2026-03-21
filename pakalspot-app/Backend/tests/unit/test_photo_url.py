"""Unit tests for init photo URL normalization."""

from types import SimpleNamespace
from unittest.mock import patch

from app.services.photo_url import (
    build_photo_url,
    build_photo_url_from_object_key,
    normalized_init_object_key,
)


def _photo(object_key: str, url: str = "", thumbnail_url=None):
    return SimpleNamespace(
        object_key=object_key,
        url=url,
        thumbnail_url=thumbnail_url,
    )


def test_normalized_init_object_key_photos_prefix():
    p = _photo("photos/IMG_5307.JPG", "http://ignored")
    assert normalized_init_object_key(p) == "photos/IMG_5307.JPG"


def test_normalized_init_object_key_legacy_bucket_prefix():
    p = _photo("pakalspot-init-photos/IMG_5307.JPG", "")
    assert normalized_init_object_key(p) == "photos/IMG_5307.JPG"


def test_normalized_init_object_key_stale_local_proxy_url():
    p = _photo(
        "pakalspot-init-photos/IMG_5307.JPG",
        "http://pakalspot.local/api/media/IMG_5307.JPG",
    )
    assert normalized_init_object_key(p) == "photos/IMG_5307.JPG"


def test_normalized_init_object_key_pakalspot_local_only_in_url():
    p = _photo(
        "orphan/IMG_5307.JPG",
        "http://pakalspot.local/api/media/IMG_5307.JPG",
    )
    assert normalized_init_object_key(p) == "photos/IMG_5307.JPG"


@patch("app.services.photo_url.settings")
def test_build_photo_url_init_uses_s3_when_no_cloudfront(mock_settings):
    mock_settings.INIT_PHOTOS_BASE_URL = None
    p = _photo("photos/IMG_5307.JPG", "")
    assert build_photo_url(p) == (
        "https://pakalspot-init-photos.s3.amazonaws.com/photos/IMG_5307.JPG"
    )


@patch("app.services.photo_url.settings")
def test_build_photo_url_from_object_key_legacy_prefix(mock_settings):
    mock_settings.INIT_PHOTOS_BASE_URL = None
    u = build_photo_url_from_object_key("pakalspot-init-photos/IMG_5307.JPG")
    assert u == "https://pakalspot-init-photos.s3.amazonaws.com/photos/IMG_5307.JPG"


def test_normalized_init_user_upload_returns_none():
    p = _photo("uploads/user-1/abc.jpg", "https://pakalspot-photos.s3.amazonaws.com/...")
    assert normalized_init_object_key(p) is None


def test_build_photo_url_user_upload_passthrough():
    p = _photo("uploads/x/y.jpg", "https://example.com/presigned")
    assert build_photo_url(p) == "https://example.com/presigned"
