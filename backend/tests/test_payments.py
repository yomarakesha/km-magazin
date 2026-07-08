from conftest import order_payload


def _login(client):
    assert client.post("/api/auth/login", json={"password": "test-password"}).status_code == 200


def test_webhook_501_with_manual_provider(client):
    r = client.post("/api/shop/payments/webhook", content=b"{}")
    assert r.status_code == 501


def test_admin_marks_order_paid(client, make_product):
    p = make_product(price=100)
    oid = client.post("/api/shop/orders", json=order_payload(p["id"])).json()["id"]

    _login(client)
    r = client.patch(f"/api/admin/shop/orders/{oid}/payment", json={"payment_status": "paid"})
    assert r.status_code == 200
    body = r.json()
    assert body["payment_status"] == "paid"
    assert body["payment_provider"] == "manual"  # set when marking paid by hand

    # visible in the customer-facing lookup too
    pub = client.get(f"/api/shop/orders/{oid}", params={"phone": "99365123456"})
    assert pub.json()["payment_status"] == "paid"


def test_invalid_payment_status_rejected(client, make_product):
    p = make_product(price=100)
    oid = client.post("/api/shop/orders", json=order_payload(p["id"])).json()["id"]
    _login(client)
    r = client.patch(f"/api/admin/shop/orders/{oid}/payment", json={"payment_status": "gifted"})
    assert r.status_code == 422
