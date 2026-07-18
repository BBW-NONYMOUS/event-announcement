from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Announcement, Ticket, TicketStatus, User
from app.schemas import AnnouncementOut

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("", response_model=list[AnnouncementOut])
@router.get("/", response_model=list[AnnouncementOut], include_in_schema=False)
def my_feed(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[Announcement]:
    """Global announcements plus those for events the user holds a ticket to.

    Pinned first, then newest first.
    """
    ticketed_event_ids = select(Ticket.event_id).where(
        Ticket.user_id == current_user.id, Ticket.status != TicketStatus.cancelled
    )
    return list(
        db.scalars(
            select(Announcement)
            .where(
                (Announcement.event_id.is_(None))
                | (Announcement.event_id.in_(ticketed_event_ids))
            )
            .order_by(
                Announcement.pinned.desc(),
                Announcement.created_at.desc(),
                Announcement.id.desc(),
            )
        )
    )
