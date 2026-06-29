"""Admin endpoints for viewing and managing contact leads."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..db import get_db
from ..models import Lead
from ..schemas import LeadOut, LeadStatusIn

router = APIRouter(
    prefix="/api/admin/leads",
    tags=["admin-leads"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[LeadOut])
def list_leads(db: Session = Depends(get_db)):
    return db.scalars(select(Lead).order_by(Lead.created_at.desc())).all()


@router.patch("/{lead_id}", response_model=LeadOut)
def set_status(lead_id: int, payload: LeadStatusIn, db: Session = Depends(get_db)):
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    lead.status = payload.status
    db.commit()
    return lead


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)) -> dict:
    lead = db.get(Lead, lead_id)
    if not lead:
        raise HTTPException(404, "Lead not found")
    db.delete(lead)
    db.commit()
    return {"ok": True}
