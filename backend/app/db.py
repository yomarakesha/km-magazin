"""SQLAlchemy engine, session factory and declarative base."""
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

if DATABASE_URL.startswith("sqlite"):
    from sqlalchemy import event

    @event.listens_for(engine, "connect")
    def _sqlite_pragmas(dbapi_conn, _record) -> None:
        # Wait for a writer lock instead of failing immediately — concurrent
        # order creation serializes cleanly instead of raising "database is locked".
        dbapi_conn.execute("PRAGMA busy_timeout=5000")


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate() -> None:
    """Lightweight idempotent migrations for SQLite (no Alembic). Adds columns
    that `create_all` can't add to an already-existing table."""
    insp = inspect(engine)
    if "shop_categories" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("shop_categories")}
        if "parent_id" not in cols:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE shop_categories ADD COLUMN parent_id INTEGER "
                    "REFERENCES shop_categories(id)"
                ))
    if "shop_order_items" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("shop_order_items")}
        if "service_id" not in cols:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE shop_order_items ADD COLUMN service_id INTEGER "
                    "REFERENCES shop_services(id)"
                ))
    if "shop_products" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("shop_products")}
        with engine.begin() as conn:
            if "old_price" not in cols:
                conn.execute(text("ALTER TABLE shop_products ADD COLUMN old_price INTEGER"))
            if "stock_qty" not in cols:
                conn.execute(text("ALTER TABLE shop_products ADD COLUMN stock_qty INTEGER"))
            if "updated_at" not in cols:
                conn.execute(text("ALTER TABLE shop_products ADD COLUMN updated_at DATETIME"))
    if "shop_orders" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("shop_orders")}
        with engine.begin() as conn:
            if "promo_code" not in cols:
                conn.execute(text(
                    "ALTER TABLE shop_orders ADD COLUMN promo_code VARCHAR(32) NOT NULL DEFAULT ''"
                ))
            if "discount" not in cols:
                conn.execute(text(
                    "ALTER TABLE shop_orders ADD COLUMN discount INTEGER NOT NULL DEFAULT 0"
                ))
            if "payment_status" not in cols:
                conn.execute(text(
                    "ALTER TABLE shop_orders ADD COLUMN payment_status VARCHAR(16) "
                    "NOT NULL DEFAULT 'unpaid'"
                ))
            if "payment_provider" not in cols:
                conn.execute(text("ALTER TABLE shop_orders ADD COLUMN payment_provider VARCHAR(32)"))
            if "payment_ref" not in cols:
                conn.execute(text("ALTER TABLE shop_orders ADD COLUMN payment_ref VARCHAR(128)"))
    if "shop_promo_codes" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("shop_promo_codes")}
        if "max_uses" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE shop_promo_codes ADD COLUMN max_uses INTEGER"))


def init_db() -> None:
    from . import models  # noqa: F401  (register models)

    Base.metadata.create_all(bind=engine)
    _migrate()
