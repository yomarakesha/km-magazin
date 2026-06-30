"""FastAPI application entrypoint for the KM site backend."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import FRONTEND_ORIGIN, MEDIA_DIR
from .db import init_db
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


@asynccontextmanager
async def lifespan(_: FastAPI):
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
