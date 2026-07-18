import pytest

from app.limiter import limiter


@pytest.fixture
def rate_limited():
    limiter.enabled = True
    limiter.reset()
    yield
    limiter.enabled = False
    limiter.reset()


def test_login_rate_limit_returns_429(client, user, rate_limited):
    # The /login limit is 10/minute; the 11th attempt must be rejected.
    for _ in range(10):
        response = client.post(
            "/api/auth/login", data={"username": user.email, "password": "password123"}
        )
        assert response.status_code == 200

    response = client.post(
        "/api/auth/login", data={"username": user.email, "password": "password123"}
    )
    assert response.status_code == 429


def test_checkin_rate_limit_returns_429(client, admin_headers, rate_limited):
    import uuid

    # The /checkin limit is 60/minute; unknown codes still consume the budget.
    for _ in range(60):
        client.post(
            "/api/admin/checkin", headers=admin_headers, json={"ticket_code": str(uuid.uuid4())}
        )

    response = client.post(
        "/api/admin/checkin", headers=admin_headers, json={"ticket_code": str(uuid.uuid4())}
    )
    assert response.status_code == 429
