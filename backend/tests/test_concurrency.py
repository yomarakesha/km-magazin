"""The race the atomic stock/promo UPDATEs exist to prevent: two checkouts
fighting over the last unit / the last promo use must never both win."""
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from conftest import order_payload

from app.main import app as fastapi_app


def _post_order(payload: dict) -> int:
    # a client per thread: keeps transport state isolated
    with TestClient(fastapi_app) as c:
        return c.post("/api/shop/orders", json=payload).status_code


def test_two_orders_for_last_unit_one_wins(make_product):
    p = make_product(stock_qty=1)
    payload = order_payload(p["id"], qty=1)
    with ThreadPoolExecutor(max_workers=2) as pool:
        codes = list(pool.map(_post_order, [payload, payload]))
    assert sorted(codes) == [201, 409]


def test_capped_promo_claimed_once_under_concurrency(make_product, make_promo):
    p = make_product(price=1000, stock_qty=None)
    promo = make_promo(kind="percent", value=10, max_uses=1)
    payload = order_payload(p["id"], promo_code=promo["code"])

    def post(payload: dict) -> int:
        with TestClient(fastapi_app) as c:
            r = c.post("/api/shop/orders", json=payload)
            assert r.status_code == 201
            return r.json()["discount"]

    with ThreadPoolExecutor(max_workers=2) as pool:
        discounts = sorted(pool.map(post, [payload, payload]))
    # exactly one order got the discount; both were accepted
    assert discounts == [0, 100]
