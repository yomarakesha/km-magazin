"""Public, unauthenticated endpoints consumed by the Next.js site."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..config import PUBLIC_URL
from ..content_builder import build_content
from ..db import get_db
from ..models import Lead
from ..schemas import LeadIn

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/content")
def get_content(db: Session = Depends(get_db)) -> dict:
    return {
        "mediaBase": f"{PUBLIC_URL}/media",
        "content": build_content(db),
    }


@router.post("/leads", status_code=201)
def create_lead(payload: LeadIn, db: Session = Depends(get_db)) -> dict:
    lead = Lead(
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=payload.email.strip(),
        message=payload.message.strip(),
    )
    db.add(lead)
    db.commit()
    return {"ok": True, "id": lead.id}
