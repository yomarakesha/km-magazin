"""Warehouse admin: stock overview, the movement ledger, manual stock
operations, suppliers and purchase documents (приходные накладные).

Writes are warehouse-role only (owner passes everywhere); sales can read
stock and the ledger. Every stock change appends a StockMovement row in the
same transaction as the counter update (see app/stock.py).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..auth import require_role
from ..db import get_db
from ..models import Product, ProductTranslation, PurchaseDoc, PurchaseItem, StockMovement, Supplier
from ..schemas import MovementIn, PurchaseIn, SupplierIn, SupplierUpdateIn
from ..stock import log_movement

router = APIRouter(
    prefix="/api/admin/warehouse",
    tags=["admin-warehouse"],
    dependencies=[Depends(require_role("warehouse", "sales"))],  # read floor
)

WRITE = Depends(require_role("warehouse"))

LOW_STOCK_AT = 5  # matches the dashboard low-stock threshold


def _title(p: Product) -> str:
    return next((t.title for t in p.translations if t.lang == "ru"), None) or p.slug


# --------------------------------------------------------------------------
# Stock overview
# --------------------------------------------------------------------------


@router.get("/stock")
def stock_overview(q: str = "", low: bool = False, db: Session = Depends(get_db)) -> list[dict]:
    """Current stock per product (tracked and untracked), with cost/price."""
    products = db.scalars(select(Product).order_by(Product.category_id, Product.sort_order)).all()
    rows = []
    for p in products:
        title = _title(p)
        if q and q.lower() not in title.lower() and q.lower() not in (p.sku or "").lower():
            continue
        if low and (p.stock_qty is None or p.stock_qty > LOW_STOCK_AT):
            continue
        rows.append({
            "id": p.id,
            "title": title,
            "sku": p.sku,
            "stock_qty": p.stock_qty,
            "cost_price": p.cost_price,
            "price": p.price,
            "in_stock": p.in_stock,
            "enabled": p.enabled,
            "low": p.stock_qty is not None and p.stock_qty <= LOW_STOCK_AT,
        })
    return rows


# --------------------------------------------------------------------------
# Movement ledger
# --------------------------------------------------------------------------


def _movement(m: StockMovement, titles: dict[int, str]) -> dict:
    return {
        "id": m.id,
        "product_id": m.product_id,
        "product_title": titles.get(m.product_id, f"#{m.product_id}"),
        "qty_delta": m.qty_delta,
        "stock_after": m.stock_after,
        "kind": m.kind,
        "note": m.note,
        "unit_cost": m.unit_cost,
        "supplier_id": m.supplier_id,
        "order_id": m.order_id,
        "purchase_id": m.purchase_id,
        "username": m.username,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


@router.get("/movements")
def list_movements(
    product_id: int | None = None,
    kind: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(StockMovement)
    if product_id is not None:
        stmt = stmt.where(StockMovement.product_id == product_id)
    if kind:
        stmt = stmt.where(StockMovement.kind == kind)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(StockMovement.id.desc()).limit(min(limit, 200)).offset(offset)
    ).all()
    pids = {m.product_id for m in rows}
    titles: dict[int, str] = {}
    if pids:
        for pid, title in db.execute(
            select(ProductTranslation.product_id, ProductTranslation.title).where(
                ProductTranslation.product_id.in_(pids), ProductTranslation.lang == "ru"
            )
        ):
            titles[pid] = title
    return {"total": total, "items": [_movement(m, titles) for m in rows]}


@router.post("/movements", status_code=201, dependencies=[WRITE])
def create_movement(payload: MovementIn, db: Session = Depends(get_db), user: dict = Depends(require_role("warehouse"))) -> dict:
    p = db.get(Product, payload.product_id)
    if not p:
        raise HTTPException(404, "Product not found")

    if payload.kind == "receipt":
        # NULL stock = tracking off → приход включает учёт с нуля
        db.execute(
            update(Product)
            .where(Product.id == p.id)
            .values(stock_qty=func.coalesce(Product.stock_qty, 0) + payload.qty)
        )
        delta = payload.qty
        if payload.unit_cost is not None:
            db.execute(update(Product).where(Product.id == p.id).values(cost_price=payload.unit_cost))
    elif payload.kind == "writeoff":
        res = db.execute(
            update(Product)
            .where(Product.id == p.id, Product.stock_qty.is_not(None), Product.stock_qty >= payload.qty)
            .values(stock_qty=Product.stock_qty - payload.qty)
        )
        if res.rowcount == 0:
            raise HTTPException(409, "insufficient stock")
        delta = -payload.qty
    else:  # adjust — set the absolute counted quantity
        old = p.stock_qty or 0
        db.execute(update(Product).where(Product.id == p.id).values(stock_qty=payload.new_qty))
        delta = payload.new_qty - old

    log_movement(
        db, product_id=p.id, qty_delta=delta, kind=payload.kind,
        username=user["username"], note=payload.note,
        unit_cost=payload.unit_cost if payload.kind == "receipt" else None,
        supplier_id=payload.supplier_id if payload.kind == "receipt" else None,
    )
    db.commit()
    db.refresh(p)
    return {"ok": True, "product_id": p.id, "stock_qty": p.stock_qty, "cost_price": p.cost_price}


# --------------------------------------------------------------------------
# Suppliers
# --------------------------------------------------------------------------


def _supplier(s: Supplier) -> dict:
    return {
        "id": s.id, "name": s.name, "phone": s.phone, "note": s.note,
        "active": s.active, "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/suppliers")
def list_suppliers(db: Session = Depends(get_db)) -> list[dict]:
    return [_supplier(s) for s in db.scalars(select(Supplier).order_by(Supplier.name)).all()]


@router.post("/suppliers", status_code=201, dependencies=[WRITE])
def create_supplier(payload: SupplierIn, db: Session = Depends(get_db)) -> dict:
    s = Supplier(name=payload.name.strip(), phone=payload.phone.strip(), note=payload.note.strip())
    db.add(s)
    db.commit()
    return _supplier(s)


@router.patch("/suppliers/{supplier_id}", dependencies=[WRITE])
def update_supplier(supplier_id: int, payload: SupplierUpdateIn, db: Session = Depends(get_db)) -> dict:
    s = db.get(Supplier, supplier_id)
    if not s:
        raise HTTPException(404, "Supplier not found")
    if payload.name is not None:
        s.name = payload.name.strip()
    if payload.phone is not None:
        s.phone = payload.phone.strip()
    if payload.note is not None:
        s.note = payload.note.strip()
    if payload.active is not None:
        s.active = payload.active
    db.commit()
    return _supplier(s)


@router.delete("/suppliers/{supplier_id}", dependencies=[WRITE])
def delete_supplier(supplier_id: int, db: Session = Depends(get_db)) -> dict:
    s = db.get(Supplier, supplier_id)
    if not s:
        raise HTTPException(404, "Supplier not found")
    # history keeps working: movements/purchases reference it with SET NULL
    db.delete(s)
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Purchase documents (приходные накладные) — immutable once posted
# --------------------------------------------------------------------------


def _purchase(doc: PurchaseDoc, suppliers: dict[int, str] | None = None) -> dict:
    return {
        "id": doc.id,
        "supplier_id": doc.supplier_id,
        "supplier_name": (suppliers or {}).get(doc.supplier_id, "")
            or (doc.supplier.name if doc.supplier else ""),
        "note": doc.note,
        "total_cost": doc.total_cost,
        "username": doc.username,
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "items": [
            {
                "product_id": it.product_id,
                "title": it.title_snapshot,
                "qty": it.qty,
                "unit_cost": it.unit_cost,
            }
            for it in doc.items
        ],
    }


@router.get("/purchases")
def list_purchases(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)) -> dict:
    total = db.scalar(select(func.count()).select_from(PurchaseDoc)) or 0
    docs = db.scalars(
        select(PurchaseDoc).order_by(PurchaseDoc.id.desc()).limit(min(limit, 200)).offset(offset)
    ).all()
    return {"total": total, "items": [_purchase(d) for d in docs]}


@router.get("/purchases/{purchase_id}")
def get_purchase(purchase_id: int, db: Session = Depends(get_db)) -> dict:
    doc = db.get(PurchaseDoc, purchase_id)
    if not doc:
        raise HTTPException(404, "Purchase not found")
    return _purchase(doc)


@router.post("/purchases", status_code=201, dependencies=[WRITE])
def create_purchase(payload: PurchaseIn, db: Session = Depends(get_db), user: dict = Depends(require_role("warehouse"))) -> dict:
    if payload.supplier_id is not None and not db.get(Supplier, payload.supplier_id):
        raise HTTPException(400, "Supplier not found")
    doc = PurchaseDoc(supplier_id=payload.supplier_id, note=payload.note.strip(), username=user["username"])
    total_cost = 0
    for it in payload.items:
        p = db.get(Product, it.product_id)
        if not p:
            raise HTTPException(400, f"Product {it.product_id} not found")
        doc.items.append(PurchaseItem(
            product_id=p.id, title_snapshot=_title(p), qty=it.qty, unit_cost=it.unit_cost,
        ))
        total_cost += it.qty * it.unit_cost
        db.execute(
            update(Product)
            .where(Product.id == p.id)
            .values(stock_qty=func.coalesce(Product.stock_qty, 0) + it.qty, cost_price=it.unit_cost)
        )
    doc.total_cost = total_cost
    db.add(doc)
    db.flush()  # doc.id for the ledger rows
    for it in payload.items:
        log_movement(
            db, product_id=it.product_id, qty_delta=it.qty, kind="receipt",
            username=user["username"], note=f"накладная #{doc.id}",
            unit_cost=it.unit_cost, supplier_id=payload.supplier_id, purchase_id=doc.id,
        )
    db.commit()
    return _purchase(doc)
