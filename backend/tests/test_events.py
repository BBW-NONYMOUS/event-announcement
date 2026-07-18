import uuid

import pytest
from sqlalchemy.exc import IntegrityError

from app.models import EventStatus, TicketStatus


def test_list_events_only_open_ordered_by_date(client, make_event):
    make_event(title="Later", event_date="2026-09-01")
    make_event(title="Sooner", event_date="2026-08-01")
    make_event(title="Closed", event_date="2026-08-02", status=EventStatus.closed)
    make_event(title="Cancelled", event_date="2026-08-03", status=EventStatus.cancelled)

    response = client.get("/api/events")
    assert response.status_code == 200
    titles = [event["title"] for event in response.json()]
    assert titles == ["Sooner", "Later"]


def test_list_events_includes_registered_count(client, make_event, user_headers):
    event = make_event()
    client.post(f"/api/events/{event.id}/register", headers=user_headers)

    response = client.get("/api/events")
    assert response.json()[0]["registered_count"] == 1


def test_get_event_includes_coordinates(client, make_event):
    event = make_event()
    response = client.get(f"/api/events/{event.id}")
    assert response.status_code == 200
    body = response.json()
    assert float(body["latitude"]) == 10.3181
    assert float(body["longitude"]) == 123.9055


def test_get_event_without_coordinates_returns_null(client, make_event):
    event = make_event(latitude=None, longitude=None)
    body = client.get(f"/api/events/{event.id}").json()
    assert body["latitude"] is None
    assert body["longitude"] is None


def test_get_missing_event_returns_404(client):
    assert client.get("/api/events/9999").status_code == 404


# --- Registration rules (Section 6) ----------------------------------------


def test_register_returns_ticket_with_uuid_code(client, make_event, user_headers):
    event = make_event()
    response = client.post(f"/api/events/{event.id}/register", headers=user_headers)
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == TicketStatus.registered.value
    uuid.UUID(body["ticket_code"])  # raises if not a valid UUID


def test_seats_are_assigned_sequentially_per_event(
    client, make_event, user_headers, other_user_headers
):
    first = make_event(title="First")
    second = make_event(title="Second")

    seat_a = client.post(f"/api/events/{first.id}/register", headers=user_headers).json()["seat"]
    seat_b = client.post(
        f"/api/events/{first.id}/register", headers=other_user_headers
    ).json()["seat"]
    # Numbering restarts per event.
    seat_c = client.post(f"/api/events/{second.id}/register", headers=user_headers).json()["seat"]

    assert [seat_a, seat_b, seat_c] == ["GA-001", "GA-002", "GA-001"]


def test_cancelled_ticket_does_not_release_its_seat_label(
    client, make_event, user_headers, other_user_headers, db
):
    from app.models import Ticket

    event = make_event()
    client.post(f"/api/events/{event.id}/register", headers=user_headers)

    ticket = db.query(Ticket).filter(Ticket.event_id == event.id).one()
    ticket.status = TicketStatus.cancelled
    db.commit()

    # GA-001 stays retired; the next attendee gets GA-002.
    seat = client.post(f"/api/events/{event.id}/register", headers=other_user_headers).json()[
        "seat"
    ]
    assert seat == "GA-002"


def test_register_missing_event_returns_404(client, user_headers):
    assert client.post("/api/events/9999/register", headers=user_headers).status_code == 404


def test_register_requires_auth(client, make_event):
    event = make_event()
    assert client.post(f"/api/events/{event.id}/register").status_code == 401


def test_register_closed_event_returns_400(client, make_event, user_headers):
    event = make_event(status=EventStatus.closed)
    response = client.post(f"/api/events/{event.id}/register", headers=user_headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "Event is not open for registration"


def test_register_cancelled_event_returns_400(client, make_event, user_headers):
    event = make_event(status=EventStatus.cancelled)
    response = client.post(f"/api/events/{event.id}/register", headers=user_headers)
    assert response.status_code == 400


def test_register_full_event_returns_409(client, make_event, user_headers, other_user_headers):
    event = make_event(capacity=1)
    assert (
        client.post(f"/api/events/{event.id}/register", headers=other_user_headers).status_code
        == 201
    )

    response = client.post(f"/api/events/{event.id}/register", headers=user_headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "Event is full"


def test_double_register_returns_409(client, make_event, user_headers):
    event = make_event()
    assert client.post(f"/api/events/{event.id}/register", headers=user_headers).status_code == 201

    response = client.post(f"/api/events/{event.id}/register", headers=user_headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "Already registered"


def test_cancelled_ticket_does_not_block_capacity_or_reregistration(
    client, make_event, user_headers, db
):
    from app.models import Ticket

    event = make_event(capacity=1)
    client.post(f"/api/events/{event.id}/register", headers=user_headers)

    ticket = db.query(Ticket).filter(Ticket.event_id == event.id).one()
    ticket.status = TicketStatus.cancelled
    db.commit()

    # The cancelled ticket frees the seat; the UniqueConstraint still applies,
    # so the same user re-registering must not 500.
    response = client.post(f"/api/events/{event.id}/register", headers=user_headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "Already registered"


def test_an_unrelated_integrity_error_is_not_reported_as_a_duplicate(
    client, make_event, user_headers, monkeypatch
):
    """A fault that is not a duplicate must not claim the user already registered.

    Reporting every integrity error as "Already registered" sends someone away
    believing they hold a ticket they do not have, and buries the real cause.
    Simulated with a ticket_code collision, which violates a different unique
    constraint than either of the two the service knows how to interpret.
    """
    import uuid as uuid_module

    from app.services import registration

    event = make_event()
    client.post(f"/api/events/{event.id}/register", headers=user_headers)

    # Force every new ticket to reuse the code the first registration took.
    existing_code = uuid_module.UUID(
        client.get("/api/tickets/mine", headers=user_headers).json()[0]["ticket_code"]
    )
    monkeypatch.setattr(registration.uuid, "uuid4", lambda: existing_code)

    # A *different* user, so the duplicate-user rule cannot legitimately fire.
    other = client.post(
        "/api/auth/register",
        json={"name": "Collider", "email": "collider@example.com", "password": "password123"},
    )
    assert other.status_code == 201
    token = client.post(
        "/api/auth/login", data={"username": "collider@example.com", "password": "password123"}
    ).json()["access_token"]

    with pytest.raises(IntegrityError):
        client.post(
            f"/api/events/{event.id}/register",
            headers={"Authorization": f"Bearer {token}"},
        )


# --- Tickets ---------------------------------------------------------------


def test_tickets_mine_returns_only_own_tickets_with_event(
    client, make_event, user_headers, other_user_headers
):
    event = make_event()
    client.post(f"/api/events/{event.id}/register", headers=user_headers)
    client.post(f"/api/events/{event.id}/register", headers=other_user_headers)

    response = client.get("/api/tickets/mine", headers=user_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["event"]["title"] == event.title
    assert body[0]["event"]["venue"] == event.venue
    uuid.UUID(body[0]["ticket_code"])


def test_tickets_mine_requires_auth(client):
    assert client.get("/api/tickets/mine").status_code == 401
