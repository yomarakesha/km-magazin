"""Database models.

Content mirrors the TS `Content`/`Section` contract in the frontend's
`lib/content.ts`. Per-language texts that are not services live in
`ContentBlock` (one JSON blob per (key, lang)); services are normalized into
`Service` + `ServiceTranslation`, and gallery media into `Media`.
"""
import re
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from .db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Service(Base):
    __tablename__ = "services"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    icon: Mapped[str] = mapped_column(String(32))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    translations: Mapped[list["ServiceTranslation"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    media: Mapped[list["Media"]] = relationship(
        back_populates="service",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="Media.sort_order",
    )


class ServiceTranslation(Base):
    __tablename__ = "service_translations"
    __table_args__ = (UniqueConstraint("service_id", "lang", name="uq_service_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"))
    lang: Mapped[str] = mapped_column(String(2))
    code: Mapped[str] = mapped_column(String(128))
    short: Mapped[str] = mapped_column(String(128))
    title: Mapped[str] = mapped_column(String(256))
    body: Mapped[str] = mapped_column(Text)
    feats: Mapped[list] = mapped_column(JSON, default=list)

    service: Mapped["Service"] = relationship(back_populates="translations")


class Media(Base):
    __tablename__ = "media"

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("services.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(8))  # "video" | "img"
    filename: Mapped[str] = mapped_column(String(128))  # full name with extension, e.g. "cctv-1.jpg"
    poster: Mapped[str | None] = mapped_column(String(128), nullable=True)  # video poster file
    still: Mapped[bool] = mapped_column(Boolean, default=False)
    caption_kind: Mapped[str] = mapped_column(String(16), default="photo")  # photo|vms|chapar
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    service: Mapped["Service"] = relationship(back_populates="media")


class ContentBlock(Base):
    __tablename__ = "content_blocks"
    __table_args__ = (UniqueConstraint("key", "lang", name="uq_block_key_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(32))   # hero|about|process|advantages|contact|nav|marquee|meta
    lang: Mapped[str] = mapped_column(String(2))
    data: Mapped[dict] = mapped_column(JSON)


# --------------------------------------------------------------------------
# Shop: tech products store (separate from the services landing).
# Mirrors the Service/Translation/Media pattern: a category groups products,
# each carries per-language text, a gallery, and filterable attributes.
# --------------------------------------------------------------------------


class ShopCategory(Base):
    __tablename__ = "shop_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    image: Mapped[str | None] = mapped_column(String(128), nullable=True)  # tile picture, media/categories
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_categories.id", ondelete="SET NULL"), nullable=True, index=True
    )

    parent: Mapped["ShopCategory | None"] = relationship(
        "ShopCategory", remote_side="ShopCategory.id", back_populates="children"
    )
    children: Mapped[list["ShopCategory"]] = relationship(
        "ShopCategory", back_populates="parent", order_by="ShopCategory.sort_order"
    )
    translations: Mapped[list["ShopCategoryTranslation"]] = relationship(
        back_populates="category", cascade="all, delete-orphan", lazy="selectin"
    )
    attributes: Mapped[list["CategoryAttribute"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="CategoryAttribute.sort_order",
    )
    products: Mapped[list["Product"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="Product.sort_order",
    )
    services: Mapped[list["ShopService"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ShopService.sort_order",
    )


class ShopCategoryTranslation(Base):
    __tablename__ = "shop_category_translations"
    __table_args__ = (UniqueConstraint("category_id", "lang", name="uq_shopcat_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("shop_categories.id", ondelete="CASCADE"))
    lang: Mapped[str] = mapped_column(String(2))
    name: Mapped[str] = mapped_column(String(128), default="")

    category: Mapped["ShopCategory"] = relationship(back_populates="translations")


class CategoryAttribute(Base):
    """A filterable characteristic of a category (e.g. ram, gpu)."""

    __tablename__ = "shop_category_attributes"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("shop_categories.id", ondelete="CASCADE"))
    key: Mapped[str] = mapped_column(String(32))  # machine key, e.g. "ram"
    type: Mapped[str] = mapped_column(String(8), default="select")  # select|number
    unit: Mapped[str | None] = mapped_column(String(16), nullable=True)  # e.g. "GB"
    filterable: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    category: Mapped["ShopCategory"] = relationship(back_populates="attributes")
    translations: Mapped[list["CategoryAttributeTranslation"]] = relationship(
        back_populates="attribute", cascade="all, delete-orphan", lazy="selectin"
    )


class CategoryAttributeTranslation(Base):
    __tablename__ = "shop_attribute_translations"
    __table_args__ = (UniqueConstraint("attribute_id", "lang", name="uq_attr_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    attribute_id: Mapped[int] = mapped_column(
        ForeignKey("shop_category_attributes.id", ondelete="CASCADE")
    )
    lang: Mapped[str] = mapped_column(String(2))
    label: Mapped[str] = mapped_column(String(64), default="")

    attribute: Mapped["CategoryAttribute"] = relationship(back_populates="translations")


class Product(Base):
    __tablename__ = "shop_products"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("shop_categories.id", ondelete="CASCADE"))
    price: Mapped[int] = mapped_column(Integer, default=0)  # whole manat
    old_price: Mapped[int | None] = mapped_column(Integer, nullable=True)  # pre-discount price
    currency: Mapped[str] = mapped_column(String(8), default="TMT")
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True)  # in stock vs. to order
    stock_qty: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = not tracked
    cost_price: Mapped[int | None] = mapped_column(Integer, nullable=True)  # last purchase cost, TMT
    sku: Mapped[str | None] = mapped_column(String(64), nullable=True)
    barcode: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)  # EAN/UPC for POS scan
    brand_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_brands.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_new: Mapped[bool] = mapped_column(Boolean, default=False)  # "Новое" badge / new-arrivals list
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    # feeds sitemap <lastmod>; NULL for rows predating the column
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, default=_now, onupdate=_now
    )

    category: Mapped["ShopCategory"] = relationship(back_populates="products")
    brand: Mapped["ShopBrand | None"] = relationship("ShopBrand", lazy="selectin")
    translations: Mapped[list["ProductTranslation"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", lazy="selectin"
    )
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ProductImage.sort_order",
    )
    attributes: Mapped[list["ProductAttribute"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", lazy="selectin"
    )
    # set only on ready-made PC builds: the parts (and assembly service) it is made of
    components: Mapped[list["ProductComponent"]] = relationship(
        foreign_keys="ProductComponent.build_id",
        back_populates="build",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ProductComponent.sort_order",
    )


class ProductComponent(Base):
    """One line of a ready-made build: a catalog product or a service, shown
    with its live title/price on the build page (Figma "Build" screen)."""

    __tablename__ = "shop_product_components"

    id: Mapped[int] = mapped_column(primary_key=True)
    build_id: Mapped[int] = mapped_column(ForeignKey("shop_products.id", ondelete="CASCADE"), index=True)
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_products.id", ondelete="SET NULL"), nullable=True
    )
    service_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_services.id", ondelete="SET NULL"), nullable=True
    )
    qty: Mapped[int] = mapped_column(Integer, default=1)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    build: Mapped["Product"] = relationship(foreign_keys=[build_id], back_populates="components")
    product: Mapped["Product | None"] = relationship(foreign_keys=[product_id], lazy="selectin")
    service: Mapped["ShopService | None"] = relationship(lazy="selectin")


class ProductTranslation(Base):
    __tablename__ = "shop_product_translations"
    __table_args__ = (UniqueConstraint("product_id", "lang", name="uq_product_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("shop_products.id", ondelete="CASCADE"))
    lang: Mapped[str] = mapped_column(String(2))
    title: Mapped[str] = mapped_column(String(256), default="")
    short: Mapped[str] = mapped_column(String(256), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    specs: Mapped[list] = mapped_column(JSON, default=list)  # [{label, value}]

    product: Mapped["Product"] = relationship(back_populates="translations")


class ProductImage(Base):
    __tablename__ = "shop_product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("shop_products.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(128))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    product: Mapped["Product"] = relationship(back_populates="images")


class ProductAttribute(Base):
    """A concrete attribute value of a product (e.g. ram=16)."""

    __tablename__ = "shop_product_attributes"
    __table_args__ = (UniqueConstraint("product_id", "attribute_id", name="uq_prod_attr"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("shop_products.id", ondelete="CASCADE"))
    attribute_id: Mapped[int] = mapped_column(
        ForeignKey("shop_category_attributes.id", ondelete="CASCADE")
    )
    value: Mapped[str] = mapped_column(String(128), default="")  # display value, e.g. "RTX 4060"
    num_value: Mapped[float | None] = mapped_column(Float, nullable=True)  # for numeric range filters

    product: Mapped["Product"] = relationship(back_populates="attributes")
    attribute: Mapped["CategoryAttribute"] = relationship("CategoryAttribute")


class ShopService(Base):
    """A priced service attached to a shop category (e.g. install, setup,
    OS reinstall). Customers add it to the cart alongside products."""

    __tablename__ = "shop_services"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("shop_categories.id", ondelete="CASCADE"))
    price: Mapped[int] = mapped_column(Integer, default=0)  # whole manat
    currency: Mapped[str] = mapped_column(String(8), default="TMT")
    icon: Mapped[str] = mapped_column(String(32), default="wrench")
    # price is a starting price ("от 250 TMT") rather than a fixed one
    price_from: Mapped[bool] = mapped_column(Boolean, default=False)
    image: Mapped[str | None] = mapped_column(String(128), nullable=True)  # card picture, media/services
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped["ShopCategory"] = relationship("ShopCategory", back_populates="services")
    translations: Mapped[list["ShopServiceTranslation"]] = relationship(
        back_populates="service", cascade="all, delete-orphan", lazy="selectin"
    )


class ShopServiceTranslation(Base):
    __tablename__ = "shop_service_translations"
    __table_args__ = (UniqueConstraint("service_id", "lang", name="uq_shopservice_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("shop_services.id", ondelete="CASCADE"))
    lang: Mapped[str] = mapped_column(String(2))
    title: Mapped[str] = mapped_column(String(256), default="")
    short: Mapped[str] = mapped_column(String(256), default="")
    body: Mapped[str] = mapped_column(Text, default="")  # service page description
    feats: Mapped[list] = mapped_column(JSON, default=list)  # "Что входит" bullet list

    service: Mapped["ShopService"] = relationship(back_populates="translations")


class ProductReview(Base):
    """A customer review; shown publicly only after admin approval."""

    __tablename__ = "shop_product_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("shop_products.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(128))
    rating: Mapped[int] = mapped_column(Integer, default=5)  # 1..5
    text: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(8), default="pending")  # pending|approved|rejected
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    product: Mapped["Product"] = relationship("Product")


def slugify(text: str) -> str:
    """ASCII url slug: lowercase, runs of anything else collapsed to "-"."""
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _brand_slug_default(ctx) -> str | None:
    # non-Latin names ("Болид") slugify to "" — leave NULL rather than clash
    return slugify(ctx.get_current_parameters().get("name") or "") or None


class ShopBrand(Base):
    """A product manufacturer; products link to it via Product.brand_id."""

    __tablename__ = "shop_brands"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64))
    slug: Mapped[str | None] = mapped_column(
        String(64), unique=True, index=True, nullable=True, default=_brand_slug_default
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class ShopSettings(Base):
    """Singleton (id=1) store contact settings shown across the shop."""

    __tablename__ = "shop_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    phone: Mapped[str] = mapped_column(String(64), default="")
    whatsapp: Mapped[str] = mapped_column(String(32), default="")
    address_ru: Mapped[str] = mapped_column(String(256), default="")
    address_tk: Mapped[str] = mapped_column(String(256), default="")
    address_en: Mapped[str] = mapped_column(String(256), default="")
    email: Mapped[str] = mapped_column(String(128), default="")
    hours_ru: Mapped[str] = mapped_column(String(128), default="")
    hours_tk: Mapped[str] = mapped_column(String(128), default="")
    hours_en: Mapped[str] = mapped_column(String(128), default="")
    # legacy flat fee, superseded by DeliveryZone; migrated into a zone on startup
    delivery_fee: Mapped[int] = mapped_column(Integer, default=0)


class PromoCode(Base):
    """A discount code applied at checkout. `kind` is percent (value = %)
    or fixed (value = TMT off). The discount is recomputed server-side."""

    __tablename__ = "shop_promo_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    kind: Mapped[str] = mapped_column(String(8), default="percent")  # percent|fixed
    value: Mapped[int] = mapped_column(Integer, default=0)
    min_total: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    max_uses: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = unlimited
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Order(Base):
    __tablename__ = "shop_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(128))
    phone: Mapped[str] = mapped_column(String(64), default="")
    address: Mapped[str] = mapped_column(Text, default="")
    payment_method: Mapped[str] = mapped_column(String(16), default="cash")  # cash|terminal
    comment: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="new")  # new|confirmed|delivered|cancelled
    # manager who took the order (called the customer or confirmed it), and when
    taken_by: Mapped[str] = mapped_column(String(64), default="")
    taken_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    total: Mapped[int] = mapped_column(Integer, default=0)
    promo_code: Mapped[str] = mapped_column(String(32), default="")
    discount: Mapped[int] = mapped_column(Integer, default=0)
    delivery: Mapped[int] = mapped_column(Integer, default=0)  # delivery fee included in total
    delivery_zone_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_delivery_zones.id", ondelete="SET NULL"), nullable=True
    )
    delivery_zone: Mapped[str] = mapped_column(String(128), default="")  # zone name snapshot (ru)
    # Online-payment slot: unpaid|pending|paid|refunded. Provider/ref are set
    # once a real gateway is wired in (see backend/app/payments/).
    payment_status: Mapped[str] = mapped_column(String(16), default="unpaid")
    payment_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    payment_ref: Mapped[str | None] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class OrderItem(Base):
    __tablename__ = "shop_order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("shop_orders.id", ondelete="CASCADE"))
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_products.id", ondelete="SET NULL"), nullable=True
    )
    service_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_services.id", ondelete="SET NULL"), nullable=True
    )
    title_snapshot: Mapped[str] = mapped_column(String(256), default="")
    price_snapshot: Mapped[int] = mapped_column(Integer, default=0)
    # purchase cost at sale time — feeds exact margin reports
    cost_snapshot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    qty: Mapped[int] = mapped_column(Integer, default=1)

    order: Mapped["Order"] = relationship(back_populates="items")


# --------------------------------------------------------------------------
# Warehouse: suppliers, purchase documents and the stock-movement ledger.
# Product.stock_qty stays the authoritative counter (orders update it with
# atomic guarded UPDATEs); every change also appends a StockMovement row in
# the same transaction, so the ledger is a full audit trail.
# --------------------------------------------------------------------------


class Supplier(Base):
    __tablename__ = "shop_suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    phone: Mapped[str] = mapped_column(String(64), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class PurchaseDoc(Base):
    """A posted incoming-goods document (приходная накладная). Immutable once
    created — corrections go through adjust/writeoff movements."""

    __tablename__ = "shop_purchases"

    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_suppliers.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str] = mapped_column(String(256), default="")
    total_cost: Mapped[int] = mapped_column(Integer, default=0)
    username: Mapped[str] = mapped_column(String(32), default="")  # who posted it
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)

    supplier: Mapped["Supplier | None"] = relationship("Supplier")
    items: Mapped[list["PurchaseItem"]] = relationship(
        back_populates="purchase", cascade="all, delete-orphan", lazy="selectin"
    )


