def _post_announcement(client, admin_headers, **payload):
    response = client.post("/api/admin/announcements", headers=admin_headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_admin_can_post_global_and_event_announcements(client, admin_headers, make_event):
    event = make_event()
    globally = _post_announcement(client, admin_headers, title="Global", body="Everyone")
    scoped = _post_announcement(
        client, admin_headers, title="Scoped", body="Ticket holders", event_id=event.id
    )
    assert globally["event_id"] is None
    assert scoped["event_id"] == event.id


def test_announcement_for_missing_event_returns_404(client, admin_headers):
    response = client.post(
        "/api/admin/announcements",
        headers=admin_headers,
        json={"title": "t", "body": "b", "event_id": 9999},
    )
    assert response.status_code == 404


def test_feed_shows_global_plus_own_event_only(
    client, admin_headers, user_headers, make_event
):
    mine = make_event(title="Mine")
    theirs = make_event(title="Theirs")
    client.post(f"/api/events/{mine.id}/register", headers=user_headers)

    _post_announcement(client, admin_headers, title="Global", body="b")
    _post_announcement(client, admin_headers, title="Mine", body="b", event_id=mine.id)
    _post_announcement(client, admin_headers, title="Theirs", body="b", event_id=theirs.id)

    response = client.get("/api/announcements", headers=user_headers)
    assert response.status_code == 200
    titles = {item["title"] for item in response.json()}
    assert titles == {"Global", "Mine"}


def test_feed_is_newest_first(client, admin_headers):
    _post_announcement(client, admin_headers, title="Older", body="b")
    _post_announcement(client, admin_headers, title="Newer", body="b")

    titles = [
        item["title"] for item in client.get("/api/announcements", headers=_headers(client)).json()
    ]
    assert titles == ["Newer", "Older"]


def test_pinned_announcements_sort_first(client, admin_headers):
    _post_announcement(client, admin_headers, title="Older pinned", body="b", pinned=True)
    _post_announcement(client, admin_headers, title="Newer", body="b")

    feed = client.get("/api/announcements", headers=_headers(client)).json()
    assert [item["title"] for item in feed] == ["Older pinned", "Newer"]
    assert feed[0]["pinned"] is True
    assert feed[1]["pinned"] is False


def _headers(client):
    client.post(
        "/api/auth/register",
        json={"name": "Feed", "email": "feed@example.com", "password": "password123"},
    )
    token = client.post(
        "/api/auth/login", data={"username": "feed@example.com", "password": "password123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_feed_requires_auth(client):
    assert client.get("/api/announcements").status_code == 401
