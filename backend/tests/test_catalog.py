import uuid

from app.models import Product, ProductTranslation, ShopBrand, ShopCategory, ShopCategoryTranslation, ShopSettings


def _u(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _setup(db):
    """Parent category with a child, two brands and four products spread over
    them. Every name/slug is unique, so the listing is scoped with q=<tag>."""
    tag = uuid.uuid4().hex[:10]
    parent = ShopCategory(slug=_u("pc"))
    db.add(parent)
    db.flush()
    child = ShopCategory(slug=_u("cpu"), parent_id=parent.id)
    other = ShopCategory(slug=_u("cam"))
    b1 = ShopBrand(name=f"Intel {tag}")
    b2 = ShopBrand(name=f"AMD {tag}")
    db.add_all([child, other, b1, b2])
    db.flush()

    def prod(cat, brand, price, old_price=None, is_new=False, stock_qty=None):
        p = Product(
            slug=_u("p"), category_id=cat.id, brand_id=brand.id if brand else None,
            price=price, old_price=old_price, is_new=is_new, stock_qty=stock_qty,
        )
        p.translations.append(ProductTranslation(lang="ru", title=f"Товар {tag}"))
        db.add(p)
        return p

    prod(child, b1, 1000, old_price=1200)
    prod(child, b2, 2000, is_new=True)
    prod(parent, b1, 3000, stock_qty=0)
    prod(other, None, 500)
    db.commit()
    return {"tag": tag, "parent": parent.slug, "child": child.slug, "b1": b1.slug, "b2": b2.slug}


def _list(client, **params):
    r = client.get("/api/shop/products", params=params)
    assert r.status_code == 200, r.text
    return r.json()


def test_brand_slug_derived_from_name(db):
    b = ShopBrand(name="be quiet!")
    db.add(b)
    db.commit()
    assert b.slug == "be-quiet"


def test_products_card_carries_brand_and_new_flag(client, db):
    s = _setup(db)
    body = _list(client, q=s["tag"], new=1)
    assert body["total"] == 1
    card = body["products"][0]
    assert card["is_new"] is True
    assert card["brand"]["slug"] == s["b2"]


def test_products_card_carries_category(client, db):
    s = _setup(db)
    child = db.query(ShopCategory).filter_by(slug=s["child"]).one()
    child.translations.append(ShopCategoryTranslation(lang="ru", name="Процессоры"))
    db.commit()
    card = _list(client, q=s["tag"], new=1)["products"][0]
    assert card["category"] == {"slug": s["child"], "name": {"ru": "Процессоры"}}


def test_category_filter_includes_subcategories(client, db):
    s = _setup(db)
    assert _list(client, q=s["tag"], category=s["parent"])["total"] == 3
    assert _list(client, q=s["tag"], category=s["child"])["total"] == 2
    assert client.get("/api/shop/products", params={"category": "no-such"}).status_code == 404


def test_brand_discount_stock_and_price_filters(client, db):
    s = _setup(db)
    assert _list(client, q=s["tag"], brand=s["b1"])["total"] == 2
    assert _list(client, q=s["tag"], brand=f"{s['b1']},{s['b2']}")["total"] == 3
    assert _list(client, q=s["tag"], discount=1)["total"] == 1
    # tracked stock at zero is not "in stock" even though in_stock=True
    assert _list(client, q=s["tag"], in_stock=1)["total"] == 3
    assert _list(client, q=s["tag"], price_min=900, price_max=2500)["total"] == 2


def test_facets_ignore_their_own_filter(client, db):
    s = _setup(db)
    body = _list(client, q=s["tag"], brand=s["b1"])
    brands = {b["slug"]: b["count"] for b in body["facets"]["brands"]}
    # picking b1 still lists b2 with its count
    assert brands == {s["b1"]: 2, s["b2"]: 1}
    assert body["facets"]["price"] == {"min": 1000, "max": 3000}
    cats = {c["slug"]: c["count"] for c in body["facets"]["categories"]}
    assert cats == {s["child"]: 1, s["parent"]: 1}


def test_brands_endpoint_counts_products(client, db):
    s = _setup(db)
    brands = {b["slug"]: b["product_count"] for b in client.get("/api/shop/brands").json()["brands"]}
    assert brands[s["b1"]] == 2
    assert brands[s["b2"]] == 1


def test_admin_sets_brand_and_new_flag(client, db):
    assert client.post("/api/auth/login", json={"username": "admin", "password": "test-password"}).status_code == 200
    brand = client.post("/api/admin/shop/brands", json={"name": _u("Brand")}).json()
    assert brand["slug"]
    dup = client.post("/api/admin/shop/brands", json={"name": "x", "slug": brand["slug"]})
    assert dup.status_code == 409

    cat = ShopCategory(slug=_u("cat"))
    db.add(cat)
    db.commit()
    p = client.post("/api/admin/shop/products", json={
        "slug": _u("p"), "category_id": cat.id, "brand_id": brand["id"], "is_new": True,
    })
    assert p.status_code == 201, p.text
    assert p.json()["brand_id"] == brand["id"] and p.json()["is_new"] is True

    r = client.put(f"/api/admin/shop/products/{p.json()['id']}", json={"brand_id": None, "is_new": False})
    assert r.status_code == 200
    assert r.json()["brand_id"] is None and r.json()["is_new"] is False

    bad = client.put(f"/api/admin/shop/products/{p.json()['id']}", json={"brand_id": 999999})
    assert bad.status_code == 400


def test_settings_expose_email_and_hours(client, db):
    assert client.post("/api/auth/login", json={"username": "admin", "password": "test-password"}).status_code == 200
    r = client.put("/api/admin/shop/settings", json={
        "phone": "+993 12 21 63 14", "email": "shop@example.com",
        "hours_ru": "Пн–Сб: 9:00–19:00",
    })
    assert r.status_code == 200
    settings = client.get("/api/shop/catalog").json()["settings"]
    assert settings["email"] == "shop@example.com"
    assert settings["hours"]["ru"] == "Пн–Сб: 9:00–19:00"
    db.expire_all()
    assert db.get(ShopSettings, 1).email == "shop@example.com"
