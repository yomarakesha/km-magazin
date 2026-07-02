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

# Each category: slug, names per lang, attribute defs, products.
# Attribute def: key, type, unit, labels{lang}.
# Product: slug, price, in_stock, titles{lang}, short{lang}, attrs{key: value}.
DATA = [
    {
        "slug": "computers",
        "names": {"ru": "Компьютеры", "tk": "Kompýuterler", "en": "Computers"},
        "attributes": [
            {"key": "cpu", "type": "select", "unit": "", "labels": {"ru": "Процессор", "tk": "Prosessor", "en": "CPU"}},
            {"key": "ram", "type": "number", "unit": "GB", "labels": {"ru": "Память", "tk": "Ýat", "en": "RAM"}},
            {"key": "gpu", "type": "select", "unit": "", "labels": {"ru": "Видеокарта", "tk": "Wideokarta", "en": "GPU"}},
            {"key": "storage", "type": "number", "unit": "GB", "labels": {"ru": "Накопитель", "tk": "Disk", "en": "Storage"}},
        ],
        "products": [
            {"slug": "pc-gamer-pro", "price": 27000, "in_stock": True, "stock_qty": 3,
             "titles": {"ru": "Игровой ПК Gamer Pro", "tk": "Oýun kompýuteri Gamer Pro", "en": "Gamer Pro Desktop"},
             "short": {"ru": "Core i7, RTX 4070, 32 ГБ", "tk": "Core i7, RTX 4070, 32 GB", "en": "Core i7, RTX 4070, 32 GB"},
             "attrs": {"cpu": "Core i7", "ram": "32", "gpu": "RTX 4070", "storage": "1024"}},
            {"slug": "pc-gamer-base", "price": 18500, "old_price": 19900, "in_stock": True,
             "titles": {"ru": "Игровой ПК Gamer Base", "tk": "Oýun kompýuteri Gamer Base", "en": "Gamer Base Desktop"},
             "short": {"ru": "Core i5, RTX 4060, 16 ГБ", "tk": "Core i5, RTX 4060, 16 GB", "en": "Core i5, RTX 4060, 16 GB"},
             "attrs": {"cpu": "Core i5", "ram": "16", "gpu": "RTX 4060", "storage": "512"}},
            {"slug": "pc-office", "price": 7500, "in_stock": True,
             "titles": {"ru": "Офисный ПК Office", "tk": "Ofis kompýuteri", "en": "Office Desktop"},
             "short": {"ru": "Core i3, 8 ГБ, SSD 256", "tk": "Core i3, 8 GB, SSD 256", "en": "Core i3, 8 GB, SSD 256"},
             "attrs": {"cpu": "Core i3", "ram": "8", "gpu": "Intel UHD", "storage": "256"}},
            {"slug": "pc-ryzen-work", "price": 9800, "in_stock": False,
             "titles": {"ru": "Рабочий ПК Ryzen", "tk": "Iş kompýuteri Ryzen", "en": "Ryzen Workstation"},
             "short": {"ru": "Ryzen 5, 16 ГБ, SSD 512", "tk": "Ryzen 5, 16 GB, SSD 512", "en": "Ryzen 5, 16 GB, SSD 512"},
             "attrs": {"cpu": "Ryzen 5", "ram": "16", "gpu": "Radeon Vega", "storage": "512"}},
        ],
    },
    {
        "slug": "cameras",
        "names": {"ru": "Камеры", "tk": "Kameralar", "en": "Cameras"},
        "attributes": [
            {"key": "resolution", "type": "select", "unit": "MP", "labels": {"ru": "Разрешение", "tk": "Çözgüt", "en": "Resolution"}},
            {"key": "type", "type": "select", "unit": "", "labels": {"ru": "Тип", "tk": "Görnüşi", "en": "Type"}},
        ],
        "products": [
            {"slug": "cam-dome-2mp", "price": 850, "old_price": 990, "in_stock": True, "stock_qty": 12,
             "titles": {"ru": "Камера купольная 2 МП", "tk": "Gümmez kamera 2 MP", "en": "Dome Camera 2 MP"},
             "short": {"ru": "Внутренняя, ИК-подсветка", "tk": "Içerki, IR yşyk", "en": "Indoor, IR night vision"},
             "attrs": {"resolution": "2", "type": "Купольная"}},
            {"slug": "cam-bullet-4mp", "price": 1200, "in_stock": True,
             "titles": {"ru": "Камера цилиндрическая 4 МП", "tk": "Silindr kamera 4 MP", "en": "Bullet Camera 4 MP"},
             "short": {"ru": "Уличная, IP67", "tk": "Daşarky, IP67", "en": "Outdoor, IP67"},
             "attrs": {"resolution": "4", "type": "Цилиндрическая"}},
            {"slug": "cam-ptz-8mp", "price": 4300, "in_stock": False,
             "titles": {"ru": "Камера PTZ 8 МП", "tk": "PTZ kamera 8 MP", "en": "PTZ Camera 8 MP"},
             "short": {"ru": "Поворотная, 20x зум", "tk": "Aýlanýan, 20x zum", "en": "Pan-tilt, 20x zoom"},
             "attrs": {"resolution": "8", "type": "PTZ"}},
        ],
    },
    {
        "slug": "network",
        "names": {"ru": "Сетевое оборудование", "tk": "Tor enjamlary", "en": "Networking"},
        "attributes": [
            {"key": "ports", "type": "number", "unit": "", "labels": {"ru": "Порты", "tk": "Portlar", "en": "Ports"}},
            {"key": "speed", "type": "select", "unit": "", "labels": {"ru": "Скорость", "tk": "Tizlik", "en": "Speed"}},
        ],
        "products": [
            {"slug": "switch-8", "price": 650, "in_stock": True,
             "titles": {"ru": "Коммутатор 8 портов", "tk": "Kommutator 8 port", "en": "8-Port Switch"},
             "short": {"ru": "Gigabit, неуправляемый", "tk": "Gigabit", "en": "Gigabit, unmanaged"},
             "attrs": {"ports": "8", "speed": "1 Гбит"}},
            {"slug": "switch-24", "price": 2100, "in_stock": True,
             "titles": {"ru": "Коммутатор 24 порта", "tk": "Kommutator 24 port", "en": "24-Port Switch"},
             "short": {"ru": "Gigabit, управляемый", "tk": "Gigabit, dolandyrylýan", "en": "Gigabit, managed"},
             "attrs": {"ports": "24", "speed": "1 Гбит"}},
            {"slug": "router-wifi6", "price": 1450, "in_stock": True,
             "titles": {"ru": "Роутер Wi-Fi 6", "tk": "Wi-Fi 6 router", "en": "Wi-Fi 6 Router"},
             "short": {"ru": "Двухдиапазонный, AX3000", "tk": "Iki diapazon, AX3000", "en": "Dual-band, AX3000"},
             "attrs": {"ports": "4", "speed": "1 Гбит"}},
        ],
    },
    {
        "slug": "noutbuki",
        "parent": "computers",
        "names": {"ru": "Ноутбуки", "tk": "Noutbuklar", "en": "Laptops"},
        "attributes": [
            {"key": "cpu", "type": "select", "unit": "", "labels": {"ru": "Процессор", "tk": "Prosessor", "en": "CPU"}},
            {"key": "ram", "type": "number", "unit": "GB", "labels": {"ru": "Память", "tk": "Ýat", "en": "RAM"}},
            {"key": "storage", "type": "number", "unit": "GB", "labels": {"ru": "Накопитель", "tk": "Disk", "en": "Storage"}},
            {"key": "screen", "type": "number", "unit": "\"", "labels": {"ru": "Экран", "tk": "Ekran", "en": "Screen"}},
        ],
        "products": [
            {"slug": "laptop-pro-15", "price": 21000, "in_stock": True,
             "titles": {"ru": "Ноутбук Pro 15", "tk": "Noutbuk Pro 15", "en": "Laptop Pro 15"},
             "short": {"ru": "Core i7, 16 ГБ, SSD 1 ТБ", "tk": "Core i7, 16 GB, SSD 1 TB", "en": "Core i7, 16 GB, 1 TB SSD"},
             "attrs": {"cpu": "Core i7", "ram": "16", "storage": "1024", "screen": "15.6"}},
            {"slug": "laptop-air-14", "price": 14500, "in_stock": True,
             "titles": {"ru": "Ноутбук Air 14", "tk": "Noutbuk Air 14", "en": "Laptop Air 14"},
             "short": {"ru": "Core i5, 8 ГБ, SSD 512", "tk": "Core i5, 8 GB, SSD 512", "en": "Core i5, 8 GB, 512 SSD"},
             "attrs": {"cpu": "Core i5", "ram": "8", "storage": "512", "screen": "14"}},
            {"slug": "laptop-ryzen-16", "price": 12800, "in_stock": False,
             "titles": {"ru": "Ноутбук Ryzen 16", "tk": "Noutbuk Ryzen 16", "en": "Laptop Ryzen 16"},
             "short": {"ru": "Ryzen 7, 16 ГБ, SSD 512", "tk": "Ryzen 7, 16 GB, SSD 512", "en": "Ryzen 7, 16 GB, 512 SSD"},
             "attrs": {"cpu": "Ryzen 7", "ram": "16", "storage": "512", "screen": "16"}},
        ],
    },
]


