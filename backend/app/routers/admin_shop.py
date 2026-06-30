"""Admin CRUD for the tech shop: categories, filter attributes, products,
product images and customer orders. Mirrors the services/media/leads routers."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import require_admin
from ..config import MEDIA_DIR
from ..db import get_db
from ..models import (
    CategoryAttribute,
    CategoryAttributeTranslation,
    Order,
    Product,
    ProductAttribute,
    ProductImage,
    ProductTranslation,
    ShopCategory,
    ShopCategoryTranslation,
)
from ..schemas import (
    CategoryAttributeIn,
    CategoryAttributeUpdateIn,
    CategoryIn,
    CategoryUpdateIn,
    OrderStatusIn,
    ProductIn,
    ProductUpdateIn,
    ReorderIn,
)
from .admin_media import _save  # file save/sanitize helper

router = APIRouter(
    prefix="/api/admin/shop",
    tags=["admin-shop"],
    dependencies=[Depends(require_admin)],
)

PRODUCTS_SUBDIR = "products"


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


def _cat(c: ShopCategory) -> dict:
    return {
        "id": c.id,
        "slug": c.slug,
        "enabled": c.enabled,
        "sort_order": c.sort_order,
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
        "currency": p.currency,
        "in_stock": p.in_stock,
        "sku": p.sku or "",
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
    }


def _image(im: ProductImage) -> dict:
    return {"id": im.id, "filename": im.filename, "sort_order": im.sort_order}


def _order(o: Order) -> dict:
    return {
        "id": o.id,
        "customer_name": o.customer_name,
        "phone": o.phone,
        "address": o.address,
        "payment_method": o.payment_method,
        "comment": o.comment,
        "status": o.status,
        "total": o.total,
        "created_at": o.created_at,
        "items": [
            {
                "product_id": it.product_id,
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


@router.post("/categories", status_code=201)
def create_category(payload: CategoryIn, db: Session = Depends(get_db)) -> dict:
    if db.scalar(select(ShopCategory).where(ShopCategory.slug == payload.slug)):
        raise HTTPException(409, "Slug already exists")
    max_order = db.scalar(select(func.max(ShopCategory.sort_order)))
    c = ShopCategory(
        slug=payload.slug,
        enabled=payload.enabled,
        sort_order=(max_order + 1) if max_order is not None else 0,
    )
    for t in payload.translations:
        c.translations.append(ShopCategoryTranslation(lang=t.lang, name=t.name))
    db.add(c)
    db.commit()
    return _cat(c)


@router.put("/categories/{cat_id}")
def update_category(cat_id: int, payload: CategoryUpdateIn, db: Session = Depends(get_db)) -> dict:
    c = db.get(ShopCategory, cat_id)
    if not c:
        raise HTTPException(404, "Category not found")
    if payload.slug is not None:
        c.slug = payload.slug
    if payload.enabled is not None:
        c.enabled = payload.enabled
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


@router.delete("/categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db)) -> dict:
    c = db.get(ShopCategory, cat_id)
    if not c:
        raise HTTPException(404, "Category not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.post("/categories/reorder")
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


@router.post("/categories/{cat_id}/attributes", status_code=201)
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


@router.put("/attributes/{attr_id}")
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


@router.delete("/attributes/{attr_id}")
def delete_attribute(attr_id: int, db: Session = Depends(get_db)) -> dict:
    a = db.get(CategoryAttribute, attr_id)
    if not a:
        raise HTTPException(404, "Attribute not found")
    db.delete(a)
    db.commit()
    return {"ok": True}


@router.post("/categories/{cat_id}/attributes/reorder")
def reorder_attributes(cat_id: int, payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, aid in enumerate(payload.ids):
        a = db.get(CategoryAttribute, aid)
        if a and a.category_id == cat_id:
            a.sort_order = order
    db.commit()
    return {"ok": True}


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


@router.post("/products", status_code=201)
def create_product(payload: ProductIn, db: Session = Depends(get_db)) -> dict:
    if db.scalar(select(Product).where(Product.slug == payload.slug)):
        raise HTTPException(409, "Slug already exists")
    if not db.get(ShopCategory, payload.category_id):
        raise HTTPException(400, "Category not found")
    max_order = db.scalar(
        select(func.max(Product.sort_order)).where(Product.category_id == payload.category_id)
    )
    p = Product(
        slug=payload.slug,
        category_id=payload.category_id,
        price=payload.price,
        currency=payload.currency,
        in_stock=payload.in_stock,
        sku=payload.sku or None,
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
    db.commit()
    return _product(p)


@router.put("/products/{product_id}")
def update_product(product_id: int, payload: ProductUpdateIn, db: Session = Depends(get_db)) -> dict:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    if payload.slug is not None:
        p.slug = payload.slug
    if payload.category_id is not None:
        p.category_id = payload.category_id
    if payload.price is not None:
        p.price = payload.price
    if payload.currency is not None:
        p.currency = payload.currency
    if payload.in_stock is not None:
        p.in_stock = payload.in_stock
    if payload.sku is not None:
        p.sku = payload.sku or None
    if payload.enabled is not None:
        p.enabled = payload.enabled
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
    db.commit()
    return _product(p)


@router.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)) -> dict:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(404, "Product not found")
    for im in p.images:
        (MEDIA_DIR / PRODUCTS_SUBDIR / im.filename).unlink(missing_ok=True)
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.post("/products/reorder")
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


@router.post("/products/{product_id}/images", status_code=201)
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


@router.delete("/images/{image_id}")
def delete_image(image_id: int, db: Session = Depends(get_db)) -> dict:
    im = db.get(ProductImage, image_id)
    if not im:
        raise HTTPException(404, "Image not found")
    (MEDIA_DIR / PRODUCTS_SUBDIR / im.filename).unlink(missing_ok=True)
    db.delete(im)
    db.commit()
    return {"ok": True}


@router.post("/products/{product_id}/images/reorder")
def reorder_images(product_id: int, payload: ReorderIn, db: Session = Depends(get_db)) -> dict:
    for order, iid in enumerate(payload.ids):
        im = db.get(ProductImage, iid)
        if im and im.product_id == product_id:
            im.sort_order = order
    db.commit()
    return {"ok": True}


# --------------------------------------------------------------------------
# Orders
# --------------------------------------------------------------------------
@router.get("/orders")
def list_orders(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(select(Order).order_by(Order.created_at.desc())).all()
    return [_order(o) for o in rows]


@router.patch("/orders/{order_id}")
def set_order_status(order_id: int, payload: OrderStatusIn, db: Session = Depends(get_db)) -> dict:
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    o.status = payload.status
    db.commit()
    return _order(o)


@router.delete("/orders/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)) -> dict:
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(404, "Order not found")
    db.delete(o)
    db.commit()
    return {"ok": True}
