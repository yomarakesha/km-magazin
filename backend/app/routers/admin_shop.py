"""Admin CRUD for the tech shop: categories, filter attributes, products,
product images and customer orders. Mirrors the services/media/leads routers."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import require_admin, require_role
from ..config import MEDIA_DIR
from ..db import get_db
from ..stock import log_movement
from ..models import (
    Lead,
    CategoryAttribute,
    DeliveryZone,
    DeliveryZoneTranslation,
    CategoryAttributeTranslation,
    Order,
    OrderItem,
    Product,
    ProductAttribute,
    ProductComponent,
    ProductImage,
    ProductReview,
    ProductTranslation,
    PromoCode,
    ShopBrand,
    ShopCategory,
    ShopCategoryTranslation,
    ShopService,
    ShopServiceTranslation,
    ShopSettings,
    slugify,
)
from ..schemas import (
    CategoryAttributeIn,
    CategoryAttributeUpdateIn,
    CategoryIn,
    CategoryUpdateIn,
    DeliveryZoneIn,
    OrderPaymentIn,
    OrderStatusIn,
    ProductIn,
    ProductUpdateIn,
    PromoCodeIn,
    PromoCodeUpdateIn,
    ReorderIn,
    ReviewStatusIn,
    ShopBrandIn,
    ShopBrandUpdateIn,
    ShopServiceIn,
    ShopServiceUpdateIn,
    ShopSettingsIn,
)
from .admin_media import _save  # file save/sanitize helper

router = APIRouter(
    prefix="/api/admin/shop",
    tags=["admin-shop"],
    dependencies=[Depends(require_admin)],
)

# Role gates (owner always passes): catalog/content writes, order/promo
# management, order lists (sales + warehouse picking), owner-only actions.
#
# Product ownership is split by field, not by "who created it" (Model B —
# goods originate at the warehouse, content dresses up the card):
#   • warehouse  → stock_qty, cost (receipts/write-offs), and creating the SKU
#   • owner      → price / old_price (money decisions)
#   • content    → texts, photos, category, slug, attributes, publish flag
# CATALOG gates the product shell (create + edit), then update_product
# enforces the per-field split inside.
CONTENT = Depends(require_role("content"))
CATALOG = Depends(require_role("content", "warehouse"))
SALES = Depends(require_role("sales"))
ORDER_VIEW = Depends(require_role("sales", "warehouse"))
OWNER = Depends(require_role())

PRODUCTS_SUBDIR = "products"
CATEGORIES_SUBDIR = "categories"
SERVICES_SUBDIR = "services"


def _replace_picture(obj, upload: UploadFile, subdir: str) -> None:
    """Store an uploaded picture for a category/service and drop the old file."""
    (MEDIA_DIR / subdir).mkdir(parents=True, exist_ok=True)
    old = obj.image
    obj.image = _save(upload, subdir)
    if old and old != obj.image:
        (MEDIA_DIR / subdir / old).unlink(missing_ok=True)


def _drop_picture(obj, subdir: str) -> None:
    if obj.image:
        (MEDIA_DIR / subdir / obj.image).unlink(missing_ok=True)
    obj.image = None


# --------------------------------------------------------------------------
# Serializers
# --------------------------------------------------------------------------
def _attr(a: CategoryAttribute) -> dict:
    return {
        "id": a.id,
        "key": a.key,
        "type": a.type,
        "unit": a.unit or "",
        "filterable": a.filterable,
        "sort_order": a.sort_order,
        "translations": [{"lang": t.lang, "label": t.label} for t in a.translations],
    }


def _service(s: ShopService) -> dict:
    return {
        "id": s.id,
        "slug": s.slug,
        "category_id": s.category_id,
        "price": s.price,
        "currency": s.currency,
        "icon": s.icon,
        "price_from": s.price_from,
        "image": f"{SERVICES_SUBDIR}/{s.image}" if s.image else None,
        "enabled": s.enabled,
        "sort_order": s.sort_order,
        "translations": [
            {"lang": t.lang, "title": t.title, "short": t.short, "body": t.body or "", "feats": t.feats or []}
            for t in s.translations
        ],
    }


def _cat(c: ShopCategory) -> dict:
    return {
        "id": c.id,
        "slug": c.slug,
        "enabled": c.enabled,
        "sort_order": c.sort_order,
        "parent_id": c.parent_id,
        "image": f"{CATEGORIES_SUBDIR}/{c.image}" if c.image else None,
        "product_count": len(c.products),
        "translations": [{"lang": t.lang, "name": t.name} for t in c.translations],
        "attributes": [_attr(a) for a in c.attributes],
    }


def _product(p: Product) -> dict:
    return {
        "id": p.id,
        "slug": p.slug,
        "category_id": p.category_id,
        "price": p.price,
        "old_price": p.old_price,
        "currency": p.currency,
        "in_stock": p.in_stock,
        "stock_qty": p.stock_qty,
        "sku": p.sku or "",
        "barcode": p.barcode,
        "brand_id": p.brand_id,
        "is_new": p.is_new,
        "enabled": p.enabled,
        "sort_order": p.sort_order,
        "image_count": len(p.images),
        "translations": [
            {
                "lang": t.lang,
                "title": t.title,
                "short": t.short,
                "body": t.body,
                "specs": t.specs or [],
            }
            for t in p.translations
        ],
        "attributes": [
            {"attribute_id": a.attribute_id, "value": a.value, "num_value": a.num_value}
            for a in p.attributes
        ],
        "components": [_component(c) for c in p.components],
    }


def _component(c: ProductComponent) -> dict:
    """Build line with the part's live title/price for the admin editor."""
    if c.service is not None:
        title = next((t.title for t in c.service.translations if t.lang == "ru"), None) or c.service.slug
        price = c.service.price
    elif c.product is not None:
        title = next((t.title for t in c.product.translations if t.lang == "ru"), None) or c.product.slug
        price = c.product.price
    else:  # referenced item was deleted
        title, price = "(удалено)", 0
    return {
        "product_id": c.product_id, "service_id": c.service_id, "qty": c.qty,
        "title": title, "price": price,
    }


