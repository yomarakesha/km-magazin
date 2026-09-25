"""Admin reports: sales + profit, stock value/turnover, service demand.

Every endpoint takes an optional ?format=csv to download the same data as a
spreadsheet. Roles: sales sees sales/services, warehouse sees stock, owner
sees everything (require_role lets owner through any gate).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import require_role
from ..db import get_db
from ..models import (
    Order,
    OrderItem,
    Product,
    ProductTranslation,
    Sale,
    ShopService,
    ShopServiceTranslation,
    StockMovement,
)
from ..reports import csv_response, parse_period

router = APIRouter(prefix="/api/admin/reports", tags=["admin-reports"])

NOT_CANCELLED = Order.status != "cancelled"


def _ru_titles(db: Session, product_ids: set[int]) -> dict[int, str]:
    if not product_ids:
        return {}
    return {
        pid: title
        for pid, title in db.execute(
            select(ProductTranslation.product_id, ProductTranslation.title).where(
                ProductTranslation.product_id.in_(product_ids), ProductTranslation.lang == "ru"
            )
        )
    }


# --------------------------------------------------------------------------
# Sales + profit
# --------------------------------------------------------------------------


@router.get("/sales", dependencies=[Depends(require_role("sales"))])
def sales_report(
    date_from: str | None = None,
    date_to: str | None = None,
    format: str = "json",
    db: Session = Depends(get_db),
) -> object:
    start, end = parse_period(date_from, date_to)
    in_range = (Order.created_at >= start, Order.created_at <= end, NOT_CANCELLED)

    orders_count = db.scalar(select(func.count(Order.id)).where(*in_range)) or 0
    revenue = db.scalar(select(func.coalesce(func.sum(Order.total), 0)).where(*in_range)) or 0
    discounts = db.scalar(select(func.coalesce(func.sum(Order.discount), 0)).where(*in_range)) or 0
    # delivery fees are part of revenue (Order.total) but not of product margin
    delivery = db.scalar(select(func.coalesce(func.sum(Order.delivery), 0)).where(*in_range)) or 0

    # cost of goods sold over product lines in those orders (cost snapshot at
    # sale time; NULL = cost unknown, counted as 0 and flagged via coverage)
    cogs = db.scalar(
        select(func.coalesce(func.sum(OrderItem.cost_snapshot * OrderItem.qty), 0))
        .join(Order, Order.id == OrderItem.order_id)
        .where(*in_range, OrderItem.product_id.is_not(None))
    ) or 0
    lines_total = db.scalar(
        select(func.count(OrderItem.id))
        .join(Order, Order.id == OrderItem.order_id)
        .where(*in_range, OrderItem.product_id.is_not(None))
    ) or 0
    lines_costed = db.scalar(
        select(func.count(OrderItem.id))
        .join(Order, Order.id == OrderItem.order_id)
        .where(*in_range, OrderItem.product_id.is_not(None), OrderItem.cost_snapshot.is_not(None))
    ) or 0

    # POS (касса) channel over the same period; online + pos feed the totals
    pos_range = (Sale.created_at >= start, Sale.created_at <= end)
    pos_count = db.scalar(select(func.count(Sale.id)).where(*pos_range)) or 0
    pos_revenue = db.scalar(
        select(func.coalesce(func.sum(Sale.sold_total), 0)).where(*pos_range)
    ) or 0
    pos_cogs = db.scalar(
        select(func.coalesce(func.sum(Sale.cost_total), 0)).where(*pos_range)
    ) or 0
    pos_discounts = db.scalar(
        select(func.coalesce(func.sum(Sale.discount), 0)).where(*pos_range)
    ) or 0
    # unsettled debts — global, not period-bound
    debts_outstanding = db.scalar(
        select(func.coalesce(func.sum(Sale.sold_total), 0)).where(Sale.status == "debt")
    ) or 0

    online_revenue, online_cogs = int(revenue), int(cogs)
    revenue = online_revenue + int(pos_revenue)
    cogs = online_cogs + int(pos_cogs)
    discounts = int(discounts) + int(pos_discounts)
    orders_count = int(orders_count) + int(pos_count)
    gross_profit = revenue - cogs
    avg_check = round(revenue / orders_count) if orders_count else 0

    # daily breakdown for a chart
    daily = db.execute(
        select(
            func.date(Order.created_at).label("day"),
            func.count(Order.id),
            func.coalesce(func.sum(Order.total), 0),
        )
        .where(*in_range)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    ).all()

    # top products by revenue, with margin
    top_rows = db.execute(
        select(
            OrderItem.product_id,
            func.sum(OrderItem.qty),
            func.coalesce(func.sum(OrderItem.price_snapshot * OrderItem.qty), 0),
            func.coalesce(func.sum(OrderItem.cost_snapshot * OrderItem.qty), 0),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(*in_range, OrderItem.product_id.is_not(None))
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.price_snapshot * OrderItem.qty).desc())
        .limit(20)
    ).all()
    titles = _ru_titles(db, {r[0] for r in top_rows})
    top_products = [
        {
            "id": pid,
            "title": titles.get(pid, f"#{pid}"),
            "qty": int(qty),
            "revenue": int(rev),
            "profit": int(rev - cost),
        }
        for pid, qty, rev, cost in top_rows
    ]

    summary = {
        "from": start.date().isoformat(),
        "to": end.date().isoformat(),
        "orders": int(orders_count),
        "revenue": int(revenue),
        "discounts": int(discounts),
        "delivery": int(delivery),
        "cogs": int(cogs),
        "gross_profit": int(gross_profit),
        "avg_check": avg_check,
        "cost_coverage": round(lines_costed / lines_total, 2) if lines_total else None,
        "channels": {
            "online": {
                "orders": int(orders_count) - int(pos_count),
                "revenue": online_revenue,
                "profit": online_revenue - online_cogs,
            },
            "pos": {
                "orders": int(pos_count),
                "revenue": int(pos_revenue),
                "profit": int(pos_revenue) - int(pos_cogs),
            },
        },
        "debts_outstanding": int(debts_outstanding),
        "daily": [{"day": str(d), "orders": int(c), "revenue": int(r)} for d, c, r in daily],
        "top_products": top_products,
    }

    if format == "csv":
        rows = [[p["title"], p["qty"], p["revenue"], p["profit"]] for p in top_products]
        ch = summary["channels"]
        rows.append(["— Канал: онлайн", ch["online"]["orders"], ch["online"]["revenue"], ch["online"]["profit"]])
        rows.append(["— Канал: касса", ch["pos"]["orders"], ch["pos"]["revenue"], ch["pos"]["profit"]])
        return csv_response(
            f"sales_{summary['from']}_{summary['to']}.csv",
            ["Товар", "Продано", "Выручка", "Прибыль"],
            rows,
        )
    return summary


# --------------------------------------------------------------------------
# Stock value / turnover
# --------------------------------------------------------------------------


@router.get("/stock", dependencies=[Depends(require_role("warehouse"))])
def stock_report(
    format: str = "json",
    dead_days: int = 60,
    db: Session = Depends(get_db),
) -> object:
    from datetime import datetime, timedelta, timezone

    tracked = db.scalars(
        select(Product).where(Product.stock_qty.is_not(None)).order_by(Product.stock_qty)
    ).all()
    titles = _ru_titles(db, {p.id for p in tracked})

    value_cost = sum((p.stock_qty or 0) * (p.cost_price or 0) for p in tracked)
    value_retail = sum((p.stock_qty or 0) * p.price for p in tracked)
    units = sum(p.stock_qty or 0 for p in tracked)

    # dead stock: in stock but no sale movement in the last `dead_days`
    cutoff = datetime.now(timezone.utc) - timedelta(days=dead_days)
    sold_recently = set(
        db.scalars(
            select(StockMovement.product_id)
            .where(StockMovement.kind == "sale", StockMovement.created_at >= cutoff)
            .distinct()
        ).all()
    )
    dead = [p for p in tracked if (p.stock_qty or 0) > 0 and p.id not in sold_recently]
    low = [p for p in tracked if (p.stock_qty or 0) <= 5]

    def _row(p: Product) -> dict:
        return {
            "id": p.id,
            "title": titles.get(p.id, p.slug),
            "sku": p.sku,
            "stock_qty": p.stock_qty,
            "cost_price": p.cost_price,
            "price": p.price,
            "value_cost": (p.stock_qty or 0) * (p.cost_price or 0),
        }

    result = {
        "value_cost": value_cost,
        "value_retail": value_retail,
        "units": units,
        "tracked_count": len(tracked),
        "dead_days": dead_days,
        "low_stock": [_row(p) for p in low],
        "dead_stock": [_row(p) for p in dead],
        "items": [_row(p) for p in tracked],
    }

    if format == "csv":
        rows = [
            [r["title"], r["sku"] or "", r["stock_qty"], r["cost_price"] or "", r["price"], r["value_cost"]]
            for r in result["items"]
        ]
        return csv_response(
            "stock.csv",
            ["Товар", "SKU", "Остаток", "Закупка", "Цена", "Стоимость (закуп)"],
            rows,
        )
    return result


# --------------------------------------------------------------------------
# Service demand
# --------------------------------------------------------------------------


@router.get("/services", dependencies=[Depends(require_role("sales"))])
def services_report(
    date_from: str | None = None,
    date_to: str | None = None,
    format: str = "json",
    db: Session = Depends(get_db),
) -> object:
    start, end = parse_period(date_from, date_to)
    in_range = (Order.created_at >= start, Order.created_at <= end, NOT_CANCELLED)

    rows = db.execute(
        select(
            OrderItem.service_id,
            func.sum(OrderItem.qty),
            func.coalesce(func.sum(OrderItem.price_snapshot * OrderItem.qty), 0),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(*in_range, OrderItem.service_id.is_not(None))
        .group_by(OrderItem.service_id)
        .order_by(func.sum(OrderItem.price_snapshot * OrderItem.qty).desc())
    ).all()

    sids = {r[0] for r in rows}
    titles: dict[int, str] = {}
    if sids:
        for sid, title in db.execute(
            select(ShopServiceTranslation.service_id, ShopServiceTranslation.title).where(
                ShopServiceTranslation.service_id.in_(sids), ShopServiceTranslation.lang == "ru"
            )
        ):
            titles[sid] = title
        for s in db.scalars(select(ShopService).where(ShopService.id.in_(sids))):
            titles.setdefault(s.id, s.slug)

    services = [
        {"id": sid, "title": titles.get(sid, f"#{sid}"), "count": int(qty), "revenue": int(rev)}
        for sid, qty, rev in rows
    ]
    result = {
        "from": start.date().isoformat(),
        "to": end.date().isoformat(),
        "total_count": sum(s["count"] for s in services),
        "total_revenue": sum(s["revenue"] for s in services),
        "services": services,
    }

    if format == "csv":
        return csv_response(
            f"services_{result['from']}_{result['to']}.csv",
            ["Услуга", "Заказано", "Выручка"],
            [[s["title"], s["count"], s["revenue"]] for s in services],
        )
    return result
