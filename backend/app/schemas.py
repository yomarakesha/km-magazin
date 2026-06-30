"""Pydantic request/response schemas for the admin and public API."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Lang = Literal["ru", "tk", "en"]


# ---- Auth ----
class LoginIn(BaseModel):
    password: str


# ---- Leads ----
class LeadIn(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    phone: str = Field(default="", max_length=64)
    email: str = Field(default="", max_length=128)
    message: str = Field(default="", max_length=4000)


class LeadStatusIn(BaseModel):
    status: Literal["new", "read", "done"]


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    email: str
    message: str
    status: str
    created_at: datetime


# ---- Content blocks ----
class ContentBlockIn(BaseModel):
    data: dict


# ---- Services ----
class ServiceTranslationIn(BaseModel):
    lang: Lang
    code: str = ""
    short: str = ""
    title: str = ""
    body: str = ""
    feats: list[str] = Field(default_factory=list)


class ServiceIn(BaseModel):
    slug: str = Field(min_length=1, max_length=64)
    icon: str = "code"
    enabled: bool = True
    translations: list[ServiceTranslationIn] = Field(default_factory=list)


class ServiceUpdateIn(BaseModel):
    slug: str | None = None
    icon: str | None = None
    enabled: bool | None = None
    translations: list[ServiceTranslationIn] | None = None


class ReorderIn(BaseModel):
    ids: list[int]


# ---- Media ----
class MediaUpdateIn(BaseModel):
    still: bool | None = None
    caption_kind: Literal["photo", "vms", "chapar"] | None = None


# ---- Shop: categories ----
class CategoryTranslationIn(BaseModel):
    lang: Lang
    name: str = ""


class CategoryIn(BaseModel):
    slug: str = Field(min_length=1, max_length=64)
    enabled: bool = True
    parent_id: int | None = None
    translations: list[CategoryTranslationIn] = Field(default_factory=list)


class CategoryUpdateIn(BaseModel):
    slug: str | None = None
    enabled: bool | None = None
    # NOTE: present-with-null means "clear parent". The admin form always sends
    # this field on save, so a missing key (unset) is treated as "no change".
    parent_id: int | None = None
    translations: list[CategoryTranslationIn] | None = None


# ---- Shop: category attributes (filter facets) ----
class AttributeTranslationIn(BaseModel):
    lang: Lang
    label: str = ""


class CategoryAttributeIn(BaseModel):
    key: str = Field(min_length=1, max_length=32)
    type: Literal["select", "number"] = "select"
    unit: str = ""
    filterable: bool = True
    translations: list[AttributeTranslationIn] = Field(default_factory=list)


class CategoryAttributeUpdateIn(BaseModel):
    key: str | None = None
    type: Literal["select", "number"] | None = None
    unit: str | None = None
    filterable: bool | None = None
    translations: list[AttributeTranslationIn] | None = None


# ---- Shop: products ----
class ProductTranslationIn(BaseModel):
    lang: Lang
    title: str = ""
    short: str = ""
    body: str = ""
    specs: list[dict] = Field(default_factory=list)


class ProductAttributeIn(BaseModel):
    attribute_id: int
    value: str = ""
    num_value: float | None = None


class ProductIn(BaseModel):
    slug: str = Field(min_length=1, max_length=64)
    category_id: int
    price: int = 0
    currency: str = "TMT"
    in_stock: bool = True
    sku: str = ""
    enabled: bool = True
    translations: list[ProductTranslationIn] = Field(default_factory=list)
    attributes: list[ProductAttributeIn] = Field(default_factory=list)


class ProductUpdateIn(BaseModel):
    slug: str | None = None
    category_id: int | None = None
    price: int | None = None
    currency: str | None = None
    in_stock: bool | None = None
    sku: str | None = None
    enabled: bool | None = None
    translations: list[ProductTranslationIn] | None = None
    attributes: list[ProductAttributeIn] | None = None


# ---- Shop: orders ----
class OrderItemIn(BaseModel):
    product_id: int
    qty: int = Field(default=1, ge=1, le=999)


class OrderIn(BaseModel):
    customer_name: str = Field(min_length=1, max_length=128)
    phone: str = Field(min_length=1, max_length=64)
    address: str = Field(default="", max_length=512)
    payment_method: Literal["cash", "terminal"] = "cash"
    comment: str = Field(default="", max_length=2000)
    items: list[OrderItemIn] = Field(min_length=1)


class OrderStatusIn(BaseModel):
    status: Literal["new", "confirmed", "delivered", "cancelled"]
