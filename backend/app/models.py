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


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    phone: Mapped[str] = mapped_column(String(64), default="")
    email: Mapped[str] = mapped_column(String(128), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(8), default="new")  # new|read|done
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
