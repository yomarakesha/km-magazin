"""Admin CRUD for per-language content blocks (texts)."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import require_role
from ..content_builder import BLOCK_KEYS, LANGS
from ..db import get_db
from ..models import ContentBlock
from ..schemas import ContentBlockIn

router = APIRouter(
    prefix="/api/admin/content",
    tags=["admin-content"],
    dependencies=[Depends(require_role("content"))],
)


@router.get("")
def list_blocks(db: Session = Depends(get_db)) -> dict:
    rows = db.scalars(select(ContentBlock)).all()
    out: dict = {lang: {} for lang in LANGS}
    for r in rows:
        out.setdefault(r.lang, {})[r.key] = r.data
    return {"keys": list(BLOCK_KEYS), "langs": list(LANGS), "blocks": out}


@router.put("/{lang}/{key}")
def upsert_block(lang: str, key: str, payload: ContentBlockIn, db: Session = Depends(get_db)) -> dict:
    row = db.scalar(
        select(ContentBlock).where(ContentBlock.lang == lang, ContentBlock.key == key)
    )
    if row is None:
        row = ContentBlock(lang=lang, key=key, data=payload.data)
        db.add(row)
    else:
        row.data = payload.data
    db.commit()
    return {"ok": True}
