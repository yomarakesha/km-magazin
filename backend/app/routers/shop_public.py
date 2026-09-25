"""Public, unauthenticated shop endpoints: catalog, category browse with
dynamic attribute filters (facets), product detail and order creation.

Texts are returned as per-language maps ({ru, tk, en}) so the SSR frontend can
switch language client-side, mirroring how the landing handles i18n.
"""
import hmac

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.orm import Session

from ..config import PUBLIC_URL
from ..db import get_db
from ..models import (
    CategoryAttribute,
    Order,
    OrderItem,
    Product,
    ProductAttribute,
    ProductReview,
    ProductTranslation,
    PromoCode,
    ShopBrand,
    ShopCategory,
    ShopService,
    ShopSettings,
)
from ..logging import log
from ..notify import order_message, telegram_notify
from ..payments import get_provider
from ..ratelimit import limiter
from ..schemas import CartValidateIn, OrderIn, PromoCheckIn, ReviewIn
from ..stock import log_movement

router = APIRouter(prefix="/api/shop", tags=["shop"])

PRODUCTS_SUBDIR = "products"


DEFAULT_PAGE = 12
MAX_PAGE = 48


def _page_params(params) -> tuple[int, int]:
    """Clamped (limit, offset) from the query string."""
    try:
        limit = min(max(int(params.get("limit", DEFAULT_PAGE)), 1), MAX_PAGE)
    except ValueError:
        limit = DEFAULT_PAGE
    try:
        offset = max(int(params.get("offset", 0)), 0)
    except ValueError:
        offset = 0
    return limit, offset


def _num(val, cast):
    """Parse a query-string number, ignoring a missing/malformed value instead
    of raising (a crafted ?price_min=abc must not 500 the endpoint)."""
    try:
        return cast(val)
    except (TypeError, ValueError):
        return None


def _like_escape(s: str) -> str:
    """Neutralise LIKE wildcards so user text matches literally under ilike()."""
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _apply_sort(stmt, sort: str | None):
    """Order a Product select by the requested key."""
    if sort == "price_asc":
        return stmt.order_by(Product.price.asc())
    if sort == "price_desc":
        return stmt.order_by(Product.price.desc())
    if sort == "new":
        return stmt.order_by(Product.id.desc())
    return stmt.order_by(Product.sort_order)


def _imap(translations, field: str) -> dict:
    """Collapse a translations list into a {lang: value} map."""
    return {t.lang: (getattr(t, field) or "") for t in translations}


def _first_image(p: Product) -> str | None:
    imgs = sorted(p.images, key=lambda x: x.sort_order)
    return f"{PRODUCTS_SUBDIR}/{imgs[0].filename}" if imgs else None


def _in_stock(p: Product) -> bool:
    """Effective availability: tracked stock at zero forces 'to order'."""
    return p.in_stock and (p.stock_qty is None or p.stock_qty > 0)


def _brand_ref(b: ShopBrand | None) -> dict | None:
    return {"slug": b.slug, "name": b.name} if b and b.enabled else None


def _card(p: Product) -> dict:
    return {
        "id": p.id,
        "slug": p.slug,
        "category_id": p.category_id,
        "brand": _brand_ref(p.brand),
        "is_new": p.is_new,
        "price": p.price,
        "old_price": p.old_price,
        "currency": p.currency,
        "in_stock": _in_stock(p),
        "image": _first_image(p),
        "title": _imap(p.translations, "title"),
        "short": _imap(p.translations, "short"),
    }


def _ratings_map(db: Session, ids: list[int]) -> dict[int, tuple[float, int]]:
    """product_id → (avg rating, approved review count)."""
    if not ids:
        return {}
    rows = db.execute(
        select(ProductReview.product_id, func.avg(ProductReview.rating), func.count())
        .where(ProductReview.product_id.in_(ids), ProductReview.status == "approved")
        .group_by(ProductReview.product_id)
    ).all()
    return {pid: (round(float(avg), 1), int(cnt)) for pid, avg, cnt in rows}


