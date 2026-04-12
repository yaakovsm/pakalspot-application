import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_db
from app.core.settings import settings
from app import models
from app.core.security import create_access_token
import uuid

# Same sqlite file as other integration tests so dependency override sees one DB.
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

models.Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

API_CONTACT = "/api/contact"
API_SUBMISSIONS = "/api/contact/submissions"


class TestContactEndpoints:
    def setup_method(self):
        db = TestingSessionLocal()
        db.query(models.ContactSubmission).delete()
        db.query(models.Photo).delete()
        db.query(models.Spot).delete()
        db.query(models.User).delete()
        db.commit()
        db.close()

    def create_user_token(self, email: str = "user@example.com"):
        db = TestingSessionLocal()
        user = models.User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash="x",
            display_name="User",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        db.close()
        return create_access_token(str(user.id))

    def test_post_contact_success(self):
        body = {
            "name": "Test User",
            "email": "reporter@example.com",
            "issue": "The map is broken on mobile.",
        }
        r = client.post(API_CONTACT, json=body)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        assert "id" in data

        token = self.create_user_token(settings.ADMIN_EMAIL)
        lr = client.get(API_SUBMISSIONS, headers={"Authorization": f"Bearer {token}"})
        assert lr.status_code == 200
        items = lr.json()
        assert len(items) >= 1
        match = next((x for x in items if x.get("email") == "reporter@example.com"), None)
        assert match is not None
        assert match["name"] == "Test User"
        assert match["issue"] == "The map is broken on mobile."

    def test_post_contact_invalid_email(self):
        r = client.post(
            API_CONTACT,
            json={"name": "A", "email": "not-an-email", "issue": "Hi"},
        )
        assert r.status_code == 422

    def test_post_contact_empty_after_strip(self):
        r = client.post(
            API_CONTACT,
            json={"name": "   ", "email": "a@b.co", "issue": "valid"},
        )
        assert r.status_code == 400

        r2 = client.post(
            API_CONTACT,
            json={"name": "OK", "email": "a@b.co", "issue": "   "},
        )
        assert r2.status_code == 400

    def test_list_submissions_no_auth(self):
        client.post(
            API_CONTACT,
            json={"name": "N", "email": "n@e.co", "issue": "I"},
        )
        r = client.get(API_SUBMISSIONS)
        assert r.status_code == 401

    def test_list_submissions_non_admin(self):
        client.post(
            API_CONTACT,
            json={"name": "N", "email": "n@e.co", "issue": "I"},
        )
        token = self.create_user_token("regular@example.com")
        r = client.get(API_SUBMISSIONS, headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 403

    def test_list_submissions_admin(self):
        client.post(
            API_CONTACT,
            json={"name": "Alice", "email": "alice@example.com", "issue": "Hello"},
        )
        token = self.create_user_token(settings.ADMIN_EMAIL)
        r = client.get(API_SUBMISSIONS, headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) == 1
        assert items[0]["name"] == "Alice"
        assert items[0]["email"] == "alice@example.com"
        assert items[0]["issue"] == "Hello"