def _apply_components(p: Product, items: list, db: Session) -> None:
    """Replace a build's component lines wholesale, validating every reference."""
    for it in items:
        if it.product_id is not None:
            if it.product_id == p.id:
                raise HTTPException(400, "A build cannot contain itself")
            if not db.get(Product, it.product_id):
                raise HTTPException(400, f"Product {it.product_id} not found")
        elif not db.get(ShopService, it.service_id):
            raise HTTPException(400, f"Service {it.service_id} not found")
    p.components.clear()
    db.flush()
    for order, it in enumerate(items):
        p.components.append(ProductComponent(
            product_id=it.product_id, service_id=it.service_id, qty=it.qty, sort_order=order,
        ))


def _image(im: ProductImage) -> dict:
    return {"id": im.id, "filename": im.filename, "sort_order": im.sort_order}


# Allowed status changes. Delivered only goes to cancelled (a return, which
# gives the stock back); cancelled can be reopened as new.
ORDER_TRANSITIONS: dict[str, tuple[str, ...]] = {
    "new": ("confirmed", "delivered", "cancelled"),
    "confirmed": ("new", "delivered", "cancelled"),
    "delivered": ("cancelled",),
    "cancelled": ("new",),
}


def _take_order(o: Order, username: str) -> None:
    """Record the first manager who started working on the order."""
    if not o.taken_by:
        o.taken_by = username
        o.taken_at = datetime.now(timezone.utc)


def _order(o: Order) -> dict:
    return {
        "id": o.id,
        "customer_name": o.customer_name,
        "phone": o.phone,
        "address": o.address,
        "payment_method": o.payment_method,
        "comment": o.comment,
        "status": o.status,
        "next_statuses": list(ORDER_TRANSITIONS.get(o.status, ())),
        "taken_by": o.taken_by,
        "taken_at": o.taken_at,
        "payment_status": o.payment_status,
        "payment_provider": o.payment_provider,
        "payment_ref": o.payment_ref,
        "total": o.total,
        "promo_code": o.promo_code,
        "delivery": o.delivery,
        "delivery_zone": o.delivery_zone,
        "discount": o.discount,
        "created_at": o.created_at,
        "items": [
            {
                "product_id": it.product_id,
                "service_id": it.service_id,
                "kind": "service" if it.service_id is not None else "product",
                "title": it.title_snapshot,
                "price": it.price_snapshot,
                "qty": it.qty,
            }
            for it in o.items
        ],
    }


# --------------------------------------------------------------------------
# Categories
# --------------------------------------------------------------------------
@router.get("/categories")
def list_categories(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(ShopCategory).order_by(ShopCategory.sort_order)).all()
    return [_cat(c) for c in rows]


@router.get("/categories/{cat_id}")
def get_category(cat_id: int, db: Session = Depends(get_db)) -> dict:
    c = db.get(ShopCategory, cat_id)
    if not c:
        raise HTTPException(404, "Category not found")
    return _cat(c)


@router.post("/categories", status_code=201, dependencies=[CONTENT])
def create_category(payload: CategoryIn, db: Session = Depends(get_db)) -> dict:
    if db.scalar(select(ShopCategory).where(ShopCategory.slug == payload.slug)):
        raise HTTPException(409, "Slug already exists")
    max_order = db.scalar(select(func.max(ShopCategory.sort_order)))
    c = ShopCategory(
        slug=payload.slug,
        enabled=payload.enabled,
        parent_id=payload.parent_id,
        sort_order=(max_order + 1) if max_order is not None else 0,
    )
    for t in payload.translations:
        c.translations.append(ShopCategoryTranslation(lang=t.lang, name=t.name))
    db.add(c)
    db.commit()
    return _cat(c)


@router.put("/categories/{cat_id}", dependencies=[CONTENT])
def update_category(cat_id: int, payload: CategoryUpdateIn, db: Session = Depends(get_db)) -> dict:
    c = db.get(ShopCategory, cat_id)
    if not c:
        raise HTTPException(404, "Category not found")
    if payload.slug is not None:
        c.slug = payload.slug
    if payload.enabled is not None:
        c.enabled = payload.enabled
    if "parent_id" in payload.model_fields_set:
        if payload.parent_id == cat_id:
            raise HTTPException(400, "A category cannot be its own parent")
        c.parent_id = payload.parent_id
    if payload.translations is not None:
        existing = {t.lang: t for t in c.translations}
        for t in payload.translations:
            row = existing.get(t.lang)
            if row is None:
                c.translations.append(ShopCategoryTranslation(lang=t.lang, name=t.name))
            else:
                row.name = t.name
    db.commit()
    return _cat(c)


@router.post("/categories/{cat_id}/image", dependencies=[CONTENT])
def upload_category_image(cat_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)) -> dict:
    c = db.get(ShopCategory, cat_id)
    if not c:
        raise HTTPException(404, "Category not found")
    _replace_picture(c, file, CATEGORIES_SUBDIR)
    db.commit()
    return _cat(c)


@router.delete("/categories/{cat_id}/image", dependencies=[CONTENT])
def delete_category_image(cat_id: int, db: Session = Depends(get_db)) -> dict:
    c = db.get(ShopCategory, cat_id)
    if not c:
        raise HTTPException(404, "Category not found")
    _drop_picture(c, CATEGORIES_SUBDIR)
    db.commit()
    return _cat(c)


