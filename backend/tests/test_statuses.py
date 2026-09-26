"""Order status rules and the "take into work" shortcuts for orders and leads."""
from conftest import order_payload


def _login(client):
    assert client.post("/api/auth/login", json={"username": "admin", "password": "test-password"}).status_code == 200


def _order(client, make_product) -> int:
    p = make_product(price=100)
    return client.post("/api/shop/orders", json=order_payload(p["id"])).json()["id"]


def test_order_status_transitions_are_enforced(client, make_product):
    oid = _order(client, make_product)
    _login(client)

    r = client.patch(f"/api/admin/shop/orders/{oid}", json={"status": "delivered"})
    assert r.status_code == 200
    assert r.json()["next_statuses"] == ["cancelled"]
    # a handed-over order can't go back to "new"
    assert client.patch(f"/api/admin/shop/orders/{oid}", json={"status": "new"}).status_code == 409
    # setting the current status again is a no-op, not an error
    assert client.patch(f"/api/admin/shop/orders/{oid}", json={"status": "delivered"}).status_code == 200


def test_delivered_order_is_marked_paid_and_taken(client, make_product):
    oid = _order(client, make_product)
    _login(client)

    body = client.patch(f"/api/admin/shop/orders/{oid}", json={"status": "delivered"}).json()
    assert body["payment_status"] == "paid"
    assert body["taken_by"] == "admin"


def test_take_order_confirms_it_once(client, make_product):
    oid = _order(client, make_product)
    _login(client)

    first = client.post(f"/api/admin/shop/orders/{oid}/take").json()
    assert first["status"] == "confirmed"
    assert first["taken_by"] == "admin" and first["taken_at"]
    # a later click keeps the original status and timestamp
    client.patch(f"/api/admin/shop/orders/{oid}", json={"status": "delivered"})
    again = client.post(f"/api/admin/shop/orders/{oid}/take").json()
    assert again["status"] == "delivered"
    assert again["taken_at"] == first["taken_at"]


def test_take_lead_moves_new_to_in_progress(client):
    assert client.post("/api/leads", json={"name": "A", "phone": "+99365000000"}).status_code == 201
    _login(client)
    lead = next(lead for lead in client.get("/api/admin/leads").json() if lead["status"] == "new")

    taken = client.post(f"/api/admin/leads/{lead['id']}/take").json()
    assert taken["status"] == "read"
    assert taken["taken_by"] == "admin" and taken["taken_at"]
    # closing it later doesn't change who took it
    done = client.patch(f"/api/admin/leads/{lead['id']}", json={"status": "done"}).json()
    assert done["taken_by"] == "admin" and done["taken_at"] == taken["taken_at"]


def test_return_of_delivered_order_refunds_payment(client, make_product):
    oid = _order(client, make_product)
    _login(client)

    client.patch(f"/api/admin/shop/orders/{oid}", json={"status": "delivered"})
    body = client.patch(f"/api/admin/shop/orders/{oid}", json={"status": "cancelled"}).json()
    assert body["status"] == "cancelled"
    assert body["payment_status"] == "refunded"
