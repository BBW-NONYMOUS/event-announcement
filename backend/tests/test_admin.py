import uuid

import pytest

from app.models import EventStatus, TicketStatus

EVENT_PAYLOAD = {
    "title": "Sunset Jazz",
    "description": "Live jazz by the bay.",
    "venue": "Bayfront Amphitheater",
    "latitude": 10.2993,
    "longitude": 123.8990,
    "event_date": "2026-08-20",
    "start_time": "18:30:00",
    "end_time": "22:00:00",
    "capacity": 50,
    "price": 45,
    "category": "Music",
    "image_url": "https://example.com/jazz.png",
}


def _register(client, event_id, headers) -> str:
    response = client.post(f"/api/events/{event_id}/register", headers=headers)
    assert response.status_code == 201, response.text
    return response.json()["ticket_code"]


# --- Guard rails -----------------------------------------------------------


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "/api/admin/events", None),
        ("post", "/api/admin/events", EVENT_PAYLOAD),
        ("put", "/api/admin/events/1", {"title": "x"}),
        ("post", "/api/admin/checkin", {"ticket_code": str(uuid.uuid4())}),
        ("get", "/api/admin/events/1/stats", None),
        ("get", "/api/admin/events/1/attendees", None),
        ("get", "/api/admin/announcements", None),
        ("post", "/api/admin/announcements", {"title": "t", "body": "b"}),
    ],
)
def test_admin_routes_reject_user_role_with_403(client, user_headers, method, path, body):
    kwargs = {"headers": user_headers}
    if body is not None:
        kwargs["json"] = body
    response = getattr(client, method)(path, **kwargs)
    assert response.status_code == 403


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "/api/admin/events", None),
        ("post", "/api/admin/events", EVENT_PAYLOAD),
        ("get", "/api/admin/events/1/stats", None),
        ("get", "/api/admin/events/1/attendees", None),
        ("get", "/api/admin/announcements", None),
    ],
)
def test_admin_routes_reject_anonymous_with_401(client, method, path, body):
    kwargs = {"json": body} if body is not None else {}
    response = getattr(client, method)(path, **kwargs)
    assert response.status_code == 401


# --- Events ----------------------------------------------------------------


def test_admin_event_list_includes_every_status(client, admin_headers, make_event):
    make_event(title="Open one", status=EventStatus.open)
    make_event(title="Closed one", status=EventStatus.closed, event_date="2026-08-15")
    make_event(title="Cancelled one", status=EventStatus.cancelled, event_date="2026-08-16")

    response = client.get("/api/admin/events", headers=admin_headers)
    assert response.status_code == 200
    titles = {event["title"] for event in response.json()}
    assert titles == {"Open one", "Closed one", "Cancelled one"}
    # The public list still only exposes the open one.
    assert [event["title"] for event in client.get("/api/events").json()] == ["Open one"]


def test_admin_event_list_carries_registered_count(
    client, admin_headers, user_headers, make_event
):
    event = make_event()
    _register(client, event.id, user_headers)

    body = client.get("/api/admin/events", headers=admin_headers).json()
    assert [e["registered_count"] for e in body if e["id"] == event.id] == [1]


def test_admin_event_list_is_empty_without_events(client, admin_headers):
    assert client.get("/api/admin/events", headers=admin_headers).json() == []


