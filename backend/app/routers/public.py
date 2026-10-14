"""Public, unauthenticated endpoints: service requests (leads)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Lead, ShopService
from ..ratelimit import limiter
from ..schemas import LeadIn

router = APIRouter(prefix="/api", tags=["public"])


@router.post("/leads", status_code=201, dependencies=[Depends(limiter("leads", 3))])
def create_lead(payload: LeadIn, db: Session = Depends(get_db)) -> dict:
    service_id = None
    if payload.service.strip():
        svc = db.scalar(select(ShopService).where(ShopService.slug == payload.service.strip()))
        if svc is None or not svc.enabled:
            raise HTTPException(404, "Service not found")
        service_id = svc.id
    lead = Lead(
        service_id=service_id,
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=payload.email.strip(),
        message=payload.message.strip(),
    )
    db.add(lead)
    db.commit()
    return {"ok": True, "id": lead.id}
