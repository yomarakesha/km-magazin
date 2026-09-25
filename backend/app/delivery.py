"""Delivery pricing shared by cart validation and order creation.

Zones are managed in the admin (Ашхабад, велаяты, самовывоз…). Each zone has
a price and an optional goods total from which delivery is free.
"""
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import DeliveryZone


def active_zones(db: Session) -> list[DeliveryZone]:
    return list(
        db.scalars(
            select(DeliveryZone).where(DeliveryZone.enabled == True).order_by(DeliveryZone.sort_order)  # noqa: E712
        ).all()
    )


def pick_zone(db: Session, zone_id: int | None) -> DeliveryZone | None:
    """The requested zone, or the default one (then the first) when none is
    requested. None when no zones are configured — delivery is then free."""
    if zone_id is not None:
        zone = db.get(DeliveryZone, zone_id)
        if zone is None or not zone.enabled:
            raise HTTPException(400, "Delivery zone is unavailable")
        return zone
    zones = active_zones(db)
    return next((z for z in zones if z.is_default), zones[0] if zones else None)


def fee(zone: DeliveryZone | None, goods_total: int) -> int:
    if zone is None:
        return 0
    if zone.free_from is not None and goods_total >= zone.free_from:
        return 0
    return zone.price


def ru_name(zone: DeliveryZone) -> str:
    return next((t.name for t in zone.translations if t.lang == "ru"), "") or f"Зона #{zone.id}"


def zone_view(zone: DeliveryZone) -> dict:
    """Public shape: per-language maps like the rest of the storefront API."""
    return {
        "id": zone.id,
        "name": {t.lang: t.name for t in zone.translations},
        "note": {t.lang: t.note for t in zone.translations},
        "price": zone.price,
        "free_from": zone.free_from,
        "is_pickup": zone.is_pickup,
        "is_default": zone.is_default,
    }


def quote(db: Session, zone_id: int | None, goods_total: int) -> dict:
    """What the cart shows: the chosen zone, its fee for this total, and how
    much more to buy for free delivery."""
    zone = pick_zone(db, zone_id)
    amount = fee(zone, goods_total)
    to_free = None
    if zone is not None and zone.free_from is not None and amount > 0:
        to_free = zone.free_from - goods_total
    return {"zone_id": zone.id if zone else None, "fee": amount, "free_from": zone.free_from if zone else None,
            "to_free": to_free}
