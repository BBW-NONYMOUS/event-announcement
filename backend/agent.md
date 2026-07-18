
This backend is the single source of truth. All business rules (capacity, duplicate registration, check-in validation) are enforced HERE, never in the clients.

Stack (do not substitute):

Python 3.11+ · FastAPI · Uvicorn
SQLAlchemy 2.x ORM · Alembic migrations
PostgreSQL (psycopg2-binary) — no SQLite, even in dev
JWT auth: python-jose[cryptography] + passlib[bcrypt]
Pydantic v2 + pydantic-settings for config

2. Repository Layout (Backend)

backend/
├── app/
│   ├── main.py            # FastAPI instance, CORS, router registration, /api/health
│   ├── config.py          # Settings via pydantic-settings (reads .env)
│   ├── database.py        # engine, SessionLocal, Base, get_db dependency
│   ├── models.py          # SQLAlchemy models (User, Event, Ticket, Announcement)
│   ├── schemas.py         # Pydantic request/response schemas
│   ├── auth.py            # hashing, JWT create/decode, get_current_user, require_admin
│   ├── routers/
│   │   ├── auth.py        # /api/auth/*
│   │   ├── events.py      # /api/events/* (public/user)
│   │   ├── tickets.py     # /api/tickets/*
│   │   ├── announcements.py
│   │   └── admin.py       # /api/admin/* (ALL guarded by require_admin)
│   └── services/
│       ├── registration.py  # capacity + duplicate checks, ticket creation
│       └── checkin.py       # ticket lookup + state transition
├── alembic/               # migrations (autogenerate, then review by hand)
├── tests/                 # pytest suites mirror routers/
├── requirements.txt
├── .env.example           # committed template
└── .env                   # NEVER commit

Rules:

Routers stay thin: parse → call service → return schema. Business logic lives in services/.
One Alembic migration per schema change. Never edit an applied migration; create a new one.
Every new endpoint gets a Pydantic response model — no bare dict returns.

3. Environment & Commands

bash# Setup
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in values

# .env keys (all required)

DATABASE_URL=postgresql://postgres:password@localhost:5432/event_checkin
SECRET_KEY=<long-random-string></long>
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CORS_ORIGINS=http://localhost:5173,http://localhost:8081

# Database

createdb event_checkin
alembic upgrade head
alembic revision --autogenerate -m "describe change"   # after model edits

# Run

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# --host 0.0.0.0 is required so the Expo app on a physical device can connect via LAN IP

# Verify

curl http://localhost:8000/api/health      # → {"status":"ok"}
open http://localhost:8000/docs            # Swagger UI — test every endpoint here

# Tests

pytest -x -q

4. Database Schema (authoritative)

TableColumnsConstraintsusersid PK · name · email · password_hash · role enum('user','admin') · created_at timestamptzemail UNIQUE, indexedeventsid PK · title · description · venue · latitude numeric(9,6) NULL · longitude numeric(9,6) NULL · event_date date · start_time · end_time · capacity int · price numeric(10,2) NOT NULL default 0 · category varchar(50) NOT NULL default 'General' · image_url NULL · status enum('open','closed','cancelled') · created_by FK users · created_at—ticketsid PK · ticket_code uuid UNIQUE · event_id FK · user_id FK · seat varchar(20) · status enum('registered','checked_in','cancelled') · checked_in_at timestamptz NULL · created_atUniqueConstraint(event_id, user_id) · UniqueConstraint(event_id, seat)announcementsid PK · event_id FK NULL (NULL = global) · title · body · pinned bool NOT NULL default false · posted_by FK users · created_at—

Postgres specifics: use native UUID type for ticket_code with uuid4 default; TIMESTAMPTZ for all timestamps; enums managed by Alembic. lat/lng are nullable — events without coordinates simply don't show a map in the app.

price/category/seat/pinned back the mobile app's UI (price badge + sticky price footer, category label, boarding-pass seat, pinned announcement). price 0 renders as "Free". Seats are assigned by services/registration.py as GA-001, GA-002, … numbered per event over every ticket ever issued (cancelled included), so a label is never reused; UniqueConstraint(event_id, seat) is the race backstop.

5. API Contract (build in this order)

5.1 Auth — /api/auth

MethodPathAuthNotesPOST/register—body: name, email, password → 201 UserOut. 409 if email exists. role defaults to 'user'.POST/login—OAuth2 password form → {access_token, token_type}. 401 on bad credentials.GET/meuserReturns current user from JWT.

5.2 Events (public/user) — /api/events

