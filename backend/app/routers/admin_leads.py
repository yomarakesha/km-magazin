"""Admin endpoints for viewing and managing contact leads."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_admin, require_role
from ..db import get_db
from ..models import Lead, ShopService
from ..schemas import LeadOut, LeadStatusIn

router = APIRouter(
    prefix="/api/admin/leads",
    tags=["admin-leads"],
    dependencies=[Depends(require_role("sales"))],
)


def _out(lead: Lead, db: Session) -> LeadOut:
    """Lead plus the title of the service page it came from, if any."""
    out = LeadOut.model_validate(lead)
    if lead.service_id is not None:
        svc = db.get(ShopService, lead.service_id)
        if svc is not None:
            out.service_title = next((t.title for t in svc.translations if t.lang == "ru"), None) or svc.slug
    return out


@router.get("", response_model=list[LeadOut])
def list_leads(db: Session = Depends(get_db)):
    return [_out(lead, db) for lead in db.scalars(select(Lead).order_by(Lead.created_at.desc())).all()]


def _take(lead: Lead, username: str) -> None:
    """Record the first manager who started working on the lead."""
    if not lead.taken_by:
        lead.taken_by = username
        lead.taken_at = datetime.now(timezone.utc)


@router.patch("/{lead_id}", response_model=LeadOut)
def set_status(
    lead_id: int,
    payload: LeadStatusIn,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    if payload.status != "new":
        _take(lead, user["username"])
    lead.status = payload.status
    db.commit()
    return _out(lead, db)


@router.post("/{lead_id}/take", response_model=LeadOut)
def take_lead(lead_id: int, db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    """The manager clicked the customer's phone or email: a new lead moves to
    "in progress" under their name. Idempotent — later clicks change nothing."""
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    if lead.status == "new":
        lead.status = "read"
    _take(lead, user["username"])
    db.commit()
    return _out(lead, db)


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)) -> dict:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    db.delete(lead)
    db.commit()
    return {"ok": True}
