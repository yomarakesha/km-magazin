"""Warehouse: ledger movements, manual ops, suppliers, purchase docs,
and the automatic sale/return rows written by order flows."""
from conftest import order_payload

from app.models import Product, StockMovement


def _login(client):
    assert client.post("/api/auth/login", json={"password": "test-password"}).status_code == 200


def _movements(db, product_id):
    return (
        db.query(StockMovement)
        .filter(StockMovement.product_id == product_id)
        .order_by(StockMovement.id)
        .all()
    )


# ---- manual movements ----

def test_receipt_increases_stock_and_logs(client, db, make_product):
    p = make_product(stock_qty=3)
    _login(client)
    r = client.post(
        "/api/admin/warehouse/movements",
        json={"product_id": p["id"], "kind": "receipt", "qty": 7, "unit_cost": 80},
    )
    assert r.status_code == 201
    assert r.json()["stock_qty"] == 10
    assert r.json()["cost_price"] == 80
    m = _movements(db, p["id"])[-1]
    assert (m.kind, m.qty_delta, m.stock_after, m.unit_cost) == ("receipt", 7, 10, 80)
    assert m.username == "admin"


def test_receipt_enables_tracking_on_untracked(client, make_product):
    p = make_product(stock_qty=None)
    _login(client)
    r = client.post(
        "/api/admin/warehouse/movements",
        json={"product_id": p["id"], "kind": "receipt", "qty": 4},
    )
    assert r.json()["stock_qty"] == 4


def test_writeoff_guards_against_negative(client, db, make_product):
    p = make_product(stock_qty=2)
    _login(client)
    r = client.post(
        "/api/admin/warehouse/movements",
        json={"product_id": p["id"], "kind": "writeoff", "qty": 5},
    )
    assert r.status_code == 409
    db.expire_all()
    assert db.get(Product, p["id"]).stock_qty == 2  # untouched


def test_adjust_sets_absolute_qty(client, db, make_product):
    p = make_product(stock_qty=10)
    _login(client)
    r = client.post(
        "/api/admin/warehouse/movements",
        json={"product_id": p["id"], "kind": "adjust", "new_qty": 6, "note": "инвентаризация"},
    )
    assert r.json()["stock_qty"] == 6
    m = _movements(db, p["id"])[-1]
    assert (m.kind, m.qty_delta, m.stock_after) == ("adjust", -4, 6)


def test_movement_requires_qty_for_kind(client, make_product):
    p = make_product(stock_qty=1)
    _login(client)
    assert client.post(
        "/api/admin/warehouse/movements", json={"product_id": p["id"], "kind": "receipt"}
    ).status_code == 422


# ---- order flow writes the ledger ----

def test_order_writes_sale_movement(client, db, make_product):
    p = make_product(price=100, stock_qty=5)
    r = client.post("/api/shop/orders", json=order_payload(p["id"], qty=2))
    assert r.status_code == 201
    m = _movements(db, p["id"])[-1]
    assert (m.kind, m.qty_delta, m.stock_after, m.order_id) == ("sale", -2, 3, r.json()["id"])
    assert m.username == ""  # storefront


def test_untracked_product_gets_no_sale_movement(client, db, make_product):
    p = make_product(price=100, stock_qty=None)
    client.post("/api/shop/orders", json=order_payload(p["id"]))
    assert _movements(db, p["id"]) == []


def test_cancel_writes_return_movement(client, db, make_product):
    p = make_product(price=100, stock_qty=5)
    oid = client.post("/api/shop/orders", json=order_payload(p["id"], qty=2)).json()["id"]
    _login(client)
    client.patch(f"/api/admin/shop/orders/{oid}", json={"status": "cancelled"})
    m = _movements(db, p["id"])[-1]
    assert (m.kind, m.qty_delta, m.stock_after) == ("return", 2, 5)
    assert m.username == "admin"


def test_order_snapshots_cost(client, db, make_product):
    p = make_product(price=100, stock_qty=5)
    _login(client)
    client.post(
        "/api/admin/warehouse/movements",
        json={"product_id": p["id"], "kind": "receipt", "qty": 1, "unit_cost": 60},
    )
    r = client.post("/api/shop/orders", json=order_payload(p["id"]))
    db.expire_all()
    from app.models import Order
    order = db.get(Order, r.json()["id"])
    assert order.items[0].cost_snapshot == 60


# ---- purchases ----

def test_purchase_doc_applies_items(client, db, make_product):
    p1 = make_product(stock_qty=1)
    p2 = make_product(stock_qty=None)
    _login(client)
    sup = client.post("/api/admin/warehouse/suppliers", json={"name": "ACME"}).json()
    r = client.post(
        "/api/admin/warehouse/purchases",
        json={
            "supplier_id": sup["id"],
            "note": "первая партия",
            "items": [
                {"product_id": p1["id"], "qty": 9, "unit_cost": 70},
                {"product_id": p2["id"], "qty": 3, "unit_cost": 40},
            ],
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["total_cost"] == 9 * 70 + 3 * 40
    db.expire_all()
    assert db.get(Product, p1["id"]).stock_qty == 10
    assert db.get(Product, p1["id"]).cost_price == 70
    assert db.get(Product, p2["id"]).stock_qty == 3
    m = _movements(db, p1["id"])[-1]
    assert (m.kind, m.qty_delta, m.purchase_id, m.supplier_id) == ("receipt", 9, body["id"], sup["id"])


def test_purchase_requires_items(client):
    _login(client)
    r = client.post("/api/admin/warehouse/purchases", json={"items": []})
    assert r.status_code == 422


# ---- roles ----

def test_sales_reads_stock_but_cannot_write(client, make_product):
    import uuid
    p = make_product(stock_qty=1)
    _login(client)
    username = f"u{uuid.uuid4().hex[:10]}"
    assert client.post(
        "/api/admin/users",
        json={"username": username, "password": "secret-pass-1", "role": "sales"},
    ).status_code == 201
    client.post("/api/auth/logout")
    assert client.post(
        "/api/auth/login", json={"username": username, "password": "secret-pass-1"}
    ).status_code == 200
    assert client.get("/api/admin/warehouse/stock").status_code == 200
    r = client.post(
        "/api/admin/warehouse/movements",
        json={"product_id": p["id"], "kind": "receipt", "qty": 1},
    )
    assert r.status_code == 403


def test_content_cannot_see_warehouse(client):
    import uuid
    _login(client)
    username = f"u{uuid.uuid4().hex[:10]}"
    client.post(
        "/api/admin/users",
        json={"username": username, "password": "secret-pass-1", "role": "content"},
    )
    client.post("/api/auth/logout")
    client.post("/api/auth/login", json={"username": username, "password": "secret-pass-1"})
    assert client.get("/api/admin/warehouse/stock").status_code == 403


def test_product_stock_edit_logs_adjust(client, db, make_product):
    p = make_product(stock_qty=5)
    _login(client)
    r = client.put(f"/api/admin/shop/products/{p['id']}", json={"stock_qty": 12})
    assert r.status_code == 200
    m = _movements(db, p["id"])[-1]
    assert (m.kind, m.qty_delta, m.stock_after) == ("adjust", 7, 12)
    assert m.note == "правка в карточке товара"
