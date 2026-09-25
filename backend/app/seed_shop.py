"""Seed demo shop data: categories, filter attributes and products.

Idempotent — wipes existing shop catalog (categories/products/attributes), keeps
orders. No image files are seeded, so product cards show the "KM" placeholder
until photos are uploaded in /admin/shop/products/{id}/images.

Run from backend/:  python -m app.seed_shop
"""
from .db import SessionLocal, init_db
from .models import (
    CategoryAttribute,
    CategoryAttributeTranslation,
    Product,
    ProductAttribute,
    ProductImage,
    ProductReview,
    ProductTranslation,
    ShopBrand,
    ShopCategory,
    ShopCategoryTranslation,
    ShopService,
    ShopServiceTranslation,
    ShopSettings,
)

LANGS = ("ru", "tk", "en")


def _attr(key: str, type_: str, unit: str, ru: str, tk: str, en: str) -> dict:
    return {"key": key, "type": type_, "unit": unit, "labels": {"ru": ru, "tk": tk, "en": en}}


def _names(ru: str, tk: str, en: str) -> dict:
    return {"ru": ru, "tk": tk, "en": en}


# Catalog mirrors the Figma design (nav: Компьютеры / Безопасность / Сетевое
# оборудование). Each category: slug, names, optional parent, attribute defs,
# products. Product: slug, price, optional old_price/stock_qty/is_new/brand,
# title and short (a plain string is used for every language), attrs, and
# optional body/specs (ru only; tk/en fall back to empty).
DATA = [
    {"slug": "computers", "names": _names("Компьютеры", "Kompýuterler", "Computers"),
     "attributes": [], "products": []},
    {"slug": "cpu", "parent": "computers",
     "names": _names("Процессоры (CPU)", "Prosessorlar (CPU)", "Processors (CPU)"),
     "attributes": [
         _attr("socket", "select", "", "Сокет", "Soket", "Socket"),
         _attr("cores", "number", "", "Ядра", "Ýadrolar", "Cores"),
     ],
     "products": [
         {"slug": "amd-ryzen-7-7800x3d", "brand": "AMD", "price": 6990, "stock_qty": 4,
          "title": "AMD Ryzen 7 7800X3D", "short": "8 ядер, AM5, 3D V-Cache",
          "attrs": {"socket": "AM5", "cores": "8"}},
         {"slug": "intel-core-i5-13400f", "brand": "Intel", "price": 2890,
          "title": "Intel Core i5-13400F", "short": "10 ядер, LGA1700",
          "attrs": {"socket": "LGA1700", "cores": "10"}},
         {"slug": "intel-core-i7-14700k", "brand": "Intel", "price": 5490, "old_price": 5990,
          "title": "Intel Core i7-14700K", "short": "20 ядер, LGA1700",
          "attrs": {"socket": "LGA1700", "cores": "20"}},
     ]},
    {"slug": "motherboards", "parent": "computers",
     "names": _names("Материнские платы", "Ene platalar", "Motherboards"),
     "attributes": [
         _attr("socket", "select", "", "Сокет", "Soket", "Socket"),
         _attr("form_factor", "select", "", "Форм-фактор", "Forma faktory", "Form factor"),
     ],
     "products": [
         {"slug": "msi-mag-b650-tomahawk-wifi", "brand": "MSI", "price": 3190,
          "title": "MSI MAG B650 Tomahawk WiFi", "short": "AM5, ATX, Wi‑Fi 6E",
          "attrs": {"socket": "AM5", "form_factor": "ATX"}},
         {"slug": "asus-tuf-gaming-b760m-plus", "brand": "ASUS", "price": 2290,
          "title": "ASUS TUF Gaming B760M-Plus", "short": "LGA1700, mATX, DDR5",
          "attrs": {"socket": "LGA1700", "form_factor": "mATX"}},
     ]},
    {"slug": "ram", "parent": "computers",
     "names": _names("Оперативная память (RAM)", "Operatiw ýat (RAM)", "Memory (RAM)"),
     "attributes": [
         _attr("capacity", "number", "GB", "Объём", "Göwrüm", "Capacity"),
         _attr("type", "select", "", "Тип", "Görnüşi", "Type"),
     ],
     "products": [
         {"slug": "gskill-trident-z5-rgb-32gb-ddr5-6400", "brand": "G.Skill", "price": 1890, "is_new": True,
          "title": "G.Skill Trident Z5 RGB 32GB DDR5-6400", "short": "2×16 ГБ, CL32",
          "attrs": {"capacity": "32", "type": "DDR5"}},
         {"slug": "kingston-fury-beast-16gb-ddr4-3200", "brand": "Kingston", "price": 890,
          "title": "Kingston Fury Beast 16GB DDR4-3200", "short": "2×8 ГБ, CL16",
          "attrs": {"capacity": "16", "type": "DDR4"}},
     ]},
    {"slug": "ssd", "parent": "computers",
     "names": _names("Твердотельные накопители (SSD)", "SSD disklar", "Solid-state drives (SSD)"),
     "attributes": [
         _attr("capacity", "number", "GB", "Объём", "Göwrüm", "Capacity"),
         _attr("interface", "select", "", "Интерфейс", "Interfeýs", "Interface"),
     ],
     "products": [
         {"slug": "wd-black-sn850x-2tb", "brand": "WD", "price": 2690,
          "title": "WD Black SN850X 2TB", "short": "NVMe PCIe 4.0, до 7300 МБ/с",
          "attrs": {"capacity": "2048", "interface": "NVMe PCIe 4.0"}},
         {"slug": "samsung-990-pro-1tb", "brand": "Samsung", "price": 1990,
          "title": "Samsung 990 Pro 1TB", "short": "NVMe PCIe 4.0",
          "attrs": {"capacity": "1024", "interface": "NVMe PCIe 4.0"}},
         {"slug": "kingston-nv2-1tb", "brand": "Kingston", "price": 990, "old_price": 1190,
          "title": "Kingston NV2 1TB", "short": "NVMe PCIe 4.0",
          "attrs": {"capacity": "1024", "interface": "NVMe PCIe 4.0"}},
     ]},
    {"slug": "psu", "parent": "computers",
     "names": _names("Блоки питания (PSU)", "Energiýa bloklary (PSU)", "Power supplies (PSU)"),
     "attributes": [_attr("power", "number", "W", "Мощность", "Kuwwat", "Power")],
     "products": [
         {"slug": "corsair-rm850x", "brand": "Corsair", "price": 2190,
          "title": "Corsair RM850x", "short": "850 Вт, 80+ Gold, модульный",
          "attrs": {"power": "850"}},
         {"slug": "deepcool-pk650d", "brand": "Deepcool", "price": 990,
          "title": "Deepcool PK650D", "short": "650 Вт, 80+ Bronze",
          "attrs": {"power": "650"}},
     ]},
    {"slug": "cases", "parent": "computers",
     "names": _names("Корпуса", "Korpuslar", "Cases"),
     "attributes": [_attr("form_factor", "select", "", "Форм-фактор", "Forma faktory", "Form factor")],
     "products": [
         {"slug": "lian-li-lancool-216-argb-white", "brand": "LIAN LI", "price": 1800, "is_new": True,
          "title": "LIAN LI Lancool 216 ARGB White", "short": "ATX, 2×160 мм ARGB",
          "attrs": {"form_factor": "ATX"}},
         {"slug": "nzxt-h5-flow", "brand": "NZXT", "price": 1590,
          "title": "NZXT H5 Flow", "short": "ATX, сетчатая панель",
          "attrs": {"form_factor": "ATX"}},
     ]},
    {"slug": "builds", "parent": "computers",
     "names": _names("Готовые сборки", "Taýýar ýygnamalar", "Ready-made PCs"),
     "attributes": [_attr("cpu", "select", "", "Процессор", "Prosessor", "CPU")],
     "products": [
         {"slug": "km-gamer-ryzen-7-7800x3d", "price": 19000, "is_new": True, "stock_qty": 2,
          "title": "KM Gamer · Ryzen 7 7800X3D", "short": "Ryzen 7 7800X3D, 32 ГБ DDR5, SSD 2 ТБ",
          "body": "Готовый компьютер, собранный и протестированный в нашем магазине. "
                  "Установим систему и драйверы, выдадим с гарантией.",
          "attrs": {"cpu": "AMD Ryzen 7 7800X3D"}},
         {"slug": "km-office-core-i5", "price": 7500,
          "title": "KM Office · Core i5-13400F", "short": "Core i5, 16 ГБ, SSD 1 ТБ",
          "attrs": {"cpu": "Intel Core i5-13400F"}},
     ]},
    {"slug": "security", "names": _names("Безопасность", "Howpsuzlyk", "Security"),
     "attributes": [], "products": []},
    {"slug": "cameras", "parent": "security",
     "names": _names("Видеокамеры", "Wideokameralar", "Cameras"),
     "attributes": [
         _attr("resolution", "select", "MP", "Разрешение", "Çözgüt", "Resolution"),
         _attr("type", "select", "", "Тип", "Görnüşi", "Type"),
     ],
     "products": [
         {"slug": "hikvision-ds-2cd1043g2-i", "brand": "Hikvision", "price": 850, "old_price": 990, "stock_qty": 12,
          "title": "Hikvision DS-2CD1043G2-I", "short": "4 МП, уличная, ИК до 30 м",
          "attrs": {"resolution": "4", "type": "Цилиндрическая"}},
         {"slug": "dahua-ipc-hdw1230t1-s5", "brand": "Dahua", "price": 650,
          "title": "Dahua IPC-HDW1230T1-S5", "short": "2 МП, купольная, ИК до 30 м",
          "attrs": {"resolution": "2", "type": "Купольная"}},
         {"slug": "hikvision-ds-2de4425iw-de", "brand": "Hikvision", "price": 4300,
          "title": "Hikvision DS-2DE4425IW-DE", "short": "4 МП, PTZ, 25× зум",
          "attrs": {"resolution": "4", "type": "PTZ"}},
     ]},
    {"slug": "sensors", "parent": "security",
     "names": _names("Датчики", "Datçikler", "Sensors"),
     "attributes": [_attr("type", "select", "", "Тип", "Görnüşi", "Type")],
     "products": [
         {"slug": "rubezh-ip-212-64-prima", "brand": "Рубеж", "price": 180,
          "title": "Рубеж ИП 212-64 Прима", "short": "Дымовой извещатель, адресный",
          "attrs": {"type": "Дымовой"}},
         {"slug": "bolid-s2000-ip", "brand": "Болид", "price": 150,
          "title": "Болид С2000-ИП", "short": "Тепловой извещатель, адресный",
          "attrs": {"type": "Тепловой"}},
         {"slug": "bolid-signal-20p", "brand": "Болид", "price": 1200, "is_new": True,
          "title": "Болид Сигнал-20П", "short": "Прибор приёмно-контрольный, 20 шлейфов",
          "attrs": {"type": "Прибор"}},
     ]},
    {"slug": "face-control", "parent": "security",
     "names": _names("Терминалы Face Control", "Face Control terminallary", "Face Control terminals"),
     "attributes": [_attr("faces", "number", "", "База лиц", "Ýüz binýady", "Face capacity")],
     "products": [
         {"slug": "hikvision-face-control-hk-043", "brand": "Hikvision", "price": 1200, "old_price": 1990,
          "title": "HIKVISION Face Control HK-043", "short": "Экран 4.3\", Wi‑Fi, IP65",
          "body": "Терминал распознавания лиц для учёта рабочего времени и контроля доступа. "
                  "Быстрое распознавание, работа с картами.",
          "specs": [
              {"label": "База лиц", "value": "3 000"},
              {"label": "Экран", "value": "4.3\""},
              {"label": "Подключение", "value": "Wi‑Fi, TCP/IP"},
              {"label": "Защита", "value": "IP65"},
              {"label": "Гарантия", "value": "24 мес."},
          ],
          "attrs": {"faces": "3000"}},
         {"slug": "dahua-asi7213x-t1", "brand": "Dahua", "price": 1500,
          "title": "Dahua ASI7213X-T1", "short": "Экран 7\", карты, температура",
          "attrs": {"faces": "10000"}},
     ]},
    {"slug": "network", "names": _names("Сетевое оборудование", "Tor enjamlary", "Networking"),
     "attributes": [], "products": []},
    {"slug": "switches", "parent": "network",
     "names": _names("Коммутаторы", "Kommutatorlar", "Switches"),
     "attributes": [_attr("ports", "number", "", "Порты", "Portlar", "Ports")],
     "products": [
         {"slug": "tp-link-tl-sg108", "brand": "TP-Link", "price": 350,
          "title": "TP-Link TL-SG108", "short": "8 портов, Gigabit, неуправляемый",
          "attrs": {"ports": "8"}},
         {"slug": "ubiquiti-usw-lite-8-poe", "brand": "Ubiquiti", "price": 1650,
          "title": "Ubiquiti USW-Lite-8-PoE", "short": "8 портов, 4 PoE+, управляемый",
          "attrs": {"ports": "8"}},
         {"slug": "mikrotik-crs326-24g-2s-in", "brand": "MikroTik", "price": 3200,
          "title": "MikroTik CRS326-24G-2S+IN", "short": "24 порта Gigabit, 2×SFP+",
          "attrs": {"ports": "24"}},
     ]},
    {"slug": "routers", "parent": "network",
     "names": _names("Роутеры", "Routerler", "Routers"),
     "attributes": [_attr("wifi", "select", "", "Wi‑Fi", "Wi‑Fi", "Wi‑Fi")],
     "products": [
         {"slug": "tp-link-archer-ax55", "brand": "TP-Link", "price": 1100, "is_new": True,
          "title": "TP-Link Archer AX55", "short": "Wi‑Fi 6, AX3000",
          "attrs": {"wifi": "Wi‑Fi 6"}},
         {"slug": "keenetic-giga-kn-1012", "brand": "Keenetic", "price": 1450,
          "title": "Keenetic Giga KN-1012", "short": "Wi‑Fi 6, AX1800, SFP",
          "attrs": {"wifi": "Wi‑Fi 6"}},
         {"slug": "mikrotik-hap-ax2", "brand": "MikroTik", "price": 1350,
          "title": "MikroTik hAP ax²", "short": "Wi‑Fi 6, 5 портов Gigabit",
          "attrs": {"wifi": "Wi‑Fi 6"}},
     ]},
]


