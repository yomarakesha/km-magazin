from conftest import order_payload

from app.models import Product


def test_create_order_recomputes_total(client, make_product):
    p = make_product(price=250)
    r = client.post("/api/shop/orders", json=order_payload(p["id"], qty=2))
    assert r.status_code == 201
    body = r.json()
    assert body["total"] == 500
    assert body["discount"] == 0


def test_order_lookup_requires_matching_phone(client, make_product):
    p = make_product(price=100)
    oid = client.post("/api/shop/orders", json=order_payload(p["id"])).json()["id"]

    ok = client.get(f"/api/shop/orders/{oid}", params={"phone": "99365123456"})
    assert ok.status_code == 200
    assert ok.json()["status"] == "new"
    assert ok.json()["payment_status"] == "unpaid"
    # each line carries the product slug so the client can offer a re-order
    assert ok.json()["items"][0]["slug"] == p["slug"]

    assert client.get(f"/api/shop/orders/{oid}", params={"phone": "12345"}).status_code == 404
    assert client.get(f"/api/shop/orders/{oid}").status_code == 404  # no phone at all


def test_disabled_product_rejected_with_structured_409(client, make_product):
    p = make_product(enabled=False)
    r = client.post("/api/shop/orders", json=order_payload(p["id"]))
    assert r.status_code == 409
    detail = r.json()["detail"]
    assert detail["code"] == "cart_invalid"
    assert detail["problems"] == [{"kind": "product", "id": p["id"], "reason": "unavailable"}]


def test_stock_decrements_on_order(client, db, make_product):
    p = make_product(stock_qty=5)
    r = client.post("/api/shop/orders", json=order_payload(p["id"], qty=2))
    assert r.status_code == 201
    db.expire_all()
    assert db.get(Product, p["id"]).stock_qty == 3


def test_oversell_rejected(client, db, make_product):
    p = make_product(stock_qty=1)
    r = client.post("/api/shop/orders", json=order_payload(p["id"], qty=2))
    assert r.status_code == 409
    db.expire_all()
    assert db.get(Product, p["id"]).stock_qty == 1  # nothing was taken


def test_untracked_stock_stays_null(client, db, make_product):
    p = make_product(stock_qty=None)
    assert client.post("/api/shop/orders", json=order_payload(p["id"], qty=3)).status_code == 201
    db.expire_all()
    assert db.get(Product, p["id"]).stock_qty is None


def test_service_line_in_order(client, make_service):
    s = make_service(price=75)
    payload = order_payload(0)
    payload["items"] = [{"kind": "service", "id": s["id"], "qty": 2}]
    r = client.post("/api/shop/orders", json=payload)
    assert r.status_code == 201
    assert r.json()["total"] == 150


def test_cart_validate_flags_dead_lines(client, make_product):
    live = make_product(price=100)
    dead = make_product(enabled=False)
    r = client.post("/api/shop/cart/validate", json={"items": [
        {"kind": "product", "id": live["id"], "qty": 1},
        {"kind": "product", "id": dead["id"], "qty": 1},
    ]})
    assert r.status_code == 200
    by_id = {it["id"]: it for it in r.json()["items"]}
    assert by_id[live["id"]]["ok"] is True
    assert by_id[live["id"]]["price"] == 100
    assert by_id[dead["id"]]["ok"] is False
    assert by_id[dead["id"]]["price"] is None