def _attach_ratings(cards: list[dict], db: Session) -> list[dict]:
    ratings = _ratings_map(db, [c["id"] for c in cards])
    for c in cards:
        r = ratings.get(c["id"])
        c["rating"], c["rating_count"] = (r[0], r[1]) if r else (None, 0)
    return cards


def _service_card(s: ShopService) -> dict:
    return {
        "id": s.id,
        "slug": s.slug,
        "category_id": s.category_id,
        "price": s.price,
        "currency": s.currency,
        "icon": s.icon,
        "title": _imap(s.translations, "title"),
        "short": _imap(s.translations, "short"),
    }


def _category_services(cat: ShopCategory, db: Session) -> list[dict]:
    rows = db.scalars(
        select(ShopService)
        .where(ShopService.category_id == cat.id, ShopService.enabled == True)  # noqa: E712
        .order_by(ShopService.sort_order)
    ).all()
    return [_service_card(s) for s in rows]


def settings_dict(db: Session) -> dict:
    """Shop contact settings as a UI-friendly map; falls back to blanks when the
    singleton row hasn't been created yet."""
    s = db.get(ShopSettings, 1)
    return {
        "phone": s.phone if s else "",
        "whatsapp": s.whatsapp if s else "",
        "email": s.email if s else "",
        "address": {
            "ru": s.address_ru if s else "",
            "tk": s.address_tk if s else "",
            "en": s.address_en if s else "",
        },
        "hours": {
            "ru": s.hours_ru if s else "",
            "tk": s.hours_tk if s else "",
            "en": s.hours_en if s else "",
        },
    }


@router.get("/catalog")
def catalog(request: Request, db: Session = Depends(get_db)) -> dict:
    cats = db.scalars(
        select(ShopCategory).where(ShopCategory.enabled == True).order_by(ShopCategory.sort_order)  # noqa: E712
    ).all()
    categories = [
        {
            "id": c.id,
            "parent_id": c.parent_id,
            "slug": c.slug,
            "name": _imap(c.translations, "name"),
            "product_count": sum(1 for p in c.products if p.enabled),
        }
        for c in cats
    ]
    limit, offset = _page_params(request.query_params)
    total = db.scalar(select(func.count()).select_from(Product).where(Product.enabled == True))  # noqa: E712
    featured = db.scalars(
        select(Product).where(Product.enabled == True)  # noqa: E712
        .order_by(Product.sort_order).offset(offset).limit(limit)
    ).all()
    services = db.scalars(
        select(ShopService).where(ShopService.enabled == True).order_by(ShopService.sort_order)  # noqa: E712
    ).all()
    brands = db.scalars(
        select(ShopBrand).where(ShopBrand.enabled == True).order_by(ShopBrand.sort_order)  # noqa: E712
    ).all()
    return {
        "mediaBase": f"{PUBLIC_URL}/media",
        "categories": categories,
        "products": _attach_ratings([_card(p) for p in featured], db),
        "total": int(total or 0),
        "services": [_service_card(s) for s in services],
        "brands": [{"id": b.id, "slug": b.slug, "name": b.name} for b in brands],
        "settings": settings_dict(db),
    }


