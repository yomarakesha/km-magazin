from conftest import order_payload

from app.models import PromoCode


def test_promo_check_percent(client, make_promo):
    promo = make_promo(kind="percent", value=10)
    r = client.post("/api/shop/promo/check", json={"code": promo["code"], "subtotal": 1000})
    assert r.status_code == 200
    assert r.json()["discount"] == 100


def test_promo_check_is_case_insensitive(client, make_promo):
    promo = make_promo(kind="fixed", value=30)
    r = client.post("/api/shop/promo/check", json={"code": promo["code"].lower(), "subtotal": 100})
    assert r.status_code == 200
    assert r.json()["discount"] == 30


def test_promo_check_unknown_code_404(client):
    assert client.post("/api/shop/promo/check", json={"code": "NOPE", "subtotal": 100}).status_code == 404


def test_promo_below_min_total_422(client, make_promo):
    # A valid code the cart is too small for returns 422 with the threshold so
    # the client can prompt "add X more", distinct from a 404 unknown code.
    promo = make_promo(value=10, min_total=500)
    r = client.post("/api/shop/promo/check", json={"code": promo["code"], "subtotal": 100})
    assert r.status_code == 422
    assert r.json()["detail"] == {"code": "below_min", "min_total": 500}


def test_fixed_discount_capped_at_subtotal(client, make_promo):
    promo = make_promo(kind="fixed", value=10_000)
    r = client.post("/api/shop/promo/check", json={"code": promo["code"], "subtotal": 100})
    assert r.json()["discount"] == 100


def test_order_applies_promo_and_claims_use(client, db, make_product, make_promo):
    p = make_product(price=1000)
    promo = make_promo(kind="percent", value=10)
    r = client.post("/api/shop/orders", json=order_payload(p["id"], promo_code=promo["code"]))
    assert r.status_code == 201
    assert r.json()["discount"] == 100
    assert r.json()["total"] == 900
    db.expire_all()
    assert db.get(PromoCode, promo["id"]).used_count == 1


def test_exhausted_promo_gives_no_discount(client, db, make_product, make_promo):
    p = make_product(price=1000)
    promo = make_promo(kind="percent", value=10, max_uses=1)

    first = client.post("/api/shop/orders", json=order_payload(p["id"], promo_code=promo["code"]))
    assert first.json()["discount"] == 100

    # cap reached → the order still goes through, at full price
    second = client.post("/api/shop/orders", json=order_payload(p["id"], promo_code=promo["code"]))
    assert second.status_code == 201
    assert second.json()["discount"] == 0
    assert second.json()["total"] == 1000
    db.expire_all()
    assert db.get(PromoCode, promo["id"]).used_count == 1


def test_inactive_promo_ignored(client, make_product, make_promo):
    p = make_product(price=1000)
    promo = make_promo(value=10, active=False)
    r = client.post("/api/shop/orders", json=order_payload(p["id"], promo_code=promo["code"]))
    assert r.status_code == 201
    assert r.json()["discount"] == 0
