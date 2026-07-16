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


# ---- barcode: the warehouse's lane (складчик присваивает код при приёмке) ----

def test_warehouse_can_set_and_change_barcode(client, make_product):
    p = make_product(price=100)
    username, password = _make_user(client, "warehouse")
    client.post("/api/auth/logout")
    _login(client, username, password)
    code = f"EAN{uuid.uuid4().hex[:10]}"
    r = client.put(f"/api/admin/shop/products/{p['id']}", json={"barcode": code})
    assert r.status_code == 200, r.text
    assert r.json()["barcode"] == code
    # a typo must stay fixable by the same складчик, not escalate to the owner
    fixed = f"EAN{uuid.uuid4().hex[:10]}"
    r2 = client.put(f"/api/admin/shop/products/{p['id']}", json={"barcode": fixed})
    assert r2.status_code == 200, r2.text
    assert r2.json()["barcode"] == fixed


def test_content_cannot_change_barcode(client, make_product):
    p = make_product(price=100)
    username, password = _make_user(client, "content")
    client.post("/api/auth/logout")
    _login(client, username, password)
    r = client.put(f"/api/admin/shop/products/{p['id']}", json={"barcode": "EAN-CONTENT"})
    assert r.status_code == 403


def test_sales_cannot_change_barcode(client, make_product):
    p = make_product(price=100)
    username, password = _make_user(client, "sales")
    client.post("/api/auth/logout")
    _login(client, username, password)
    r = client.put(f"/api/admin/shop/products/{p['id']}", json={"barcode": "EAN-SALES"})
    assert r.status_code == 403


def test_barcode_must_be_unique_across_products(client, make_product):
    # a duplicate would make POS /lookup ambiguous — it must be refused
    code = f"EAN{uuid.uuid4().hex[:10]}"
    a = make_product(price=100)
    b = make_product(price=100)
    _login(client)
    ok = client.put(f"/api/admin/shop/products/{a['id']}", json={"barcode": code})
    assert ok.status_code == 200, ok.text
    dup = client.put(f"/api/admin/shop/products/{b['id']}", json={"barcode": code})
    assert dup.status_code == 409, dup.text
    # re-saving the same code on the same product is not a duplicate
    same = client.put(f"/api/admin/shop/products/{a['id']}", json={"barcode": code})
    assert same.status_code == 200, same.text


def test_barcode_uniqueness_enforced_at_db_level(db, make_product):
    """The app-level check has a TOCTOU race: two concurrent PUTs can both pass
    the SELECT before either INSERTs. A DB unique constraint is the backstop —
    bypass the app and write two identical barcodes straight to the session."""
    import sqlalchemy.exc
    from app.models import Product, ProductTranslation, ShopCategory

    code = f"EAN{uuid.uuid4().hex[:10]}"
    a = make_product(price=100, barcode=code)  # first one takes the code
    cat = ShopCategory(slug=f"cat-{uuid.uuid4().hex[:8]}")
    db.add(cat)
    db.flush()
    clash = Product(slug=f"prod-{uuid.uuid4().hex[:8]}", category_id=cat.id,
                    price=100, barcode=code)
    clash.translations.append(ProductTranslation(lang="ru", title="Дубль"))
    db.add(clash)
    with pytest.raises(sqlalchemy.exc.IntegrityError):
        db.commit()
    db.rollback()


def test_barcode_null_is_not_unique_constrained(db):
    """Many products carry no barcode; NULLs must not collide with each other."""
    from app.models import Product, ProductTranslation, ShopCategory

    for _ in range(3):
        cat = ShopCategory(slug=f"cat-{uuid.uuid4().hex[:8]}")
        db.add(cat)
        db.flush()
        p = Product(slug=f"prod-{uuid.uuid4().hex[:8]}", category_id=cat.id,
                    price=100, barcode=None)
        p.translations.append(ProductTranslation(lang="ru", title="Без кода"))
        db.add(p)
    db.commit()  # no IntegrityError → multiple NULL barcodes coexist


def test_barcode_can_be_cleared_and_set_on_create(client):
    _login(client)
    code = f"EAN{uuid.uuid4().hex[:10]}"
    created = client.post(
        "/api/admin/shop/products",
        json={"slug": f"p-{uuid.uuid4().hex[:8]}", "category_id": 1, "price": 10, "barcode": code},
    )
    assert created.status_code == 201, created.text
    assert created.json()["barcode"] == code
    pid = created.json()["id"]
    cleared = client.put(f"/api/admin/shop/products/{pid}", json={"barcode": None})
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["barcode"] is None


def test_scanned_barcode_reaches_pos_lookup(client, make_product):
    # the whole point: what the складчик binds, the кассир can scan
    p = make_product(price=100, stock_qty=3)
    username, password = _make_user(client, "warehouse")
    client.post("/api/auth/logout")
    _login(client, username, password)
    code = f"EAN{uuid.uuid4().hex[:10]}"
    assert client.put(f"/api/admin/shop/products/{p['id']}", json={"barcode": code}).status_code == 200
    client.post("/api/auth/logout")
    _login(client)
    r = client.get(f"/api/admin/pos/lookup?code={code}")
    assert r.status_code == 200, r.text
    assert r.json()["id"] == p["id"]


def test_content_cannot_bind_barcode_at_creation(client):
    # the create endpoint is open to content+warehouse; the barcode lane must
    # still hold there, or content could bind a code it may never edit after
    username, password = _make_user(client, "content")
    client.post("/api/auth/logout")
    _login(client, username, password)
    r = client.post(
        "/api/admin/shop/products",
        json={"slug": f"p-{uuid.uuid4().hex[:8]}", "category_id": 1, "price": 10,
              "barcode": f"EAN{uuid.uuid4().hex[:8]}"},
    )
    assert r.status_code == 403, r.text
    # ...but content may still create a product without touching the barcode
    ok = client.post(
        "/api/admin/shop/products",
        json={"slug": f"p-{uuid.uuid4().hex[:8]}", "category_id": 1, "price": 10},
    )
    assert ok.status_code == 201, ok.text


def test_warehouse_can_bind_barcode_at_creation(client):
    username, password = _make_user(client, "warehouse")
    client.post("/api/auth/logout")
    _login(client, username, password)
    code = f"EAN{uuid.uuid4().hex[:10]}"
    r = client.post(
        "/api/admin/shop/products",
        json={"slug": f"p-{uuid.uuid4().hex[:8]}", "category_id": 1, "price": 10, "barcode": code},
    )
    assert r.status_code == 201, r.text
    assert r.json()["barcode"] == code


def test_dashboard_stats_hides_revenue_from_roles_without_money_access(client):
    # /reports/sales already 403s the warehouse — the dashboard must not be a
    # side door to the same number
    for role in ("warehouse", "content"):
        username, password = _make_user(client, role)
        client.post("/api/auth/logout")
        _login(client, username, password)
        assert client.get("/api/admin/reports/sales?days=7").status_code == 403
        r = client.get("/api/admin/shop/stats")
        assert r.status_code == 200, r.text
        assert r.json()["revenue_week"] is None, f"{role} must not see revenue"
        client.post("/api/auth/logout")


def test_dashboard_stats_shows_revenue_to_owner_and_sales(client):
    for username, password in [("admin", "test-password"), _make_user(client, "sales")]:
        client.post("/api/auth/logout")
        _login(client, username, password)
        r = client.get("/api/admin/shop/stats")
        assert r.status_code == 200, r.text
        assert isinstance(r.json()["revenue_week"], int), "owner/sales must see revenue"
        client.post("/api/auth/logout")
