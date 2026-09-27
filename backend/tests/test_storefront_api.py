"""Storefront API additions from docs/BACKEND_GAPS.md: warranty, map pin,
multi-category filter, word search, translated characteristic values, page
image, category order, the light category list and the /products rate limit."""
import base64
import uuid

from app.models import (
    CategoryAttribute,
    Page,
    PageTranslation,
    Product,
    ProductAttribute,
    ProductTranslation,
    ShopBrand,
    ShopCategory,
)
from app.routers.shop_public import PRODUCTS_RATE

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def _u(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def _login(client, username="admin", password="test-password"):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text


def _list(client, **params):
    r = client.get("/api/shop/products", params=params)
    assert r.status_code == 200, r.text
    return r.json()


def _product(db, cat, title, *, brand=None, sku=None, short="", en_title=None):
    p = Product(slug=_u("p"), category_id=cat.id, price=100, brand_id=brand.id if brand else None, sku=sku)
    p.translations.append(ProductTranslation(lang="ru", title=title, short=short))
    if en_title:
        p.translations.append(ProductTranslation(lang="en", title=en_title))
    db.add(p)
    db.flush()
    return p


# ------------------------------------------------------------------ 1. warranty
def test_warranty_months_admin_and_public(client, db):
    cat = ShopCategory(slug=_u("cat"))
    db.add(cat)
    db.commit()
    _login(client)
    r = client.post("/api/admin/shop/products", json={
        "slug": _u("p"), "category_id": cat.id, "warranty_months": 36,
    })
    assert r.status_code == 201, r.text
    prod = r.json()
    assert prod["warranty_months"] == 36
    assert client.get(f"/api/shop/products/{prod['slug']}").json()["warranty_months"] == 36

    # key present with null clears it; a missing key leaves it alone
    r = client.put(f"/api/admin/shop/products/{prod['id']}", json={"warranty_months": None})
    assert r.json()["warranty_months"] is None
    r = client.put(f"/api/admin/shop/products/{prod['id']}", json={"warranty_months": 12})
    r = client.put(f"/api/admin/shop/products/{prod['id']}", json={"is_new": True})
    assert r.json()["warranty_months"] == 12
    bad = client.put(f"/api/admin/shop/products/{prod['id']}", json={"warranty_months": -1})
    assert bad.status_code == 422


def test_warranty_is_a_content_field(client, make_product):
    p = make_product()
    _login(client)
    username = f"u{uuid.uuid4().hex[:10]}"
    client.post("/api/admin/users", json={"username": username, "password": "secret-pass-1", "role": "warehouse"})
    client.post("/api/auth/logout")
    _login(client, username, "secret-pass-1")
    r = client.put(f"/api/admin/shop/products/{p['id']}", json={"warranty_months": 24})
    assert r.status_code == 403


# ------------------------------------------------------------------ 2. map pin
def test_settings_store_coordinates(client):
    _login(client)
    r = client.put("/api/admin/shop/settings", json={"lat": 37.899804, "lng": 58.34857})
    assert r.status_code == 200, r.text
    assert (r.json()["lat"], r.json()["lng"]) == (37.899804, 58.34857)
    for path in ("/api/shop/settings", "/api/shop/catalog", "/api/shop/home", "/api/shop/services"):
        body = client.get(path).json()
        settings = body if path.endswith("settings") else body["settings"]
        assert (settings["lat"], settings["lng"]) == (37.899804, 58.34857), path

    assert client.put("/api/admin/shop/settings", json={"lat": 37.9}).status_code == 422
    assert client.put("/api/admin/shop/settings", json={"lat": 91, "lng": 0}).status_code == 422
    cleared = client.put("/api/admin/shop/settings", json={"lat": None, "lng": None}).json()
    assert cleared["lat"] is None and client.get("/api/shop/settings").json()["lng"] is None


# ------------------------------------------------------------------ 3. several categories
def _three_categories(db):
    tag = uuid.uuid4().hex[:10]
    parent = ShopCategory(slug=_u("pc"))
    db.add(parent)
    db.flush()
    cpu = ShopCategory(slug=_u("cpu"), parent_id=parent.id)
    gpu = ShopCategory(slug=_u("gpu"), parent_id=parent.id)
    cam = ShopCategory(slug=_u("cam"))
    db.add_all([cpu, gpu, cam])
    db.flush()
    _product(db, cpu, f"CPU {tag}")
    _product(db, cpu, f"CPU2 {tag}")
    _product(db, gpu, f"GPU {tag}")
    _product(db, cam, f"CAM {tag}")
    db.commit()
    return tag, parent, cpu, gpu, cam


def test_category_filter_takes_several_slugs(client, db):
    tag, parent, cpu, gpu, cam = _three_categories(db)
    assert _list(client, q=tag, category=f"{cpu.slug},{gpu.slug}")["total"] == 3
    assert _list(client, q=tag, category=f"{cpu.slug},{cam.slug}")["total"] == 3
    # a parent still brings its subcategories, and overlaps are not double counted
    assert _list(client, q=tag, category=f"{parent.slug},{cpu.slug}")["total"] == 3
    # server paging over the merged set
    page = _list(client, q=tag, category=f"{cpu.slug},{gpu.slug},{cam.slug}", limit=2, offset=2)
    assert page["total"] == 4 and len(page["products"]) == 2
    # the category facet ignores its own filter
    facet = _list(client, q=tag, category=f"{cpu.slug},{gpu.slug}")["facets"]["categories"]
    assert {c["slug"]: c["count"] for c in facet} == {cpu.slug: 2, gpu.slug: 1, cam.slug: 1}
    r = client.get("/api/shop/products", params={"category": f"{cpu.slug},no-such"})
    assert r.status_code == 404


def test_characteristic_filters_only_with_one_category(client, db):
    tag, parent, cpu, gpu, cam = _three_categories(db)
    attr = CategoryAttribute(category_id=cpu.id, key="socket", type="select")
    db.add(attr)
    db.commit()
    one = _list(client, q=tag, category=cpu.slug)
    assert one["facets"]["attributes"] == []  # no values set, so no facet rows
    two = _list(client, q=tag, category=f"{cpu.slug},{gpu.slug}", socket="AM5")
    assert two["total"] == 3  # the characteristic param is ignored across categories


# ------------------------------------------------------------------ 4. search
def test_search_matches_every_word_anywhere(client, db):
    tag = uuid.uuid4().hex[:10]
    cat = ShopCategory(slug=_u("cpu"))
    brand = ShopBrand(name=f"Brand{tag}")
    db.add_all([cat, brand])
    db.flush()
    ryzen = _product(db, cat, f"AMD Ryzen 7 7800X3D {tag}", brand=brand, sku=f"KM-{tag}-001")
    _product(db, cat, f"AMD Ryzen 5 7600 {tag}")
    _product(db, cat, f"Ёмкий накопитель {tag}", short="Твёрдый диск")
    _product(db, cat, f"Other {tag}", en_title=f"Wireless mouse {tag}")
    db.commit()

    def titles(q):
        return sorted(p["title"]["ru"] for p in _list(client, q=q, limit=48)["products"])

    assert titles(f"ryzen 7800 {tag}") == [f"AMD Ryzen 7 7800X3D {tag}"]
    assert titles(f"AMD 7600 {tag}") == [f"AMD Ryzen 5 7600 {tag}"]
    assert len(titles(f"amd ryzen {tag}")) == 2
    # brand name that isn't in the title
    assert titles(f"brand{tag}") == [f"AMD Ryzen 7 7800X3D {tag}"]
    # SKU, any case
    assert titles(f"km-{tag}-001".upper()) == [f"AMD Ryzen 7 7800X3D {tag}"]
    # Cyrillic case and ё/е
    assert titles(f"емкий {tag}") == [f"Ёмкий накопитель {tag}"]
    assert titles(f"ТВЕРДЫЙ {tag}") == [f"Ёмкий накопитель {tag}"]
    # other languages
    assert titles(f"wireless {tag}") == [f"Other {tag}"]
    assert titles(f"ryzen nothing-{tag}") == []
    # LIKE wildcards are literal
    assert titles(f"% {tag}") == []
    # /search uses the same matching
    found = client.get("/api/shop/search", params={"q": f"ryzen 7800 {tag}"}).json()
    assert [p["id"] for p in found["products"]] == [ryzen.id]


# ------------------------------------------------------------------ 5. value labels
def test_select_values_carry_translations(client, db):
    cat = ShopCategory(slug=_u("cpu"))
    db.add(cat)
    db.commit()
    _login(client)
    r = client.post(f"/api/admin/shop/categories/{cat.id}/attributes", json={
        "key": "igpu", "type": "select",
        "translations": [{"lang": "ru", "label": "Модель GPU"}],
        "options": [{"value": "Нет", "label": {"ru": "Нет", "tk": "Ýok", "en": "None"}}],
    })
    assert r.status_code == 201, r.text
    attr = r.json()
    assert attr["options"] == [{"value": "Нет", "label": {"ru": "Нет", "tk": "Ýok", "en": "None"}}]
    dup = client.put(f"/api/admin/shop/attributes/{attr['id']}", json={"options": [{"value": "a"}, {"value": "a"}]})
    assert dup.status_code == 422

    tag = uuid.uuid4().hex[:10]
    no_gpu = _product(db, cat, f"CPU {tag}")
    with_gpu = _product(db, cat, f"CPU2 {tag}")
    db.add_all([
        ProductAttribute(product_id=no_gpu.id, attribute_id=attr["id"], value="Нет"),
        ProductAttribute(product_id=with_gpu.id, attribute_id=attr["id"], value="Radeon Graphics"),
    ])
    db.commit()

    facet = _list(client, category=cat.slug)["facets"]["attributes"][0]
    labels = {o["value"]: o["label"] for o in facet["options"]}
    assert labels["Нет"] == {"ru": "Нет", "tk": "Ýok", "en": "None"}
    # no translation configured: the value itself in every language
    assert labels["Radeon Graphics"] == {"ru": "Radeon Graphics", "tk": "Radeon Graphics", "en": "Radeon Graphics"}
    # filtering still uses the value
    assert _list(client, category=cat.slug, igpu="Нет")["total"] == 1

    old = client.get(f"/api/shop/categories/{cat.slug}").json()["facets"][0]
    assert {o["value"]: o["label"]["tk"] for o in old["options"]}["Нет"] == "Ýok"

    detail = client.get(f"/api/shop/products/{no_gpu.slug}").json()
    row = detail["attributes"][0]
    assert row["value"] == "Нет" and row["value_label"]["tk"] == "Ýok"
    assert row["label"] == {"ru": "Модель GPU"}

    # a missing language falls back to the Russian label
    client.put(f"/api/admin/shop/attributes/{attr['id']}", json={"options": [{"value": "Нет", "label": {"ru": "Нет"}}]})
    detail = client.get(f"/api/shop/products/{no_gpu.slug}").json()
    assert detail["attributes"][0]["value_label"] == {"ru": "Нет", "tk": "Нет", "en": "Нет"}

    # number attributes keep no labels
    r = client.put(f"/api/admin/shop/attributes/{attr['id']}", json={"type": "number"})
    assert r.json()["options"] == []


# ------------------------------------------------------------------ 6. page image
def test_page_image_upload_and_public(client, db):
    page = Page(slug=_u("about"))
    page.translations.append(PageTranslation(lang="ru", title="Наш магазин"))
    db.add(page)
    db.commit()
    assert client.get(f"/api/shop/pages/{page.slug}").json()["image"] is None

    _login(client)
    r = client.post(f"/api/admin/site/pages/{page.id}/image", files={"file": ("store.png", PNG, "image/png")})
    assert r.status_code == 200, r.text
    image = r.json()["image"]
    assert image.startswith("pages/")
    assert client.get(f"/api/shop/pages/{page.slug}").json()["image"] == image
    # saving the texts keeps the picture
    client.put(f"/api/admin/site/pages/{page.id}", json={"slug": page.slug, "translations": []})
    assert client.get(f"/api/admin/site/pages/{page.id}").json()["image"] == image

    assert client.delete(f"/api/admin/site/pages/{page.id}/image").json()["image"] is None
    assert client.get(f"/api/shop/pages/{page.slug}").json()["image"] is None


# ------------------------------------------------------------------ smaller notes
def test_category_facet_follows_admin_order(client, db):
    tag = uuid.uuid4().hex[:10]
    top_b = ShopCategory(slug=f"a-{tag}", sort_order=900)  # slug sorts first, order last
    top_a = ShopCategory(slug=f"z-{tag}", sort_order=800)
    db.add_all([top_a, top_b])
    db.flush()
    kid_2 = ShopCategory(slug=f"b-{tag}", parent_id=top_a.id, sort_order=2)
    kid_1 = ShopCategory(slug=f"y-{tag}", parent_id=top_a.id, sort_order=1)
    db.add_all([kid_1, kid_2])
    db.flush()
    for c in (top_a, top_b, kid_1, kid_2):
        _product(db, c, f"Item {tag}")
    db.commit()
    facet = _list(client, q=tag)["facets"]["categories"]
    assert [c["slug"] for c in facet] == [f"z-{tag}", f"y-{tag}", f"b-{tag}", f"a-{tag}"]
    assert facet[1]["sort_order"] == 1


def test_light_category_list(client, db):
    parent = ShopCategory(slug=_u("pc"))
    db.add(parent)
    db.flush()
    child = ShopCategory(slug=_u("cpu"), parent_id=parent.id)
    hidden = ShopCategory(slug=_u("off"), enabled=False)
    db.add_all([child, hidden])
    db.flush()
    _product(db, child, "x")
    db.commit()
    body = client.get("/api/shop/categories").json()
    assert "products" not in body
    by_slug = {c["slug"]: c for c in body["categories"]}
    assert by_slug[child.slug]["parent_id"] == parent.id
    assert by_slug[child.slug]["product_count"] == 1
    assert hidden.slug not in by_slug
    # same shape as the catalog's list
    catalog = {c["slug"]: c for c in client.get("/api/shop/catalog").json()["categories"]}
    assert catalog[child.slug] == by_slug[child.slug]


def test_products_rate_limit(client):
    for _ in range(PRODUCTS_RATE):
        assert client.get("/api/shop/products", params={"limit": 1}).status_code == 200
    assert client.get("/api/shop/products", params={"limit": 1}).status_code == 429
