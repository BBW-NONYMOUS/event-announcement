def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_register_creates_user_with_user_role(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "New User", "email": "new@example.com", "password": "password123"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["role"] == "user"
    assert "password_hash" not in body
    assert "password" not in body


def test_register_duplicate_email_returns_409(client, user):
    response = client.post(
        "/api/auth/register",
        json={"name": "Dupe", "email": user.email, "password": "password123"},
    )
    assert response.status_code == 409


def test_login_returns_token(client, user):
    response = client.post(
        "/api/auth/login", data={"username": user.email, "password": "password123"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_login_bad_password_returns_401(client, user):
    response = client.post(
        "/api/auth/login", data={"username": user.email, "password": "wrong-password"}
    )
    assert response.status_code == 401


def test_me_returns_current_user(client, user, user_headers):
    response = client.get("/api/auth/me", headers=user_headers)
    assert response.status_code == 200
    assert response.json()["email"] == user.email


def test_me_without_token_returns_401(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_garbage_token_returns_401(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert response.status_code == 401
