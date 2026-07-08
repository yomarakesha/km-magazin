"""FastAPI application entrypoint for the KM site backend."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_ORIGIN, MEDIA_DIR, SENTRY_DSN
from .db import init_db
from .logging import setup_logging
from .revalidate import revalidate_frontend
from .routers import (
    admin_content,
    admin_leads,
    admin_media,
    admin_services,
    admin_shop,
    auth,
    public,
    shop_public,
)


# Error tracking: a no-op without SENTRY_DSN (and tolerated if the package
# isn't installed locally — it's in requirements.txt for CI/production).
if SENTRY_DSN:
    try:
        import sentry_sdk

        sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1)
    except ImportError:  # pragma: no cover
        import logging

        logging.getLogger("km").warning("SENTRY_DSN set but sentry-sdk is not installed")


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    init_db()
    yield


app = FastAPI(title="KM Site API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@app.middleware("http")
async def _invalidate_frontend_cache(request: Request, call_next):
    """After any successful admin write, ping the frontend so its tagged SSR
    caches ("shop"/"content") refresh immediately. One choke point instead of
    hooks in ~30 admin endpoints."""
    response = await call_next(request)
    path = request.url.path
    if (
        request.method in _WRITE_METHODS
        and path.startswith("/api/admin/")
        and response.status_code < 400
    ):
        revalidate_frontend(["shop"] if path.startswith("/api/admin/shop/") else ["content"])
    return response


app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

app.include_router(public.router)
app.include_router(auth.router)
app.include_router(admin_content.router)
app.include_router(admin_services.router)
app.include_router(admin_media.router)
app.include_router(admin_leads.router)
app.include_router(admin_shop.router)
app.include_router(shop_public.router)


@app.get("/health")
def health() -> dict:
    return {"ok": True}