@router.delete("/categories/{cat_id}", dependencies=[CONTENT])
def delete_category(cat_id: int, db: Session = Depends(get_db)) -> dict:
    c = db.get(ShopCategory, cat_id)
    if not c:
        raise HTTPException(404, "Category not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.post("/categories/reorder", dependencies=[CONTENT])
def reorder_categories(payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, cid in enumerate(payload.ids):
        c = db.get(ShopCategory, cid)
        if c:
            c.sort_order = order
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Category attributes (filter facets)
# --------------------------------------------------------------------------
@router.get("/categories/{cat_id}/attributes")
def list_attributes(cat_id: int, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(CategoryAttribute)
        .where(CategoryAttribute.category_id == cat_id)
        .order_by(CategoryAttribute.sort_order)
    ).all()
    return [_attr(a) for a in rows]


@router.post("/categories/{cat_id}/attributes", status_code=201, dependencies=[CONTENT])
def create_attribute(cat_id: int, payload: CategoryAttributeIn, db: Session = Depends(get_db)) -> dict:
    if not db.get(ShopCategory, cat_id):
        raise HTTPException(404, "Category not found")
    max_order = db.scalar(
        select(func.max(CategoryAttribute.sort_order)).where(
            CategoryAttribute.category_id == cat_id
        )
    )
    a = CategoryAttribute(
        category_id=cat_id,
        key=payload.key,
        type=payload.type,
        unit=payload.unit or None,
        filterable=payload.filterable,
        sort_order=(max_order + 1) if max_order is not None else 0,
    )
    for t in payload.translations:
        a.translations.append(CategoryAttributeTranslation(lang=t.lang, label=t.label))
    db.add(a)
    db.commit()
    return _attr(a)


@router.put("/attributes/{attr_id}", dependencies=[CONTENT])
def update_attribute(
    attr_id: int, payload: CategoryAttributeUpdateIn, db: Session = Depends(get_db)
) -> dict:
    a = db.get(CategoryAttribute, attr_id)
    if not a:
        raise HTTPException(404, "Attribute not found")
    if payload.key is not None:
        a.key = payload.key
    if payload.type is not None:
        a.type = payload.type
    if payload.unit is not None:
        a.unit = payload.unit or None
    if payload.filterable is not None:
        a.filterable = payload.filterable
    if payload.translations is not None:
        existing = {t.lang: t for t in a.translations}
        for t in payload.translations:
            row = existing.get(t.lang)
            if row is None:
                a.translations.append(CategoryAttributeTranslation(lang=t.lang, label=t.label))
            else:
                row.label = t.label
    db.commit()
    return _attr(a)


@router.delete("/attributes/{attr_id}", dependencies=[CONTENT])
def delete_attribute(attr_id: int, db: Session = Depends(get_db)) -> dict:
    a = db.get(CategoryAttribute, attr_id)
    if not a:
        raise HTTPException(404, "Attribute not found")
    db.delete(a)
    db.commit()
    return {"ok": True}


@router.post("/categories/{cat_id}/attributes/reorder", dependencies=[CONTENT])
def reorder_attributes(cat_id: int, payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, aid in enumerate(payload.ids):
        a = db.get(CategoryAttribute, aid)
        if a and a.category_id == cat_id:
            a.sort_order = order
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Category services (priced add-ons: install, setup, repair…)
# --------------------------------------------------------------------------
@router.get("/categories/{cat_id}/services")
def list_services(cat_id: int, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(ShopService)
        .where(ShopService.category_id == cat_id)
        .order_by(ShopService.sort_order)
    ).all()
    return [_service(s) for s in rows]


@router.post("/categories/{cat_id}/services", status_code=201, dependencies=[CONTENT])
def create_service(cat_id: int, payload: ShopServiceIn, db: Session = Depends(get_db)) -> dict:
    if not db.get(ShopCategory, cat_id):
        raise HTTPException(404, "Category not found")
    if db.scalar(select(ShopService).where(ShopService.slug == payload.slug)):
        raise HTTPException(409, "Slug already exists")
    max_order = db.scalar(
        select(func.max(ShopService.sort_order)).where(ShopService.category_id == cat_id)
    )
    s = ShopService(
        slug=payload.slug,
        category_id=cat_id,
        price=payload.price,
        currency=payload.currency,
        icon=payload.icon,
        price_from=payload.price_from,
        enabled=payload.enabled,
        sort_order=(max_order + 1) if max_order is not None else 0,
    )
    for t in payload.translations:
        s.translations.append(ShopServiceTranslation(
            lang=t.lang, title=t.title, short=t.short, body=t.body, feats=t.feats,
        ))
    db.add(s)
    db.commit()
    return _service(s)


@router.get("/services")
def list_all_services(db: Session = Depends(get_db)) -> list[dict]:
    """Every service across categories (the storefront "Услуги" page)."""
    rows = db.scalars(select(ShopService).order_by(ShopService.category_id, ShopService.sort_order)).all()
    return [_service(s) for s in rows]


@router.put("/services/{service_id}", dependencies=[CONTENT])
def update_service(service_id: int, payload: ShopServiceUpdateIn, db: Session = Depends(get_db)) -> dict:
    s = db.get(ShopService, service_id)
    if not s:
        raise HTTPException(404, "Service not found")
    if payload.slug is not None:
        if db.scalar(select(ShopService).where(ShopService.slug == payload.slug, ShopService.id != service_id)):
            raise HTTPException(409, "Slug already exists")
        s.slug = payload.slug
    if payload.price is not None:
        s.price = payload.price
    if payload.currency is not None:
        s.currency = payload.currency
    if payload.icon is not None:
        s.icon = payload.icon
    if payload.price_from is not None:
        s.price_from = payload.price_from
    if payload.category_id is not None and payload.category_id != s.category_id:
        if not db.get(ShopCategory, payload.category_id):
            raise HTTPException(400, "Category not found")
        s.category_id = payload.category_id
    if payload.enabled is not None:
        s.enabled = payload.enabled
    if payload.translations is not None:
        existing = {t.lang: t for t in s.translations}
        for t in payload.translations:
            row = existing.get(t.lang)
            if row is None:
                s.translations.append(ShopServiceTranslation(
                    lang=t.lang, title=t.title, short=t.short, body=t.body, feats=t.feats,
                ))
            else:
                row.title, row.short, row.body, row.feats = t.title, t.short, t.body, t.feats
    db.commit()
    return _service(s)


@router.post("/services/{service_id}/image", dependencies=[CONTENT])
def upload_service_image(service_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)) -> dict:
    s = db.get(ShopService, service_id)
    if not s:
        raise HTTPException(404, "Service not found")
    _replace_picture(s, file, SERVICES_SUBDIR)
    db.commit()
    return _service(s)


@router.delete("/services/{service_id}/image", dependencies=[CONTENT])
def delete_service_image(service_id: int, db: Session = Depends(get_db)) -> dict:
    s = db.get(ShopService, service_id)
    if not s:
        raise HTTPException(404, "Service not found")
    _drop_picture(s, SERVICES_SUBDIR)
    db.commit()
    return _service(s)


@router.delete("/services/{service_id}", dependencies=[CONTENT])
def delete_service(service_id: int, db: Session = Depends(get_db)) -> dict:
    s = db.get(ShopService, service_id)
    if not s:
        raise HTTPException(404, "Service not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.post("/categories/{cat_id}/services/reorder", dependencies=[CONTENT])
def reorder_services(cat_id: int, payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, sid in enumerate(payload.ids):
        s = db.get(ShopService, sid)
        if s and s.category_id == cat_id:
            s.sort_order = order
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Brands (storefront brands strip)
# --------------------------------------------------------------------------
def _brand(b: ShopBrand) -> dict:
    return {"id": b.id, "slug": b.slug, "name": b.name, "enabled": b.enabled, "sort_order": b.sort_order}


def _brand_slug_taken(db: Session, slug: str, exclude_id: int | None = None) -> bool:
    stmt = select(ShopBrand.id).where(ShopBrand.slug == slug)
    if exclude_id is not None:
        stmt = stmt.where(ShopBrand.id != exclude_id)
    return db.scalar(stmt) is not None


@router.get("/brands")
def list_brands(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(ShopBrand).order_by(ShopBrand.sort_order)).all()
    return [_brand(b) for b in rows]


@router.post("/brands", status_code=201, dependencies=[CONTENT])
def create_brand(payload: ShopBrandIn, db: Session = Depends(get_db)) -> dict:
    slug = payload.slug or slugify(payload.name)
    if not slug:
        raise HTTPException(422, "Brand slug is empty — pass one explicitly")
    if _brand_slug_taken(db, slug):
        raise HTTPException(409, "Brand slug already exists")
    max_order = db.scalar(select(func.max(ShopBrand.sort_order)))
    b = ShopBrand(
        name=payload.name, slug=slug, enabled=payload.enabled,
        sort_order=(max_order + 1) if max_order is not None else 0,
    )
    db.add(b)
    db.commit()
    return _brand(b)


@router.put("/brands/{brand_id}", dependencies=[CONTENT])
def update_brand(brand_id: int, payload: ShopBrandUpdateIn, db: Session = Depends(get_db)) -> dict:
    b = db.get(ShopBrand, brand_id)
    if not b:
        raise HTTPException(404, "Brand not found")
    if payload.slug is not None and payload.slug != b.slug:
        if _brand_slug_taken(db, payload.slug, exclude_id=b.id):
            raise HTTPException(409, "Brand slug already exists")
        b.slug = payload.slug
    if payload.name is not None:
        b.name = payload.name
    if payload.enabled is not None:
        b.enabled = payload.enabled
    db.commit()
    return _brand(b)


@router.delete("/brands/{brand_id}", dependencies=[CONTENT])
def delete_brand(brand_id: int, db: Session = Depends(get_db)) -> dict:
    b = db.get(ShopBrand, brand_id)
    if not b:
        raise HTTPException(404, "Brand not found")
    db.delete(b)
    db.commit()
    return {"ok": True}


@router.post("/brands/reorder", dependencies=[CONTENT])
def reorder_brands(payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, bid in enumerate(payload.ids):
        b = db.get(ShopBrand, bid)
        if b:
            b.sort_order = order
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Product reviews (moderation)
# --------------------------------------------------------------------------
def _review(r: ProductReview) -> dict:
    title = next((t.title for t in r.product.translations if t.lang == "ru"), None) if r.product else None
    return {
        "id": r.id,
        "product_id": r.product_id,
        "product_title": title or (r.product.slug if r.product else "?"),
        "product_slug": r.product.slug if r.product else "",
        "name": r.name,
        "rating": r.rating,
        "text": r.text,
        "status": r.status,
        "created_at": r.created_at,
    }


@router.get("/reviews")
def list_reviews(status: str | None = None, db: Session = Depends(get_db)) -> list[dict]:
    stmt = select(ProductReview).order_by(ProductReview.created_at.desc())
    if status:
        stmt = stmt.where(ProductReview.status == status)
    return [_review(r) for r in db.scalars(stmt).all()]


@router.patch("/reviews/{review_id}", dependencies=[CONTENT])
def set_review_status(review_id: int, payload: ReviewStatusIn, db: Session = Depends(get_db)) -> dict:
    r = db.get(ProductReview, review_id)
    if not r:
        raise HTTPException(404, "Review not found")
    r.status = payload.status
    db.commit()
    return _review(r)


@router.delete("/reviews/{review_id}", dependencies=[CONTENT])
def delete_review(review_id: int, db: Session = Depends(get_db)) -> dict:
    r = db.get(ProductReview, review_id)
    if not r:
        raise HTTPException(404, "Review not found")
    db.delete(r)
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Delivery zones (checkout options; prices are an owner decision)
# --------------------------------------------------------------------------
def _zone(z: DeliveryZone) -> dict:
    return {
        "id": z.id, "price": z.price, "free_from": z.free_from, "is_pickup": z.is_pickup,
        "is_default": z.is_default, "enabled": z.enabled, "sort_order": z.sort_order,
        "translations": [{"lang": t.lang, "name": t.name, "note": t.note} for t in z.translations],
    }


def _apply_zone(z: DeliveryZone, payload: DeliveryZoneIn, db: Session) -> None:
    z.price = payload.price
    z.free_from = payload.free_from
    z.is_pickup = payload.is_pickup
    z.enabled = payload.enabled
    if payload.is_default and not z.is_default:
        # exactly one default: the zone checkout falls back to
        db.execute(update(DeliveryZone).values(is_default=False))
    z.is_default = payload.is_default
    existing = {t.lang: t for t in z.translations}
    for t in payload.translations:
        row = existing.get(t.lang)
        if row is None:
            z.translations.append(DeliveryZoneTranslation(lang=t.lang, name=t.name, note=t.note))
        else:
            row.name, row.note = t.name, t.note


@router.get("/delivery-zones")
def list_zones(db: Session = Depends(get_db)) -> list[dict]:
    return [_zone(z) for z in db.scalars(select(DeliveryZone).order_by(DeliveryZone.sort_order)).all()]


@router.post("/delivery-zones", status_code=201, dependencies=[OWNER])
def create_zone(payload: DeliveryZoneIn, db: Session = Depends(get_db)) -> dict:
    max_order = db.scalar(select(func.max(DeliveryZone.sort_order)))
    z = DeliveryZone(sort_order=(max_order + 1) if max_order is not None else 0)
    _apply_zone(z, payload, db)
    db.add(z)
    db.commit()
    return _zone(z)


@router.put("/delivery-zones/{zone_id}", dependencies=[OWNER])
def update_zone(zone_id: int, payload: DeliveryZoneIn, db: Session = Depends(get_db)) -> dict:
    z = db.get(DeliveryZone, zone_id)
    if not z:
        raise HTTPException(404, "Delivery zone not found")
    _apply_zone(z, payload, db)
    db.commit()
    return _zone(z)


@router.delete("/delivery-zones/{zone_id}", dependencies=[OWNER])
def delete_zone(zone_id: int, db: Session = Depends(get_db)) -> dict:
    z = db.get(DeliveryZone, zone_id)
    if not z:
        raise HTTPException(404, "Delivery zone not found")
    db.delete(z)  # past orders keep their fee and zone name snapshot
    db.commit()
    return {"ok": True}


@router.post("/delivery-zones/reorder", dependencies=[OWNER])
def reorder_zones(payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, zid in enumerate(payload.ids):
        z = db.get(DeliveryZone, zid)
        if z:
            z.sort_order = order
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Settings (contacts singleton, id=1)
# --------------------------------------------------------------------------
def _get_or_create_settings(db: Session) -> ShopSettings:
    s = db.get(ShopSettings, 1)
    if s is None:
        s = ShopSettings(id=1)
        db.add(s)
        db.commit()
    return s


def _settings(s: ShopSettings) -> dict:
    return {
        "phone": s.phone, "whatsapp": s.whatsapp,
        "address_ru": s.address_ru, "address_tk": s.address_tk, "address_en": s.address_en,
        "email": s.email,
        "hours_ru": s.hours_ru, "hours_tk": s.hours_tk, "hours_en": s.hours_en,
    }


@router.get("/settings")
def get_settings(db: Session = Depends(get_db)) -> dict:
    return _settings(_get_or_create_settings(db))


@router.put("/settings", dependencies=[CONTENT])
def update_settings(payload: ShopSettingsIn, db: Session = Depends(get_db)) -> dict:
    s = _get_or_create_settings(db)
    s.phone = payload.phone
    s.whatsapp = payload.whatsapp
    s.address_ru = payload.address_ru
    s.address_tk = payload.address_tk
    s.address_en = payload.address_en
    s.email = payload.email
    s.hours_ru = payload.hours_ru
    s.hours_tk = payload.hours_tk
    s.hours_en = payload.hours_en
    db.commit()
    return _settings(s)


# --------------------------------------------------------------------------
# Products
# --------------------------------------------------------------------------
def _apply_attributes(p: Product, items: list, db: Session) -> None:
    """Replace a product's attribute values wholesale."""
    p.attributes.clear()
    db.flush()
    for a in items:
        p.attributes.append(
            ProductAttribute(attribute_id=a.attribute_id, value=a.value, num_value=a.num_value)
        )


@router.get("/products")
def list_products(category_id: int | None = None, db: Session = Depends(get_db)) -> list[dict]:
    stmt = select(Product).order_by(Product.sort_order)
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    return [_product(p) for p in db.scalars(stmt).all()]


@router.get("/products/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)) -> dict:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    return _product(p)


def _commit_or_barcode_conflict(db: Session, barcode_in_play: bool) -> None:
    """The app-level SELECT catches the common duplicate, but two concurrent
    writers can both pass it before either commits; the DB unique index is the
    backstop. Translate that race into the same 409, not a raw 500."""
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if barcode_in_play:
            raise HTTPException(409, "barcode already bound to another product")
        raise


@router.post("/products", status_code=201, dependencies=[CATALOG])
def create_product(payload: ProductIn, db: Session = Depends(get_db), user: dict = Depends(require_admin)) -> dict:
    if db.scalar(select(Product).where(Product.slug == payload.slug)):
        raise HTTPException(409, "Slug already exists")
    if not db.get(ShopCategory, payload.category_id):
        raise HTTPException(400, "Category not found")
    if payload.brand_id is not None and not db.get(ShopBrand, payload.brand_id):
        raise HTTPException(400, "Brand not found")
    if payload.barcode:
        # create is open to content+warehouse, but the barcode lane holds here too
        if user["role"] not in ("owner", "warehouse"):
            raise HTTPException(403, "barcode changes are warehouse-only")
        if db.scalar(select(Product.id).where(Product.barcode == payload.barcode)):
            raise HTTPException(409, "barcode already bound to another product")
    max_order = db.scalar(
        select(func.max(Product.sort_order)).where(Product.category_id == payload.category_id)
    )
    p = Product(
        slug=payload.slug,
        category_id=payload.category_id,
        price=payload.price,
        old_price=payload.old_price,
        currency=payload.currency,
        in_stock=payload.in_stock,
        stock_qty=payload.stock_qty,
        sku=payload.sku or None,
        barcode=payload.barcode or None,
        brand_id=payload.brand_id,
        is_new=payload.is_new,
        enabled=payload.enabled,
        sort_order=(max_order + 1) if max_order is not None else 0,
    )
    for t in payload.translations:
        p.translations.append(
            ProductTranslation(lang=t.lang, title=t.title, short=t.short, body=t.body, specs=t.specs)
        )
    for a in payload.attributes:
        p.attributes.append(
            ProductAttribute(attribute_id=a.attribute_id, value=a.value, num_value=a.num_value)
        )
    db.add(p)
    if payload.components:
        db.flush()  # p.id for the self-reference check
        _apply_components(p, payload.components, db)
    if payload.stock_qty is not None:
        db.flush()  # p.id for the ledger row
        log_movement(
            db, product_id=p.id, qty_delta=payload.stock_qty, kind="adjust",
            username=user["username"], note="начальный остаток",
        )
    _commit_or_barcode_conflict(db, bool(payload.barcode))
    return _product(p)


@router.put("/products/{product_id}")
def update_product(
    product_id: int,
    payload: ProductUpdateIn,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("content", "warehouse")),
) -> dict:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    # Per-field ownership (owner passes all). Each edited domain is checked
    # against the role that owns it so no role can reach outside its lane:
    #   price/old_price → owner · stock_qty/barcode → warehouse · everything else → content
    role = user["role"]

    def owns(*roles: str) -> bool:
        return role == "owner" or role in roles

    price_touched = (payload.price is not None and payload.price != p.price) or (
        "old_price" in payload.model_fields_set and payload.old_price != p.old_price
    )
    stock_touched = "stock_qty" in payload.model_fields_set and payload.stock_qty != p.stock_qty
    barcode_touched = "barcode" in payload.model_fields_set and payload.barcode != p.barcode
    catalog_touched = any((
        payload.slug is not None,
        payload.category_id is not None,
        payload.currency is not None,
        payload.in_stock is not None,
        payload.sku is not None,
        payload.enabled is not None,
        "brand_id" in payload.model_fields_set,
        payload.is_new is not None,
        payload.translations is not None,
        payload.attributes is not None,
        payload.components is not None,
    ))
    if price_touched and not owns():
        raise HTTPException(403, "price changes are owner-only")
    if stock_touched and not owns("warehouse"):
        raise HTTPException(403, "stock changes are warehouse-only")
    if barcode_touched and not owns("warehouse"):
        raise HTTPException(403, "barcode changes are warehouse-only")
    if catalog_touched and not owns("content"):
        raise HTTPException(403, "catalog fields are content-only")
    if barcode_touched and payload.barcode:
        # a duplicate would make the POS scanner ambiguous — /lookup picks one at random
        taken = db.scalar(
            select(Product.id).where(Product.barcode == payload.barcode, Product.id != p.id)
        )
        if taken:
            raise HTTPException(409, "barcode already bound to another product")
        p.barcode = payload.barcode
    elif barcode_touched:
        p.barcode = None
    if payload.slug is not None:
        p.slug = payload.slug
    if payload.category_id is not None:
        p.category_id = payload.category_id
    if payload.price is not None:
        p.price = payload.price
    if "old_price" in payload.model_fields_set:
        # present-with-null clears the discount; missing key = no change
        p.old_price = payload.old_price
    if "stock_qty" in payload.model_fields_set and payload.stock_qty != p.stock_qty:
        # present-with-null disables stock tracking; any manual change goes
        # to the ledger as a correction so the audit trail stays complete
        old = p.stock_qty
        p.stock_qty = payload.stock_qty
        db.flush()  # session has autoflush=False; ledger reads stock_after via SELECT
        log_movement(
            db, product_id=p.id, qty_delta=(payload.stock_qty or 0) - (old or 0), kind="adjust",
            username=user["username"],
            note="правка в карточке товара" if payload.stock_qty is not None else "учёт остатка отключён",
        )
    if payload.currency is not None:
        p.currency = payload.currency
    if payload.in_stock is not None:
        p.in_stock = payload.in_stock
    if payload.sku is not None:
        p.sku = payload.sku or None
    if payload.enabled is not None:
        p.enabled = payload.enabled
    if "brand_id" in payload.model_fields_set:
        if payload.brand_id is not None and not db.get(ShopBrand, payload.brand_id):
            raise HTTPException(400, "Brand not found")
        p.brand_id = payload.brand_id
    if payload.is_new is not None:
        p.is_new = payload.is_new
    if payload.translations is not None:
        existing = {t.lang: t for t in p.translations}
        for t in payload.translations:
            row = existing.get(t.lang)
            if row is None:
                p.translations.append(
                    ProductTranslation(
                        lang=t.lang, title=t.title, short=t.short, body=t.body, specs=t.specs
                    )
                )
            else:
                row.title, row.short, row.body, row.specs = t.title, t.short, t.body, t.specs
    if payload.attributes is not None:
        _apply_attributes(p, payload.attributes, db)
    if payload.components is not None:
        _apply_components(p, payload.components, db)
    _commit_or_barcode_conflict(db, barcode_touched)
    return _product(p)


@router.delete("/products/{product_id}", dependencies=[CONTENT])
def delete_product(product_id: int, db: Session = Depends(get_db)) -> dict:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    for im in p.images:
        (MEDIA_DIR / PRODUCTS_SUBDIR / im.filename).unlink(missing_ok=True)
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.post("/products/reorder", dependencies=[CONTENT])
def reorder_products(payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, pid in enumerate(payload.ids):
        p = db.get(Product, pid)
        if p:
            p.sort_order = order
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Product images
# --------------------------------------------------------------------------
@router.get("/products/{product_id}/images")
def list_images(product_id: int, db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(ProductImage)
        .where(ProductImage.product_id == product_id)
        .order_by(ProductImage.sort_order)
    ).all()
    return [_image(im) for im in rows]


@router.post("/products/{product_id}/images", status_code=201, dependencies=[CONTENT])
def upload_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    if not db.get(Product, product_id):
        raise HTTPException(404, "Product not found")
    filename = _save(file, PRODUCTS_SUBDIR)
    max_order = db.scalar(
        select(func.max(ProductImage.sort_order)).where(ProductImage.product_id == product_id)
    )
    im = ProductImage(
        product_id=product_id,
        filename=filename,
        sort_order=(max_order + 1) if max_order is not None else 0,
    )
    db.add(im)
    db.commit()
    return _image(im)


@router.delete("/images/{image_id}", dependencies=[CONTENT])
def delete_image(image_id: int, db: Session = Depends(get_db)) -> dict:
    im = db.get(ProductImage, image_id)
    if not im:
        raise HTTPException(404, "Image not found")
    (MEDIA_DIR / PRODUCTS_SUBDIR / im.filename).unlink(missing_ok=True)
    db.delete(im)
    db.commit()
    return {"ok": True}


@router.post("/products/{product_id}/images/reorder", dependencies=[CONTENT])
def reorder_images(product_id: int, payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, iid in enumerate(payload.ids):
        im = db.get(ProductImage, iid)
        if im and im.product_id == product_id:
            im.sort_order = order
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Promo codes
# --------------------------------------------------------------------------
def _parse_expiry(raw: str | None):
    """'YYYY-MM-DD' → end-of-day datetime; empty/None → no expiry."""
    from datetime import datetime

    if not raw or not raw.strip():
        return None
    try:
        return datetime.strptime(raw.strip(), "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    except ValueError:
        raise HTTPException(400, "expires_at must be YYYY-MM-DD")


def _promo(p: PromoCode) -> dict:
    return {
        "id": p.id,
        "code": p.code,
        "kind": p.kind,
        "value": p.value,
        "min_total": p.min_total,
        "active": p.active,
        "expires_at": p.expires_at.strftime("%Y-%m-%d") if p.expires_at else None,
        "used_count": p.used_count,
        "max_uses": p.max_uses,
        "created_at": p.created_at,
    }


@router.get("/promos", dependencies=[SALES])
def list_promos(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(PromoCode).order_by(PromoCode.created_at.desc())).all()
    return [_promo(p) for p in rows]


@router.post("/promos", status_code=201, dependencies=[SALES])
def create_promo(payload: PromoCodeIn, db: Session = Depends(get_db)) -> dict:
    code = payload.code.strip().upper()
    if db.scalar(select(PromoCode).where(func.lower(PromoCode.code) == code.lower())):
        raise HTTPException(409, "Code already exists")
    p = PromoCode(
        code=code,
        kind=payload.kind,
        value=payload.value,
        min_total=payload.min_total,
        active=payload.active,
        expires_at=_parse_expiry(payload.expires_at),
        max_uses=payload.max_uses,
    )
    db.add(p)
    db.commit()
    return _promo(p)


@router.put("/promos/{promo_id}", dependencies=[SALES])
def update_promo(promo_id: int, payload: PromoCodeUpdateIn, db: Session = Depends(get_db)) -> dict:
    p = db.get(PromoCode, promo_id)
    if not p:
        raise HTTPException(404, "Promo code not found")
    if payload.code is not None:
        code = payload.code.strip().upper()
        if db.scalar(
            select(PromoCode).where(func.lower(PromoCode.code) == code.lower(), PromoCode.id != promo_id)
        ):
            raise HTTPException(409, "Code already exists")
        p.code = code
    if payload.kind is not None:
        p.kind = payload.kind
    if payload.value is not None:
        p.value = payload.value
    if payload.min_total is not None:
        p.min_total = payload.min_total
    if payload.active is not None:
        p.active = payload.active
    if "expires_at" in payload.model_fields_set:
        # present-with-null clears the expiry; missing key = no change
        p.expires_at = _parse_expiry(payload.expires_at)
    if "max_uses" in payload.model_fields_set:
        # present-with-null clears the cap; missing key = no change
        p.max_uses = payload.max_uses
    # Guard the merged result: a partial patch (e.g. value only) could push an
    # existing percent code past 100 without the schema validator seeing both.
    if p.kind == "percent" and p.value > 100:
        raise HTTPException(422, "percent discount cannot exceed 100")
    db.commit()
    return _promo(p)


@router.delete("/promos/{promo_id}", dependencies=[SALES])
def delete_promo(promo_id: int, db: Session = Depends(get_db)) -> dict:
    p = db.get(PromoCode, promo_id)
    if not p:
        raise HTTPException(404, "Promo code not found")
    db.delete(p)
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Orders
# --------------------------------------------------------------------------
@router.get("/orders", dependencies=[ORDER_VIEW])
def list_orders(
    status: str | None = None,
    payment: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
) -> list[dict]:
    stmt = select(Order).order_by(Order.created_at.desc())
    if status:
        stmt = stmt.where(Order.status == status)
    if payment:
        stmt = stmt.where(Order.payment_status == payment)
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(Order.phone.like(needle) | Order.customer_name.like(needle))
    return [_order(o) for o in db.scalars(stmt).all()]


@router.get("/stats")
def shop_stats(db: Session = Depends(get_db), user: dict = Depends(require_admin)) -> dict:
    from datetime import timedelta

    # Orders store aware-UTC created_at (models._now); compare in the same frame.
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    not_cancelled = Order.status != "cancelled"

    orders_new = db.scalar(select(func.count(Order.id)).where(Order.status == "new")) or 0
    orders_today = db.scalar(
        select(func.count(Order.id)).where(Order.created_at >= today, not_cancelled)
    ) or 0
    orders_week = db.scalar(
        select(func.count(Order.id)).where(Order.created_at >= week_ago, not_cancelled)
    ) or 0
    # money is the owner's and sales' lane — /reports/sales gates it the same
    # way, and this endpoint must not become a side door around that
    sees_money = user["role"] in ("owner", "sales")
    revenue_week = (
        db.scalar(
            select(func.coalesce(func.sum(Order.total), 0)).where(
                Order.created_at >= week_ago, not_cancelled
            )
        ) or 0
    ) if sees_money else None
    leads_new = db.scalar(select(func.count(Lead.id)).where(Lead.status == "new")) or 0
    reviews_pending = db.scalar(
        select(func.count(ProductReview.id)).where(ProductReview.status == "pending")
    ) or 0

    # top products by qty sold over the last 30 days (delivered/confirmed/new)
    top_rows = db.execute(
        select(OrderItem.product_id, func.sum(OrderItem.qty).label("sold"))
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.created_at >= month_ago,
            not_cancelled,
            OrderItem.product_id.is_not(None),
        )
        .group_by(OrderItem.product_id)
        .order_by(func.sum(OrderItem.qty).desc())
        .limit(5)
    ).all()
    top_products = []
    for pid, sold in top_rows:
        p = db.get(Product, pid)
        if not p:
            continue
        title = next((t.title for t in p.translations if t.lang == "ru"), None) or p.slug
        top_products.append({"id": p.id, "title": title, "sold": int(sold)})

    # tracked-stock products running low (<=5), lowest first
    low_rows = db.scalars(
        select(Product)
        .where(Product.stock_qty.is_not(None), Product.stock_qty <= 5, Product.enabled)
        .order_by(Product.stock_qty)
        .limit(8)
    ).all()
    low_stock = [
        {
            "id": p.id,
            "title": next((t.title for t in p.translations if t.lang == "ru"), None) or p.slug,
            "stock_qty": p.stock_qty,
        }
        for p in low_rows
    ]

    return {
        "orders_new": orders_new,
        "orders_today": orders_today,
        "orders_week": orders_week,
        "revenue_week": int(revenue_week) if revenue_week is not None else None,
        "reviews_pending": reviews_pending,
        "leads_new": leads_new,
        "top_products": top_products,
        "low_stock": low_stock,
    }


def _restore_stock_and_promo(db: Session, order: Order, username: str = "") -> None:
    """Give back the stock decremented and the promo use claimed at
    create_order. Called when an order is cancelled or deleted so the
    reservation doesn't leak. Tracked stock only (NULL = not tracked)."""
    for it in order.items:
        if it.product_id is not None:
            res = db.execute(
                update(Product)
                .where(Product.id == it.product_id, Product.stock_qty.is_not(None))
                .values(stock_qty=Product.stock_qty + it.qty)
            )
            if res.rowcount:  # tracked → ledger row
                log_movement(
                    db, product_id=it.product_id, qty_delta=it.qty, kind="return",
                    order_id=order.id, username=username, note=f"отмена заказа #{order.id}",
                )
    if order.promo_code:
        db.execute(
            update(PromoCode)
            .where(func.lower(PromoCode.code) == order.promo_code.lower(), PromoCode.used_count > 0)
            .values(used_count=PromoCode.used_count - 1)
        )


def _reserve_stock_and_promo(db: Session, order: Order, username: str = "") -> None:
    """Re-apply the stock/promo reservation when an order leaves the
    cancelled state (mirror of _restore_stock_and_promo). Best-effort:
    an out-of-stock product still un-cancels but its stock stays as-is."""
    for it in order.items:
        if it.product_id is not None:
            res = db.execute(
                update(Product)
                .where(
                    Product.id == it.product_id,
                    Product.stock_qty.is_not(None),
                    Product.stock_qty >= it.qty,
                )
                .values(stock_qty=Product.stock_qty - it.qty)
            )
            if res.rowcount:  # tracked and covered → ledger row
                log_movement(
                    db, product_id=it.product_id, qty_delta=-it.qty, kind="sale",
                    order_id=order.id, username=username, note=f"восстановление заказа #{order.id}",
                )
    if order.promo_code:
        db.execute(
            update(PromoCode)
            .where(
                func.lower(PromoCode.code) == order.promo_code.lower(),
                or_(PromoCode.max_uses.is_(None), PromoCode.used_count < PromoCode.max_uses),
            )
            .values(used_count=PromoCode.used_count + 1)
        )


@router.patch("/orders/{order_id}", dependencies=[SALES])
def set_order_status(
    order_id: int,
    payload: OrderStatusIn,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin),
) -> dict:
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    changed = o.status != payload.status
    if changed and payload.status not in ORDER_TRANSITIONS.get(o.status, ()):
        raise HTTPException(409, f"Order status cannot change from {o.status} to {payload.status}")
    if changed:
        if payload.status in ("confirmed", "delivered"):
            _take_order(o, user["username"])
        # payment is taken on hand-over (cash or card), so a delivered order is paid
        if payload.status == "delivered" and o.payment_status == "unpaid":
            o.payment_status = "paid"
            o.payment_provider = o.payment_provider or "manual"
        # cancelling a handed-over order is a return: the money goes back too
        if o.status == "delivered" and payload.status == "cancelled" and o.payment_status == "paid":
            o.payment_status = "refunded"
        if payload.status == "cancelled":
            _restore_stock_and_promo(db, o, user["username"])
        elif o.status == "cancelled":
            # leaving cancelled → re-reserve what was given back
            _reserve_stock_and_promo(db, o, user["username"])
    o.status = payload.status
    db.commit()
    return _order(o)


@router.post("/orders/{order_id}/take", dependencies=[SALES])
def take_order(order_id: int, db: Session = Depends(get_db), user: dict = Depends(require_admin)) -> dict:
    """The manager clicked the customer's phone: a new order becomes confirmed
    under their name. Idempotent — later clicks change nothing."""
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    if o.status == "new":
        o.status = "confirmed"
    if o.status != "cancelled":
        _take_order(o, user["username"])
    db.commit()
    return _order(o)


@router.patch("/orders/{order_id}/payment", dependencies=[SALES])
def set_order_payment(order_id: int, payload: OrderPaymentIn, db: Session = Depends(get_db)) -> dict:
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    o.payment_status = payload.payment_status
    if payload.payment_status == "paid" and not o.payment_provider:
        o.payment_provider = "manual"  # paid by hand, no gateway involved
    db.commit()
    return _order(o)


@router.delete("/orders/{order_id}", dependencies=[OWNER])
def delete_order(order_id: int, db: Session = Depends(get_db), user: dict = Depends(require_admin)) -> dict:
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    # A cancelled order already gave its reservation back; anything else still
    # holds stock/promo, so restore before the row (and its items) disappear.
    if o.status != "cancelled":
        _restore_stock_and_promo(db, o, user["username"])
    db.delete(o)
    db.commit()
    return {"ok": True}
