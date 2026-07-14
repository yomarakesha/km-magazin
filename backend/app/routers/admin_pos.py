"""POS (касса) for the sales role: barcode lookup, counter sales with an
immediate stock decrement, debts (в долг) with settle, and owner-only void.

A Sale is separate from an online Order, but both write into the same
StockMovement ledger. Stock is decremented with atomic guarded UPDATEs (the
same pattern as create_order): insufficient tracked stock aborts the whole
sale with 409 — nothing is written.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..auth import require_admin, require_role
from ..db import get_db
from ..models import Product, ProductTranslation, Sale, SaleItem
from ..reports import parse_period
from ..schemas import SaleIn
from ..stock import log_movement

router = APIRouter(
    prefix="/api/admin/pos",
    tags=["admin-pos"],
    dependencies=[Depends(require_role("sales"))],
)

OWNER = Depends(require_role())


def _title(p: Product) -> str:
    return next((t.title for t in p.translations if t.lang == "ru"), None) or p.slug


def _sale(s: Sale) -> dict:
    return {
        "id": s.id,
        "seller": s.seller,
        "subtotal": s.subtotal,
        "sold_total": s.sold_total,
        "discount": s.discount,
        "cost_total": s.cost_total,
        "status": s.status,
        "payment_method": s.payment_method,
        "debtor_name": s.debtor_name,
        "debtor_phone": s.debtor_phone,
        "settled_at": s.settled_at,
        "created_at": s.created_at,
        "items": [
            {
                "product_id": it.product_id,
                "title": it.title_snapshot,
                "price": it.price_snapshot,
                "qty": it.qty,
            }
            for it in s.items
        ],
    }


# --------------------------------------------------------------------------
# Barcode / SKU lookup
# --------------------------------------------------------------------------


@router.get("/lookup")
def lookup(code: str, db: Session = Depends(get_db)) -> dict:
    """Find a product for the scanner: barcode → sku → title substring."""
    needle = code.strip()
    if not needle:
        raise HTTPException(404, "Product not found")
    p = db.scalar(select(Product).where(Product.barcode == needle))
    if p is None:
        p = db.scalar(select(Product).where(Product.sku == needle))
    if p is None:
        p = db.scalar(
            select(Product)
            .join(ProductTranslation, ProductTranslation.product_id == Product.id)
            .where(
                ProductTranslation.lang == "ru",
                ProductTranslation.title.ilike(f"%{needle}%"),
            )
            .order_by(Product.sort_order)
            .limit(1)
        )
    if p is None:
        raise HTTPException(404, "Product not found")
    return {
        "id": p.id,
        "title": _title(p),
        "price": p.price,
        "currency": p.currency,
        "stock_qty": p.stock_qty,
        "barcode": p.barcode,
        "sku": p.sku,
    }


# --------------------------------------------------------------------------
# Posting a sale
# --------------------------------------------------------------------------


@router.post("/sales", status_code=201)
def create_sale(
    payload: SaleIn,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
) -> dict:
    # Load products and take snapshots first; abort before any write on 404.
    lines: list[tuple[Product, int]] = []
    for it in payload.items:
        p = db.get(Product, it.product_id)
        if p is None:
            raise HTTPException(404, f"Product {it.product_id} not found")
        lines.append((p, it.qty))

    # Guarded decrement for tracked products; any shortage aborts everything.
    decremented: list[tuple[Product, int]] = []
    for p, qty in lines:
        if p.stock_qty is None:
            continue  # под заказ — sold without stock tracking
        res = db.execute(
            update(Product)
            .where(Product.id == p.id, Product.stock_qty.is_not(None), Product.stock_qty >= qty)
            .values(stock_qty=Product.stock_qty - qty)
        )
        if res.rowcount == 0:
            db.rollback()
            raise HTTPException(409, f"недостаточно на складе: {_title(p)}")
        decremented.append((p, qty))

    subtotal = sum(p.price * qty for p, qty in lines)
    sold_total = payload.sold_total if payload.sold_total is not None else subtotal
    sale = Sale(
        seller=user["username"],
        subtotal=subtotal,
        sold_total=sold_total,
        discount=subtotal - sold_total,
        cost_total=sum((p.cost_price or 0) * qty for p, qty in lines),
        status="debt" if payload.payment_method == "debt" else "paid",
        payment_method=payload.payment_method,
        debtor_name=(payload.debtor_name or "").strip() or None,
        debtor_phone=(payload.debtor_phone or "").strip() or None,
    )
    for p, qty in lines:
        sale.items.append(SaleItem(
            product_id=p.id,
            title_snapshot=_title(p),
            price_snapshot=p.price,
            cost_snapshot=p.cost_price,
            qty=qty,
        ))
    db.add(sale)
    db.flush()  # sale.id for the ledger rows
    for p, qty in decremented:
        log_movement(
            db, product_id=p.id, qty_delta=-qty, kind="sale",
            sale_id=sale.id, username=user["username"], note=f"касса, чек #{sale.id}",
        )
    db.commit()
    return _sale(sale)


# --------------------------------------------------------------------------
# History, debts, settle, void
# --------------------------------------------------------------------------


@router.get("/sales")
def list_sales(
    date_from: str | None = None,
    date_to: str | None = None,
    debt: bool = False,
    db: Session = Depends(get_db),
) -> list[dict]:
    start, end = parse_period(date_from, date_to)
    stmt = (
        select(Sale)
        .where(Sale.created_at >= start, Sale.created_at <= end)
        .order_by(Sale.created_at.desc())
    )
    if debt:
        stmt = select(Sale).where(Sale.status == "debt").order_by(Sale.created_at.desc())
    return [_sale(s) for s in db.scalars(stmt).all()]


@router.get("/sales/{sale_id}")
def get_sale(sale_id: int, db: Session = Depends(get_db)) -> dict:
    s = db.get(Sale, sale_id)
    if s is None:
        raise HTTPException(404, "Sale not found")
    return _sale(s)


@router.post("/sales/{sale_id}/settle")
def settle_sale(sale_id: int, db: Session = Depends(get_db)) -> dict:
    s = db.get(Sale, sale_id)
    if s is None:
        raise HTTPException(404, "Sale not found")
    if s.status != "debt":
        raise HTTPException(409, "Sale is not a debt")
    s.status = "paid"
    s.settled_at = datetime.now(timezone.utc)
    db.commit()
    return _sale(s)


@router.post("/sales/{sale_id}/void", dependencies=[OWNER])
def void_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
) -> dict:
    """Cancel a sale: give tracked stock back, then delete the receipt. The
    ledger keeps both the sale and return rows (sale_id goes NULL on delete)."""
    s = db.get(Sale, sale_id)
    if s is None:
        raise HTTPException(404, "Sale not found")
    for it in s.items:
        if it.product_id is None:
            continue
        res = db.execute(
            update(Product)
            .where(Product.id == it.product_id, Product.stock_qty.is_not(None))
            .values(stock_qty=Product.stock_qty + it.qty)
        )
        if res.rowcount:  # tracked → ledger row
            log_movement(
                db, product_id=it.product_id, qty_delta=it.qty, kind="return",
                sale_id=s.id, username=user["username"], note=f"отмена чека #{s.id}",
            )
    db.delete(s)
    db.commit()
    return {"ok": True}
