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
