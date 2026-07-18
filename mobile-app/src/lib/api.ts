// API client (per AGENTS.md: lib/api.js) — talks to the FastAPI backend.
//
// The backend is the single source of truth: capacity, duplicate registration
// and check-in rules are enforced there, so this module never second-guesses
// them. It maps the API's snake_case contract onto the camelCase view models
// the screens render, and surfaces backend error details as Error messages.

import axios, { AxiosError } from "axios";
import Constants from "expo-constants";
import { clearSession, getStoredUser, getToken } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

/**
 * Resolution order:
 *  1. EXPO_PUBLIC_API_URL — set this for a device on a different network, and
 *     required for any standalone build (see below).
 *  2. The LAN IP Metro is served from, port 8000. A physical device in Expo Go
 *     cannot reach the dev machine's localhost, which is why the backend runs
 *     with --host 0.0.0.0.
 *  3. localhost, for simulators and web.
 *
 * Steps 2 and 3 are development-only. A standalone build (APK/IPA) has no
 * Metro host, so without EXPO_PUBLIC_API_URL it would fall through to
 * localhost — which on a phone means the phone itself, leaving every request
 * to fail with a network error that looks like a server outage. Failing here
 * instead names the actual cause, the way admin-web does for VITE_API_URL.
 *
 * EXPO_PUBLIC_* values are inlined at build time, so this must be set when the
 * build runs, not at launch.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  const host = hostUri?.split(":")[0];
  if (host) return `http://${host}:8000`;

  if (!__DEV__) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. A standalone build cannot discover the " +
        "backend on its own — set it (e.g. in eas.json) to your deployed HTTPS " +
        "URL and rebuild."
    );
  }

  return "http://localhost:8000";
}

export const API_URL = resolveBaseUrl();

const http = axios.create({ baseURL: API_URL, timeout: 15000 });

http.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ---------------------------------------------------------------------------
// Session expiry
// ---------------------------------------------------------------------------

type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

/**
 * Register a callback for "the server rejected our token".
 *
 * A callback rather than a direct import: lib/auth.tsx imports this module, so
 * importing it back would be a cycle. AuthProvider subscribes, drops its user,
 * and the guard in _layout.tsx routes to login from there.
 */
export function onSessionExpired(handler: SessionExpiredHandler): () => void {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null;
  };
}

/** Endpoints where a 401 means "wrong credentials", not "session expired". */
const isCredentialCheck = (url?: string) =>
  Boolean(url && (url.includes("/api/auth/login") || url.includes("/api/auth/register")));

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Without this, an expired token leaves the app looking signed in while
    // every action fails with "Could not validate credentials" and no way back.
    if (error.response?.status === 401 && !isCredentialCheck(error.config?.url)) {
      await clearSession();
      sessionExpiredHandler?.();
      return Promise.reject(new Error("Your session expired. Please sign in again."));
    }
    return Promise.reject(toError(error));
  }
);

/** Turns FastAPI's `{detail: ...}` shapes into a readable Error. */
function toError(error: AxiosError): Error {
  if (!error.response) {
    return new Error("Can't reach the server. Check your connection and try again.");
  }

  const { detail } = (error.response.data ?? {}) as { detail?: unknown };

  if (typeof detail === "string") return new Error(detail);

  // 422 validation errors arrive as a list of {loc, msg, type}.
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined;
    if (first?.msg) return new Error(first.msg);
  }

  // Check-in conflicts carry an object detail ({message, checked_in_at}).
  if (detail && typeof detail === "object") {
    const { message } = detail as { message?: string };
    if (message) return new Error(message);
  }

  return new Error(`Request failed (${error.response.status}).`);
}

// ---------------------------------------------------------------------------
// Wire types (mirror the backend schemas)
// ---------------------------------------------------------------------------

type EventDTO = {
  id: number;
  title: string;
  description: string;
  venue: string;
  latitude: string | number | null;
  longitude: string | number | null;
  event_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  price: string | number;
  category: string;
  image_url: string | null;
  status: "open" | "closed" | "cancelled";
  is_featured: boolean;
  registered_count: number;
};

