"""Admin media management: upload, edit, reorder, delete gallery items."""
import re
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..config import MEDIA_DIR
from ..db import get_db
from ..models import Media, Service
from ..schemas import MediaUpdateIn, ReorderIn

router = APIRouter(
    prefix="/api/admin",
    tags=["admin-media"],
    dependencies=[Depends(require_admin)],
)

_SAFE = re.compile(r"[^a-zA-Z0-9._-]+")


def _safe_name(name: str) -> str:
    name = _SAFE.sub("-", name.strip()).strip("-.")
    return name or "file"


def _unique_path(subdir: str, name: str) -> Path:
    base = MEDIA_DIR / subdir
    stem, dot, ext = name.partition(".")
    candidate = base / name
    i = 1
    while candidate.exists():
        candidate = base / f"{stem}-{i}{dot}{ext}"
        i += 1
    return candidate


def _save(upload: UploadFile, subdir: str) -> str:
    path = _unique_path(subdir, _safe_name(upload.filename or "file"))
    with path.open("wb") as f:
        f.write(upload.file.read())
    return path.name


def _serialize(m: Media) -> dict:
    return {
        "id": m.id,
        "kind": m.kind,
        "filename": m.filename,
        "poster": m.poster,
        "still": m.still,
        "caption_kind": m.caption_kind,
        "sort_order": m.sort_order,
    }


@router.get("/services/{service_id}/media")
def list_media(service_id: int, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(Media).where(Media.service_id == service_id).order_by(Media.sort_order)
    ).all()
    return [_serialize(m) for m in rows]


@router.post("/services/{service_id}/media", status_code=201)
def upload_media(
    service_id: int,
    kind: str = Form(...),
    caption_kind: str = Form("photo"),
    still: bool = Form(False),
    file: UploadFile = File(...),
    poster: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> dict:
    if kind not in ("img", "video"):
        raise HTTPException(400, "kind must be 'img' or 'video'")
    if not db.get(Service, service_id):
        raise HTTPException(404, "Service not found")

    subdir = "video" if kind == "video" else "img"
    filename = _save(file, subdir)
    poster_name = _save(poster, "img") if (kind == "video" and poster) else None

    max_order = db.scalar(
        select(func.max(Media.sort_order)).where(Media.service_id == service_id)
    )
    m = Media(
        service_id=service_id,
        kind=kind,
        filename=filename,
        poster=poster_name,
        still=still,
        caption_kind=caption_kind,
        sort_order=(max_order + 1) if max_order is not None else 0,
    )
    db.add(m)
    db.commit()
    return _serialize(m)


@router.patch("/media/{media_id}")
def update_media(media_id: int, payload: MediaUpdateIn, db: Session = Depends(get_db)) -> dict:
    m = db.get(Media, media_id)
    if not m:
        raise HTTPException(404, "Media not found")
    if payload.still is not None:
        m.still = payload.still
    if payload.caption_kind is not None:
        m.caption_kind = payload.caption_kind
    db.commit()
    return _serialize(m)


@router.delete("/media/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db)) -> dict:
    m = db.get(Media, media_id)
    if not m:
        raise HTTPException(404, "Media not found")
    for sub, name in (("video" if m.kind == "video" else "img", m.filename), ("img", m.poster)):
        if name:
            fp = MEDIA_DIR / sub / name
            fp.unlink(missing_ok=True)
    db.delete(m)
    db.commit()
    return {"ok": True}


@router.post("/services/{service_id}/media/reorder")
def reorder_media(service_id: int, payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, mid in enumerate(payload.ids):
        m = db.get(Media, mid)
        if m and m.service_id == service_id:
            m.sort_order = order
    db.commit()
    return {"ok": True}
