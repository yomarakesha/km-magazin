"""Reports: sales/profit, stock value/turnover, service demand, CSV export,
and role gating."""
import uuid

from conftest import order_payload


def _login(client):
    assert client.post("/api/auth/login", json={"password": "test-password"}).status_code == 200


def _make_role_user(client, role):
    _login(client)
    username = f"u{uuid.uuid4().hex[:10]}"
    assert client.post(
        "/api/admin/users",
        json={"username": username, "password": "secret-pass-1", "role": role},
    ).status_code == 201
    client.post("/api/auth/logout")
    assert client.post(
        "/api/auth/login", json={"username": username, "password": "secret-pass-1"}
    ).status_code == 200


# The report DB is shared across tests, so assert on deltas / the product's own
# top-products row rather than global absolute totals.

# ---- sales + profit ----

def test_sales_report_profit_uses_cost_snapshot(client, make_product):
    _login(client)
    base = client.get("/api/admin/reports/sales").json()
    p = make_product(price=100, stock_qty=10)
    # set purchase cost so the sale snapshots it
    client.post("/api/admin/warehouse/movements",
                json={"product_id": p["id"], "kind": "receipt", "qty": 1, "unit_cost": 60})
    client.post("/api/shop/orders", json=order_payload(p["id"], qty=2))  # revenue 200, cost 120

    body = client.get("/api/admin/reports/sales").json()
    assert body["orders"] == base["orders"] + 1
    assert body["revenue"] == base["revenue"] + 200
    assert body["cogs"] == base["cogs"] + 120
    assert body["gross_profit"] == base["gross_profit"] + 80
    row = next(r for r in body["top_products"] if r["id"] == p["id"])
    assert (row["qty"], row["revenue"], row["profit"]) == (2, 200, 80)


def test_sales_report_excludes_cancelled(client, make_product):
    _login(client)
    base = client.get("/api/admin/reports/sales").json()
    p = make_product(price=100, stock_qty=5)
    oid = client.post("/api/shop/orders", json=order_payload(p["id"])).json()["id"]
    client.patch(f"/api/admin/shop/orders/{oid}", json={"status": "cancelled"})
    body = client.get("/api/admin/reports/sales").json()
    # cancelled order leaves totals unchanged and never appears in top products
    assert body["orders"] == base["orders"]
    assert body["revenue"] == base["revenue"]
    assert all(r["id"] != p["id"] for r in body["top_products"])


def test_sales_report_bad_date_422(client):
    _login(client)
    assert client.get("/api/admin/reports/sales?date_from=nonsense").status_code == 422


def test_sales_report_csv(client, make_product):
    p = make_product(price=100, stock_qty=5)
    client.post("/api/shop/orders", json=order_payload(p["id"]))
    _login(client)
    r = client.get("/api/admin/reports/sales?format=csv")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert "attachment" in r.headers["content-disposition"]
    assert "Товар" in r.text


# ---- stock ----

def test_stock_report_values(client, db, make_product):
    p = make_product(price=100, stock_qty=4)
    _login(client)
    client.post("/api/admin/warehouse/movements",
                json={"product_id": p["id"], "kind": "receipt", "qty": 0 or 1, "unit_cost": 70})
    # now stock 5, cost 70
    body = client.get("/api/admin/reports/stock").json()
    assert body["units"] >= 5
    # value at cost includes this product's 5*70
    assert body["value_cost"] >= 5 * 70
    assert any(it["id"] == p["id"] for it in body["items"])


def test_stock_report_dead_stock(client, make_product):
    # product with stock but never sold → dead
    p = make_product(price=100, stock_qty=3)
    _login(client)
    body = client.get("/api/admin/reports/stock?dead_days=30").json()
    assert any(it["id"] == p["id"] for it in body["dead_stock"])


def test_stock_report_csv(client, make_product):
    make_product(price=100, stock_qty=3)
    _login(client)
    r = client.get("/api/admin/reports/stock?format=csv")
    assert r.status_code == 200
    assert "Остаток" in r.text


# ---- services ----

def test_services_report_counts_demand(client, make_service):
    s = make_service(price=50)
    client.post("/api/shop/orders", json={
        "customer_name": "T", "phone": "+993 65 111111",
        "items": [{"kind": "service", "id": s["id"], "qty": 3}],
    })
    _login(client)
    body = client.get("/api/admin/reports/services").json()
    row = next(r for r in body["services"] if r["id"] == s["id"])
    assert (row["count"], row["revenue"]) == (3, 150)


# ---- role gating ----

def test_sales_role_can_read_sales_and_services(client):
    _make_role_user(client, "sales")
    assert client.get("/api/admin/reports/sales").status_code == 200
    assert client.get("/api/admin/reports/services").status_code == 200
    assert client.get("/api/admin/reports/stock").status_code == 403


def test_warehouse_role_can_read_stock_only(client):
    _make_role_user(client, "warehouse")
    assert client.get("/api/admin/reports/stock").status_code == 200
    assert client.get("/api/admin/reports/sales").status_code == 403


def test_content_role_sees_no_reports(client):
    _make_role_user(client, "content")
    assert client.get("/api/admin/reports/sales").status_code == 403
    assert client.get("/api/admin/reports/stock").status_code == 403
    assert client.get("/api/admin/reports/services").status_code == 403
