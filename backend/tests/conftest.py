import os

from dotenv import load_dotenv

# Point the app at the test database *before* app.config is imported.
load_dotenv()
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/event_checkin_test"
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.auth import hash_password  # noqa: E402
from app.database import Base, SessionLocal, engine, get_db  # noqa: E402
from app.limiter import limiter  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Event, EventStatus, User, UserRole  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _schema() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def _clean_tables(_schema):
    with engine.begin() as conn:
        # settings included: it is a singleton the app creates on demand, so a
        # test that lowers max_featured would otherwise leak into every test
        # that runs after it.
        conn.execute(
            text(
                "TRUNCATE announcements, tickets, events, users, settings"
                " RESTART IDENTITY CASCADE"
            )
        )
    yield


@pytest.fixture(autouse=True)
def _no_rate_limit():
    """Rate limits are off by default; the rate-limit test re-enables them."""
    limiter.enabled = False
    yield
    limiter.enabled = False


@pytest.fixture
def client(db):
    def _override_get_db():
        session = SessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# --- Data helpers ----------------------------------------------------------


@pytest.fixture
def user(db) -> User:
    record = User(
        name="Reg User",
        email="user@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@pytest.fixture
def other_user(db) -> User:
    record = User(
        name="Other User",
        email="other@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.user,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@pytest.fixture
def admin(db) -> User:
    record = User(
        name="Admin",
        email="admin@example.com",
        password_hash=hash_password("password123"),
        role=UserRole.admin,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def _token(client: TestClient, email: str) -> str:
    response = client.post(
        "/api/auth/login", data={"username": email, "password": "password123"}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture
def user_headers(client, user) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token(client, user.email)}"}


@pytest.fixture
def other_user_headers(client, other_user) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token(client, other_user.email)}"}


@pytest.fixture
def admin_headers(client, admin) -> dict[str, str]:
    return {"Authorization": f"Bearer {_token(client, admin.email)}"}


@pytest.fixture
def make_event(db, admin):
    def _make(**overrides) -> Event:
        defaults = dict(
            title="React Native Summit",
            description="A day of talks.",
            venue="Metro Convention Center",
            latitude=10.3181,
            longitude=123.9055,
            event_date="2026-08-14",
            start_time="09:00:00",
            end_time="17:00:00",
            capacity=100,
            price=0,
            category="Tech",
            image_url="https://example.com/img.png",
            status=EventStatus.open,
            created_by=admin.id,
        )
        defaults.update(overrides)
        record = Event(**defaults)
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    return _make
