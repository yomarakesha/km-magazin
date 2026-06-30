"""SQLAlchemy engine, session factory and declarative base."""
from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


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


def init_db() -> None:
    from . import models  # noqa: F401  (register models)

    Base.metadata.create_all(bind=engine)
    _migrate()