@router.get("/categories/{slug}")
def category(slug: str, request: Request, db: Session = Depends(get_db)) -> dict:
    cat = db.scalar(select(ShopCategory).where(ShopCategory.slug == slug))
    if not cat or not cat.enabled:
        raise HTTPException(404, "Category not found")

    params = request.query_params
    attr_by_key = {a.key: a for a in cat.attributes}

    stmt = select(Product).where(Product.category_id == cat.id, Product.enabled == True)  # noqa: E712

    # price range
    price_min = _num(params.get("price_min"), int)
    if price_min is not None:
        stmt = stmt.where(Product.price >= price_min)
    price_max = _num(params.get("price_max"), int)
    if price_max is not None:
        stmt = stmt.where(Product.price <= price_max)
    if params.get("in_stock"):
        stmt = stmt.where(Product.in_stock == True)  # noqa: E712

    # dynamic attribute filters
    for key, a in attr_by_key.items():
        if a.type == "select":
            raw = params.get(key)
            if raw:
                vals = [v for v in raw.split(",") if v]
                sub = select(ProductAttribute.product_id).where(
                    ProductAttribute.attribute_id == a.id, ProductAttribute.value.in_(vals)
                )
                stmt = stmt.where(Product.id.in_(sub))
        else:  # number range
            nmin = _num(params.get(f"{key}_min"), float)
            nmax = _num(params.get(f"{key}_max"), float)
            if nmin is not None or nmax is not None:
                sub = select(ProductAttribute.product_id).where(
                    ProductAttribute.attribute_id == a.id
                )
                if nmin is not None:
                    sub = sub.where(ProductAttribute.num_value >= nmin)
                if nmax is not None:
                    sub = sub.where(ProductAttribute.num_value <= nmax)
                stmt = stmt.where(Product.id.in_(sub))

    prods = db.scalars(_apply_sort(stmt, params.get("sort"))).all()
    filtered_ids = [p.id for p in prods]

    facets = _build_facets(cat, filtered_ids, db)

    # facets/counts reflect the full filtered set; only the product list pages
    limit, offset = _page_params(params)
    page = prods[offset : offset + limit]

    return {
        "mediaBase": f"{PUBLIC_URL}/media",
        "slug": cat.slug,
        "name": _imap(cat.translations, "name"),
        "facets": facets,
        "products": _attach_ratings([_card(p) for p in page], db),
        "total": len(prods),
        "services": _category_services(cat, db),
    }


def _build_facets(cat: ShopCategory, filtered_ids: list[int], db: Session) -> list[dict]:
    """Build filter facets. Options come from all enabled products in the
    category; counts/ranges reflect the currently filtered selection."""
    all_ids = [p.id for p in cat.products if p.enabled]
    facets: list[dict] = []
    for a in sorted(cat.attributes, key=lambda x: x.sort_order):
        if not a.filterable:
            continue
        item = {"key": a.key, "label": _imap(a.translations, "label"), "type": a.type, "unit": a.unit or ""}
        if a.type == "select":
            # distinct values across the whole category
            values = []
            if all_ids:
                values = [
                    v for (v,) in db.execute(
                        select(ProductAttribute.value)
                        .where(
                            ProductAttribute.attribute_id == a.id,
                            ProductAttribute.product_id.in_(all_ids),
                            ProductAttribute.value != "",
                        )
                        .distinct()
                    ).all()
                ]
            counts: dict[str, int] = {}
            if filtered_ids:
                counts = dict(
                    db.execute(
                        select(ProductAttribute.value, func.count())
                        .where(
                            ProductAttribute.attribute_id == a.id,
                            ProductAttribute.product_id.in_(filtered_ids),
                        )
                        .group_by(ProductAttribute.value)
                    ).all()
                )
            item["options"] = [
                {"value": v, "count": int(counts.get(v, 0))} for v in sorted(values)
            ]
        else:  # number
            mn = mx = None
            if all_ids:
                mn, mx = db.execute(
                    select(func.min(ProductAttribute.num_value), func.max(ProductAttribute.num_value)).where(
                        ProductAttribute.attribute_id == a.id,
                        ProductAttribute.product_id.in_(all_ids),
                    )
                ).first()
            item["min"], item["max"] = mn, mx
        facets.append(item)
    return facets