/** GET /api/settings — unauthed display settings, fetched before the home screen renders. */
type PublicSettingsDTO = {
  show_featured_marquee: boolean;
  max_featured: number;
};

type EventSummaryDTO = Pick<
  EventDTO,
  | "id"
  | "title"
  | "venue"
  | "event_date"
  | "start_time"
  | "end_time"
  | "price"
  | "category"
  | "image_url"
  | "status"
  | "latitude"
  | "longitude"
>;

type TicketDTO = {
  id: number;
  ticket_code: string;
  event_id: number;
  user_id: number;
  seat: string;
  status: "registered" | "checked_in" | "cancelled";
  checked_in_at: string | null;
  created_at: string;
};

type TicketWithEventDTO = TicketDTO & { event: EventSummaryDTO };

type AnnouncementDTO = {
  id: number;
  event_id: number | null;
  title: string;
  body: string;
  pinned: boolean;
  posted_by: number;
  created_at: string;
};

type UserDTO = { id: number; name: string; email: string; role: "user" | "admin" };

// ---------------------------------------------------------------------------
// View models
// ---------------------------------------------------------------------------

export type EventItem = {
  id: string;
  title: string;
  description: string;
  date: string; // ISO
  location: string;
  image: string | null;
  price: number; // 0 == Free
  category: string;
  attendees: number;
  isFeatured: boolean;
  latitude: number | null;
  longitude: number | null;
};

export type AppSettings = {
  showFeaturedMarquee: boolean;
  maxFeatured: number;
};

/** An event the backend gave coordinates for — the only kind a map can pin. */
export type LocatedEvent = EventItem & { latitude: number; longitude: number };

export const hasCoords = (event: EventItem): event is LocatedEvent =>
  event.latitude !== null && event.longitude !== null;

export type Ticket = {
  id: string;
  eventId: string;
  eventTitle: string;
  eventImage: string | null;
  date: string;
  location: string;
  seat: string;
  code: string; // encoded into the QR
  holder: string;
  status: "registered" | "checked_in" | "cancelled";
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  pinned: boolean;
};

export type User = { id: string; name: string; email: string };
export type AuthResponse = { token: string; user: User };

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/**
 * Numeric columns arrive as JSON strings; anything unusable becomes null.
 *
 * Non-finite results must not escape: NaN is not null, so a NaN latitude would
 * satisfy `hasCoords` and hand the map un-plottable coordinates.
 */
const num = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * A non-empty string, or the fallback.
 *
 * These mappers are the boundary between the wire and the view models the
 * screens trust. A field the API omits must not reach a component — one
 * missing `category` would otherwise throw in `.toUpperCase()` and take the
 * whole list down with it. Fallbacks mirror the backend's own column defaults.
 */
const text = (value: string | null | undefined, fallback = ""): string => {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? fallback : trimmed;
};

/**
 * Turn `image_url` into something this device can actually fetch.
 *
 * Uploaded images are stored host-relative (`/uploads/x.png`) precisely so the
 * admin's host doesn't get baked in — this joins them onto the API base this
 * app resolved, which on a physical device is the LAN IP, not localhost.
 * Externally hosted images are already absolute and pass through untouched.
 */
