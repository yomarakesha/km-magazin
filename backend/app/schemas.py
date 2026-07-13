"""Pydantic request/response schemas for the admin and public API."""
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Lang = Literal["ru", "tk", "en"]


# ---- Auth ----
class LoginIn(BaseModel):
    # username defaults to the seeded root account so the old
    # {"password": "..."} body keeps working.
    username: str = Field(default="admin", min_length=1, max_length=32)
    password: str


AdminRole = Literal["owner", "warehouse", "sales", "content"]


class AdminUserIn(BaseModel):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=128)
    role: AdminRole = "content"


class AdminUserUpdateIn(BaseModel):
    password: str | None = Field(default=None, min_length=8, max_length=128)
    role: AdminRole | None = None
    active: bool | None = None


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
    old_price: int | None = None
    currency: str = "TMT"
    in_stock: bool = True
    stock_qty: int | None = Field(default=None, ge=0)
    sku: str = ""
    enabled: bool = True
    translations: list[ProductTranslationIn] = Field(default_factory=list)
    attributes: list[ProductAttributeIn] = Field(default_factory=list)


class ProductUpdateIn(BaseModel):
    slug: str | None = None
    category_id: int | None = None
    price: int | None = None
    # present-with-null clears the old price; the admin form always sends it
    old_price: int | None = None
    currency: str | None = None
    in_stock: bool | None = None
    # present-with-null disables stock tracking
    stock_qty: int | None = Field(default=None, ge=0)
    sku: str | None = None
    enabled: bool | None = None
    translations: list[ProductTranslationIn] | None = None
    attributes: list[ProductAttributeIn] | None = None


# ---- Shop: category services ----
class ShopServiceTranslationIn(BaseModel):
    lang: Lang
    title: str = ""
    short: str = ""


class ShopServiceIn(BaseModel):
    slug: str = Field(min_length=1, max_length=64)
    price: int = 0
    currency: str = "TMT"
    icon: str = "wrench"
    enabled: bool = True
    translations: list[ShopServiceTranslationIn] = Field(default_factory=list)


class ShopServiceUpdateIn(BaseModel):
    slug: str | None = None
    price: int | None = None
    currency: str | None = None
    icon: str | None = None
    enabled: bool | None = None
    translations: list[ShopServiceTranslationIn] | None = None


# ---- Shop: product reviews ----
class ReviewIn(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    rating: int = Field(default=5, ge=1, le=5)
    text: str = Field(default="", max_length=2000)


class ReviewStatusIn(BaseModel):
    status: Literal["pending", "approved", "rejected"]


# ---- Shop: brands ----
class ShopBrandIn(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    enabled: bool = True


class ShopBrandUpdateIn(BaseModel):
    name: str | None = None
    enabled: bool | None = None


# ---- Shop: settings (contacts singleton) ----
class ShopSettingsIn(BaseModel):
    phone: str = Field(default="", max_length=64)
    whatsapp: str = Field(default="", max_length=32)
    address_ru: str = Field(default="", max_length=256)
    address_tk: str = Field(default="", max_length=256)
    address_en: str = Field(default="", max_length=256)


# ---- Shop: orders ----
class OrderItemIn(BaseModel):
    # kind distinguishes a product line from a category-service line; a missing
    # kind is treated as "product" for backward compatibility.
    kind: Literal["product", "service"] = "product"
    id: int | None = None
    product_id: int | None = None  # legacy alias for kind="product"
    qty: int = Field(default=1, ge=1, le=999)

    def ref_id(self) -> int | None:
        return self.id if self.id is not None else self.product_id


class OrderIn(BaseModel):
    customer_name: str = Field(min_length=1, max_length=128)
    phone: str = Field(min_length=1, max_length=64)
    address: str = Field(default="", max_length=512)
    payment_method: Literal["cash", "terminal"] = "cash"
    comment: str = Field(default="", max_length=2000)
    promo_code: str = Field(default="", max_length=32)
    items: list[OrderItemIn] = Field(min_length=1)


class CartItemRef(BaseModel):
    kind: Literal["product", "service"] = "product"
    id: int
    qty: int = Field(default=1, ge=1, le=999)


class CartValidateIn(BaseModel):
    items: list[CartItemRef] = Field(min_length=1, max_length=100)


class OrderStatusIn(BaseModel):
    status: Literal["new", "confirmed", "delivered", "cancelled"]


class OrderPaymentIn(BaseModel):
    payment_status: Literal["unpaid", "pending", "paid", "refunded"]


# ---- Shop: promo codes ----
class PromoCodeIn(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    kind: Literal["percent", "fixed"] = "percent"
    value: int = Field(ge=1)
    min_total: int = Field(default=0, ge=0)
    active: bool = True
    expires_at: str | None = None  # "YYYY-MM-DD" or null = no expiry
    max_uses: int | None = Field(default=None, ge=1)  # None = unlimited

    @model_validator(mode="after")
    def _percent_cap(self):
        if self.kind == "percent" and self.value > 100:
            raise ValueError("percent discount cannot exceed 100")
        return self


class PromoCodeUpdateIn(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=32)
    kind: Literal["percent", "fixed"] | None = None
    value: int | None = Field(default=None, ge=1)
    min_total: int | None = Field(default=None, ge=0)
    active: bool | None = None
    expires_at: str | None = None
    # present-with-null clears the cap; missing key = no change
    max_uses: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def _percent_cap(self):
        # Only enforce when both are supplied in the same patch; a partial
        # update that changes just one is validated against the stored row
        # in the router.
        if self.kind == "percent" and self.value is not None and self.value > 100:
            raise ValueError("percent discount cannot exceed 100")
        return self


class PromoCheckIn(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    subtotal: int = Field(ge=0)


# ---- Warehouse ----
class SupplierIn(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    phone: str = Field(default="", max_length=64)
    note: str = Field(default="", max_length=2000)


class SupplierUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    phone: str | None = Field(default=None, max_length=64)
    note: str | None = Field(default=None, max_length=2000)
    active: bool | None = None


class MovementIn(BaseModel):
    """Manual stock operation. receipt/writeoff take a positive qty;
    adjust takes the absolute new_qty (инвентаризация)."""

    product_id: int
    kind: Literal["receipt", "writeoff", "adjust"]
    qty: int | None = Field(default=None, ge=1)        # receipt | writeoff
    new_qty: int | None = Field(default=None, ge=0)    # adjust
    note: str = Field(default="", max_length=256)
    unit_cost: int | None = Field(default=None, ge=0)  # receipt only
    supplier_id: int | None = None

    @model_validator(mode="after")
    def _qty_matches_kind(self) -> "MovementIn":
        if self.kind == "adjust":
            if self.new_qty is None:
                raise ValueError("adjust requires new_qty")
        elif self.qty is None:
            raise ValueError(f"{self.kind} requires qty")
        return self


class PurchaseItemIn(BaseModel):
    product_id: int
    qty: int = Field(ge=1)
    unit_cost: int = Field(ge=0)


class PurchaseIn(BaseModel):
    supplier_id: int | None = None
    note: str = Field(default="", max_length=256)
    items: list[PurchaseItemIn] = Field(min_length=1)
