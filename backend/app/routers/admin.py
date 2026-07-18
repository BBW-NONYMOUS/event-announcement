from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.limiter import limiter
from app.models import Announcement, Event, EventStatus, Settings, Ticket, TicketStatus, User
from app.routers.events import _registered_count_subquery, _to_event_out
from app.schemas import (
    AnnouncementCreate,
    AnnouncementOut,
    AttendeeOut,
    CheckinRequest,
    CheckinResult,
    EventCreate,
    EventOut,
    EventStats,
    EventSummary,
    EventUpdate,
    SettingsOut,
    SettingsUpdate,
    TicketOut,
    UploadOut,
    UserOut,
)
from app.services.checkin import check_in
from app.services.settings import get_settings
from app.services.uploads import public_url, save_event_image

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _assert_featured_capacity(db: Session, *, exclude_event_id: int | None = None) -> None:
    """Refuse to feature one more event than max_featured allows.

    Enforced here and not only in the admin UI, because the cap decides how many
    cards the mobile highlight strip has to render.

    Only *open* events count: the strip lists open events, so a closed one that
    kept its featured flag occupies no slot and must not silently spend one.
    """
    limit = get_settings(db).max_featured
    query = (
        select(func.count())
        .select_from(Event)
        .where(Event.is_featured.is_(True), Event.status == EventStatus.open)
    )
    if exclude_event_id is not None:
        # An already-featured event being re-saved must not count against itself.
        query = query.where(Event.id != exclude_event_id)

    if (db.scalar(query) or 0) >= limit:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Only {limit} events can be featured at once. "
                "Unfeature another event first, or raise the limit in Settings."
            ),
        )


@router.get("/events", response_model=list[EventOut])
def list_all_events(db: Session = Depends(get_db)) -> list[EventOut]:
    """Every event regardless of status.

    The public GET /api/events only exposes open events, so admins need this to
    see and reopen the ones they have closed or cancelled.
    """
    counts = _registered_count_subquery()
    rows = db.execute(
        select(Event, func.coalesce(counts.c.registered_count, 0))
        .outerjoin(counts, counts.c.event_id == Event.id)
        .order_by(Event.event_date.desc(), Event.start_time.desc())
    ).all()
    return [_to_event_out(event, count) for event, count in rows]


@router.post("/events", response_model=EventOut, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> EventOut:
    if payload.is_featured:
        _assert_featured_capacity(db)

    event = Event(**payload.model_dump(), created_by=admin.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventOut.model_validate(event)


@router.put("/events/{event_id}", response_model=EventOut)
def update_event(
    event_id: int, payload: EventUpdate, db: Session = Depends(get_db)
) -> EventOut:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    # Only on the false -> true transition: re-saving an already-featured event
    # must not be blocked by the cap it is itself part of.
    if payload.is_featured and not event.is_featured:
        _assert_featured_capacity(db, exclude_event_id=event_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)

    registered_count = db.scalar(
        select(func.count())
        .select_from(Ticket)
        .where(Ticket.event_id == event_id, Ticket.status != TicketStatus.cancelled)
    )
    return EventOut.model_validate(event).model_copy(
        update={"registered_count": registered_count or 0}
    )


@router.get("/settings", response_model=SettingsOut)
def read_settings(db: Session = Depends(get_db)) -> Settings:
    return get_settings(db)


@router.put("/settings", response_model=SettingsOut)
def write_settings(payload: SettingsUpdate, db: Session = Depends(get_db)) -> Settings:
    settings = get_settings(db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings


@router.post("/checkin", response_model=CheckinResult)
@limiter.limit("60/minute")
def checkin(
    request: Request, payload: CheckinRequest, db: Session = Depends(get_db)
) -> CheckinResult:
    ticket = check_in(db, payload.ticket_code)
    return CheckinResult(
        ticket=TicketOut.model_validate(ticket),
        user=UserOut.model_validate(ticket.user),
        event=EventSummary.model_validate(ticket.event),
    )


@router.get("/events/{event_id}/stats", response_model=EventStats)
def event_stats(event_id: int, db: Session = Depends(get_db)) -> EventStats:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    registered = db.scalar(
        select(func.count())
        .select_from(Ticket)
        .where(Ticket.event_id == event_id, Ticket.status != TicketStatus.cancelled)
    )
    checked_in = db.scalar(
        select(func.count())
        .select_from(Ticket)
        .where(Ticket.event_id == event_id, Ticket.status == TicketStatus.checked_in)
    )
    return EventStats(
        registered=registered or 0, checked_in=checked_in or 0, capacity=event.capacity
    )


@router.get("/events/{event_id}/attendees", response_model=list[AttendeeOut])
def event_attendees(event_id: int, db: Session = Depends(get_db)) -> list[AttendeeOut]:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    rows = db.execute(
        select(Ticket, User)
        .join(User, Ticket.user_id == User.id)
        .where(Ticket.event_id == event_id)
        .order_by(User.name)
    ).all()
    return [
        AttendeeOut(
            user_id=user.id,
            name=user.name,
            email=user.email,
            ticket_code=ticket.ticket_code,
            status=ticket.status,
            checked_in_at=ticket.checked_in_at,
        )
        for ticket, user in rows
    ]


@router.post(
    "/uploads/image", response_model=UploadOut, status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def upload_image(
    request: Request, file: UploadFile = File(...)
) -> UploadOut:
    """Store an event image and hand back the URL for Event.image_url."""
    filename, size = await save_event_image(file)
    return UploadOut(
        url=public_url(filename),
        filename=filename,
        content_type=file.content_type,
        size=size,
    )


@router.get("/announcements", response_model=list[AnnouncementOut])
def list_all_announcements(db: Session = Depends(get_db)) -> list[Announcement]:
    """Every announcement, pinned first then newest first.

    GET /api/announcements is scoped to the caller's own tickets, so it would
    hide the event-specific announcements an admin posts.
    """
    return list(
        db.scalars(
            select(Announcement).order_by(
                Announcement.pinned.desc(),
                Announcement.created_at.desc(),
                Announcement.id.desc(),
            )
        )
    )


@router.post(
    "/announcements", response_model=AnnouncementOut, status_code=status.HTTP_201_CREATED
)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
) -> AnnouncementOut:
    if payload.event_id is not None and db.get(Event, payload.event_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    announcement = Announcement(
        event_id=payload.event_id,
        title=payload.title,
        body=payload.body,
        pinned=payload.pinned,
        posted_by=admin.id,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return AnnouncementOut.model_validate(announcement)