@router.get("/search", dependencies=[Depends(limiter("search", 30))])
def search(request: Request, db: Session = Depends(get_db)) -> dict:
    """Full-text-ish search over product title/short/sku across all categories."""
    params = request.query_params
    q = (params.get("q") or "").strip()
    stmt = select(Product).where(Product.enabled == True)  # noqa: E712
    if q:
        like = f"%{_like_escape(q)}%"
        text_match = select(ProductTranslation.product_id).where(
            or_(
                ProductTranslation.title.ilike(like, escape="\\"),
                ProductTranslation.short.ilike(like, escape="\\"),
            )
        )
        stmt = stmt.where(or_(Product.id.in_(text_match), Product.sku.ilike(like, escape="\\")))
    prods = db.scalars(_apply_sort(stmt, params.get("sort"))).all()
    limit, offset = _page_params(params)
    return {
        "mediaBase": f"{PUBLIC_URL}/media",
        "query": q,
        "products": _attach_ratings([_card(p) for p in prods[offset : offset + limit]], db),
        "total": len(prods),
    }


@router.get("/brands")
def brands(db: Session = Depends(get_db)) -> dict:
    """Brands page: every enabled brand with its enabled-product count."""
    counts = dict(
        db.execute(
            select(Product.brand_id, func.count())
            .where(Product.enabled == True, Product.brand_id.is_not(None))  # noqa: E712
            .group_by(Product.brand_id)
        ).all()
    )
    rows = db.scalars(
        select(ShopBrand).where(ShopBrand.enabled == True).order_by(ShopBrand.sort_order)  # noqa: E712
    ).all()
    return {
        "brands": [
            {"id": b.id, "slug": b.slug, "name": b.name, "product_count": int(counts.get(b.id, 0))}
            for b in rows
        ]
    }


def _descendant_ids(db: Session, root_id: int) -> list[int]:
    """root_id plus every category below it (any depth, cycle-safe)."""
    children: dict[int | None, list[int]] = {}
    for cid, pid in db.execute(select(ShopCategory.id, ShopCategory.parent_id)).all():
        children.setdefault(pid, []).append(cid)
    out, seen = [root_id], {root_id}
    for cid in out:
        for kid in children.get(cid, []):
            if kid not in seen:
                seen.add(kid)
                out.append(kid)
    return out


_IN_STOCK_SQL = and_(
    Product.in_stock == True,  # noqa: E712
    or_(Product.stock_qty.is_(None), Product.stock_qty > 0),
)