# Category-attached services (priced add-ons). Keyed by category slug.
# service: slug, price, icon, titles{lang}, short{lang}.
SERVICES = {
    "computers": [
        {"slug": "pc-build", "price": 250, "icon": "wrench",
         "titles": _names("Сборка ПК", "Kompýuter ýygnamak", "PC assembly"),
         "short": _names("Сборка, установка ОС и тестирование", "Ýygnamak, OS gurnamak we barlag",
                         "Assembly, OS install and testing")},
        {"slug": "pc-maintenance", "price": 150, "icon": "refresh",
         "titles": _names("Профилактика", "Profilaktika", "Maintenance"),
         "short": _names("Чистка, замена термопасты, проверка", "Arassalamak, termopasta çalyşmak",
                         "Cleaning, thermal paste, check-up")},
        {"slug": "pc-repair", "price": 100, "icon": "wrench",
         "titles": _names("Ремонт", "Abatlamak", "Repair"),
         "short": _names("Диагностика и замена комплектующих", "Diagnostika we bölekleri çalyşmak",
                         "Diagnostics and part replacement")},
    ],
    "security": [
        {"slug": "cam-install", "price": 500, "icon": "wrench",
         "titles": _names("Монтаж видеонаблюдения", "Wideo gözegçiligi gurnamak", "CCTV installation"),
         "short": _names("Камеры, регистратор, просмотр со смартфона", "Kameralar, registrator, smartfondan görmek",
                         "Cameras, recorder, phone viewing")},
    ],
    "network": [
        {"slug": "net-setup", "price": 400, "icon": "settings",
         "titles": _names("Установка и настройка сетевого оборудования", "Tor enjamlaryny gurnamak we sazlamak",
                          "Network equipment setup"),
         "short": _names("Проектирование, монтаж и администрирование сетей", "Tor taslamasy, gurnamak we dolandyrmak",
                         "Network design, installation and administration")},
    ],
}


