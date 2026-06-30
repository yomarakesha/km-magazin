"""Public, unauthenticated shop endpoints: catalog, category browse with
dynamic attribute filters (facets), product detail and order creation.

Texts are returned as per-language maps ({ru, tk, en}) so the SSR frontend can
switch language client-side, mirroring how the landing handles i18n.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import PUBLIC_URL
from ..db import get_db
from ..models import (
    CategoryAttribute,
    Order,
    OrderItem,
    Product,
    ProductAttribute,
    ProductTranslation,
    ShopCategory,
)
from ..schemas import OrderIn

router = APIRouter(prefix="/api/shop", tags=["shop"])

PRODUCTS_SUBDIR = "products"


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


def _card(p: Product) -> dict:
    return {
        "id": p.id,
        "slug": p.slug,
        "price": p.price,
        "currency": p.currency,
        "in_stock": p.in_stock,
        "image": _first_image(p),
        "title": _imap(p.translations, "title"),
        "short": _imap(p.translations, "short"),
    }


@router.get("/catalog")
def catalog(db: Session = Depends(get_db)) -> dict:
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
    featured = db.scalars(
        select(Product).where(Product.enabled == True).order_by(Product.sort_order).limit(12)  # noqa: E712
    ).all()
    return {
        "mediaBase": f"{PUBLIC_URL}/media",
        "categories": categories,
        "products": [_card(p) for p in featured],
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
    if params.get("price_min"):
        stmt = stmt.where(Product.price >= int(params["price_min"]))
    if params.get("price_max"):
        stmt = stmt.where(Product.price <= int(params["price_max"]))
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
            nmin, nmax = params.get(f"{key}_min"), params.get(f"{key}_max")
            if nmin or nmax:
                sub = select(ProductAttribute.product_id).where(
                    ProductAttribute.attribute_id == a.id
                )
                if nmin:
                    sub = sub.where(ProductAttribute.num_value >= float(nmin))
                if nmax:
                    sub = sub.where(ProductAttribute.num_value <= float(nmax))
                stmt = stmt.where(Product.id.in_(sub))

    prods = db.scalars(_apply_sort(stmt, params.get("sort"))).all()
    filtered_ids = [p.id for p in prods]

    facets = _build_facets(cat, filtered_ids, db)

    return {
        "mediaBase": f"{PUBLIC_URL}/media",
        "slug": cat.slug,
        "name": _imap(cat.translations, "name"),
        "facets": facets,
        "products": [_card(p) for p in prods],
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


@router.get("/search")
def search(request: Request, db: Session = Depends(get_db)) -> dict:
    """Full-text-ish search over product title/short/sku across all categories."""
    params = request.query_params
    q = (params.get("q") or "").strip()
    stmt = select(Product).where(Product.enabled == True)  # noqa: E712
    if q:
        like = f"%{q}%"
        text_match = select(ProductTranslation.product_id).where(
            or_(ProductTranslation.title.ilike(like), ProductTranslation.short.ilike(like))
        )
        stmt = stmt.where(or_(Product.id.in_(text_match), Product.sku.ilike(like)))
    prods = db.scalars(_apply_sort(stmt, params.get("sort"))).all()
    return {
        "mediaBase": f"{PUBLIC_URL}/media",
        "query": q,
        "products": [_card(p) for p in prods],
    }


@router.get("/sitemap")
def sitemap(db: Session = Depends(get_db)) -> dict:
    """Slugs for the frontend sitemap.xml."""
    cats = db.scalars(select(ShopCategory.slug).where(ShopCategory.enabled == True)).all()  # noqa: E712
    prods = db.scalars(select(Product.slug).where(Product.enabled == True)).all()  # noqa: E712
    return {"categories": list(cats), "products": list(prods)}


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
    return {
        "mediaBase": f"{PUBLIC_URL}/media",
        "id": p.id,
        "slug": p.slug,
        "category": p.category.slug,
        "price": p.price,
        "currency": p.currency,
        "in_stock": p.in_stock,
        "title": _imap(p.translations, "title"),
        "short": _imap(p.translations, "short"),
        "body": _imap(p.translations, "body"),
        "specs": {t.lang: (t.specs or []) for t in p.translations},
        "images": [f"{PRODUCTS_SUBDIR}/{im.filename}" for im in sorted(p.images, key=lambda x: x.sort_order)],
        "attributes": attributes,
    }


@router.post("/orders", status_code=201)
def create_order(payload: OrderIn, db: Session = Depends(get_db)) -> dict:
    """Create an order. The total is recomputed server-side from DB prices;
    item title/price are snapshotted so the order is stable over time."""
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
    for it in payload.items:
        p = db.get(Product, it.product_id)
        if not p or not p.enabled:
            raise HTTPException(400, f"Product {it.product_id} is unavailable")
        title = next((t.title for t in p.translations if t.lang == "ru"), None) or p.slug
        order.items.append(
            OrderItem(
                product_id=p.id,
                title_snapshot=title,
                price_snapshot=p.price,
                qty=it.qty,
            )
        )
        total += p.price * it.qty
    order.total = total
    db.add(order)
    db.commit()
    return {"ok": True, "id": order.id, "total": total}
