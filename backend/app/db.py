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
            if "cost_price" not in cols:
                conn.execute(text("ALTER TABLE shop_products ADD COLUMN cost_price INTEGER"))
            if "barcode" not in cols:
                conn.execute(text("ALTER TABLE shop_products ADD COLUMN barcode VARCHAR(64)"))
            if "brand_id" not in cols:
                conn.execute(text(
                    "ALTER TABLE shop_products ADD COLUMN brand_id INTEGER REFERENCES shop_brands(id)"
                ))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_shop_products_brand_id ON shop_products(brand_id)"
                ))
            if "is_new" not in cols:
                conn.execute(text(
                    "ALTER TABLE shop_products ADD COLUMN is_new BOOLEAN NOT NULL DEFAULT 0"
                ))
        # DB-level uniqueness is the backstop for the app-level check, which has
        # a TOCTOU race (two PUTs both pass the SELECT before either INSERTs).
        # Partial index so the many products without a barcode (NULL) don't clash.
        with engine.begin() as conn:
            try:
                conn.execute(text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ux_shop_products_barcode "
                    "ON shop_products(barcode) WHERE barcode IS NOT NULL"
                ))
            except Exception:
                # pre-existing duplicates in a live DB would block the index;
                # leave it off and rely on the app-level 409 until deduped.
                import logging
                logging.getLogger(__name__).warning(
                    "barcode unique index skipped — resolve duplicates first"
                )
    if "shop_order_items" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("shop_order_items")}
        if "cost_snapshot" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE shop_order_items ADD COLUMN cost_snapshot INTEGER"))
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
    if "shop_brands" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("shop_brands")}
        if "slug" not in cols:
            from .models import slugify

            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE shop_brands ADD COLUMN slug VARCHAR(64)"))
                # backfill from the name; a clash (e.g. "HP" vs "hp") gets the id appended
                seen: set[str] = set()
                for bid, name in conn.execute(text("SELECT id, name FROM shop_brands ORDER BY id")).all():
                    slug = slugify(name) or f"brand-{bid}"
                    if slug in seen:
                        slug = f"{slug}-{bid}"
                    seen.add(slug)
                    conn.execute(text("UPDATE shop_brands SET slug = :s WHERE id = :i"), {"s": slug, "i": bid})
                conn.execute(text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_shop_brands_slug ON shop_brands(slug)"
                ))
    if "shop_settings" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("shop_settings")}
        with engine.begin() as conn:
            for col, size in (("email", 128), ("hours_ru", 128), ("hours_tk", 128), ("hours_en", 128)):
                if col not in cols:
                    conn.execute(text(
                        f"ALTER TABLE shop_settings ADD COLUMN {col} VARCHAR({size}) NOT NULL DEFAULT ''"
                    ))
    if "shop_stock_movements" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("shop_stock_movements")}
        if "sale_id" not in cols:
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE shop_stock_movements ADD COLUMN sale_id INTEGER "
                    "REFERENCES shop_sales(id)"
                ))


def _seed_owner() -> None:
    """First start after the users table appears: create the root `admin`
    account from ADMIN_PASSWORD so the existing login keeps working."""
    from .config import ADMIN_PASSWORD
    from .models import AdminUser
    from .security import hash_password

    with SessionLocal() as db:
        if db.query(AdminUser).count() == 0:
            db.add(AdminUser(username="admin", password_hash=hash_password(ADMIN_PASSWORD), role="owner"))
            db.commit()


def _seed_ledger_opening() -> None:
    """First start with the ledger table: write an opening-balance row per
    tracked product so SUM(movements) == stock_qty holds from day one."""
    from .models import Product, StockMovement

    with SessionLocal() as db:
        if db.query(StockMovement).count() > 0:
            return
        tracked = db.query(Product).filter(Product.stock_qty.is_not(None)).all()
        for p in tracked:
            db.add(StockMovement(
                product_id=p.id, qty_delta=p.stock_qty, stock_after=p.stock_qty,
                kind="adjust", note="начальный остаток", username="system",
            ))
        if tracked:
            db.commit()


def init_db() -> None:
    from . import models  # noqa: F401  (register models)

    Base.metadata.create_all(bind=engine)
    _migrate()
    _seed_owner()
    _seed_ledger_opening()
