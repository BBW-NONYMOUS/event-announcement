import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Event, EventStatus, Ticket, TicketStatus, User

SEAT_PREFIX = "GA"
_SEAT_RETRIES = 5


def _next_seat(db: Session, event_id: int) -> str:
    """Next free seat label for an event, e.g. GA-003.

    Numbered off every ticket ever issued for the event (cancelled ones
    included) so a released seat label is never handed out twice.
    """
    issued = db.scalar(
        select(func.count()).select_from(Ticket).where(Ticket.event_id == event_id)
    )
    return f"{SEAT_PREFIX}-{(issued or 0) + 1:03d}"


def register_for_event(db: Session, event_id: int, user: User) -> Ticket:
    """Register `user` for `event_id`, enforcing capacity and duplicate rules.

    The count check and the insert share one transaction; the
    UniqueConstraint(event_id, user_id) is the race-condition backstop.
    """
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    if event.status != EventStatus.open:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event is not open for registration",
        )

    registered_count = db.scalar(
        select(func.count())
        .select_from(Ticket)
        .where(Ticket.event_id == event_id, Ticket.status != TicketStatus.cancelled)
    )
    if registered_count >= event.capacity:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Event is full")

    existing = db.scalar(
        select(Ticket).where(
            Ticket.event_id == event_id,
            Ticket.user_id == user.id,
            Ticket.status != TicketStatus.cancelled,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already registered")

    for _ in range(_SEAT_RETRIES):
        ticket = Ticket(
            ticket_code=uuid.uuid4(),
            event_id=event_id,
            user_id=user.id,
            seat=_next_seat(db, event_id),
            status=TicketStatus.registered,
        )
        db.add(ticket)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            if _violated(exc, "uq_tickets_event_seat"):
                # A concurrent registration took the seat — recompute and retry.
                continue
            if _violated(exc, "uq_tickets_event_user"):
                # The real duplicate case: this user already holds a ticket, and
                # a concurrent request beat the check above to the insert.
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT, detail="Already registered"
                ) from exc
            # Anything else is a genuine fault, not a duplicate. Reporting it as
            # "Already registered" sends the user away believing they hold a
            # ticket they do not have, and hides the real error from the logs.
            raise

        db.refresh(ticket)
        return ticket

    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail="Could not assign a seat, please retry"
    )


def _violated(exc: IntegrityError, constraint: str) -> bool:
    return constraint in str(getattr(exc, "orig", exc))