class PurchaseItem(Base):
    __tablename__ = "shop_purchase_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_id: Mapped[int] = mapped_column(ForeignKey("shop_purchases.id", ondelete="CASCADE"))
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_products.id", ondelete="SET NULL"), nullable=True
    )
    title_snapshot: Mapped[str] = mapped_column(String(256), default="")
    qty: Mapped[int] = mapped_column(Integer, default=1)
    unit_cost: Mapped[int] = mapped_column(Integer, default=0)

    purchase: Mapped["PurchaseDoc"] = relationship(back_populates="items")


class StockMovement(Base):
    """One ledger row per stock change: who, when, how much, and why.
    kind: receipt (закупка/приход) | sale | return (отмена заказа) |
    writeoff (списание) | adjust (корректировка/инвентаризация)."""

    __tablename__ = "shop_stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("shop_products.id", ondelete="CASCADE"), index=True
    )
    qty_delta: Mapped[int] = mapped_column(Integer)  # signed: + приход / − расход
    stock_after: Mapped[int | None] = mapped_column(Integer, nullable=True)  # counter after the change
    kind: Mapped[str] = mapped_column(String(16), index=True)
    note: Mapped[str] = mapped_column(String(256), default="")
    unit_cost: Mapped[int | None] = mapped_column(Integer, nullable=True)  # receipts only
    supplier_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_suppliers.id", ondelete="SET NULL"), nullable=True
    )
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_orders.id", ondelete="SET NULL"), nullable=True
    )
    purchase_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_purchases.id", ondelete="SET NULL"), nullable=True
    )
    sale_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_sales.id", ondelete="SET NULL"), nullable=True, index=True
    )
    username: Mapped[str] = mapped_column(String(32), default="")  # "" = storefront
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)

    product: Mapped["Product"] = relationship("Product")


