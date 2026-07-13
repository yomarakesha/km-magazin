"""Admin CRUD for services and their per-language translations."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import require_role
from ..db import get_db
from ..models import Service, ServiceTranslation
from ..schemas import ReorderIn, ServiceIn, ServiceUpdateIn

router = APIRouter(
    prefix="/api/admin/services",
    tags=["admin-services"],
    dependencies=[Depends(require_role("content"))],
)


def _serialize(svc: Service) -> dict:
    return {
        "id": svc.id,
        "slug": svc.slug,
        "icon": svc.icon,
        "enabled": svc.enabled,
        "sort_order": svc.sort_order,
        "media_count": len(svc.media),
        "translations": [
            {
                "lang": t.lang,
                "code": t.code,
                "short": t.short,
                "title": t.title,
                "body": t.body,
                "feats": t.feats or [],
            }
            for t in svc.translations
        ],
    }


@router.get("")
def list_services(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Service).order_by(Service.sort_order)).all()
    return [_serialize(s) for s in rows]


@router.get("/{service_id}")
def get_service(service_id: int, db: Session = Depends(get_db)) -> dict:
    svc = db.get(Service, service_id)
    if not svc:
        raise HTTPException(404, "Service not found")
    return _serialize(svc)


@router.post("", status_code=201)
def create_service(payload: ServiceIn, db: Session = Depends(get_db)) -> dict:
    if db.scalar(select(Service).where(Service.slug == payload.slug)):
        raise HTTPException(409, "Slug already exists")
    max_order = db.scalar(select(func.max(Service.sort_order)))
    svc = Service(
        slug=payload.slug,
        icon=payload.icon,
        enabled=payload.enabled,
        sort_order=(max_order + 1) if max_order is not None else 0,
    )
    for t in payload.translations:
        svc.translations.append(
            ServiceTranslation(
                lang=t.lang, code=t.code, short=t.short, title=t.title, body=t.body, feats=t.feats
            )
        )
    db.add(svc)
    db.commit()
    return _serialize(svc)


@router.put("/{service_id}")
def update_service(service_id: int, payload: ServiceUpdateIn, db: Session = Depends(get_db)) -> dict:
    svc = db.get(Service, service_id)
    if not svc:
        raise HTTPException(404, "Service not found")
    if payload.slug is not None:
        svc.slug = payload.slug
    if payload.icon is not None:
        svc.icon = payload.icon
    if payload.enabled is not None:
        svc.enabled = payload.enabled
    if payload.translations is not None:
        existing = {t.lang: t for t in svc.translations}
        for t in payload.translations:
            row = existing.get(t.lang)
            if row is None:
                svc.translations.append(
                    ServiceTranslation(
                        lang=t.lang, code=t.code, short=t.short, title=t.title, body=t.body, feats=t.feats
                    )
                )
            else:
                row.code, row.short, row.title, row.body, row.feats = (
                    t.code, t.short, t.title, t.body, t.feats,
                )
    db.commit()
    return _serialize(svc)


@router.delete("/{service_id}")
def delete_service(service_id: int, db: Session = Depends(get_db)) -> dict:
    svc = db.get(Service, service_id)
    if not svc:
        raise HTTPException(404, "Service not found")
    db.delete(svc)
    db.commit()
    return {"ok": True}


@router.post("/reorder")
def reorder_services(payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, sid in enumerate(payload.ids):
        svc = db.get(Service, sid)
        if svc:
            svc.sort_order = order
    db.commit()
    return {"ok": True}