# Category-attached services (priced add-ons). Keyed by category slug.
# service: slug, price, icon, titles{lang}, short{lang}.
SERVICES = {
    "computers": [
        {"slug": "pc-repair", "price": 300, "icon": "wrench",
         "titles": {"ru": "Ремонт компьютера", "tk": "Kompýuter abatlamak", "en": "PC repair"},
         "short": {"ru": "Диагностика и ремонт", "tk": "Diagnostika we abatlaýyş", "en": "Diagnostics & repair"}},
        {"slug": "os-reinstall", "price": 150, "icon": "refresh",
         "titles": {"ru": "Переустановка ОС", "tk": "OS gaýtadan gurmak", "en": "OS reinstall"},
         "short": {"ru": "Windows + драйверы + программы", "tk": "Windows + draýwerler", "en": "Windows + drivers + apps"}},
    ],
    "cameras": [
        {"slug": "cam-install", "price": 500, "icon": "wrench",
         "titles": {"ru": "Монтаж камеры", "tk": "Kamera gurnamak", "en": "Camera installation"},
         "short": {"ru": "Установка и подключение", "tk": "Gurnama we birikdirme", "en": "Mount & wiring"}},
        {"slug": "cam-setup", "price": 200, "icon": "settings",
         "titles": {"ru": "Настройка видеонаблюдения", "tk": "Wideo gözegçiligi sazlamak", "en": "CCTV setup"},
         "short": {"ru": "ПО, запись, удалённый доступ", "tk": "Programma, ýazgy, uzak elýeterlik", "en": "Software, recording, remote access"}},
    ],
    "network": [
        {"slug": "net-setup", "price": 250, "icon": "settings",
         "titles": {"ru": "Настройка сети", "tk": "Tor sazlamak", "en": "Network setup"},
         "short": {"ru": "Роутеры, Wi-Fi, VLAN", "tk": "Routerler, Wi-Fi, VLAN", "en": "Routers, Wi-Fi, VLAN"}},
        {"slug": "cabling", "price": 400, "icon": "wrench",
         "titles": {"ru": "Прокладка кабеля", "tk": "Kabel çekmek", "en": "Cabling"},
         "short": {"ru": "СКС, монтаж, обжим", "tk": "Gurnama, birikdirme", "en": "Structured cabling & crimping"}},
    ],
    "noutbuki": [
        {"slug": "laptop-cleanup", "price": 180, "icon": "wrench",
         "titles": {"ru": "Чистка ноутбука", "tk": "Noutbuk arassalamak", "en": "Laptop cleaning"},
         "short": {"ru": "Термопаста, чистка от пыли", "tk": "Ýylylyk pastasy, tozan arassalaýyş", "en": "Thermal paste & dust cleanup"}},
    ],
}