def test_admin_can_create_event(client, admin_headers):
    response = client.post("/api/admin/events", headers=admin_headers, json=EVENT_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == EVENT_PAYLOAD["title"]
    assert float(body["latitude"]) == EVENT_PAYLOAD["latitude"]
    assert float(body["price"]) == 45
    assert body["category"] == "Music"
    assert body["status"] == EventStatus.open.value


def test_event_price_and_category_default(client, admin_headers):
    payload = {k: v for k, v in EVENT_PAYLOAD.items() if k not in ("price", "category")}
    body = client.post("/api/admin/events", headers=admin_headers, json=payload).json()
    assert float(body["price"]) == 0
    assert body["category"] == "General"


def test_negative_price_is_rejected(client, admin_headers):
    response = client.post(
        "/api/admin/events", headers=admin_headers, json={**EVENT_PAYLOAD, "price": -5}
    )
    assert response.status_code == 422


def test_admin_can_close_event(client, admin_headers, make_event):
    event = make_event()
    response = client.put(
        f"/api/admin/events/{event.id}", headers=admin_headers, json={"status": "closed"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "closed"
    assert client.get("/api/events") .json() == []


def test_admin_update_missing_event_returns_404(client, admin_headers):
    response = client.put("/api/admin/events/9999", headers=admin_headers, json={"title": "x"})
    assert response.status_code == 404


# --- Check-in rules (Section 6) --------------------------------------------


def test_checkin_succeeds_and_returns_ticket_user_event(
    client, admin_headers, user_headers, make_event, user
):
    event = make_event()
    code = _register(client, event.id, user_headers)

    response = client.post("/api/admin/checkin", headers=admin_headers, json={"ticket_code": code})
    assert response.status_code == 200
    body = response.json()
    assert body["ticket"]["status"] == TicketStatus.checked_in.value
    assert body["ticket"]["checked_in_at"] is not None
    assert body["user"]["email"] == user.email
    assert body["event"]["title"] == event.title


def test_checkin_unknown_code_returns_404(client, admin_headers):
    response = client.post(
        "/api/admin/checkin", headers=admin_headers, json={"ticket_code": str(uuid.uuid4())}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Ticket not found"


def test_double_checkin_returns_409_with_checked_in_at(
    client, admin_headers, user_headers, make_event
):
    event = make_event()
    code = _register(client, event.id, user_headers)
    client.post("/api/admin/checkin", headers=admin_headers, json={"ticket_code": code})

    response = client.post("/api/admin/checkin", headers=admin_headers, json={"ticket_code": code})
    assert response.status_code == 409
    assert response.json()["detail"]["checked_in_at"] is not None


def test_checkin_cancelled_ticket_returns_400(
    client, admin_headers, user_headers, make_event, db
):
    from app.models import Ticket

    event = make_event()
    code = _register(client, event.id, user_headers)
    ticket = db.query(Ticket).filter(Ticket.ticket_code == uuid.UUID(code)).one()
    ticket.status = TicketStatus.cancelled
    db.commit()

    response = client.post("/api/admin/checkin", headers=admin_headers, json={"ticket_code": code})
    assert response.status_code == 400
    assert response.json()["detail"] == "Ticket cancelled"


def test_checkin_for_cancelled_event_returns_400(
    client, admin_headers, user_headers, make_event, db
):
    event = make_event()
    code = _register(client, event.id, user_headers)

    db.query(type(event)).filter_by(id=event.id).update({"status": EventStatus.cancelled})
    db.commit()

    response = client.post("/api/admin/checkin", headers=admin_headers, json={"ticket_code": code})
    assert response.status_code == 400


# --- Stats & attendees -----------------------------------------------------


def test_stats_match_reality(
    client, admin_headers, user_headers, other_user_headers, make_event
):
    event = make_event(capacity=10)
    code = _register(client, event.id, user_headers)
    _register(client, event.id, other_user_headers)
    client.post("/api/admin/checkin", headers=admin_headers, json={"ticket_code": code})

    response = client.get(f"/api/admin/events/{event.id}/stats", headers=admin_headers)
    assert response.status_code == 200
    assert response.json() == {"registered": 2, "checked_in": 1, "capacity": 10}


def test_attendees_list(client, admin_headers, user_headers, make_event, user):
    event = make_event()
    _register(client, event.id, user_headers)

    response = client.get(f"/api/admin/events/{event.id}/attendees", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["email"] == user.email
    assert body[0]["status"] == TicketStatus.registered.value


# --- Announcements ---------------------------------------------------------


def test_admin_announcement_list_includes_event_specific_ones(
    client, admin_headers, make_event
):
    event = make_event()
    client.post(
        "/api/admin/announcements",
        headers=admin_headers,
        json={"title": "Global", "body": "b"},
    )
    client.post(
        "/api/admin/announcements",
        headers=admin_headers,
        json={"title": "For the event", "body": "b", "event_id": event.id},
    )

    response = client.get("/api/admin/announcements", headers=admin_headers)
    assert response.status_code == 200
    titles = {a["title"] for a in response.json()}
    # The admin holds no ticket, so the user-scoped feed would hide the second.
    assert titles == {"Global", "For the event"}


def test_admin_announcement_list_puts_pinned_first(client, admin_headers):
    client.post(
        "/api/admin/announcements", headers=admin_headers, json={"title": "Plain", "body": "b"}
    )
    client.post(
        "/api/admin/announcements",
        headers=admin_headers,
        json={"title": "Pinned", "body": "b", "pinned": True},
    )

    body = client.get("/api/admin/announcements", headers=admin_headers).json()
    assert [a["title"] for a in body] == ["Pinned", "Plain"]
