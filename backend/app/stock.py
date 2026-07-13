"""Stock-movement ledger helper.

`Product.stock_qty` remains the authoritative counter (updated with atomic
guarded UPDATEs); `log_movement` appends the audit row in the SAME transaction
so ledger and counter commit or roll back together.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Product, StockMovement


def log_movement(
    db: Session,
    *,
    product_id: int,
    qty_delta: int,
    kind: str,
    username: str = "",
    note: str = "",
    unit_cost: int | None = None,
    supplier_id: int | None = None,
    order_id: int | None = None,
    purchase_id: int | None = None,
) -> None:
    """Append one ledger row. Call AFTER the stock counter was updated within
    the current transaction — stock_after reads the post-update value."""
    stock_after = db.scalar(select(Product.stock_qty).where(Product.id == product_id))
    db.add(StockMovement(
        product_id=product_id,
        qty_delta=qty_delta,
        stock_after=stock_after,
        kind=kind,
        note=note,
        unit_cost=unit_cost,
        supplier_id=supplier_id,
        order_id=order_id,
        purchase_id=purchase_id,
        username=username,
    ))
