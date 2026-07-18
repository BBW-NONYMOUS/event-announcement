from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.models import Ticket, User
from app.schemas import TicketWithEvent

router = APIRouter(prefix="/api/tickets", tags=["tickets"])


@router.get("/mine", response_model=list[TicketWithEvent])
def my_tickets(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[Ticket]:
    return list(
        db.scalars(
            select(Ticket)
            .options(joinedload(Ticket.event))
            .where(Ticket.user_id == current_user.id)
            .order_by(Ticket.created_at.desc())
        )
    )
