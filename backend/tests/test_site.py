import uuid

from conftest import order_payload

from app.models import Product, ProductTranslation, ShopCategory, ShopService, ShopServiceTranslation


def _u(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _login(client):
    assert client.post("/api/auth/login", json={"password": "test-password"}).status_code == 200


def _catalog(db):
    """Parent with two subcategories, three parts and one service."""
    parent = ShopCategory(slug=_u("pc"))
    db.add(parent)
    db.flush()
    cpu = ShopCategory(slug=_u("cpu"), parent_id=parent.id)
    ram = ShopCategory(slug=_u("ram"), parent_id=parent.id)
    db.add_all([cpu, ram])
    db.flush()

    def prod(cat, price):
        p = Product(slug=_u("p"), category_id=cat.id, price=price)
        p.translations.append(ProductTranslation(lang="ru", title=f"Деталь {price}"))
        db.add(p)
        return p

    parts = [prod(cpu, 1000), prod(cpu, 1500), prod(ram, 500)]
    svc = ShopService(slug=_u("build"), category_id=parent.id, price=250, price_from=True)
    svc.translations.append(ShopServiceTranslation(
        lang="ru", title="Сборка ПК", short="кратко", body="описание", feats=["пункт 1", "пункт 2"],
    ))
    db.add(svc)
    db.commit()
    return {"parent": parent, "cpu": cpu, "parts": parts, "svc": svc}


# ------------------------------------------------------------------ builds
def test_build_components_admin_and_public(client, db):
    c = _catalog(db)
    _login(client)
    parts = c["parts"]
    r = client.post("/api/admin/shop/products", json={
        "slug": _u("build"), "category_id": c["parent"].id, "price": 2750,
        "translations": [{"lang": "ru", "title": "KM Gamer"}],
        "components": [
            {"product_id": parts[0].id}, {"product_id": parts[2].id, "qty": 2},
            {"service_id": c["svc"].id},
        ],
    })
    assert r.status_code == 201, r.text
    build = r.json()
    assert [x["price"] for x in build["components"]] == [1000, 500, 250]

    pub = client.get(f"/api/shop/products/{build['slug']}").json()
    assert [x["kind"] for x in pub["components"]] == ["product", "product", "service"]
    assert pub["components"][1]["qty"] == 2
    assert pub["components"][0]["category"] is not None

    listing = client.get("/api/shop/products", params={"build": 1, "q": "KM Gamer"}).json()
    assert [p["slug"] for p in listing["products"]] == [build["slug"]]
    assert listing["products"][0]["is_build"] is True

    # replace the lines wholesale
    r = client.put(f"/api/admin/shop/products/{build['id']}", json={"components": [{"product_id": parts[1].id}]})
    assert r.status_code == 200
    assert [x["product_id"] for x in r.json()["components"]] == [parts[1].id]


def test_build_rejects_self_and_bad_refs(client, db):
    c = _catalog(db)
    _login(client)
    pid = c["parts"][0].id
    assert client.put(f"/api/admin/shop/products/{pid}", json={"components": [{"product_id": pid}]}).status_code == 400
    assert client.put(f"/api/admin/shop/products/{pid}", json={"components": [{"service_id": 999999}]}).status_code == 400
    both = client.put(f"/api/admin/shop/products/{pid}", json={"components": [{"product_id": pid, "service_id": 1}]})
    assert both.status_code == 422


# ------------------------------------------------------------------ popularity / similar
def test_popular_sort_counts_orders(client, db):
    c = _catalog(db)
    cheap, mid, _ = c["parts"]
    assert client.post("/api/shop/orders", json=order_payload(mid.id, qty=3)).status_code == 201
    assert client.post("/api/shop/orders", json=order_payload(cheap.id, qty=1)).status_code == 201
    slugs = [p["slug"] for p in client.get(
        "/api/shop/products", params={"category": c["cpu"].slug, "sort": "popular"},
    ).json()["products"]]
    assert slugs == [mid.slug, cheap.slug]


def test_similar_prefers_same_category_then_branch(client, db):
    c = _catalog(db)
    a, b, ram = c["parts"]
    got = [p["slug"] for p in client.get(f"/api/shop/products/{a.slug}/similar").json()["products"]]
    assert got[0] == b.slug and ram.slug in got and a.slug not in got


# ------------------------------------------------------------------ services
def test_service_page_and_lead_link(client, db):
    c = _catalog(db)
    svc = c["svc"]
    listed = {s["slug"]: s for s in client.get("/api/shop/services").json()["services"]}
    assert listed[svc.slug]["price_from"] is True

    d = client.get(f"/api/shop/services/{svc.slug}").json()
    assert d["body"]["ru"] == "описание" and d["feats"]["ru"] == ["пункт 1", "пункт 2"]

    assert client.post("/api/leads", json={"name": "A", "phone": "1", "service": "nope"}).status_code == 404
    assert client.post("/api/leads", json={"name": "A", "phone": "1", "service": svc.slug}).status_code == 201
    _login(client)
    leads = client.get("/api/admin/leads").json()
    assert any(lead["service_title"] == "Сборка ПК" for lead in leads)


def test_admin_updates_service_texts(client, db):
    c = _catalog(db)
    _login(client)
    r = client.put(f"/api/admin/shop/services/{c['svc'].id}", json={
        "price_from": False,
        "translations": [{"lang": "ru", "title": "Сборка", "short": "", "body": "новое", "feats": ["a"]}],
    })
    assert r.status_code == 200
    ru = next(t for t in r.json()["translations"] if t["lang"] == "ru")
    assert ru["body"] == "новое" and ru["feats"] == ["a"] and r.json()["price_from"] is False
    assert any(s["id"] == c["svc"].id for s in client.get("/api/admin/shop/services").json())


# ------------------------------------------------------------------ banners / pages / home
def test_banner_crud_and_public(client):
    _login(client)
    title = _u("Баннер")
    r = client.post("/api/admin/site/banners", json={
        "link": "/catalog", "translations": [{"lang": "ru", "title": title, "subtitle": "sub"}],
    })
    assert r.status_code == 201
    bid = r.json()["id"]
    assert any(b["title"].get("ru") == title for b in client.get("/api/shop/banners").json()["banners"])
    assert client.put(f"/api/admin/site/banners/{bid}", json={"enabled": False, "translations": []}).status_code == 200
    assert not any(b["id"] == bid for b in client.get("/api/shop/home").json()["banners"])
    assert client.delete(f"/api/admin/site/banners/{bid}").status_code == 200


def test_page_crud_and_public(client):
    _login(client)
    slug = _u("page")
    body = {"slug": slug, "translations": [{
        "lang": "ru", "title": "FAQ", "lead": "вступление",
        "blocks": [{"title": "Вопрос?", "body": "Ответ."}, {"title": "", "body": ""}],
    }]}
    r = client.post("/api/admin/site/pages", json=body)
    assert r.status_code == 201
    assert client.post("/api/admin/site/pages", json=body).status_code == 409
    page = client.get(f"/api/shop/pages/{slug}").json()
    # empty blocks are dropped on save
    assert page["blocks"]["ru"] == [{"title": "Вопрос?", "body": "Ответ."}]
    assert slug in [p["slug"] for p in client.get("/api/shop/pages").json()["pages"]]
    pid = r.json()["id"]
    assert client.put(f"/api/admin/site/pages/{pid}", json={**body, "enabled": False}).status_code == 200
    assert client.get(f"/api/shop/pages/{slug}").status_code == 404
    assert client.delete(f"/api/admin/site/pages/{pid}").status_code == 200


def test_site_content_is_content_role_only(client):
    assert client.post("/api/admin/site/pages", json={"slug": "x"}).status_code == 401


# ------------------------------------------------------------------ delivery
def test_delivery_fee_added_to_order_total(client, db, make_product):
    from app.models import Order, ShopSettings

    p = make_product(price=2890)
    settings = db.get(ShopSettings, 1) or ShopSettings(id=1)
    old_fee = settings.delivery_fee or 0
    settings.delivery_fee = 30
    db.add(settings)
    db.commit()
    try:
        v = client.post("/api/shop/cart/validate", json={"items": [{"id": p["id"], "qty": 4}]}).json()
        assert v["delivery_fee"] == 30
        r = client.post("/api/shop/orders", json=order_payload(p["id"], qty=4))
        assert r.status_code == 201
        assert r.json()["total"] == 4 * 2890 + 30 and r.json()["delivery"] == 30
        db.expire_all()
        assert db.get(Order, r.json()["id"]).delivery == 30
    finally:
        settings = db.get(ShopSettings, 1)
        settings.delivery_fee = old_fee
        db.commit()


# ------------------------------------------------------------------ characteristic filters
def test_products_characteristic_filters_and_facets(client, db):
    from app.models import CategoryAttribute, ProductAttribute, ShopBrand

    cat = ShopCategory(slug=_u("cpu"))
    db.add(cat)
    db.flush()
    socket = CategoryAttribute(category_id=cat.id, key="socket", type="select")
    cores = CategoryAttribute(category_id=cat.id, key="cores", type="number")
    amd, intel = ShopBrand(name=_u("AMD")), ShopBrand(name=_u("Intel"))
    db.add_all([socket, cores, amd, intel])
    db.flush()
    for brand, sock, n in ((amd, "AM5", 8), (amd, "AM5", 6), (intel, "LGA1700", 10)):
        p = Product(slug=_u("p"), category_id=cat.id, price=100 * n, brand_id=brand.id)
        p.attributes.append(ProductAttribute(attribute_id=socket.id, value=sock))
        p.attributes.append(ProductAttribute(attribute_id=cores.id, value=str(n), num_value=n))
        db.add(p)
    db.commit()

    body = client.get("/api/shop/products", params={"category": cat.slug, "socket": "AM5"}).json()
    assert body["total"] == 2
    facets = {f["key"]: [o["value"] for o in f["options"]] for f in body["facets"]["attributes"]}
    # the socket facet ignores its own filter; cores narrows to the AM5 parts
    assert facets["socket"] == ["AM5", "LGA1700"]
    assert facets["cores"] == ["6", "8"]
    assert [b["slug"] for b in body["facets"]["brands"]] == [amd.slug]

    assert client.get("/api/shop/products", params={"category": cat.slug, "cores": "6,10"}).json()["total"] == 2
    assert client.get("/api/shop/products", params={"category": cat.slug, "cores_min": 7}).json()["total"] == 2


# ------------------------------------------------------------------ pictures
def test_category_and_service_pictures(client, db):
    import base64

    c = _catalog(db)
    _login(client)
    png = base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
    r = client.post(f"/api/admin/shop/categories/{c['cpu'].id}/image", files={"file": ("cpu.png", png, "image/png")})
    assert r.status_code == 200, r.text
    image = r.json()["image"]
    assert image.startswith("categories/")
    parent = client.get(f"/api/shop/categories/{c['parent'].slug}").json()
    assert any(ch["image"] == image for ch in parent["children"])

    r = client.post(f"/api/admin/shop/services/{c['svc'].id}/image", files={"file": ("svc.png", png, "image/png")})
    assert r.status_code == 200
    listed = {s["slug"]: s for s in client.get("/api/shop/services").json()["services"]}
    assert listed[c["svc"].slug]["image"] == r.json()["image"]

    assert client.delete(f"/api/admin/shop/categories/{c['cpu'].id}/image").json()["image"] is None
    assert client.delete(f"/api/admin/shop/services/{c['svc'].id}/image").json()["image"] is None
