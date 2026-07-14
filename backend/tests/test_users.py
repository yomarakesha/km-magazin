"""Admin users: management endpoints + role gating across the admin API."""
import uuid

import pytest


def _login(client, username="admin", password="test-password"):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r.json()


def _make_user(client, role, password="secret-pass-1"):
    """As owner, create a user with the given role; returns (username, password)."""
    _login(client)
    username = f"u{uuid.uuid4().hex[:10]}"
    r = client.post(
        "/api/admin/users",
        json={"username": username, "password": password, "role": role},
    )
    assert r.status_code == 201, r.text
    return username, password


# ---- auth / login ----

def test_login_with_explicit_username(client):
    body = _login(client, username="admin")
    assert body["role"] == "owner"


def test_login_unknown_user_401(client):
    r = client.post("/api/auth/login", json={"username": "ghost", "password": "whatever-123"})
    assert r.status_code == 401


def test_created_user_can_login_and_me_reports_role(client):
    username, password = _make_user(client, "warehouse")
    client.post("/api/auth/logout")
    _login(client, username, password)
    me = client.get("/api/auth/me").json()
    assert me["username"] == username
    assert me["role"] == "warehouse"


def test_deactivated_user_cannot_login(client):
    username, password = _make_user(client, "sales")
    users = client.get("/api/admin/users").json()
    uid = next(u["id"] for u in users if u["username"] == username)
    assert client.patch(f"/api/admin/users/{uid}", json={"active": False}).status_code == 200
    client.post("/api/auth/logout")
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 401


# ---- user management guards ----

def test_users_endpoint_is_owner_only(client):
    username, password = _make_user(client, "sales")
    client.post("/api/auth/logout")
    _login(client, username, password)
    assert client.get("/api/admin/users").status_code == 403


def test_cannot_deactivate_last_owner(client):
    _login(client)
    users = client.get("/api/admin/users").json()
    owner_id = next(u["id"] for u in users if u["username"] == "admin")
    r = client.patch(f"/api/admin/users/{owner_id}", json={"active": False})
    assert r.status_code == 409


def test_duplicate_username_409(client):
    username, _ = _make_user(client, "content")
    r = client.post(
        "/api/admin/users",
        json={"username": username, "password": "another-pass-1", "role": "sales"},
    )
    assert r.status_code == 409


# ---- role gating on shop admin ----

@pytest.mark.parametrize(
    "role,path,ok",
    [
        # warehouse: sees orders, cannot touch promos or products
        ("warehouse", "/api/admin/shop/orders", True),
        ("warehouse", "/api/admin/shop/promos", False),
        # sales: orders + promos, no user management
        ("sales", "/api/admin/shop/orders", True),
        ("sales", "/api/admin/shop/promos", True),
        # content: catalog reads ok, orders hidden
        ("content", "/api/admin/shop/products", True),
        ("content", "/api/admin/shop/orders", False),
    ],
)
def test_role_read_access(client, role, path, ok):
    username, password = _make_user(client, role)
    client.post("/api/auth/logout")
    _login(client, username, password)
    r = client.get(path)
    assert (r.status_code == 200) == ok, f"{role} GET {path} -> {r.status_code}"


def test_warehouse_can_create_product(client):
    # Model B: goods originate at the warehouse — складчик заводит SKU.
    username, password = _make_user(client, "warehouse")
    client.post("/api/auth/logout")
    _login(client, username, password)
    r = client.post(
        "/api/admin/shop/products",
        json={"slug": f"p-{uuid.uuid4().hex[:8]}", "category_id": 1, "price": 10},
    )
    assert r.status_code == 201, r.text


def test_warehouse_owns_stock_not_catalog(client, make_product):
    p = make_product(price=100)
    username, password = _make_user(client, "warehouse")
    client.post("/api/auth/logout")
    _login(client, username, password)
    # stock_qty is the warehouse's field
    ok = client.put(f"/api/admin/shop/products/{p['id']}", json={"stock_qty": 7})
    assert ok.status_code == 200, ok.text
    assert ok.json()["stock_qty"] == 7
    # catalog fields belong to content
    r = client.put(f"/api/admin/shop/products/{p['id']}", json={"sku": "WH-1"})
    assert r.status_code == 403


def test_content_cannot_change_stock(client, make_product):
    p = make_product(price=100)
    username, password = _make_user(client, "content")
    client.post("/api/auth/logout")
    _login(client, username, password)
    r = client.put(f"/api/admin/shop/products/{p['id']}", json={"stock_qty": 5})
    assert r.status_code == 403


def test_content_cannot_change_price(client, make_product):
    p = make_product(price=100)
    username, password = _make_user(client, "content")
    client.post("/api/auth/logout")
    _login(client, username, password)
    # non-price edit passes
    ok = client.put(f"/api/admin/shop/products/{p['id']}", json={"sku": "ABC-1"})
    assert ok.status_code == 200, ok.text
    # price edit is owner-only
    r = client.put(f"/api/admin/shop/products/{p['id']}", json={"price": 999})
    assert r.status_code == 403


def test_owner_can_change_price(client, make_product):
    p = make_product(price=100)
    _login(client)
    r = client.put(f"/api/admin/shop/products/{p['id']}", json={"price": 999})
    assert r.status_code == 200
    assert r.json()["price"] == 999