export const resolveImageUrl = (value: string | null | undefined): string | null => {
  if (!value) return null;
  if (/^(https?:)?\/\//i.test(value) || value.startsWith("data:")) return value;
  return `${API_URL}${value.startsWith("/") ? "" : "/"}${value}`;
};

/** The API splits date and time; the UI renders a single instant. */
const toIso = (date: string, time: string): string => `${date}T${time}`;

function toEvent(dto: EventDTO): EventItem {
  return {
    id: String(dto.id),
    title: text(dto.title, "Untitled event"),
    description: text(dto.description),
    date: toIso(dto.event_date, dto.start_time),
    location: text(dto.venue, "Venue to be announced"),
    image: resolveImageUrl(dto.image_url),
    price: num(dto.price) ?? 0,
    // 'General' is the backend's own default for this column.
    category: text(dto.category, "General"),
    attendees: num(dto.registered_count) ?? 0,
    // An older backend without this column must read as "not featured" rather
    // than undefined, which would render as a stray highlight badge.
    isFeatured: dto.is_featured === true,
    latitude: num(dto.latitude),
    longitude: num(dto.longitude),
  };
}

function toTicket(dto: TicketWithEventDTO, holder: string): Ticket {
  return {
    id: String(dto.id),
    eventId: String(dto.event.id),
    eventTitle: text(dto.event.title, "Untitled event"),
    eventImage: resolveImageUrl(dto.event.image_url),
    date: toIso(dto.event.event_date, dto.event.start_time),
    location: text(dto.event.venue, "Venue to be announced"),
    seat: dto.seat,
    code: dto.ticket_code,
    holder,
    status: dto.status,
  };
}

function toAnnouncement(dto: AnnouncementDTO): Announcement {
  return {
    id: String(dto.id),
    title: dto.title,
    body: dto.body,
    createdAt: dto.created_at,
    pinned: dto.pinned,
  };
}

const toUser = (dto: UserDTO): User => ({
  id: String(dto.id),
  name: dto.name,
  email: dto.email,
});

async function holderName(): Promise<string> {
  const user = await getStoredUser();
  return user?.name ?? "You";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const api = {
  async login(email: string, password: string): Promise<AuthResponse> {
    // OAuth2 password flow: form-encoded, with the email in `username`.
    const form = new URLSearchParams({ username: email, password });
    const { data } = await http.post<{ access_token: string }>("/api/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    // The token isn't stored yet, so pass it explicitly for this one call.
    const { data: me } = await http.get<UserDTO>("/api/auth/me", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    return { token: data.access_token, user: toUser(me) };
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    await http.post<UserDTO>("/api/auth/register", { name, email, password });
    return api.login(email, password);
  },

  async getEvents(): Promise<EventItem[]> {
    const { data } = await http.get<EventDTO[]>("/api/events");
    return data.map(toEvent);
  },

  /**
   * Display settings for the home screen.
   *
   * Unauthed, and deliberately forgiving: if this endpoint fails the app still
   * has events to show, so it falls back to defaults rather than blocking.
   */
  async getSettings(): Promise<AppSettings> {
    const { data } = await http.get<PublicSettingsDTO>("/api/settings");
    return {
      showFeaturedMarquee: data.show_featured_marquee !== false,
      maxFeatured: num(data.max_featured) ?? 5,
    };
  },

  async getEvent(id: string): Promise<EventItem> {
    const { data } = await http.get<EventDTO>(`/api/events/${id}`);
    return toEvent(data);
  },

  async getTickets(): Promise<Ticket[]> {
    const [{ data }, holder] = await Promise.all([
      http.get<TicketWithEventDTO[]>("/api/tickets/mine"),
      holderName(),
    ]);
    return data.map((dto) => toTicket(dto, holder));
  },

  async registerForEvent(eventId: string, holder: string): Promise<Ticket> {
    const { data: ticket } = await http.post<TicketDTO>(`/api/events/${eventId}/register`);
    const { data: event } = await http.get<EventDTO>(`/api/events/${eventId}`);
    return toTicket({ ...ticket, event }, holder || (await holderName()));
  },

  async hasTicket(eventId: string): Promise<boolean> {
    const { data } = await http.get<TicketWithEventDTO[]>("/api/tickets/mine");
    return data.some((t) => String(t.event_id) === eventId && t.status !== "cancelled");
  },

  async getAnnouncements(): Promise<Announcement[]> {
    // The backend already returns pinned-first, then newest-first.
    const { data } = await http.get<AnnouncementDTO[]>("/api/announcements");
    return data.map(toAnnouncement);
  },
};

// Query keys — centralized so screens and mutations invalidate consistently.
export const qk = {
  events: ["events"] as const,
  settings: ["settings"] as const,
  event: (id: string) => ["event", id] as const,
  tickets: ["tickets"] as const,
  hasTicket: (id: string) => ["hasTicket", id] as const,
  announcements: ["announcements"] as const,
};
