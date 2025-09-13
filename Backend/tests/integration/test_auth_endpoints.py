import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import get_db
from app import models
import tempfile
import os

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


class TestAuthEndpoints:
    """Integration tests for authentication endpoints."""
    
    def setup_method(self):
        """Set up test data before each test."""
        # Clear the database
        db = TestingSessionLocal()
        db.query(models.User).delete()
        db.commit()
        db.close()
    
    def test_register_success(self):
        """Test successful user registration."""
        user_data = {
            "email": "test@example.com",
            "password": "test_password_123",
            "display_name": "Test User"
        }
        
        response = client.post("/auth/register", json=user_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["display_name"] == user_data["display_name"]
        assert "id" in data
        assert "password_hash" not in data  # Password should not be returned
    
    def test_register_duplicate_email(self):
        """Test registration with duplicate email."""
        user_data = {
            "email": "test@example.com",
            "password": "test_password_123",
            "display_name": "Test User"
        }
        
        # Register first user
        response1 = client.post("/auth/register", json=user_data)
        assert response1.status_code == 200
        
        # Try to register with same email
        response2 = client.post("/auth/register", json=user_data)
        assert response2.status_code == 400
        assert "Email already registered" in response2.json()["detail"]
    
    def test_register_invalid_data(self):
        """Test registration with invalid data."""
        # Missing email
        user_data = {
            "password": "test_password_123",
            "display_name": "Test User"
        }
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422
        
        # Missing password
        user_data = {
            "email": "test@example.com",
            "display_name": "Test User"
        }
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422
        
        # Missing display_name
        user_data = {
            "email": "test@example.com",
            "password": "test_password_123"
        }
        response = client.post("/auth/register", json=user_data)
        assert response.status_code == 422
    
    def test_login_success(self):
        """Test successful user login."""
        # First register a user
        user_data = {
            "email": "test@example.com",
            "password": "test_password_123",
            "display_name": "Test User"
        }
        client.post("/auth/register", json=user_data)
        
        # Then login
        login_data = {
            "email": "test@example.com",
            "password": "test_password_123"
        }
        response = client.post("/auth/login", json=login_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == user_data["email"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        # First register a user
        user_data = {
            "email": "test@example.com",
            "password": "test_password_123",
            "display_name": "Test User"
        }
        client.post("/auth/register", json=user_data)
        
        # Try to login with wrong password
        login_data = {
            "email": "test@example.com",
            "password": "wrong_password"
        }
        response = client.post("/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent user."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "test_password_123"
        }
        response = client.post("/auth/login", json=login_data)
        
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]
    
    def test_login_invalid_data(self):
        """Test login with invalid data."""
        # Missing email
        login_data = {
            "password": "test_password_123"
        }
        response = client.post("/auth/login", json=login_data)
        assert response.status_code == 422
        
        # Missing password
        login_data = {
            "email": "test@example.com"
        }
        response = client.post("/auth/login", json=login_data)
        assert response.status_code == 422
