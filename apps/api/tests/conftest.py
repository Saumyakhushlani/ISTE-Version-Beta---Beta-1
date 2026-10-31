"""
Pytest configuration and session-wide fixtures for Financial Decision Lab (FDL).
Ensures SQLite schema is created and demo user Aarav is present before tests execute.
Provides authenticated headers fixtures for user isolation testing.
"""

import pytest
from db.database import Base, engine, SessionLocal
from db.models import User, UserProfile, DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_PASSWORD_HASH
from auth import create_access_token

@pytest.fixture(scope="session", autouse=True)
def initialize_test_database():
    """Initializes all database tables and ensures demo user exists before test execution."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    existing_user = db.query(User).filter_by(id=DEMO_USER_ID).first()
    if not existing_user:
        aarav = User(
            id=DEMO_USER_ID,
            email=DEMO_USER_EMAIL,
            password_hash=DEMO_USER_PASSWORD_HASH,
            is_active=True,
            is_onboarded=True
        )
        db.add(aarav)
        db.commit()

        profile = UserProfile(
            user_id=DEMO_USER_ID,
            full_name="Aarav Kumar",
            mobile_number="+91 98765 43210",
            country="India",
            preferred_currency="INR"
        )
        db.add(profile)
        db.commit()
    db.close()
    yield

@pytest.fixture
def auth_headers_aarav():
    token = create_access_token(user_id=DEMO_USER_ID, email=DEMO_USER_EMAIL)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_user_a(db_session):
    user_a = User(
        id="usr_test_user_a",
        email="usera@example.com",
        password_hash=DEMO_USER_PASSWORD_HASH,
        is_active=True,
        is_onboarded=True
    )
    db_session.merge(user_a)
    db_session.commit()
    token = create_access_token(user_id="usr_test_user_a", email="usera@example.com")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_user_b(db_session):
    user_b = User(
        id="usr_test_user_b",
        email="userb@example.com",
        password_hash=DEMO_USER_PASSWORD_HASH,
        is_active=True,
        is_onboarded=True
    )
    db_session.merge(user_b)
    db_session.commit()
    token = create_access_token(user_id="usr_test_user_b", email="userb@example.com")
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
