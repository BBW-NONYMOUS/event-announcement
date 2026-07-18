import enum
import uuid
from datetime import date, datetime, time, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


class EventStatus(str, enum.Enum):
    open = "open"
    closed = "closed"
    cancelled = "cancelled"


class TicketStatus(str, enum.Enum):
    registered = "registered"
    checked_in = "checked_in"
    cancelled = "cancelled"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, default=UserRole.user
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, server_default=func.now()
    )

    events_created: Mapped[list["Event"]] = relationship(back_populates="creator")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="user")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    venue: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0"), server_default="0"
    )
    category: Mapped[str] = mapped_column(
        String(50), nullable=False, default="General", server_default="General"
    )
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="event_status"), nullable=False, default=EventStatus.open
    )
    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, server_default=func.now()
    )

    creator: Mapped["User"] = relationship(back_populates="events_created")
    tickets: Mapped[list["Ticket"]] = relationship(back_populates="event")
    announcements: Mapped[list["Announcement"]] = relationship(back_populates="event")


class Settings(Base):
    """Admin-tunable app settings — a single row, pinned to id=1.

    A singleton table rather than a key/value store so each setting keeps a real
    type and the DB rejects nonsense. Mobile reads the featured half of this via
    GET /api/settings, so these cannot live in the admin's browser.
    """

    __tablename__ = "settings"
    __table_args__ = (CheckConstraint("id = 1", name="ck_settings_singleton"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    default_category: Mapped[str] = mapped_column(
        String(50), nullable=False, default="General", server_default="General"
    )
    default_event_status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="event_status"),
        nullable=False,
        default=EventStatus.open,
        server_default=EventStatus.open.value,
    )
    max_featured: Mapped[int] = mapped_column(
        Integer, nullable=False, default=5, server_default="5"
    )
    show_featured_marquee: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=_utcnow,
        onupdate=_utcnow,
        server_default=func.now(),
    )


class Ticket(Base):
    __tablename__ = "tickets"
    __table_args__ = (
        UniqueConstraint("event_id", "user_id", name="uq_tickets_event_user"),
        UniqueConstraint("event_id", "seat", name="uq_tickets_event_seat"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_code: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), unique=True, nullable=False, default=uuid.uuid4
    )
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    seat: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status"), nullable=False, default=TicketStatus.registered
    )
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, server_default=func.now()
    )

    event: Mapped["Event"] = relationship(back_populates="tickets")
    user: Mapped["User"] = relationship(back_populates="tickets")


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event_id: Mapped[int | None] = mapped_column(
        ForeignKey("events.id"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    pinned: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    posted_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_utcnow, server_default=func.now()
    )

    event: Mapped["Event | None"] = relationship(back_populates="announcements")
    poster: Mapped["User"] = relationship()
