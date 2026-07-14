"""POS (касса): model, sale posting with stock decrement + ledger, debts,
settle/void, barcode lookup.

Shared test DB across tests — assertions are product-scoped or delta-based.
"""
import uuid


def _login(client, username="admin", password="test-password"):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text


# ---- model ----

def test_sale_model_roundtrip(db, make_product):
    from app.models import Sale, SaleItem

    p = make_product(price=100)
    s = Sale(seller="admin", subtotal=100, sold_total=90, discount=10,
             cost_total=0, status="paid", payment_method="cash")
    s.items.append(SaleItem(product_id=p["id"], title_snapshot="x",
                            price_snapshot=100, cost_snapshot=None, qty=1))
    db.add(s)
    db.commit()
    db.refresh(s)
    assert s.id and s.items[0].qty == 1


# ---- posting a sale ----

def test_sale_decrements_stock_and_writes_ledger(client, db, make_product):
    from app.models import StockMovement

    p = make_product(price=100, stock_qty=10)
    _login(client)
    r = client.post("/api/admin/pos/sales", json={
        "items": [{"product_id": p["id"], "qty": 3}], "payment_method": "cash"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["subtotal"] == 300 and body["sold_total"] == 300 and body["discount"] == 0
    assert body["status"] == "paid"
    got = client.get(f"/api/admin/shop/products/{p['id']}").json()
    assert got["stock_qty"] == 7
    move = (db.query(StockMovement)
            .filter(StockMovement.product_id == p["id"], StockMovement.kind == "sale")
            .one())
    assert move.qty_delta == -3 and move.sale_id == body["id"] and move.stock_after == 7


def test_sale_discount_and_cost(client, make_product):
    p = make_product(price=100, stock_qty=5, cost_price=60)
    _login(client)
    r = client.post("/api/admin/pos/sales", json={
        "items": [{"product_id": p["id"], "qty": 2}], "sold_total": 150,
        "payment_method": "cash"})
    assert r.status_code == 201, r.text
    b = r.json()
    assert b["subtotal"] == 200 and b["sold_total"] == 150 and b["discount"] == 50
    assert b["cost_total"] == 120


def test_debt_requires_debtor(client, make_product):
    p = make_product(stock_qty=3)
    _login(client)
    bad = client.post("/api/admin/pos/sales", json={
        "items": [{"product_id": p["id"], "qty": 1}], "payment_method": "debt"})
    assert bad.status_code == 422
    ok = client.post("/api/admin/pos/sales", json={
        "items": [{"product_id": p["id"], "qty": 1}], "payment_method": "debt",
        "debtor_name": "Мурад", "debtor_phone": "+993 65 000000"})
    assert ok.status_code == 201, ok.text
    assert ok.json()["status"] == "debt"


def test_insufficient_stock_409(client, make_product):
    p = make_product(stock_qty=1)
    _login(client)
    r = client.post("/api/admin/pos/sales", json={
        "items": [{"product_id": p["id"], "qty": 5}], "payment_method": "cash"})
    assert r.status_code == 409
    # rollback: counter untouched
    assert client.get(f"/api/admin/shop/products/{p['id']}").json()["stock_qty"] == 1


def test_untracked_sells_without_ledger(client, db, make_product):
    from app.models import StockMovement

    p = make_product(stock_qty=None)
    _login(client)
    r = client.post("/api/admin/pos/sales", json={
        "items": [{"product_id": p["id"], "qty": 2}], "payment_method": "cash"})
    assert r.status_code == 201, r.text
    assert db.query(StockMovement).filter(StockMovement.product_id == p["id"]).count() == 0


# ---- lookup ----

def test_lookup_by_barcode_sku_title(client, make_product):
    code = f"BC{uuid.uuid4().hex[:10]}"
    p = make_product(price=42, stock_qty=5, barcode=code)
    _login(client)
    r = client.get(f"/api/admin/pos/lookup?code={code}")
    assert r.status_code == 200 and r.json()["id"] == p["id"]
    missing = client.get("/api/admin/pos/lookup?code=no-such-code-xyz")
    assert missing.status_code == 404


# ---- settle / void ----

def test_settle_debt(client, make_product):
    p = make_product(stock_qty=5)
    _login(client)
    sid = client.post("/api/admin/pos/sales", json={
        "items": [{"product_id": p["id"], "qty": 1}], "payment_method": "debt",
        "debtor_name": "A", "debtor_phone": "+1"}).json()["id"]
    r = client.post(f"/api/admin/pos/sales/{sid}/settle")
    assert r.status_code == 200 and r.json()["status"] == "paid"
    assert r.json()["settled_at"] is not None
    assert client.post(f"/api/admin/pos/sales/{sid}/settle").status_code == 409


def test_void_returns_stock_owner_only(client, make_product):
    p = make_product(stock_qty=5)
    _login(client)
    sid = client.post("/api/admin/pos/sales", json={
        "items": [{"product_id": p["id"], "qty": 2}], "payment_method": "cash"}).json()["id"]
    assert client.get(f"/api/admin/shop/products/{p['id']}").json()["stock_qty"] == 3
    r = client.post(f"/api/admin/pos/sales/{sid}/void")
    assert r.status_code == 200
    assert client.get(f"/api/admin/shop/products/{p['id']}").json()["stock_qty"] == 5
    assert client.get(f"/api/admin/pos/sales/{sid}").status_code == 404


def test_void_forbidden_for_sales_role(client, make_product):
    import uuid as _uuid

    p = make_product(stock_qty=5)
    _login(client)
    username = f"u{_uuid.uuid4().hex[:10]}"
    assert client.post("/api/admin/users", json={
        "username": username, "password": "secret-pass-1", "role": "sales",
    }).status_code == 201
    client.post("/api/auth/logout")
    _login(client, username, "secret-pass-1")
    sid = client.post("/api/admin/pos/sales", json={
        "items": [{"product_id": p["id"], "qty": 1}], "payment_method": "cash"}).json()["id"]
    assert client.post(f"/api/admin/pos/sales/{sid}/void").status_code == 403