@router.get("/products", dependencies=[Depends(limiter("products", 60))])
def products(request: Request, db: Session = Depends(get_db)) -> dict:
    """Cross-category product listing behind the catalog, discount, new-arrivals
    and search pages.

    Query: q, category (slug, includes subcategories), brand (comma-separated
    slugs), price_min, price_max, in_stock=1, discount=1, new=1, sort
    (price_asc|price_desc|new), limit, offset.

    Facets (categories, brands, price range) are computed with every filter
    applied except their own, so picking one brand still lists the others.
    """
    params = request.query_params
    base = [Product.enabled == True]  # noqa: E712
    q = (params.get("q") or "").strip()
    if q:
        like = f"%{_like_escape(q)}%"
        text_match = select(ProductTranslation.product_id).where(
            or_(
                ProductTranslation.title.ilike(like, escape="\\"),
                ProductTranslation.short.ilike(like, escape="\\"),
            )
        )
        base.append(or_(Product.id.in_(text_match), Product.sku.ilike(like, escape="\\")))
    if params.get("in_stock"):
        base.append(_IN_STOCK_SQL)
    if params.get("discount"):
        base.append(and_(Product.old_price.is_not(None), Product.old_price > Product.price))
    if params.get("new"):
        base.append(Product.is_new == True)  # noqa: E712

    # facet-owned filters: key -> conditions
    own: dict[str, list] = {"category": [], "brand": [], "price": []}
    cat_slug = params.get("category")
    if cat_slug:
        cat = db.scalar(select(ShopCategory).where(ShopCategory.slug == cat_slug))
        if not cat or not cat.enabled:
            raise HTTPException(404, "Category not found")
        own["category"].append(Product.category_id.in_(_descendant_ids(db, cat.id)))
    brand_slugs = [b for b in (params.get("brand") or "").split(",") if b]
    if brand_slugs:
        own["brand"].append(
            Product.brand_id.in_(select(ShopBrand.id).where(ShopBrand.slug.in_(brand_slugs)))
        )
    price_min = _num(params.get("price_min"), int)
    if price_min is not None:
        own["price"].append(Product.price >= price_min)
    price_max = _num(params.get("price_max"), int)
    if price_max is not None:
        own["price"].append(Product.price <= price_max)

    def where_except(skip: str | None = None) -> list:
        return base + [c for k, conds in own.items() if k != skip for c in conds]

    conds = where_except()
    total = db.scalar(select(func.count()).select_from(Product).where(*conds))
    limit, offset = _page_params(params)
    page = db.scalars(
        _apply_sort(select(Product).where(*conds), params.get("sort")).offset(offset).limit(limit)
    ).all()

    cat_counts = db.execute(
        select(Product.category_id, func.count())
        .where(*where_except("category"))
        .group_by(Product.category_id)
    ).all()
    cats = {
        c.id: c
        for c in db.scalars(
            select(ShopCategory).where(ShopCategory.id.in_([cid for cid, _ in cat_counts]))
        ).all()
    }
    brand_counts = db.execute(
        select(Product.brand_id, func.count())
        .where(*where_except("brand"), Product.brand_id.is_not(None))
        .group_by(Product.brand_id)
    ).all()
    brand_rows = {
        b.id: b
        for b in db.scalars(
            select(ShopBrand).where(
                ShopBrand.id.in_([bid for bid, _ in brand_counts]),
                ShopBrand.enabled == True,  # noqa: E712
            )
        ).all()
    }
    pmin, pmax = db.execute(
        select(func.min(Product.price), func.max(Product.price)).where(*where_except("price"))
    ).first()

    return {
        "mediaBase": f"{PUBLIC_URL}/media",
        "query": q,
        "products": _attach_ratings([_card(p) for p in page], db),
        "total": int(total or 0),
        "facets": {
            "categories": sorted(
                (
                    {
                        "slug": cats[cid].slug,
                        "parent_id": cats[cid].parent_id,
                        "name": _imap(cats[cid].translations, "name"),
                        "count": int(n),
                    }
                    for cid, n in cat_counts
                    if cid in cats and cats[cid].enabled
                ),
                key=lambda c: c["slug"],
            ),
            "brands": sorted(
                (
                    {"slug": brand_rows[bid].slug, "name": brand_rows[bid].name, "count": int(n)}
                    for bid, n in brand_counts
                    if bid in brand_rows
                ),
                key=lambda b: b["name"].lower(),
            ),
            "price": {"min": pmin, "max": pmax},
        },
    }


@router.get("/sitemap")
def sitemap(db: Session = Depends(get_db)) -> dict:
    """Slugs (+ product lastmod) for the frontend sitemap.xml."""
    cats = db.scalars(select(ShopCategory.slug).where(ShopCategory.enabled == True)).all()  # noqa: E712
    prods = db.execute(
        select(Product.slug, Product.updated_at).where(Product.enabled == True)  # noqa: E712
    ).all()
    return {
        "categories": list(cats),
        "products": [
            {"slug": slug, "lastmod": upd.isoformat() if upd else None} for slug, upd in prods
        ],
    }


