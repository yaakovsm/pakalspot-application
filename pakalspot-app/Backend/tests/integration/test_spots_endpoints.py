from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import MagicMock, patch

from app.main import app
from app.core.database import get_db
from app import models
from app.core.security import create_access_token
import uuid

# Create a test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
models.Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

API_SPOTS = "/api/spots/"


class TestSpotsEndpoints:
    """Integration tests for spots endpoints."""

    def setup_method(self):
        """Set up test data before each test."""
        db = TestingSessionLocal()
        db.query(models.Photo).delete()
        db.query(models.Spot).delete()
        db.query(models.User).delete()
        db.commit()
        db.close()

    def create_test_user(self):
        """Create a test user and return auth token."""
        db = TestingSessionLocal()
        user = models.User(
            id=str(uuid.uuid4()),
            email="test@example.com",
            password_hash="hashed_password",
            display_name="Test User",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.close()

        token = create_access_token(str(user.id))
        return token, user

    def test_create_spot_success(self):
        """Test successful spot creation (multipart form, no photos)."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}

        data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "type": "viewpoint",
            "latitude": "32.5",
            "longitude": "35.0",
        }

        response = client.post(API_SPOTS, data=data, headers=headers)

        assert response.status_code == 200
        body = response.json()
        assert body["title"] == data["title"]
        assert body["description"] == data["description"]
        assert body["spot_type"] == data["type"]
        assert "id" in body
        assert "created_at" in body

    def test_create_spot_multipart_with_photo(self):
        """POST /api/spots/ with form + file; S3 client mocked."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}

        form = {
            "title": "With Photo",
            "description": "Spot with image",
            "type": "forest",
            "latitude": "31.5",
            "longitude": "34.8",
        }
        files = [
            ("photos", ("test.jpg", b"\xff\xd8\xff\xe0 fake jpeg bytes", "image/jpeg")),
        ]
        mock_s3 = MagicMock()
        with patch("app.routers.spots.get_s3_client", return_value=mock_s3):
            response = client.post(API_SPOTS, data=form, files=files, headers=headers)

        assert response.status_code == 200, response.text
        body = response.json()
        assert body["title"] == "With Photo"
        assert mock_s3.put_object.called
        assert len(body.get("photos") or []) == 1

    def test_create_spot_unauthorized(self):
        """Test spot creation without authentication."""
        data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "type": "viewpoint",
            "latitude": "32.5",
            "longitude": "35.0",
        }

        response = client.post(API_SPOTS, data=data)

        assert response.status_code == 401

    def test_create_spot_invalid_data(self):
        """Test spot creation with invalid data."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}

        data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
        }

        response = client.post(API_SPOTS, data=data, headers=headers)
        assert response.status_code == 422

    def test_list_spots(self):
        """Test listing all spots."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}

        spot_data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "type": "viewpoint",
            "latitude": "32.5",
            "longitude": "35.0",
        }
        client.post(API_SPOTS, data=spot_data, headers=headers)

        response = client.get(API_SPOTS)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["title"] == spot_data["title"]

    def test_get_spot_by_id(self):
        """Test getting a specific spot by ID."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}

        spot_data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "type": "viewpoint",
            "latitude": "32.5",
            "longitude": "35.0",
        }
        create_response = client.post(API_SPOTS, data=spot_data, headers=headers)
        spot_id = create_response.json()["id"]

        response = client.get(f"/api/spots/{spot_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == spot_id
        assert data["title"] == spot_data["title"]

    def test_get_spot_nonexistent(self):
        """Test getting a non-existent spot."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/api/spots/{fake_id}")

        assert response.status_code == 404

    def test_create_spot_invalid_coordinates(self):
        """Test spot creation with extreme coordinates (still accepted by API)."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}

        data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "type": "viewpoint",
            "latitude": "999.0",
            "longitude": "35.0",
        }

        response = client.post(API_SPOTS, data=data, headers=headers)
        assert response.status_code == 200

    def test_create_spot_unknown_type_defaults_to_viewpoint(self):
        """Unknown type strings fall back to viewpoint (parse_spot_type)."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}

        data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "type": "invalid_type",
            "latitude": "32.5",
            "longitude": "35.0",
        }

        response = client.post(API_SPOTS, data=data, headers=headers)
        assert response.status_code == 200
        assert response.json()["spot_type"] == "viewpoint"