BRANDS = ["Hikvision", "Dell", "HP", "TP-Link", "Asus", "Lenovo", "Ubiquiti", "Logitech"]

SETTINGS = {
    "phone": "+993 12 00-00-00",
    "whatsapp": "99312000000",
    "address_ru": "Ашхабад, ул. ...",
    "address_tk": "Aşgabat, ... köç.",
    "address_en": "Ashgabat, ... str.",
}


# sample reviews keyed by product slug: (name, rating, text, status)
REVIEWS = {
    "pc-gamer-pro": [
        ("Мердан", 5, "Отличная сборка, всё летает.", "approved"),
        ("Айна", 4, "Хороший ПК, доставили быстро.", "approved"),
    ],
    "cam-dome-2mp": [
        ("Сердар", 5, "Картинка чёткая даже ночью.", "approved"),
        ("Гость", 3, "Нормально за свои деньги.", "pending"),
    ],
    "router-wifi6": [("Байрам", 5, "Wi-Fi стал гораздо стабильнее.", "approved")],
}


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
                    currency="TMT", in_stock=p["in_stock"], stock_qty=p.get("stock_qty"),
                    sort_order=p_order, enabled=True,
                )
                for lang in LANGS:
                    prod.translations.append(ProductTranslation(
                        lang=lang, title=p["titles"][lang], short=p["short"][lang], body="", specs=[],
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

        for b_order, name in enumerate(BRANDS):
            db.add(ShopBrand(name=name, sort_order=b_order, enabled=True))

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
