"""Featured events, the max_featured cap, and the public settings endpoint."""


def test_list_events_puts_featured_first(client, make_event):
    # Soonest last, so date ordering alone could not produce the expected order.
    make_event(title="Plain", event_date="2026-08-10", is_featured=False)
    make_event(title="Starred", event_date="2026-09-20", is_featured=True)

    response = client.get("/api/events")

    assert response.status_code == 200
    assert [event["title"] for event in response.json()] == ["Starred", "Plain"]


def test_list_events_featured_filter(client, make_event):
    make_event(title="Plain", is_featured=False)
    make_event(title="Starred", is_featured=True)

    response = client.get("/api/events", params={"featured": "true"})

    assert response.status_code == 200
    body = response.json()
    assert [event["title"] for event in body] == ["Starred"]
    assert body[0]["is_featured"] is True


def test_list_events_featured_filter_excludes_when_false(client, make_event):
    make_event(title="Plain", is_featured=False)
    make_event(title="Starred", is_featured=True)

    response = client.get("/api/events", params={"featured": "false"})

    assert [event["title"] for event in response.json()] == ["Plain"]


def test_featured_filter_still_hides_closed_events(client, make_event):
    """Featuring must not be a way around the open-events-only rule."""
    make_event(title="Closed but starred", status="closed", is_featured=True)

    response = client.get("/api/events", params={"featured": "true"})

    assert response.json() == []


def test_list_events_limit(client, make_event):
    make_event(title="A", event_date="2026-08-10")
    make_event(title="B", event_date="2026-08-11")

    response = client.get("/api/events", params={"limit": 1})

    assert [event["title"] for event in response.json()] == ["A"]


def test_create_event_can_be_featured(client, admin_headers):
    response = client.post(
        "/api/admin/events",
        headers=admin_headers,
        json={
            "title": "Launch",
            "description": "Big one.",
            "venue": "Hall",
            "event_date": "2026-08-14",
            "start_time": "09:00:00",
            "end_time": "17:00:00",
            "capacity": 10,
            "is_featured": True,
        },
    )

    assert response.status_code == 201, response.text
    assert response.json()["is_featured"] is True


def test_update_event_toggles_featured(client, admin_headers, make_event):
    event = make_event(is_featured=False)

    response = client.put(
        f"/api/admin/events/{event.id}", headers=admin_headers, json={"is_featured": True}
    )

    assert response.status_code == 200, response.text
    assert response.json()["is_featured"] is True


def test_featuring_past_the_cap_is_refused(client, admin_headers, make_event):
    client.put("/api/admin/settings", headers=admin_headers, json={"max_featured": 1})
    make_event(title="First", is_featured=True)
    runner_up = make_event(title="Second", is_featured=False)

    response = client.put(
        f"/api/admin/events/{runner_up.id}", headers=admin_headers, json={"is_featured": True}
    )

    assert response.status_code == 409
    assert "Only 1 events" in response.json()["detail"]


def test_resaving_an_already_featured_event_is_not_capped(client, admin_headers, make_event):
    """The cap counts other events — an event must not block its own edit."""
    client.put("/api/admin/settings", headers=admin_headers, json={"max_featured": 1})
    event = make_event(title="First", is_featured=True)

    response = client.put(
        f"/api/admin/events/{event.id}",
        headers=admin_headers,
        json={"is_featured": True, "title": "First, renamed"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["title"] == "First, renamed"


def test_a_closed_featured_event_does_not_spend_a_slot(client, admin_headers, make_event):
    """Only open events show in the strip, so only they count against the cap."""
    client.put("/api/admin/settings", headers=admin_headers, json={"max_featured": 1})
    make_event(title="Closed but still flagged", status="closed", is_featured=True)
    contender = make_event(title="Open", is_featured=False)

    response = client.put(
        f"/api/admin/events/{contender.id}", headers=admin_headers, json={"is_featured": True}
    )

    assert response.status_code == 200, response.text
    assert response.json()["is_featured"] is True


def test_unfeaturing_is_never_capped(client, admin_headers, make_event):
    client.put("/api/admin/settings", headers=admin_headers, json={"max_featured": 0})
    event = make_event(is_featured=True)

    response = client.put(
        f"/api/admin/events/{event.id}", headers=admin_headers, json={"is_featured": False}
    )

    assert response.status_code == 200, response.text
    assert response.json()["is_featured"] is False


# --- Settings --------------------------------------------------------------


def test_admin_settings_have_defaults(client, admin_headers):
    response = client.get("/api/admin/settings", headers=admin_headers)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["max_featured"] == 5
    assert body["show_featured_marquee"] is True
    assert body["default_category"] == "General"


def test_settings_update_persists(client, admin_headers):
    client.put(
        "/api/admin/settings",
        headers=admin_headers,
        json={"max_featured": 3, "show_featured_marquee": False},
    )

    body = client.get("/api/admin/settings", headers=admin_headers).json()
    assert body["max_featured"] == 3
    assert body["show_featured_marquee"] is False
    # Untouched fields survive a partial update.
    assert body["default_category"] == "General"


def test_settings_reject_out_of_range_max_featured(client, admin_headers):
    response = client.put(
        "/api/admin/settings", headers=admin_headers, json={"max_featured": 999}
    )

    assert response.status_code == 422


def test_admin_settings_require_admin(client, user_headers):
    assert client.get("/api/admin/settings", headers=user_headers).status_code == 403
    assert (
        client.put("/api/admin/settings", headers=user_headers, json={"max_featured": 1}).status_code
        == 403
    )


def test_public_settings_need_no_auth(client):
    response = client.get("/api/settings")

    assert response.status_code == 200, response.text
    assert response.json() == {"show_featured_marquee": True, "max_featured": 5}


def test_public_settings_hide_admin_only_fields(client, admin_headers):
    """The unauthed endpoint must not leak admin-facing settings."""
    client.put(
        "/api/admin/settings", headers=admin_headers, json={"default_category": "Secret"}
    )

    body = client.get("/api/settings").json()

    assert "default_category" not in body
    assert "default_event_status" not in body
