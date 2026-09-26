"""Test bootstrap.

The app reads config at import time (fail-closed: it refuses to start without
ADMIN_PASSWORD/SECRET_KEY), so the test environment must be in os.environ
BEFORE anything under `app.` is imported. load_dotenv() does not override
existing variables, so these values win over backend/.env.
"""
import os
import sys
import tempfile
import uuid
from pathlib import Path

_TMP = tempfile.mkdtemp(prefix="km-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP}/test.db"
os.environ["MEDIA_DIR"] = f"{_TMP}/media"  # uploads never touch backend/media
os.environ["ADMIN_PASSWORD"] = "test-password"
os.environ["SECRET_KEY"] = "test-secret-key-0123456789abcdef-0123456789abcdef"
os.environ["PROMOS_ENABLED"] = "1"         # promo tests exercise the feature; one test turns it off
os.environ["REVALIDATE_SECRET"] = ""      # no frontend cache pings from tests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # backend/ on path

import pytest
from fastapi.testclient import TestClient

import app.ratelimit as ratelimit
from app.db import SessionLocal, init_db
from app.main import app as fastapi_app
from app.models import Product, ProductTranslation, PromoCode, ShopCategory, ShopService

init_db()


@pytest.fixture()
def client() -> TestClient:
    return TestClient(fastapi_app)


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """TestClient requests all share one client IP, so buckets fill across
    tests; clear them so each test starts with a clean window."""
    ratelimit._hits.clear()
    yield
    ratelimit._hits.clear()


@pytest.fixture()
def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


def _slug(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


@pytest.fixture()
def make_product(db):
    """Create a product (with its own category) and return it detached-safe:
    (id, slug, price)."""

    def factory(price: int = 100, stock_qty: int | None = None, enabled: bool = True,
                cost_price: int | None = None, barcode: str | None = None):
        cat = ShopCategory(slug=_slug("cat"))
        db.add(cat)
        db.flush()
        p = Product(
            slug=_slug("prod"), category_id=cat.id, price=price,
            stock_qty=stock_qty, enabled=enabled,
            cost_price=cost_price, barcode=barcode,
        )
        p.translations.append(ProductTranslation(lang="ru", title="Тестовый товар"))
        db.add(p)
        db.commit()
        return {"id": p.id, "slug": p.slug, "price": p.price}

    return factory


@pytest.fixture()
def make_service(db):
    def factory(price: int = 50, enabled: bool = True):
        cat = ShopCategory(slug=_slug("cat"))
        db.add(cat)
        db.flush()
        s = ShopService(slug=_slug("svc"), category_id=cat.id, price=price, enabled=enabled)
        db.add(s)
        db.commit()
        return {"id": s.id, "slug": s.slug, "price": s.price}

    return factory


@pytest.fixture()
def make_promo(db):
    def factory(code: str | None = None, kind: str = "percent", value: int = 10,
                min_total: int = 0, max_uses: int | None = None, active: bool = True):
        promo = PromoCode(
            code=code or _slug("PROMO").upper(), kind=kind, value=value,
            min_total=min_total, max_uses=max_uses, active=active,
        )
        db.add(promo)
        db.commit()
        return {"id": promo.id, "code": promo.code}

    return factory


def order_payload(product_id: int, qty: int = 1, **over) -> dict:
    base = {
        "customer_name": "Test",
        "phone": "+993 65 123456",
        "items": [{"kind": "product", "id": product_id, "qty": qty}],
    }
    base.update(over)
    return base
