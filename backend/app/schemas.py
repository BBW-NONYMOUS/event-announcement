import uuid
from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import EventStatus, TicketStatus, UserRole

# --- Users -----------------------------------------------------------------


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: UserRole
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: EmailStr | None = None


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=72)


# --- Events ----------------------------------------------------------------


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str
    venue: str = Field(min_length=1, max_length=255)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    event_date: date
    start_time: time
    end_time: time
    capacity: int = Field(gt=0)
    price: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    category: str = Field(default="General", min_length=1, max_length=50)
    image_url: str | None = Field(default=None, max_length=500)
    status: EventStatus = EventStatus.open
    is_featured: bool = False


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    venue: str | None = Field(default=None, min_length=1, max_length=255)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    event_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    capacity: int | None = Field(default=None, gt=0)
    price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    image_url: str | None = Field(default=None, max_length=500)
    status: EventStatus | None = None
    is_featured: bool | None = None


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    venue: str
    latitude: Decimal | None
    longitude: Decimal | None
    event_date: date
    start_time: time
    end_time: time
    capacity: int
    price: Decimal
    category: str
    image_url: str | None
    status: EventStatus
    is_featured: bool
    created_by: int
    created_at: datetime
    registered_count: int = 0


class EventSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    venue: str
    event_date: date
    start_time: time
    end_time: time
    price: Decimal
    category: str
    image_url: str | None
    status: EventStatus
    is_featured: bool
    latitude: Decimal | None
    longitude: Decimal | None


# --- Tickets ---------------------------------------------------------------


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticket_code: uuid.UUID
    event_id: int
    user_id: int
    seat: str
    status: TicketStatus
    checked_in_at: datetime | None
    created_at: datetime


class TicketWithEvent(TicketOut):
    event: EventSummary


class CheckinRequest(BaseModel):
    ticket_code: uuid.UUID


class CheckinResult(BaseModel):
    ticket: TicketOut
    user: UserOut
    event: EventSummary


class AttendeeOut(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    ticket_code: uuid.UUID
    status: TicketStatus
    checked_in_at: datetime | None


class EventStats(BaseModel):
    registered: int
    checked_in: int
    capacity: int


# --- Announcements ---------------------------------------------------------


class AnnouncementCreate(BaseModel):
    event_id: int | None = None
    title: str = Field(min_length=1, max_length=200)
    body: str
    pinned: bool = False


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int | None
    title: str
    body: str
    pinned: bool
    posted_by: int
    created_at: datetime


# --- Settings --------------------------------------------------------------


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    default_category: str
    default_event_status: EventStatus
    max_featured: int
    show_featured_marquee: bool
    updated_at: datetime


class SettingsUpdate(BaseModel):
    default_category: str | None = Field(default=None, min_length=1, max_length=50)
    default_event_status: EventStatus | None = None
    max_featured: int | None = Field(default=None, ge=0, le=50)
    show_featured_marquee: bool | None = None


class PublicSettings(BaseModel):
    """The settings the mobile app is allowed to see.

    Deliberately a separate model from SettingsOut: this endpoint is unauthed,
    so new admin-only settings must not leak into it by default.
    """

    model_config = ConfigDict(from_attributes=True)

    show_featured_marquee: bool
    max_featured: int


# --- Uploads ---------------------------------------------------------------


class UploadOut(BaseModel):
    """A stored image. `url` is what belongs in Event.image_url."""

    url: str
    filename: str
    content_type: str
    size: int


# --- Misc ------------------------------------------------------------------


class HealthOut(BaseModel):
    status: str