@router.get("/products/{slug}")
def product(slug: str, db: Session = Depends(get_db)) -> dict:
    p = db.scalar(select(Product).where(Product.slug == slug))
    if not p or not p.enabled:
        raise HTTPException(404, "Product not found")
    attr_meta = {a.id: a for a in p.category.attributes}
    attributes = []
    for pa in p.attributes:
        a = attr_meta.get(pa.attribute_id)
        if a is None:
            continue
        attributes.append(
            {"key": a.key, "label": _imap(a.translations, "label"), "value": pa.value, "unit": a.unit or ""}
        )
    reviews = db.scalars(
        select(ProductReview)
        .where(ProductReview.product_id == p.id, ProductReview.status == "approved")
        .order_by(ProductReview.created_at.desc())
        .limit(30)
    ).all()
    rating = _ratings_map(db, [p.id]).get(p.id)
    return {
        "mediaBase": f"{PUBLIC_URL}/media",
        "id": p.id,
        "slug": p.slug,
        "category": p.category.slug,
        "category_id": p.category_id,
        "brand": _brand_ref(p.brand),
        "is_new": p.is_new,
        "price": p.price,
        "old_price": p.old_price,
        "currency": p.currency,
        "in_stock": _in_stock(p),
        "stock_qty": p.stock_qty,
        "sku": p.sku,
        "title": _imap(p.translations, "title"),
        "short": _imap(p.translations, "short"),
        "body": _imap(p.translations, "body"),
        "specs": {t.lang: (t.specs or []) for t in p.translations},
        "images": [f"{PRODUCTS_SUBDIR}/{im.filename}" for im in sorted(p.images, key=lambda x: x.sort_order)],
        "attributes": attributes,
        "services": _category_services(p.category, db),
        "rating": rating[0] if rating else None,
        "rating_count": rating[1] if rating else 0,
        "reviews": [
            {"name": r.name, "rating": r.rating, "text": r.text, "created_at": r.created_at.isoformat()}
            for r in reviews
        ],
    }


@router.post("/products/{slug}/reviews", status_code=201, dependencies=[Depends(limiter("reviews", 3))])
def create_review(slug: str, payload: ReviewIn, db: Session = Depends(get_db)) -> dict:
    """Submit a review; it stays hidden until an admin approves it."""
    p = db.scalar(select(Product).where(Product.slug == slug))
    if not p or not p.enabled:
        raise HTTPException(404, "Product not found")
    db.add(ProductReview(
        product_id=p.id, name=payload.name.strip(), rating=payload.rating, text=payload.text.strip()
    ))
    db.commit()
    return {"ok": True}


def _promo_expired(promo: PromoCode) -> bool:
    # expires_at is stored naive (end-of-day, see admin _parse_expiry) — compare
    # against naive UTC now rather than deprecated utcnow().
    from datetime import datetime, timezone

    return bool(promo.expires_at and promo.expires_at < datetime.now(timezone.utc).replace(tzinfo=None))


def _promo_usable(promo: PromoCode | None) -> bool:
    """Code exists, active, not expired, not exhausted — ignoring min_total."""
    return bool(
        promo
        and promo.active
        and not _promo_expired(promo)
        and (promo.max_uses is None or promo.used_count < promo.max_uses)
    )


def promo_discount(db: Session, code: str, subtotal: int) -> tuple[PromoCode | None, int]:
    """Resolve a promo code against a subtotal. Returns (promo, discount) or
    (None, 0) when the code is unknown, inactive, expired, exhausted or below
    min_total."""
    code = code.strip()
    if not code:
        return None, 0
    promo = db.scalar(select(PromoCode).where(func.lower(PromoCode.code) == code.lower()))
    if not _promo_usable(promo) or subtotal < promo.min_total:
        return None, 0
    raw = subtotal * promo.value // 100 if promo.kind == "percent" else promo.value
    return promo, max(0, min(raw, subtotal))


@router.post("/promo/check", dependencies=[Depends(limiter("promo", 10))])
def promo_check(payload: PromoCheckIn, db: Session = Depends(get_db)) -> dict:
    promo, discount = promo_discount(db, payload.code, payload.subtotal)
    if not promo:
        # Distinguish an otherwise-valid code that just needs a bigger cart from
        # a genuinely invalid one, so the client can prompt "add X more".
        code = payload.code.strip()
        existing = db.scalar(select(PromoCode).where(func.lower(PromoCode.code) == code.lower())) if code else None
        if _promo_usable(existing) and payload.subtotal < existing.min_total:
            raise HTTPException(422, {"code": "below_min", "min_total": existing.min_total})
        raise HTTPException(404, "Promo code is not valid")
    return {
        "code": promo.code,
        "kind": promo.kind,
        "value": promo.value,
        "min_total": promo.min_total,
        "discount": discount,
    }