# Brands strip / brands page, in the order the design shows them. Cyrillic
# names need an explicit slug (slugify keeps ASCII only).
BRANDS = [
    "Hikvision", "Kingston", "Dahua", "TP-Link", "Intel", "AMD", "ASUS", "LIAN LI",
    ("Болид", "bolid"), "Ubiquiti", "Corsair", "MSI", "WD", "Seagate", "Deepcool",
    ("Рубеж", "rubezh"), "MikroTik", "Logitech", "G.Skill", "Gigabyte", "Samsung", "Crucial",
    "Toshiba", "be quiet!", "Seasonic", "NZXT", "Keenetic", "Mercusys", "TLK", "Hyperline",
    "Keychron", "Dell", "HP",
]

SETTINGS = {
    "phone": "+993 12 21 63 14",
    "whatsapp": "",
    "email": "kanagat22122022@gmail.com",
    "address_ru": "г. Ашхабад, ул. Московская, дом 142, 1-ый этаж",
    "address_tk": "Aşgabat ş., Moskowskaýa köçesi, 142-nji jaý, 1-nji gat",
    "address_en": "142 Moskovskaya St., 1st floor, Ashgabat",
    "hours_ru": "Пн–Сб: 9:00–19:00, Вс — выходной",
    "hours_tk": "Db–Şb: 9:00–19:00, Ýb — dynç güni",
    "hours_en": "Mon–Sat: 9:00–19:00, Sun — closed",
}