class Sale(Base):
    """A POS (counter) sale rung up by a seller. Separate from online Orders;
    both write `sale`/`return` rows into the StockMovement ledger. Line items
    keep catalog prices; the real amount taken is `sold_total` (discounts and
    markups live at the receipt level). A sale on credit (в долг) carries the
    debtor's name/phone until settled."""

    __tablename__ = "shop_sales"

    id: Mapped[int] = mapped_column(primary_key=True)
    seller: Mapped[str] = mapped_column(String(32), default="")  # admin username
    subtotal: Mapped[int] = mapped_column(Integer, default=0)  # Σ catalog price·qty
    sold_total: Mapped[int] = mapped_column(Integer, default=0)  # what was actually taken
    discount: Mapped[int] = mapped_column(Integer, default=0)  # subtotal − sold_total (may be < 0)
    cost_total: Mapped[int] = mapped_column(Integer, default=0)  # Σ cost_snapshot·qty
    status: Mapped[str] = mapped_column(String(8), default="paid", index=True)  # paid|debt
    payment_method: Mapped[str] = mapped_column(String(16), default="cash")  # cash|terminal|debt
    debtor_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    debtor_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)

    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale", cascade="all, delete-orphan", lazy="selectin"
    )


class SaleItem(Base):
    __tablename__ = "shop_sale_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("shop_sales.id", ondelete="CASCADE"))
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_products.id", ondelete="SET NULL"), nullable=True
    )
    title_snapshot: Mapped[str] = mapped_column(String(256), default="")
    price_snapshot: Mapped[int] = mapped_column(Integer, default=0)  # catalog price at sale time
    cost_snapshot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    qty: Mapped[int] = mapped_column(Integer, default=1)

    sale: Mapped["Sale"] = relationship(back_populates="items")