def _digits(s: str) -> str:
    return "".join(ch for ch in s if ch.isdigit())


@router.get("/orders/{order_id}", dependencies=[Depends(limiter("order-lookup", 10))])
def order_status(order_id: int, phone: str = "", db: Session = Depends(get_db)) -> dict:
    """Customer-facing order lookup: the phone must match the one on the order
    (digits-only comparison) so order ids alone don't leak anything."""
    o = db.get(Order, order_id)
    supplied = _digits(phone)
    # Constant-time compare so the digits can't be recovered one at a time via
    # response timing; the phone is the only secret gating this lookup.
    if not o or not supplied or not hmac.compare_digest(supplied, _digits(o.phone)):
        raise HTTPException(404, "Order not found")
    return {
        "id": o.id,
        "status": o.status,
        "payment_method": o.payment_method,
        "payment_status": o.payment_status,
        "total": o.total,
        "created_at": o.created_at,
        "items": [
            {
                "title": it.title_snapshot,
                "price": it.price_snapshot,
                "qty": it.qty,
                "kind": "service" if it.service_id is not None else "product",
                # slug lets the client rebuild the cart for a re-order; null if the
                # product/service has since been deleted
                "slug": _item_slug(db, it),
            }
            for it in o.items
        ],
    }


def _item_slug(db: Session, it: OrderItem) -> str | None:
    if it.service_id is not None:
        s = db.get(ShopService, it.service_id)
        return s.slug if s else None
    if it.product_id is not None:
        p = db.get(Product, it.product_id)
        return p.slug if p else None
    return None


def _enabled_product(db: Session, ref: int) -> bool:
    p = db.get(Product, ref)
    return bool(p and p.enabled)


def _enabled_service(db: Session, ref: int) -> bool:
    s = db.get(ShopService, ref)
    return bool(s and s.enabled)


@router.post("/cart/validate")
def cart_validate(payload: CartValidateIn, db: Session = Depends(get_db)) -> dict:
    """Re-check a client cart against the DB: per line — does the item still
    exist/is enabled, its current price and effective availability. The client
    uses this on the cart/checkout pages to flag removed items and price drift
    before the order is submitted."""
    out = []
    for it in payload.items:
        if it.kind == "service":
            s = db.get(ShopService, it.id)
            ok = bool(s and s.enabled)
            out.append({
                "kind": "service", "id": it.id, "ok": ok,
                "price": s.price if ok else None,
                "in_stock": True if ok else None,
            })
        else:
            p = db.get(Product, it.id)
            ok = bool(p and p.enabled)
            out.append({
                "kind": "product", "id": it.id, "ok": ok,
                "price": p.price if ok else None,
                "in_stock": _in_stock(p) if ok else None,
            })
    return {"items": out}


