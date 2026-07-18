
The admin web is a thin client. All business rules (capacity, duplicate check-in, auth roles) are enforced by the FastAPI backend. This app's job: great UX, correct API calls, honest display of server responses.

Stack (do not substitute):

React 18+ · Vite · JavaScript (or TypeScript if the repo is already TS — match what exists)
Tailwind CSS (+ shadcn/ui components where useful)
React Router (routing + auth guard)
Axios + TanStack Query (all server state)
React Hook Form + Zod (all forms)
Recharts (stats) · html5-qrcode (webcam scanning) · Sonner (toasts) · date-fns · lucide-react (icons)

2. Repository Layout

admin-web/
├── src/
│   ├── main.jsx               # React root, QueryClientProvider, Toaster
│   ├── App.jsx                # Router: public /login, everything else guarded
│   ├── api/
│   │   ├── client.js          # axios instance: baseURL from env, JWT header, 401 interceptor
│   │   ├── auth.js            # login(), me()
│   │   ├── events.js          # CRUD + stats + attendees calls
│   │   ├── checkin.js         # postCheckin(ticket_code)
│   │   └── announcements.js
│   ├── hooks/                 # useAuth, useEvents, useStats — wrap TanStack Query
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx      # stat cards + attendance chart
│   │   ├── EventsManager.jsx  # list + create/edit modal or subpage
│   │   ├── CheckInScanner.jsx # manual input + webcam scan
│   │   └── Announcements.jsx
│   ├── components/
│   │   ├── layout/            # Sidebar, Topbar, PageShell
│   │   ├── StatCard.jsx
│   │   ├── EventForm.jsx      # RHF + Zod, incl. location fields
│   │   ├── AttendeeTable.jsx
│   │   └── CheckinResult.jsx  # giant ✓ / ✗ panel
│   ├── lib/
│   │   ├── auth.js            # token get/set/clear, decode role
│   │   └── format.js          # date-fns helpers
│   └── index.css              # Tailwind entry
├── .env.example               # VITE_API_URL=http://localhost:8000
├── .env                       # NEVER commit
└── vite.config.js

Rules:

No raw fetch/axios inside components — always go through api/ modules wrapped in TanStack Query hooks.
No business logic client-side. If the server says 409 "Event is full", display it; don't pre-block.
Every mutation: show a Sonner toast on success AND on error (use the server's detail message).
Components stay presentational; data fetching lives in hooks/pages.

3. Environment & Commands

bash# Setup
npm install
cp .env.example .env          # set VITE_API_URL

# Run (backend must be running at VITE_API_URL)

npm run dev                   # http://localhost:5173

# Quality

npm run lint
npm run build && npm run preview   # verify production build before finishing any task

Env access: only via import.meta.env.VITE_API_URL. Never hardcode the API URL.

4. Backend API Contract (consume exactly — do not invent endpoints)

Base URL: VITE_API_URL. All authed requests send Authorization: Bearer <token></token>.

PurposeMethod & PathNotesLoginPOST /api/auth/loginOAuth2 form-encoded body (username, password) → {access_token, token_type}Current userGET /api/auth/meUse to verify role === 'admin' after loginList eventsGET /api/eventsIncludes registered_count, latitude, longitudeCreate eventPOST /api/admin/eventstitle, description, venue, latitude?, longitude?, event_date, start_time, end_time, capacity, image_url?, statusEdit eventPUT /api/admin/events/{id}Also used to set status 'closed' / 'cancelled'Check inPOST /api/admin/checkinbody {ticket_code} — see status handling belowEvent statsGET /api/admin/events/{id}/stats{registered, checked_in, capacity}AttendeesGET /api/admin/events/{id}/attendeesusers + ticket statusPost announcementPOST /api/admin/announcementstitle, body, event_id? (null = global)

Check-in response handling (CheckinResult.jsx must cover all):

200 → green ✓ panel with attendee name + event; success sound optional
404 → red ✗ "Ticket not found"
409 → amber ⚠ "Already checked in at {checked_in_at}" (format with date-fns)
400 → red ✗ show server detail (cancelled ticket/event)

Auth error handling: axios interceptor — on 401 clear token and redirect to /login; on 403 toast "Admin access required".

5. UI/UX Conventions

Layout: fixed left Sidebar (Dashboard · Events · Check-in · Announcements) + Topbar with admin name and logout. Content in a max-width container with consistent padding.
Design language: clean SaaS — white cards on bg-slate-50, rounded-xl, subtle borders/shadows, one primary color (indigo #6366F1 to match the mobile app).
Feedback everywhere: skeletons while loading, friendly empty states, Sonner toasts on every mutation, disabled buttons with spinners while pending.
Forms (EventForm): React Hook Form + Zod schema; inline field errors; latitude/longitude as optional paired numeric fields with helper text "Paste coordinates from Google Maps"; datetime validation (end after start, date not in past).
CheckInScanner page: autofocused code input (scanner-gun friendly — submits on Enter) + "Use camera" toggle starting html5-qrcode; result panel is large and readable from a distance; input clears and refocuses after each scan.
Tables: search filter, status pills (Registered = blue, Checked-in = green), CSV export button on attendees.
Accessibility: labels on all inputs, focus states, buttons not divs.

6. Development Plan (execute in order)

Task 1 — Scaffold & shell

Vite + Tailwind setup · api/client.js with interceptors · Router with Sidebar/Topbar layout and placeholder pages. Done when: app runs, nav switches pages, production build succeeds.

Task 2 — Auth

Login page (RHF + Zod) · form-encoded login call · store token · fetch /me and reject non-admins with a clear message · route guard redirects unauthenticated users to /login · logout. Done when: wrong password shows server error; user-role account is blocked; refresh keeps session; 401 auto-redirects.

Task 3 — Events manager

Events list with status pills and registered/capacity bar · EventForm create + edit (incl. location fields) · close/cancel actions with confirm dialog. Done when: created event appears without manual refresh (query invalidation); server 4xx messages surface in toasts.

Task 4 — Check-in

Manual entry flow first, all four response states rendered · then html5-qrcode camera scanning feeding the same submit path. Done when: valid, unknown, duplicate, and cancelled codes each show the correct panel; input refocuses after every attempt.

Task 5 — Dashboard & attendees

Stat cards (events, registered, checked-in) · Recharts bar chart of registered vs checked-in per event · AttendeeTable with search + CSV export. Done when: numbers match backend stats endpoint exactly; chart handles zero-event state.

Task 6 — Announcements

Form (global vs specific event dropdown) · list of posted announcements. Done when: posting shows success toast and the new item in the list.

Task 7 — Polish & verify

Skeletons, empty states, error boundaries · responsive down to tablet width · npm run build clean · manual E2E against real backend: login → create event → register via mobile/Swagger → check in → stats update. Done when: the full loop works with zero console errors.

Do not start a task until the previous task's "Done when" passes.

7. Definition of Done (whole admin web)

 Non-admin credentials cannot reach any page beyond /login
 All API calls go through api/ modules + TanStack Query; zero hardcoded URLs
 Check-in handles 200/404/409/400 distinctly and legibly from a distance
 Every mutation shows success/error feedback; server detail messages are surfaced, never swallowed
 Event form validates with Zod and supports optional map coordinates
 npm run build passes with no errors or warnings
 Works against the real FastAPI backend, not mocks
