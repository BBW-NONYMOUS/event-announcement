import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import EventStatus, Ticket, TicketStatus


def check_in(db: Session, ticket_code: uuid.UUID) -> Ticket:
    """Transition a ticket to checked_in, enforcing the check-in rules."""
    ticket = db.scalar(select(Ticket).where(Ticket.ticket_code == ticket_code))
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if ticket.status == TicketStatus.checked_in:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Ticket already checked in",
                "checked_in_at": ticket.checked_in_at.isoformat()
                if ticket.checked_in_at
                else None,
            },
        )

    if ticket.status == TicketStatus.cancelled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ticket cancelled")

    if ticket.event.status == EventStatus.cancelled:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event is cancelled")

    ticket.status = TicketStatus.checked_in
    ticket.checked_in_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return ticket
