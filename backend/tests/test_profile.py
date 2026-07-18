"""PATCH /api/auth/me and POST /api/auth/me/password."""


def test_update_profile_name(client, user_headers):
    response = client.patch("/api/auth/me", headers=user_headers, json={"name": "New Name"})

    assert response.status_code == 200, response.text
    assert response.json()["name"] == "New Name"
    assert client.get("/api/auth/me", headers=user_headers).json()["name"] == "New Name"


def test_update_profile_is_partial(client, user_headers):
    response = client.patch("/api/auth/me", headers=user_headers, json={"name": "Only Name"})

    assert response.json()["email"] == "user@example.com"


def test_update_profile_rejects_a_taken_email(client, user_headers, other_user):
    response = client.patch(
        "/api/auth/me", headers=user_headers, json={"email": other_user.email}
    )

    assert response.status_code == 409
    # The rolled-back session must leave the original address intact.
    assert client.get("/api/auth/me", headers=user_headers).json()["email"] == "user@example.com"


def test_update_profile_rejects_a_bad_email(client, user_headers):
    response = client.patch("/api/auth/me", headers=user_headers, json={"email": "not-an-email"})

    assert response.status_code == 422


def test_update_profile_requires_auth(client):
    assert client.patch("/api/auth/me", json={"name": "Nobody"}).status_code == 401


def test_change_password_then_log_in_with_it(client, user, user_headers):
    response = client.post(
        "/api/auth/me/password",
        headers=user_headers,
        json={"current_password": "password123", "new_password": "brand-new-pw"},
    )

    assert response.status_code == 204, response.text

    old = client.post(
        "/api/auth/login", data={"username": user.email, "password": "password123"}
    )
    assert old.status_code == 401

    new = client.post(
        "/api/auth/login", data={"username": user.email, "password": "brand-new-pw"}
    )
    assert new.status_code == 200


def test_change_password_needs_the_current_one(client, user, user_headers):
    response = client.post(
        "/api/auth/me/password",
        headers=user_headers,
        json={"current_password": "wrong-password", "new_password": "brand-new-pw"},
    )

    assert response.status_code == 400
    # The old password still works — nothing was changed.
    assert (
        client.post(
            "/api/auth/login", data={"username": user.email, "password": "password123"}
        ).status_code
        == 200
    )


def test_change_password_enforces_a_minimum_length(client, user_headers):
    response = client.post(
        "/api/auth/me/password",
        headers=user_headers,
        json={"current_password": "password123", "new_password": "short"},
    )

    assert response.status_code == 422


def test_change_password_requires_auth(client):
    response = client.post(
        "/api/auth/me/password",
        json={"current_password": "password123", "new_password": "brand-new-pw"},
    )

    assert response.status_code == 401
