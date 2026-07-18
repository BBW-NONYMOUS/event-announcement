from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi import _rate_limit_exceeded_handler

from app.config import settings
from app.limiter import limiter
from app.routers import admin, announcements, auth, events, tickets
from app.schemas import HealthOut

app = FastAPI(title="Event Check-in API", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploaded event images, served read-only. StaticFiles needs the directory to
# exist at mount time, and only ever reads from inside it.
settings.upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_path), name="uploads")

app.include_router(auth.router)
app.include_router(events.router)
app.include_router(events.settings_router)
app.include_router(tickets.router)
app.include_router(announcements.router)
app.include_router(admin.router)


@app.get("/api/health", response_model=HealthOut, tags=["health"])
def health() -> HealthOut:
    return HealthOut(status="ok")
