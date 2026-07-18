from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Event, EventStatus, Settings, Ticket, TicketStatus, User
from app.schemas import EventOut, PublicSettings, TicketOut
from app.services.registration import register_for_event
from app.services.settings import get_settings

router = APIRouter(prefix="/api/events", tags=["events"])

settings_router = APIRouter(prefix="/api/settings", tags=["settings"])


@settings_router.get("", response_model=PublicSettings)
@settings_router.get("/", response_model=PublicSettings, include_in_schema=False)
def public_settings(db: Session = Depends(get_db)) -> Settings:
    """The display settings the mobile app needs before it renders the home screen.

    Unauthed on purpose — the app fetches this on launch, before login.
    """
    return get_settings(db)


def _registered_count_subquery() -> Select:
    return (
        select(Ticket.event_id, func.count(Ticket.id).label("registered_count"))
        .where(Ticket.status != TicketStatus.cancelled)
        .group_by(Ticket.event_id)
        .subquery()
    )


def _to_event_out(event: Event, registered_count: int) -> EventOut:
    return EventOut.model_validate(event).model_copy(
        update={"registered_count": registered_count}
    )


@router.get("", response_model=list[EventOut])
@router.get("/", response_model=list[EventOut], include_in_schema=False)
def list_events(
    featured: bool | None = None,
    limit: int | None = Query(default=None, gt=0, le=100),
    db: Session = Depends(get_db),
) -> list[EventOut]:
    """Open events, featured first then soonest.

    `featured=true` narrows this to the featured ones alone, which is what the
    mobile home screen's highlight strip asks for.
    """
    counts = _registered_count_subquery()
    query = (
        select(Event, func.coalesce(counts.c.registered_count, 0))
        .outerjoin(counts, counts.c.event_id == Event.id)
        .where(Event.status == EventStatus.open)
        .order_by(Event.is_featured.desc(), Event.event_date, Event.start_time)
    )
    if featured is not None:
        query = query.where(Event.is_featured.is_(featured))
    if limit is not None:
        query = query.limit(limit)

    rows = db.execute(query).all()
    return [_to_event_out(event, count) for event, count in rows]


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db)) -> EventOut:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    registered_count = db.scalar(
        select(func.count())
        .select_from(Ticket)
        .where(Ticket.event_id == event_id, Ticket.status != TicketStatus.cancelled)
    )
    return _to_event_out(event, registered_count or 0)


@router.post(
    "/{event_id}/register", response_model=TicketOut, status_code=status.HTTP_201_CREATED
)
def register_for_event_endpoint(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TicketOut:
    ticket = register_for_event(db, event_id, current_user)
    return TicketOut.model_validate(ticket)
