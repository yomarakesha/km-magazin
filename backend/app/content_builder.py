"""Assemble the public content payload in the shape the frontend expects.

Returns a dict keyed by language. Each language object matches the TS `Content`
interface (lib/content.ts), with `sections` carrying their gallery media inline
as stems ({videos, photos, still}); the frontend prepends the media base URL.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ContentBlock, Service

LANGS = ("ru", "tk", "en")

# ContentBlock.key -> flat fields it carries in Content
BLOCK_KEYS = ("meta", "hero", "marquee", "nav", "about", "services", "process", "advantages", "contact")


def _blocks_for_lang(db: Session, lang: str) -> dict:
    rows = db.scalars(select(ContentBlock).where(ContentBlock.lang == lang)).all()
    merged: dict = {}
    by_key = {r.key: r.data for r in rows}
    for key in BLOCK_KEYS:
        data = by_key.get(key)
        if isinstance(data, dict):
            merged.update(data)
        elif data is not None:  # e.g. marquee stored as {"marquee": [...]}
            merged[key] = data
    return merged


def _media_item(m) -> dict:
    """One gallery item with paths relative to the media base URL."""
    if m.kind == "video":
        return {
            "kind": "video",
            "src": f"video/{m.filename}",
            "poster": f"img/{m.poster}" if m.poster else None,
            "still": bool(m.still),
        }
    return {
        "kind": "img",
        "src": f"img/{m.filename}",
        "caption": m.caption_kind or "photo",
    }


def _sections_for_lang(db: Session, services: list[Service], lang: str) -> list[dict]:
    out: list[dict] = []
    for svc in services:
        tr = next((t for t in svc.translations if t.lang == lang), None)
        if tr is None:
            continue
        media = [_media_item(m) for m in sorted(svc.media, key=lambda x: x.sort_order)]
        out.append(
            {
                "id": svc.slug,
                "no": f"{svc.sort_order + 1:03d}",
                "icon": svc.icon,
                "code": tr.code,
                "short": tr.short,
                "title": tr.title,
                "body": tr.body,
                "feats": tr.feats or [],
                "media": media,
            }
        )
    return out


def build_content(db: Session) -> dict:
    services = db.scalars(
        select(Service).where(Service.enabled == True).order_by(Service.sort_order)  # noqa: E712
    ).all()
    result: dict = {}
    for lang in LANGS:
        content = _blocks_for_lang(db, lang)
        content["sections"] = _sections_for_lang(db, services, lang)
        result[lang] = content
    return result