@router.post("/orders", status_code=201, dependencies=[Depends(limiter("orders", 5))])
def create_order(payload: OrderIn, background: BackgroundTasks, db: Session = Depends(get_db)) -> dict:
    """Create an order. The total is recomputed server-side from DB prices;
    item title/price are snapshotted so the order is stable over time.
    Unavailable items produce a structured 409 listing every problem line,
    so the client can show exactly what to remove from the cart."""
    problems = [
        {"kind": it.kind, "id": it.ref_id(), "reason": "unavailable"}
        for it in payload.items
        if it.ref_id() is None
        or (it.kind == "service" and not _enabled_service(db, it.ref_id()))
        or (it.kind != "service" and not _enabled_product(db, it.ref_id()))
    ]
    if problems:
        raise HTTPException(409, {"code": "cart_invalid", "problems": problems})
    order = Order(
        customer_name=payload.customer_name.strip(),
        phone=payload.phone.strip(),
        address=payload.address.strip(),
        payment_method=payload.payment_method,
        comment=payload.comment.strip(),
        status="new",
        total=0,
    )
    total = 0
    sold_tracked: list[tuple[int, int]] = []  # (product_id, qty) with tracked stock
    for it in payload.items:
        ref = it.ref_id()
        if ref is None:
            raise HTTPException(400, "Order item is missing an id")
        if it.kind == "service":
            s = db.get(ShopService, ref)
            if not s or not s.enabled:
                raise HTTPException(400, f"Service {ref} is unavailable")
            title = next((t.title for t in s.translations if t.lang == "ru"), None) or s.slug
            order.items.append(
                OrderItem(
                    service_id=s.id,
                    title_snapshot=title,
                    price_snapshot=s.price,
                    qty=it.qty,
                )
            )
            total += s.price * it.qty
        else:
            p = db.get(Product, ref)
            if not p or not p.enabled:
                raise HTTPException(400, f"Product {ref} is unavailable")
            title = next((t.title for t in p.translations if t.lang == "ru"), None) or p.slug
            order.items.append(
                OrderItem(
                    product_id=p.id,
                    title_snapshot=title,
                    price_snapshot=p.price,
                    cost_snapshot=p.cost_price,
                    qty=it.qty,
                )
            )
            # Atomic guarded decrement: NULL stock stays NULL (not tracked);
            # tracked stock must cover the qty or the claim fails. The UPDATE
            # itself is atomic, so two concurrent orders can never both take
            # the last unit (no read-modify-write race).
            res = db.execute(
                update(Product)
                .where(
                    Product.id == p.id,
                    or_(Product.stock_qty.is_(None), Product.stock_qty >= it.qty),
                )
                .values(stock_qty=Product.stock_qty - it.qty)
            )
            if res.rowcount == 0:
                raise HTTPException(409, f"Product {ref} is out of stock")
            if p.stock_qty is not None:  # tracked → ledger row (same transaction)
                sold_tracked.append((p.id, it.qty))
            total += p.price * it.qty
    promo, discount = promo_discount(db, payload.promo_code, total)
    if promo:
        # Atomic guarded claim of one use — mirrors the stock decrement so a
        # capped promo can never exceed max_uses under concurrent checkouts.
        res = db.execute(
            update(PromoCode)
            .where(
                PromoCode.id == promo.id,
                or_(PromoCode.max_uses.is_(None), PromoCode.used_count < PromoCode.max_uses),
            )
            .values(used_count=PromoCode.used_count + 1)
        )
        if res.rowcount == 0:
            raise HTTPException(409, "Promo code is no longer valid")
        order.promo_code = promo.code
        order.discount = discount
        total -= discount
    order.total = total
    db.add(order)
    db.flush()  # order.id for the ledger rows
    for pid, qty in sold_tracked:
        log_movement(db, product_id=pid, qty_delta=-qty, kind="sale", order_id=order.id)
    db.commit()
    log.info(
        "order created",
        extra={"event": "order_created", "order_id": order.id, "total": total,
               "items": len(order.items), "promo": promo.code if promo else ""},
    )
    lines = [f"{it.title_snapshot} × {it.qty} = {it.price_snapshot * it.qty} TMT" for it in order.items]
    if promo:
        lines.append(f"Промокод {promo.code}: −{discount} TMT")
    background.add_task(
        telegram_notify,
        order_message(order.id, order.customer_name, order.phone, total, lines),
    )
    return {"ok": True, "id": order.id, "total": total, "discount": discount if promo else 0}


@router.post("/payments/webhook", dependencies=[Depends(limiter("pay-webhook", 30))])
async def payments_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    """Provider callback slot. The active provider verifies the signature and
    parses the event; with ManualProvider (default) this answers 501 until a
    real gateway is configured."""
    event = get_provider().parse_webhook(await request.body(), request.headers)
    order = db.scalar(select(Order).where(Order.payment_ref == event.ref))
    if not order:
        raise HTTPException(404, "Order not found for payment reference")
    order.payment_status = event.status
    db.commit()
    return {"ok": True, "id": order.id, "payment_status": order.payment_status}
