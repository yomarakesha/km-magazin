"""Admin endpoints for storefront site content: home banners and static
info pages (About, FAQ, Delivery, Guarantee, Install…)."""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import require_admin, require_role
from ..config import MEDIA_DIR
from ..db import get_db
from ..models import Banner, BannerTranslation, Page, PageTranslation
from ..schemas import BannerIn, PageIn, ReorderIn
from .admin_media import _save

router = APIRouter(
    prefix="/api/admin/site",
    tags=["admin-site"],
    dependencies=[Depends(require_admin)],
)
CONTENT = Depends(require_role("content"))

BANNERS_SUBDIR = "banners"


# --------------------------------------------------------------------------
# Banners
# --------------------------------------------------------------------------
def banner_dict(b: Banner) -> dict:
    return {
        "id": b.id,
        "image": f"{BANNERS_SUBDIR}/{b.image}" if b.image else None,
        "link": b.link,
        "enabled": b.enabled,
        "sort_order": b.sort_order,
        "translations": [{"lang": t.lang, "title": t.title, "subtitle": t.subtitle} for t in b.translations],
    }


def _apply_banner(b: Banner, payload: BannerIn) -> None:
    b.link = payload.link.strip()
    b.enabled = payload.enabled
    existing = {t.lang: t for t in b.translations}
    for t in payload.translations:
        row = existing.get(t.lang)
        if row is None:
            b.translations.append(BannerTranslation(lang=t.lang, title=t.title, subtitle=t.subtitle))
        else:
            row.title, row.subtitle = t.title, t.subtitle


@router.get("/banners")
def list_banners(db: Session = Depends(get_db)) -> list[dict]:
    return [banner_dict(b) for b in db.scalars(select(Banner).order_by(Banner.sort_order)).all()]


@router.post("/banners", status_code=201, dependencies=[CONTENT])
def create_banner(payload: BannerIn, db: Session = Depends(get_db)) -> dict:
    max_order = db.scalar(select(func.max(Banner.sort_order)))
    b = Banner(sort_order=(max_order + 1) if max_order is not None else 0)
    _apply_banner(b, payload)
    db.add(b)
    db.commit()
    return banner_dict(b)


@router.put("/banners/{banner_id}", dependencies=[CONTENT])
def update_banner(banner_id: int, payload: BannerIn, db: Session = Depends(get_db)) -> dict:
    b = db.get(Banner, banner_id)
    if not b:
        raise HTTPException(404, "Banner not found")
    _apply_banner(b, payload)
    db.commit()
    return banner_dict(b)


@router.post("/banners/{banner_id}/image", dependencies=[CONTENT])
def upload_banner_image(banner_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)) -> dict:
    b = db.get(Banner, banner_id)
    if not b:
        raise HTTPException(404, "Banner not found")
    (MEDIA_DIR / BANNERS_SUBDIR).mkdir(parents=True, exist_ok=True)
    old = b.image
    b.image = _save(file, BANNERS_SUBDIR)
    db.commit()
    if old and old != b.image:
        (MEDIA_DIR / BANNERS_SUBDIR / old).unlink(missing_ok=True)
    return banner_dict(b)


@router.delete("/banners/{banner_id}", dependencies=[CONTENT])
def delete_banner(banner_id: int, db: Session = Depends(get_db)) -> dict:
    b = db.get(Banner, banner_id)
    if not b:
        raise HTTPException(404, "Banner not found")
    if b.image:
        (MEDIA_DIR / BANNERS_SUBDIR / b.image).unlink(missing_ok=True)
    db.delete(b)
    db.commit()
    return {"ok": True}


@router.post("/banners/reorder", dependencies=[CONTENT])
def reorder_banners(payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, bid in enumerate(payload.ids):
        b = db.get(Banner, bid)
        if b:
            b.sort_order = order
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Static pages
# --------------------------------------------------------------------------
def page_dict(p: Page) -> dict:
    return {
        "id": p.id,
        "slug": p.slug,
        "enabled": p.enabled,
        "sort_order": p.sort_order,
        "translations": [
            {"lang": t.lang, "title": t.title, "lead": t.lead, "blocks": t.blocks or []}
            for t in p.translations
        ],
    }


def _apply_page(p: Page, payload: PageIn) -> None:
    p.slug = payload.slug
    p.enabled = payload.enabled
    existing = {t.lang: t for t in p.translations}
    for t in payload.translations:
        blocks = [b.model_dump() for b in t.blocks if b.title.strip() or b.body.strip()]
        row = existing.get(t.lang)
        if row is None:
            p.translations.append(PageTranslation(lang=t.lang, title=t.title, lead=t.lead, blocks=blocks))
        else:
            row.title, row.lead, row.blocks = t.title, t.lead, blocks


def _slug_taken(db: Session, slug: str, exclude_id: int | None = None) -> bool:
    stmt = select(Page.id).where(Page.slug == slug)
    if exclude_id is not None:
        stmt = stmt.where(Page.id != exclude_id)
    return db.scalar(stmt) is not None


@router.get("/pages")
def list_pages(db: Session = Depends(get_db)) -> list[dict]:
    return [page_dict(p) for p in db.scalars(select(Page).order_by(Page.sort_order)).all()]


@router.get("/pages/{page_id}")
def get_page(page_id: int, db: Session = Depends(get_db)) -> dict:
    p = db.get(Page, page_id)
    if not p:
        raise HTTPException(404, "Page not found")
    return page_dict(p)


@router.post("/pages", status_code=201, dependencies=[CONTENT])
def create_page(payload: PageIn, db: Session = Depends(get_db)) -> dict:
    if _slug_taken(db, payload.slug):
        raise HTTPException(409, "Slug already exists")
    max_order = db.scalar(select(func.max(Page.sort_order)))
    p = Page(sort_order=(max_order + 1) if max_order is not None else 0)
    _apply_page(p, payload)
    db.add(p)
    db.commit()
    return page_dict(p)


@router.put("/pages/{page_id}", dependencies=[CONTENT])
def update_page(page_id: int, payload: PageIn, db: Session = Depends(get_db)) -> dict:
    p = db.get(Page, page_id)
    if not p:
        raise HTTPException(404, "Page not found")
    if _slug_taken(db, payload.slug, exclude_id=p.id):
        raise HTTPException(409, "Slug already exists")
    _apply_page(p, payload)
    db.commit()
    return page_dict(p)


@router.delete("/pages/{page_id}", dependencies=[CONTENT])
def delete_page(page_id: int, db: Session = Depends(get_db)) -> dict:
    p = db.get(Page, page_id)
    if not p:
        raise HTTPException(404, "Page not found")
    db.delete(p)
    db.commit()
    return {"ok": True}