# sample reviews keyed by product slug: (name, rating, text, status)
REVIEWS = {
    "km-gamer-ryzen-7-7800x3d": [
        ("Мердан", 5, "Отличная сборка, всё летает.", "approved"),
        ("Айна", 4, "Хороший ПК, доставили быстро.", "approved"),
    ],
    "hikvision-ds-2cd1043g2-i": [
        ("Сердар", 5, "Картинка чёткая даже ночью.", "approved"),
        ("Гость", 3, "Нормально за свои деньги.", "pending"),
    ],
    "tp-link-archer-ax55": [("Байрам", 5, "Wi-Fi стал гораздо стабильнее.", "approved")],
}


def _per_lang(v) -> dict:
    return v if isinstance(v, dict) else {lang: v for lang in LANGS}


def _wipe(db) -> None:
    for model in (
        ProductReview,
        ProductAttribute, ProductImage, ProductTranslation, Product,
        ShopServiceTranslation, ShopService,
        CategoryAttributeTranslation, CategoryAttribute,
        ShopCategoryTranslation, ShopCategory,
        ShopBrand,
    ):
        db.query(model).delete()
    db.commit()


def seed_shop() -> None:
    init_db()
    db = SessionLocal()
    try:
        _wipe(db)
        brand_by_name: dict[str, ShopBrand] = {}
        for b_order, entry in enumerate(BRANDS):
            name, slug = entry if isinstance(entry, tuple) else (entry, None)
            brand = ShopBrand(name=name, sort_order=b_order, enabled=True)
            if slug:
                brand.slug = slug
            db.add(brand)
            brand_by_name[name] = brand
        n_prod = 0
        by_slug: dict[str, ShopCategory] = {}
        for c_order, c in enumerate(DATA):
            cat = ShopCategory(slug=c["slug"], sort_order=c_order, enabled=True)
            by_slug[c["slug"]] = cat
            for lang in LANGS:
                cat.translations.append(ShopCategoryTranslation(lang=lang, name=c["names"][lang]))

            attr_by_key: dict[str, CategoryAttribute] = {}
            for a_order, a in enumerate(c["attributes"]):
                attr = CategoryAttribute(
                    key=a["key"], type=a["type"], unit=a["unit"] or None,
                    filterable=True, sort_order=a_order,
                )
                for lang in LANGS:
                    attr.translations.append(CategoryAttributeTranslation(lang=lang, label=a["labels"][lang]))
                cat.attributes.append(attr)
                attr_by_key[a["key"]] = attr

            for p_order, p in enumerate(c["products"]):
                prod = Product(
                    slug=p["slug"], price=p["price"], old_price=p.get("old_price"),
                    currency="TMT", in_stock=p.get("in_stock", True), stock_qty=p.get("stock_qty"),
                    is_new=p.get("is_new", False), sort_order=p_order, enabled=True,
                )
                if p.get("brand"):
                    prod.brand = brand_by_name[p["brand"]]
                titles, shorts = _per_lang(p["title"]), _per_lang(p["short"])
                for lang in LANGS:
                    ru = lang == "ru"
                    prod.translations.append(ProductTranslation(
                        lang=lang, title=titles[lang], short=shorts[lang],
                        body=p.get("body", "") if ru else "", specs=p.get("specs", []) if ru else [],
                    ))
                for key, value in p["attrs"].items():
                    attr = attr_by_key[key]
                    num = None
                    if attr.type == "number":
                        try:
                            num = float(value)
                        except ValueError:
                            num = None
                    prod.attributes.append(ProductAttribute(attribute=attr, value=value, num_value=num))
                cat.products.append(prod)
                n_prod += 1

            for s_order, s in enumerate(SERVICES.get(c["slug"], [])):
                svc = ShopService(
                    slug=s["slug"], price=s["price"], currency="TMT",
                    icon=s["icon"], enabled=True, sort_order=s_order,
                )
                for lang in LANGS:
                    svc.translations.append(ShopServiceTranslation(
                        lang=lang, title=s["titles"][lang], short=s["short"][lang],
                    ))
                cat.services.append(svc)

            db.add(cat)

        # wire parent → child relationships now that all categories exist
        for c in DATA:
            parent_slug = c.get("parent")
            if parent_slug:
                by_slug[c["slug"]].parent = by_slug[parent_slug]

        # sample reviews need product ids → flush inserts first
        db.flush()
        prod_by_slug = {p.slug: p for cat in by_slug.values() for p in cat.products}
        for slug, items in REVIEWS.items():
            p = prod_by_slug.get(slug)
            if p is None:
                continue
            for name, rating, text, status in items:
                db.add(ProductReview(product_id=p.id, name=name, rating=rating, text=text, status=status))

        # contacts singleton (id=1) — only seed defaults if absent, so re-seeding
        # the catalog doesn't clobber contacts an admin has already edited
        if db.get(ShopSettings, 1) is None:
            db.add(ShopSettings(id=1, **SETTINGS))

        db.commit()
        print(f"Seeded {len(DATA)} categories, {n_prod} products, {len(BRANDS)} brands.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_shop()
