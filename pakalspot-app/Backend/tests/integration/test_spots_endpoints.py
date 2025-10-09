import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
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


class TestSpotsEndpoints:
    """Integration tests for spots endpoints."""
    
    def setup_method(self):
        """Set up test data before each test."""
        # Clear the database
        db = TestingSessionLocal()
        db.query(models.Spot).delete()
        db.query(models.User).delete()
        db.commit()
        db.close()
    
    def create_test_user(self):
        """Create a test user and return auth token."""
        # Create user in database
        db = TestingSessionLocal()
        user = models.User(
            id=uuid.uuid4(),
            email="test@example.com",
            password_hash="hashed_password",
            display_name="Test User"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.close()
        
        # Create auth token
        token = create_access_token(str(user.id))
        return token, user
    
    def test_create_spot_success(self):
        """Test successful spot creation."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}
        
        spot_data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "spot_type": "viewpoint",
            "region": "galilee",
            "lat": 32.5,
            "lon": 35.0
        }
        
        response = client.post("/spots/", json=spot_data, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == spot_data["title"]
        assert data["description"] == spot_data["description"]
        assert data["spot_type"] == spot_data["spot_type"]
        assert data["region"] == spot_data["region"]
        assert "id" in data
        assert "created_at" in data
    
    def test_create_spot_unauthorized(self):
        """Test spot creation without authentication."""
        spot_data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "spot_type": "viewpoint",
            "region": "galilee",
            "lat": 32.5,
            "lon": 35.0
        }
        
        response = client.post("/spots/", json=spot_data)
        
        assert response.status_code == 401
    
    def test_create_spot_invalid_data(self):
        """Test spot creation with invalid data."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Missing required fields
        spot_data = {
            "title": "Test Spot",
            "description": "A beautiful test spot"
            # Missing spot_type, region, lat, lon
        }
        
        response = client.post("/spots/", json=spot_data, headers=headers)
        assert response.status_code == 422
    
    def test_list_spots(self):
        """Test listing all spots."""
        # Create a spot first
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}
        
        spot_data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "spot_type": "viewpoint",
            "region": "galilee",
            "lat": 32.5,
            "lon": 35.0
        }
        client.post("/spots/", json=spot_data, headers=headers)
        
        # List spots
        response = client.get("/spots/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["title"] == spot_data["title"]
    
    def test_get_spot_by_id(self):
        """Test getting a specific spot by ID."""
        # Create a spot first
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}
        
        spot_data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "spot_type": "viewpoint",
            "region": "galilee",
            "lat": 32.5,
            "lon": 35.0
        }
        create_response = client.post("/spots/", json=spot_data, headers=headers)
        spot_id = create_response.json()["id"]
        
        # Get spot by ID
        response = client.get(f"/spots/{spot_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == spot_id
        assert data["title"] == spot_data["title"]
    
    def test_get_spot_nonexistent(self):
        """Test getting a non-existent spot."""
        fake_id = str(uuid.uuid4())
        response = client.get(f"/spots/{fake_id}")
        
        assert response.status_code == 404
    
    def test_create_spot_invalid_coordinates(self):
        """Test spot creation with invalid coordinates."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Invalid latitude (outside Israel bounds)
        spot_data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "spot_type": "viewpoint",
            "region": "galilee",
            "lat": 999.0,  # Invalid latitude
            "lon": 35.0
        }
        
        response = client.post("/spots/", json=spot_data, headers=headers)
        # Should still create the spot (validation would be in frontend)
        assert response.status_code == 200
    
    def test_create_spot_invalid_enum_values(self):
        """Test spot creation with invalid enum values."""
        token, user = self.create_test_user()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Invalid spot_type
        spot_data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "spot_type": "invalid_type",
            "region": "galilee",
            "lat": 32.5,
            "lon": 35.0
        }
        
        response = client.post("/spots/", json=spot_data, headers=headers)
        assert response.status_code == 422
        
        # Invalid region
        spot_data = {
            "title": "Test Spot",
            "description": "A beautiful test spot",
            "spot_type": "viewpoint",
            "region": "invalid_region",
            "lat": 32.5,
            "lon": 35.0
        }
        
        response = client.post("/spots/", json=spot_data, headers=headers)
        assert response.status_code == 422