class AdminUser(Base):
    """An admin-panel account. `role` gates what the user can do:
    owner (everything, incl. user management), warehouse (stock),
    sales (orders/promos), content (products/texts/media, no prices)."""

    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    role: Mapped[str] = mapped_column(String(16), default="content")  # owner|warehouse|sales|content
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    phone: Mapped[str] = mapped_column(String(64), default="")
    email: Mapped[str] = mapped_column(String(128), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    # set when the request came from a service page ("Оставить заявку")
    service_id: Mapped[int | None] = mapped_column(
        ForeignKey("shop_services.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(8), default="new")  # new|read|done
    # manager who took the lead into work (called or changed its status), and when
    taken_by: Mapped[str] = mapped_column(String(64), default="")
    taken_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class Banner(Base):
    """Home-page hero slide."""

    __tablename__ = "shop_banners"

    id: Mapped[int] = mapped_column(primary_key=True)
    image: Mapped[str | None] = mapped_column(String(128), nullable=True)  # file in media/banners
    link: Mapped[str] = mapped_column(String(256), default="")  # site path, e.g. /catalog/builds
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    translations: Mapped[list["BannerTranslation"]] = relationship(
        back_populates="banner", cascade="all, delete-orphan", lazy="selectin"
    )


class BannerTranslation(Base):
    __tablename__ = "shop_banner_translations"
    __table_args__ = (UniqueConstraint("banner_id", "lang", name="uq_banner_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    banner_id: Mapped[int] = mapped_column(ForeignKey("shop_banners.id", ondelete="CASCADE"))
    lang: Mapped[str] = mapped_column(String(2))
    title: Mapped[str] = mapped_column(String(256), default="")
    subtitle: Mapped[str] = mapped_column(String(256), default="")

    banner: Mapped["Banner"] = relationship(back_populates="translations")


class Page(Base):
    """Static info page (About, FAQ, Delivery, Guarantee, Install…)."""

    __tablename__ = "shop_pages"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    translations: Mapped[list["PageTranslation"]] = relationship(
        back_populates="page", cascade="all, delete-orphan", lazy="selectin"
    )


class PageTranslation(Base):
    __tablename__ = "shop_page_translations"
    __table_args__ = (UniqueConstraint("page_id", "lang", name="uq_page_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    page_id: Mapped[int] = mapped_column(ForeignKey("shop_pages.id", ondelete="CASCADE"))
    lang: Mapped[str] = mapped_column(String(2))
    title: Mapped[str] = mapped_column(String(256), default="")
    lead: Mapped[str] = mapped_column(Text, default="")  # intro under the title
    # ordered sections: [{title, body}] — FAQ uses title=question, body=answer
    blocks: Mapped[list] = mapped_column(JSON, default=list)

    page: Mapped["Page"] = relationship(back_populates="translations")


class DeliveryZone(Base):
    """A delivery option chosen at checkout (Ашхабад, велаяты, самовывоз…).
    The fee drops to 0 once the goods total reaches free_from."""

    __tablename__ = "shop_delivery_zones"

    id: Mapped[int] = mapped_column(primary_key=True)
    price: Mapped[int] = mapped_column(Integer, default=0)  # TMT
    free_from: Mapped[int | None] = mapped_column(Integer, nullable=True)  # goods total for free delivery
    is_pickup: Mapped[bool] = mapped_column(Boolean, default=False)  # no address needed
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)  # used when checkout picks none
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    translations: Mapped[list["DeliveryZoneTranslation"]] = relationship(
        back_populates="zone", cascade="all, delete-orphan", lazy="selectin"
    )


class DeliveryZoneTranslation(Base):
    __tablename__ = "shop_delivery_zone_translations"
    __table_args__ = (UniqueConstraint("zone_id", "lang", name="uq_delivery_zone_lang"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    zone_id: Mapped[int] = mapped_column(ForeignKey("shop_delivery_zones.id", ondelete="CASCADE"))
    lang: Mapped[str] = mapped_column(String(2))
    name: Mapped[str] = mapped_column(String(128), default="")
    note: Mapped[str] = mapped_column(String(256), default="")  # e.g. "в день заявки или на следующий"

    zone: Mapped["DeliveryZone"] = relationship(back_populates="translations")
