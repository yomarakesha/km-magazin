"""Database models.

Content mirrors the TS `Content`/`Section` contract in the frontend's
`lib/content.ts`. Per-language texts that are not services live in
`ContentBlock` (one JSON blob per (key, lang)); services are normalized into
`Service` + `ServiceTranslation`, and gallery media into `Media`.
"""
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
    currency: Mapped[str] = mapped_column(String(8), default="TMT")
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True)  # in stock vs. to order
    sku: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped["ShopCategory"] = relationship(back_populates="products")
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


class Order(Base):
    __tablename__ = "shop_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(128))
    phone: Mapped[str] = mapped_column(String(64), default="")
    address: Mapped[str] = mapped_column(Text, default="")
    payment_method: Mapped[str] = mapped_column(String(16), default="cash")  # cash|terminal
    comment: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="new")  # new|confirmed|delivered|cancelled
    total: Mapped[int] = mapped_column(Integer, default=0)
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
    title_snapshot: Mapped[str] = mapped_column(String(256), default="")
    price_snapshot: Mapped[int] = mapped_column(Integer, default=0)
    qty: Mapped[int] = mapped_column(Integer, default=1)

    order: Mapped["Order"] = relationship(back_populates="items")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    phone: Mapped[str] = mapped_column(String(64), default="")
    email: Mapped[str] = mapped_column(String(128), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(8), default="new")  # new|read|done
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