MethodPathAuthNotesGET/—Upcoming events with status='open', ordered by event_date. Include registered_count.GET/{event_id}—404 if missing. Include lat/lng for the mobile map.POST/{event_id}/registeruserSee registration rules below. Returns TicketOut with ticket_code.

5.3 Tickets — /api/tickets

MethodPathAuthNotesGET/mineuserCurrent user's tickets joined with event info (app renders QR from ticket_code).

5.4 Admin — /api/admin (EVERY route: Depends(require_admin))

MethodPathNotesPOST/eventsCreate event (incl. optional latitude/longitude, image_url).PUT/events/{event_id}Edit fields / set status closed·cancelled.POST/checkinbody {ticket_code} — see check-in rules below.GET/events/{event_id}/stats{registered, checked_in, capacity}.GET/events/{event_id}/attendeesList of users + ticket status.POST/announcementsCreate announcement (event-specific or global).

5.5 Announcements — /api/announcements

MethodPathAuthNotesGET/userGlobal + announcements for events the user has tickets to. Pinned first, then newest first.

6. Business Rules (enforce exactly)

Registration (services/registration.py)

Reject with the listed status; only then create the ticket:

Event not found → 404
Event status != 'open' → 400 "Event is not open for registration"
Registered ticket count >= capacity → 409 "Event is full"
User already has a non-cancelled ticket for this event → 409 "Already registered"
OK → create ticket: ticket_code=uuid4(), status='registered', seat=next GA-### for the event

Wrap count-check + insert in one transaction; rely on UniqueConstraint(event_id, user_id) as the race-condition backstop (catch IntegrityError → 409).

Check-in (services/checkin.py)

ticket_code not found → 404 "Ticket not found"
status == 'checked_in' → 409 include checked_in_at in the error detail
status == 'cancelled' → 400 "Ticket cancelled"
Event status == 'cancelled' → 400
OK → set status='checked_in', checked_in_at=now() → 200 with ticket + user + event summary

Auth

Hash with bcrypt via passlib. Never log or return password_hash.
JWT payload: sub (user id), role, exp. Signed HS256 with SECRET_KEY.
require_admin: decode token → load user → role != 'admin' → 403.

7. Coding Conventions

Style: PEP 8, type hints on all function signatures, black + ruff clean.
Schemas: XCreate / XUpdate / XOut naming. XOut uses model_config = ConfigDict(from_attributes=True).
Errors: raise HTTPException(status_code, detail="human-readable message"). Consistent JSON error shape.
DB access: always via Depends(get_db); no sessions created inside services — pass the session in.
No secrets in code. Everything configurable comes from config.Settings.
CORS: origins read from CORS_ORIGINS env var, not hardcoded.
Timestamps: always timezone-aware UTC (datetime.now(timezone.utc)).

8. Development Plan (execute in order)

Task 1 — Skeleton & health

Scaffold layout from Section 2 · config.py + database.py · /api/health · CORS middleware. Done when: server boots, health returns ok, Swagger loads.

Task 2 — Models & migration

All 4 models per Section 4 · initial Alembic migration. Done when: alembic upgrade head creates all tables in Postgres with constraints verified via \d in psql.

Task 3 — Auth

auth.py helpers · auth router (register/login/me) · require_admin dependency · seed script scripts/create_admin.py. Done when: full register→login→/me flow works in Swagger; /me without token → 401.

Task 4 — Events & registration

Events router · registration service with all 5 rules · tickets/mine. Done when: each rejection rule returns the exact status code above; double-register returns 409; ticket_code is a UUID.

Task 5 — Admin & check-in

Admin router fully guarded · check-in service with all rules · stats + attendees. Done when: non-admin token gets 403 on every admin route; double check-in returns 409; stats numbers match reality.

Task 6 — Announcements

Both endpoints per contract. Done when: user feed shows global + own-event announcements only.

Task 7 — Tests & hardening

pytest coverage of every business rule (happy + each failure path) · slowapi rate limits on /login and /checkin · review autogenerated migrations. Done when: pytest green; rate limit returns 429 when hammered.

Do not start a task until the previous task's "Done when" passes.

9. Definition of Done (whole backend)

 Every endpoint in Section 5 works via Swagger with documented status codes
 All Section 6 business rules covered by passing pytest tests
 No plaintext passwords anywhere; .env not committed; .env.example current
 Admin routes return 403 for user-role tokens (verified by test)
 A ticket can never be checked in twice (verified by test)
 Alembic migrations run cleanly from empty DB to head
 Events return latitude/longitude so the Expo map can render pins
