"""Seed demo shop data: categories, filter attributes and products.

Idempotent — wipes existing shop catalog (categories/products/attributes/
services/brands), keeps orders. Photos for a few products reference files
committed in media/products (seed-*.png, taken from the Figma mockups); the rest
show the storefront placeholder. Banners, info pages and contacts are seeded
only when absent, so admin edits survive a catalog re-seed.

Run from backend/:  python -m app.seed_shop
"""
from .db import SessionLocal, init_db
from .models import (
    Banner,
    BannerTranslation,
    CategoryAttribute,
    CategoryAttributeTranslation,
    DeliveryZone,
    DeliveryZoneTranslation,
    Page,
    PageTranslation,
    Product,
    ProductAttribute,
    ProductComponent,
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


# Catalog mirrors the Figma design: three sections (Компьютеры / Безопасность /
# Сетевые оборудования), each with the subcategory tiles of its section page.
# Category: slug, names, optional parent, attribute defs ("По характеристике"
# filters), products. Product: slug, price, optional old_price/stock_qty/is_new/
# brand/images, title and short (a plain string is used for every language),
# attrs, and optional body/specs (ru only; tk/en fall back to empty).
DATA = [
    # ---------------------------------------------------------------- computers
    {"slug": "computers", "names": _names("Компьютеры", "Kompýuterler", "Computers"),
     "attributes": [], "products": []},
    {"slug": "cpu", "parent": "computers",
     "names": _names("Процессоры", "Prosessorlar", "Processors"),
     "attributes": [
         _attr("generation", "select", "", "Поколение", "Nesil", "Generation"),
         _attr("socket", "select", "", "Сокет", "Soket", "Socket"),
         _attr("cores", "number", "", "Кол-во ядер", "Ýadrolaryň sany", "Cores"),
         _attr("tdp", "number", "W", "Тепловыделение (TDP)", "Ýylylyk bölüp çykaryş (TDP)", "TDP"),
         _attr("igpu", "select", "", "Модель GPU", "GPU modeli", "Integrated GPU"),
     ],
     "products": [
         {"slug": "amd-ryzen-7-7800x3d", "brand": "AMD", "price": 6990, "stock_qty": 4,
          "title": "AMD Ryzen 7 7800X3D", "short": "8 ядер, AM5, 3D V-Cache",
          "attrs": {"generation": "Ryzen 7000", "socket": "AM5", "cores": "8", "tdp": "120",
                    "igpu": "Radeon Graphics"}},
         {"slug": "amd-ryzen-5-7600", "brand": "AMD", "price": 2990,
          "title": "AMD Ryzen 5 7600", "short": "6 ядер, AM5",
          "attrs": {"generation": "Ryzen 7000", "socket": "AM5", "cores": "6", "tdp": "65",
                    "igpu": "Radeon Graphics"}},
         {"slug": "intel-core-i5-13400f", "brand": "Intel", "price": 2890,
          "title": "Intel Core i5-13400F", "short": "10 ядер, LGA1700",
          "attrs": {"generation": "Intel 13 gen", "socket": "LGA1700", "cores": "10", "tdp": "65",
                    "igpu": "Нет"}},
         {"slug": "intel-core-i7-14700k", "brand": "Intel", "price": 5490, "old_price": 5990, "is_new": True,
          "title": "Intel Core i7-14700K", "short": "20 ядер, LGA1700",
          "attrs": {"generation": "Intel 14 gen", "socket": "LGA1700", "cores": "20", "tdp": "125",
                    "igpu": "Intel UHD 770"}},
         {"slug": "intel-core-i3-12100", "brand": "Intel", "price": 1490,
          "title": "Intel Core i3-12100", "short": "4 ядра, LGA1700",
          "attrs": {"generation": "Intel 12 gen", "socket": "LGA1700", "cores": "4", "tdp": "60",
                    "igpu": "Intel UHD 730"}},
     ]},
    {"slug": "motherboards", "parent": "computers",
     "names": _names("Материнская плата", "Ene plata", "Motherboards"),
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
         {"slug": "gigabyte-b650m-ds3h", "brand": "Gigabyte", "price": 1790,
          "title": "Gigabyte B650M DS3H", "short": "AM5, mATX, DDR5",
          "attrs": {"socket": "AM5", "form_factor": "mATX"}},
     ]},
    {"slug": "ram", "parent": "computers",
     "names": _names("Оперативная память", "Operatiw ýat", "Memory (RAM)"),
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
         {"slug": "crucial-pro-32gb-ddr5-5600", "brand": "Crucial", "price": 1490,
          "title": "Crucial Pro 32GB DDR5-5600", "short": "2×16 ГБ, CL46",
          "attrs": {"capacity": "32", "type": "DDR5"}},
     ]},
    {"slug": "gpu", "parent": "computers",
     "names": _names("Видеокарты", "Wideokartalar", "Graphics cards"),
     "attributes": [
         _attr("chip", "select", "", "Чипсет", "Çipset", "Chipset"),
         _attr("vram", "number", "GB", "Видеопамять", "Wideo ýady", "VRAM"),
     ],
     "products": [
         {"slug": "asus-dual-rtx-4060-8gb", "brand": "ASUS", "price": 5190, "is_new": True,
          "title": "ASUS Dual GeForce RTX 4060 OC 8GB", "short": "8 ГБ GDDR6, DLSS 3",
          "attrs": {"chip": "GeForce RTX 4060", "vram": "8"}},
         {"slug": "gigabyte-rx-7600-gaming-oc-8gb", "brand": "Gigabyte", "price": 4690, "old_price": 4990,
          "title": "Gigabyte Radeon RX 7600 Gaming OC 8GB", "short": "8 ГБ GDDR6",
          "attrs": {"chip": "Radeon RX 7600", "vram": "8"}},
         {"slug": "msi-rtx-4070-super-ventus-12gb", "brand": "MSI", "price": 9890,
          "title": "MSI GeForce RTX 4070 SUPER Ventus 2X 12GB", "short": "12 ГБ GDDR6X",
          "attrs": {"chip": "GeForce RTX 4070 SUPER", "vram": "12"}},
     ]},
    {"slug": "psu", "parent": "computers",
     "names": _names("Блок питания", "Energiýa bloky", "Power supplies"),
     "attributes": [_attr("power", "number", "W", "Мощность", "Kuwwat", "Power")],
     "products": [
         {"slug": "corsair-rm850x", "brand": "Corsair", "price": 2190,
          "title": "Corsair RM850x", "short": "850 Вт, 80+ Gold, модульный",
          "attrs": {"power": "850"}},
         {"slug": "deepcool-pk650d", "brand": "Deepcool", "price": 990,
          "title": "Deepcool PK650D", "short": "650 Вт, 80+ Bronze",
          "attrs": {"power": "650"}},
         {"slug": "be-quiet-pure-power-12-m-750w", "brand": "be quiet!", "price": 1690,
          "title": "be quiet! Pure Power 12 M 750W", "short": "750 Вт, 80+ Gold, ATX 3.0",
          "attrs": {"power": "750"}},
     ]},
    {"slug": "ssd", "parent": "computers",
     "names": _names("Твердотельный накопитель (SSD)", "Gaty ýagdaýly disk (SSD)", "Solid-state drives (SSD)"),
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
    {"slug": "hdd", "parent": "computers",
     "names": _names("Жесткий диск (HDD)", "Gaty disk (HDD)", "Hard drives (HDD)"),
     "attributes": [
         _attr("capacity", "number", "GB", "Объём", "Göwrüm", "Capacity"),
         _attr("rpm", "number", "rpm", "Скорость вращения", "Aýlanyş tizligi", "Spindle speed"),
     ],
     "products": [
         {"slug": "seagate-barracuda-2tb", "brand": "Seagate", "price": 1090,
          "title": "Seagate BarraCuda 2TB", "short": "3.5\", 7200 об/мин, 256 МБ",
          "attrs": {"capacity": "2048", "rpm": "7200"}},
         {"slug": "toshiba-p300-1tb", "brand": "Toshiba", "price": 750,
          "title": "Toshiba P300 1TB", "short": "3.5\", 7200 об/мин",
          "attrs": {"capacity": "1024", "rpm": "7200"}},
         {"slug": "wd-purple-4tb", "brand": "WD", "price": 1890,
          "title": "WD Purple 4TB", "short": "Для видеонаблюдения, 5400 об/мин",
          "attrs": {"capacity": "4096", "rpm": "5400"}},
     ]},
    {"slug": "cases", "parent": "computers",
     "names": _names("Кейс", "Korpus", "Cases"),
     "attributes": [_attr("form_factor", "select", "", "Форм-фактор", "Forma faktory", "Form factor")],
     "products": [
         {"slug": "lian-li-lancool-216-argb-white", "brand": "LIAN LI", "price": 1800, "is_new": True,
          "images": ["seed-lancool-216-white.png"],
          "title": "LIAN LI Lancool 216 ARGB White", "short": "ATX, 2×160 мм ARGB",
          "attrs": {"form_factor": "ATX"}},
         {"slug": "nzxt-h5-flow", "brand": "NZXT", "price": 1590,
          "title": "NZXT H5 Flow", "short": "ATX, сетчатая панель",
          "attrs": {"form_factor": "ATX"}},
     ]},
    {"slug": "pc-accessories", "parent": "computers",
     "names": _names("Аксессуары", "Aksessuarlar", "Accessories"),
     "attributes": [_attr("type", "select", "", "Тип", "Görnüşi", "Type")],
     "products": [
         {"slug": "logitech-g102-lightsync", "brand": "Logitech", "price": 290,
          "title": "Logitech G102 Lightsync", "short": "Игровая мышь, 8000 DPI",
          "attrs": {"type": "Мышь"}},
         {"slug": "deepcool-ak400", "brand": "Deepcool", "price": 590,
          "title": "Deepcool AK400", "short": "Кулер для процессора, 220 Вт",
          "attrs": {"type": "Охлаждение"}},
         {"slug": "logitech-k120", "brand": "Logitech", "price": 190,
          "title": "Logitech K120", "short": "Проводная клавиатура",
          "attrs": {"type": "Клавиатура"}},
     ]},
    # ----------------------------------------------------------------- security
    {"slug": "security", "names": _names("Безопасность", "Howpsuzlyk", "Security"),
     "attributes": [], "products": []},
    {"slug": "cameras", "parent": "security",
     "names": _names("Камеры", "Kameralar", "Cameras"),
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
    {"slug": "fire-sensors", "parent": "security",
     "names": _names("Датчики пожарные", "Ýangyn datçikleri", "Fire detectors"),
     "attributes": [_attr("type", "select", "", "Тип", "Görnüşi", "Type")],
     "products": [
         {"slug": "rubezh-ip-212-64-prima", "brand": "Рубеж", "price": 180,
          "images": ["seed-fire-sensors.png"],
          "title": "Рубеж ИП 212-64 Прима", "short": "Дымовой извещатель, адресный",
          "attrs": {"type": "Дымовой"}},
         {"slug": "bolid-s2000-ip", "brand": "Болид", "price": 150,
          "title": "Болид С2000-ИП", "short": "Тепловой извещатель, адресный",
          "attrs": {"type": "Тепловой"}},
         {"slug": "bolid-signal-20p", "brand": "Болид", "price": 1200, "is_new": True,
          "title": "Болид Сигнал-20П", "short": "Прибор приёмно-контрольный, 20 шлейфов",
          "attrs": {"type": "Прибор"}},
     ]},
    {"slug": "camera-recorders", "parent": "security",
     "names": _names("Тюнеры для камер", "Kameralar üçin tünerler", "Camera recorders"),
     "attributes": [_attr("channels", "number", "", "Каналы", "Kanallar", "Channels")],
     "products": [
         {"slug": "hikvision-ds-7608ni-k2", "brand": "Hikvision", "price": 1650,
          "title": "Hikvision DS-7608NI-K2", "short": "IP-регистратор, 8 каналов, 2 HDD",
          "attrs": {"channels": "8"}},
         {"slug": "dahua-nvr2104hs-s3", "brand": "Dahua", "price": 890,
          "title": "Dahua DHI-NVR2104HS-S3", "short": "IP-регистратор, 4 канала",
          "attrs": {"channels": "4"}},
     ]},
    {"slug": "face-control", "parent": "security",
     "names": _names("Face Control", "Face Control", "Face Control"),
     "attributes": [_attr("faces", "number", "", "База лиц", "Ýüz binýady", "Face capacity")],
     "products": [
         {"slug": "hikvision-face-control-hk-043", "brand": "Hikvision", "price": 1200, "old_price": 1990,
          "images": ["seed-face-control-hk043.png"],
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
    {"slug": "motion-sensors", "parent": "security",
     "names": _names("Датчики движения", "Hereket datçikleri", "Motion sensors"),
     "attributes": [_attr("type", "select", "", "Тип", "Görnüşi", "Type")],
     "products": [
         {"slug": "bolid-s2000-ik", "brand": "Болид", "price": 140,
          "title": "Болид С2000-ИК", "short": "Адресный ИК-извещатель, до 12 м",
          "attrs": {"type": "Инфракрасный"}},
         {"slug": "rubezh-io-409-40", "brand": "Рубеж", "price": 160,
          "title": "Рубеж ИО 409-40", "short": "Объёмный ИК-извещатель",
          "attrs": {"type": "Инфракрасный"}},
     ]},
    {"slug": "security-accessories", "parent": "security",
     "names": _names("Аксессуары", "Aksessuarlar", "Accessories"),
     "attributes": [_attr("type", "select", "", "Тип", "Görnüşi", "Type")],
     "products": [
         {"slug": "hikvision-ds-1280zj-xs", "brand": "Hikvision", "price": 60,
          "title": "Hikvision DS-1280ZJ-XS", "short": "Монтажная коробка для камер",
          "attrs": {"type": "Крепление"}},
         {"slug": "tp-link-tl-poe150s", "brand": "TP-Link", "price": 190,
          "title": "TP-Link TL-PoE150S", "short": "PoE-инжектор, Gigabit",
          "attrs": {"type": "Питание"}},
     ]},
    # ------------------------------------------------------------------ network
    {"slug": "network", "names": _names("Сетевые оборудования", "Tor enjamlary", "Networking"),
     "attributes": [], "products": []},
    {"slug": "switches", "parent": "network",
     "names": _names("Свитчи", "Switçler", "Switches"),
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
    {"slug": "repeaters", "parent": "network",
     "names": _names("Репиторы", "Repiterler", "Range extenders"),
     "attributes": [_attr("wifi", "select", "", "Wi‑Fi", "Wi‑Fi", "Wi‑Fi")],
     "products": [
         {"slug": "tp-link-re315", "brand": "TP-Link", "price": 450,
          "title": "TP-Link RE315", "short": "Усилитель Wi‑Fi AC1200, Mesh",
          "attrs": {"wifi": "Wi‑Fi 5"}},
         {"slug": "mercusys-me30", "brand": "Mercusys", "price": 320,
          "title": "Mercusys ME30", "short": "Усилитель Wi‑Fi AC1200",
          "attrs": {"wifi": "Wi‑Fi 5"}},
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
    {"slug": "network-adapters", "parent": "network",
     "names": _names("Сетевые адаптеры", "Tor adapterleri", "Network adapters"),
     "attributes": [_attr("interface", "select", "", "Подключение", "Birikdirme", "Interface")],
     "products": [
         {"slug": "tp-link-archer-t3u", "brand": "TP-Link", "price": 220,
          "title": "TP-Link Archer T3U", "short": "USB Wi‑Fi адаптер AC1300",
          "attrs": {"interface": "USB"}},
         {"slug": "mercusys-ma30n", "brand": "Mercusys", "price": 240,
          "title": "Mercusys MA30N", "short": "PCIe Wi‑Fi адаптер AC1200",
          "attrs": {"interface": "PCIe"}},
     ]},
    {"slug": "modems", "parent": "network",
     "names": _names("Модемы", "Modemler", "Modems"),
     "attributes": [_attr("type", "select", "", "Тип", "Görnüşi", "Type")],
     "products": [
         {"slug": "tp-link-archer-vr300", "brand": "TP-Link", "price": 690,
          "title": "TP-Link Archer VR300", "short": "VDSL/ADSL модем-роутер AC1200",
          "attrs": {"type": "DSL"}},
         {"slug": "tp-link-archer-mr600", "brand": "TP-Link", "price": 1290,
          "title": "TP-Link Archer MR600", "short": "4G+ роутер Cat6, AC1200",
          "attrs": {"type": "4G"}},
     ]},
    {"slug": "firewalls", "parent": "network",
     "names": _names("Файерволы", "Faýerwollar", "Firewalls"),
     "attributes": [_attr("ports", "number", "", "Порты", "Portlar", "Ports")],
     "products": [
         {"slug": "mikrotik-rb5009ug-s-in", "brand": "MikroTik", "price": 3800, "is_new": True,
          "title": "MikroTik RB5009UG+S+IN", "short": "Маршрутизатор-файервол, 2.5G + SFP+",
          "attrs": {"ports": "9"}},
         {"slug": "ubiquiti-udm-pro", "brand": "Ubiquiti", "price": 8900,
          "title": "Ubiquiti UniFi Dream Machine Pro", "short": "Шлюз безопасности, IDS/IPS",
          "attrs": {"ports": "10"}},
     ]},
    {"slug": "network-accessories", "parent": "network",
     "names": _names("Аксессуары", "Aksessuarlar", "Accessories"),
     "attributes": [_attr("type", "select", "", "Тип", "Görnüşi", "Type")],
     "products": [
         {"slug": "hyperline-pc-lpm-utp-rj45-1m", "brand": "Hyperline", "price": 30,
          "title": "Hyperline патч-корд UTP Cat5e 1 м", "short": "RJ45–RJ45, серый",
          "attrs": {"type": "Кабель"}},
         {"slug": "tlk-rack-12u-600x450", "brand": "TLK", "price": 2400,
          "title": "TLK шкаф настенный 12U 600×450", "short": "Стеклянная дверь, съёмные стенки",
          "attrs": {"type": "Шкаф"}},
     ]},
    # Ready-made PCs: hidden in the current design but still linked from the
    # footer ("Наши сборки"); kept as a section of their own.
    {"slug": "builds",
     "names": _names("Готовые сборки", "Taýýar ýygnamalar", "Ready-made PCs"),
     "attributes": [_attr("cpu", "select", "", "Процессор", "Prosessor", "CPU")],
     "products": [
         {"slug": "km-gamer-ryzen-7-7800x3d", "price": 19000, "is_new": True, "stock_qty": 2,
          "images": ["seed-lancool-216-white.png"],
          # parts + assembly service, 19 000 TMT in total
          "components": [
              ("product", "amd-ryzen-7-7800x3d"), ("product", "msi-mag-b650-tomahawk-wifi"),
              ("product", "gskill-trident-z5-rgb-32gb-ddr5-6400"), ("product", "wd-black-sn850x-2tb"),
              ("product", "corsair-rm850x"), ("product", "lian-li-lancool-216-argb-white"),
              ("service", "pc-build"),
          ],
          "title": "KM Gamer · Ryzen 7 7800X3D", "short": "Ryzen 7 7800X3D, 32 ГБ DDR5, SSD 2 ТБ",
          "body": "Готовый компьютер, собранный и протестированный в нашем магазине. "
                  "Установим систему и драйверы, выдадим с гарантией.",
          "attrs": {"cpu": "AMD Ryzen 7 7800X3D"}},
         {"slug": "km-office-core-i5", "price": 9900,
          "components": [
              ("product", "intel-core-i5-13400f"), ("product", "asus-tuf-gaming-b760m-plus"),
              ("product", "kingston-fury-beast-16gb-ddr4-3200"), ("product", "kingston-nv2-1tb"),
              ("product", "deepcool-pk650d"), ("product", "nzxt-h5-flow"), ("service", "pc-build"),
          ],
          "title": "KM Office · Core i5-13400F", "short": "Core i5, 16 ГБ, SSD 1 ТБ",
          "attrs": {"cpu": "Intel Core i5-13400F"}},
     ]},
]


# Services (Figma "Услуги" / "Сервис" screens), keyed by category slug.
# price_from → shown as "от N TMT"; body/feats fill the service page (ru/en).
SERVICES = {
    "computers": [
        {"slug": "pc-build", "price": 250, "price_from": True, "icon": "wrench",
         "titles": _names("Сборка ПК", "Kompýuter ýygnamak", "PC assembly"),
         "short": _names("Подбор комплектующих, сборка, установка ОС и стресс-тест.",
                         "Bölekleri saýlamak, ýygnamak, OS gurnamak we stres-test.",
                         "Parts selection, assembly, OS install and stress test."),
         "body": {"ru": "Соберём компьютер для работы, учёбы или игр — из наших комплектующих или из ваших. "
                        "Аккуратно проложим кабели, обновим BIOS, установим систему и проверим стабильность под нагрузкой.",
                  "en": "We build a PC for work, study or gaming — from our parts or yours. Neat cable management, "
                        "BIOS update, OS install and a stability check under load."},
         "feats": {"ru": ["Подбор совместимых комплектующих под бюджет", "Сборка и кабель-менеджмент",
                          "Установка Windows и драйверов", "Нагрузочное тестирование"],
                   "en": ["Compatible parts for your budget", "Assembly and cable management",
                          "Windows and drivers installed", "Stress testing"]}},
        {"slug": "pc-maintenance", "price": 150, "price_from": True, "icon": "refresh",
         "titles": _names("Профилактика", "Profilaktika", "Maintenance"),
         "short": _names("Чистка, замена термопасты, проверка и обновление.",
                         "Arassalamak, termopastany çalyşmak, barlamak we täzelemek.",
                         "Cleaning, thermal paste, check-up and updates."),
         "body": {"ru": "Вернём компьютеру или ноутбуку тишину и прохладу: почистим от пыли, заменим термопасту, "
                        "проверим диски и обновим драйверы.",
                  "en": "Make your PC or laptop quiet and cool again: dust cleaning, fresh thermal paste, "
                        "disk health check and driver updates."},
         "feats": {"ru": ["Чистка от пыли", "Замена термопасты", "Проверка дисков и памяти", "Обновление драйверов и BIOS"],
                   "en": ["Dust cleaning", "Thermal paste replacement", "Disk and memory check", "Driver and BIOS updates"]}},
        {"slug": "pc-repair", "price": 100, "price_from": True, "icon": "wrench",
         "titles": _names("Ремонт", "Abatlamak", "Repair"),
         "short": _names("Диагностика, замена комплектующих, восстановление данных.",
                         "Diagnostika, bölekleri çalyşmak, maglumatlary dikeltmek.",
                         "Diagnostics, part replacement, data recovery."),
         "body": {"ru": "Найдём причину неисправности, согласуем стоимость и сроки, заменим неисправные детали. "
                        "Поможем восстановить данные с повреждённых дисков.",
                  "en": "We find the fault, agree on price and timing, and replace failed parts. "
                        "Data recovery from damaged drives."},
         "feats": {"ru": ["Бесплатная диагностика при ремонте", "Замена комплектующих", "Восстановление данных",
                          "Гарантия на работы"],
                   "en": ["Free diagnostics with repair", "Part replacement", "Data recovery", "Warranty on work"]}},
    ],
    "security": [
        {"slug": "cam-install", "price": 400, "price_from": True, "icon": "wrench",
         "titles": _names("Установка и настройка камеры", "Kamerany gurnamak we sazlamak",
                          "Camera installation and setup"),
         "short": _names("Проектирование, установка камер безопасности.",
                         "Taslama, howpsuzlyk kameralaryny gurnamak.",
                         "Design and installation of security cameras."),
         "body": {"ru": "Подберём камеры под объект, смонтируем и настроим запись и удалённый просмотр со смартфона.",
                  "en": "Cameras chosen for your site, installed with recording and remote phone viewing set up."},
         "feats": {"ru": ["Выезд и проект", "Монтаж камер и кабеля", "Настройка регистратора", "Просмотр со смартфона"],
                   "en": ["Site visit and design", "Cameras and cabling", "Recorder setup", "Phone viewing"]}},
    ],
    "network": [
        {"slug": "net-setup", "price": 400, "price_from": True, "icon": "settings",
         "titles": _names("Установка и настройка сетевого оборудования", "Tor enjamlaryny gurnamak we sazlamak",
                          "Network equipment setup"),
         "short": _names("Проектирование, монтаж и администрирование сетей.",
                         "Tor taslamasy, gurnamak we dolandyrmak.",
                         "Network design, installation and administration."),
         "body": {"ru": "Спроектируем и смонтируем сеть для офиса, магазина или склада: кабельные линии, шкафы, Wi‑Fi, "
                        "настройка коммутаторов и роутеров.",
                  "en": "Networks for offices, shops and warehouses: cabling, racks, Wi‑Fi, switch and router setup."},
         "feats": {"ru": ["Проект сети", "Прокладка кабеля и монтаж шкафов", "Настройка Wi‑Fi и VLAN",
                          "Администрирование"],
                   "en": ["Network design", "Cabling and racks", "Wi‑Fi and VLAN setup", "Administration"]}},
    ],
}


# Order of the flat "Услуги" page in the design (sort_order is global).
SERVICE_ORDER = ["pc-build", "net-setup", "cam-install", "pc-maintenance", "pc-repair"]


# Home hero slides (Figma "Home" screen)
BANNERS = [
    {"image": "hero-computer-store.png", "link": "/catalog/computers",
     "title": _names("Техника для твоих целей", "Maksatlaryňyz üçin tehnika", "Tech for your goals"),
     "subtitle": _names("Компьютеры · Комплектующие · Периферия", "Kompýuterler · Bölekler · Periferiýa",
                        "Computers · Components · Peripherals")},
    {"image": "hero-computer-store.png", "link": "/catalog/builds",
     "title": _names("Готовые сборки", "Taýýar ýygnamalar", "Ready-made PCs"),
     "subtitle": _names("Собираем, тестируем и настраиваем перед выдачей", "Ýygnaýarys, barlaýarys we sazlaýarys",
                        "Assembled, tested and set up before hand-over")},
]


def _block(title: str, body: str) -> dict:
    return {"title": title, "body": body}


# Info pages (Figma: About, FAQ, Guarantee, Delivery, Install). ru + en texts;
# tk carries the title only until a translation is provided.
PAGES = [
    {"slug": "about",
     "title": _names("Наш магазин", "Biziň dükanymyz", "About us"),
     "lead": {"ru": "Kanagatly Mahabat — магазин компьютерной техники, систем безопасности и сетевого оборудования в Ашхабаде.",
              "tk": "Kanagatly Mahabat — Aşgabatdaky kompýuter tehnikasy, howpsuzlyk ulgamlary we tor enjamlary dükany.",
              "en": "Kanagatly Mahabat is a computer, security and networking store in Ashgabat."},
     "blocks": {
         "ru": [
             _block("Что мы продаём", "Комплектующие для ПК и готовые сборки, видеокамеры, датчики, терминалы Face Control, "
                                      "коммутаторы и роутеры. Все товары на сайте есть в нашем магазине — их можно посмотреть вживую."),
             _block("Не только продажа", "Собираем компьютеры, монтируем сети и системы безопасности, проводим профилактику и ремонт."),
             _block("Как купить", "Добавьте товары в корзину и отправьте заявку — менеджер перезвонит и подтвердит детали. "
                                  "Или просто позвоните нам."),
         ],
         "tk": [
             _block("Näme satýarys", "Kompýuter bölekleri we taýýar ýygnamalar, wideokameralar, datçikler, Face Control terminallary, kommutatorlar we routerler. Saýtdaky ähli harytlar dükanymyzda bar — olary göz bilen görüp bilersiňiz."),
             _block("Diňe satuw däl", "Kompýuter ýygnaýarys, tor we howpsuzlyk ulgamlaryny gurnaýarys, profilaktika we abatlaýyş geçirýäris."),
             _block("Nädip satyn almaly", "Harytlary sebede goşuň we ýüz tutma iberiň — menejer jaň edip, jikme-jiklikleri tassyklar. Ýa-da bize jaň ediň."),
         ],
         "en": [
             _block("What we sell", "PC components and ready-made builds, cameras, sensors, Face Control terminals, switches "
                                    "and routers. Everything on the site is in our store — come and see it."),
             _block("More than sales", "We build PCs, install networks and security systems, and do maintenance and repair."),
             _block("How to buy", "Add items to the cart and send a request — a manager will call you back. Or just call us."),
         ]}},
    {"slug": "faq",
     "title": _names("Частые вопросы", "Köp soralýan soraglar", "FAQ"),
     "lead": {"ru": "Ответы на вопросы, которые нам задают чаще всего.",
              "tk": "Bize iň köp berilýän soraglaryň jogaplary.",
              "en": "Answers to the questions we hear most often."},
     "blocks": {
         "ru": [
             _block("Нужно ли регистрироваться, чтобы сделать заказ?",
                    "Нет. Добавьте товары в корзину и отправьте заявку с именем и телефоном — менеджер перезвонит."),
             _block("Как оплатить заказ?", "Наличными или картой при получении. Оплата на сайте не требуется."),
             _block("Все товары на сайте есть в наличии?",
                    "Да, на сайте только то, что есть в магазине. Если товар закончился, он помечен «под заказ»."),
             _block("Можно ли посмотреть товар вживую?",
                    "Конечно — приходите в магазин: г. Ашхабад, ул. Московская, дом 142, 1-ый этаж."),
             _block("Соберёте компьютер из моих комплектующих?",
                    "Да. Проверим совместимость, соберём, установим систему и протестируем под нагрузкой."),
             _block("Устанавливаете ли вы камеры и сигнализацию?",
                    "Да, монтируем видеонаблюдение, пожарную и охранную сигнализацию, контроль доступа и сети."),
             _block("Какая гарантия на товары?",
                    "Гарантия производителя — от 12 до 36 месяцев, на готовые сборки — 24 месяца."),
         ],
         "tk": [
             _block("Sargyt etmek üçin hasaba durmaly mi?", "Ýok. Harytlary sebede goşuň we adyňyz hem telefonyňyz bilen ýüz tutma iberiň — menejer jaň eder."),
             _block("Sargydy nädip tölemeli?", "Dükanda ýa-da kurýere alanyňyzda nagt ýa-da kart bilen."),
             _block("Saýtdaky ähli harytlar barmy?", "Ýagdaýy haryt sahypasynda görkezilen. Haryt ýok bolsa — jaň ediň, gelmeli möhletini aýdarys."),
             _block("Harydy göz bilen görüp bolýarmy?", "Hawa, dükana geliň: Aşgabat ş., Moskowskaýa köç., 142-nji jaý, 1-nji gat."),
             _block("Kompýuteri meniň böleklerimden ýygnap bilersiňizmi?", "Hawa. Gabat gelşini barlap, ýygnarys we synag ederis."),
             _block("Kameralary we duýduryş ulgamyny gurnaýarsyňyzmy?", "Hawa, taslamadan sazlamaga çenli. Giňişleýin — «Gurnamak» sahypasynda."),
             _block("Harytlara nähili kepillik bar?", "12-den 36 aýa çenli — möhleti harydyň häsiýetnamasynda görkezilen."),
         ],
         "en": [
             _block("Do I need an account to order?", "No. Add items to the cart and send your name and phone — we'll call back."),
             _block("How do I pay?", "Cash or card on delivery. No online payment is required."),
             _block("Is everything on the site in stock?", "Yes. Items that ran out are marked \"to order\"."),
             _block("Can I see an item in person?", "Of course — visit us at 142 Moskovskaya St., 1st floor, Ashgabat."),
             _block("Will you build a PC from my parts?", "Yes. We check compatibility, assemble, install the OS and stress-test it."),
             _block("Do you install cameras and alarms?", "Yes: CCTV, fire and security alarms, access control and networks."),
             _block("What warranty do you give?", "Manufacturer warranty, 12 to 36 months; ready-made builds — 24 months."),
         ]}},
    {"slug": "guarantee",
     "title": _names("Гарантия и возврат", "Kepillik we yzyna gaýtarmak", "Warranty and returns"),
     "lead": {"ru": "На все товары действует гарантия производителя. Срок указан в характеристиках каждого товара.",
              "tk": "Ähli harytlara öndürijiniň kepilligi bar. Möhleti her harydyň häsiýetnamasynda görkezilen.",
              "en": "All goods carry the manufacturer's warranty; the term is listed in each product's specs."},
     "blocks": {
         "ru": [
             _block("Гарантия", "От 12 до 36 месяцев в зависимости от товара. На готовые сборки — 24 месяца."),
             _block("Возврат", "Товар надлежащего качества можно вернуть в течение 14 дней, если сохранены упаковка и товарный вид."),
             _block("Гарантийный случай", "1. Принесите товар и документ о покупке в магазин.\n"
                                          "2. Проведём диагностику — обычно до 3 рабочих дней.\n"
                                          "3. Отремонтируем, заменим или вернём деньги."),
             _block("Не гарантийный случай", "Механические повреждения, следы вскрытия, попадание влаги и нарушение условий эксплуатации."),
         ],
         "tk": [
             _block("Kepillik", "Haryda görä 12-den 36 aýa çenli. Taýýar ýygnamalara — 24 aý."),
             _block("Yzyna gaýtarmak", "Hili kadaly haryt gaplamasy we daşky görnüşi saklanan bolsa, 14 günüň dowamynda gaýtarylyp bilner."),
             _block("Kepillik ýagdaýy", "1. Harydy we satyn alyş resminamasyny dükana getiriň.\n2. Diagnostika geçireris — adatça 3 iş gününe çenli.\n3. Abatlarys, çalyşarys ýa-da pul gaýtararys."),
             _block("Kepillik däl ýagdaý", "Mehaniki zeper, açylan yzlary, çyglylyk we ulanyş şertleriniň bozulmagy."),
         ],
         "en": [
             _block("Warranty", "12 to 36 months depending on the item. Ready-made builds — 24 months."),
             _block("Returns", "Items in proper condition can be returned within 14 days with original packaging."),
             _block("Warranty claim", "1. Bring the item and the receipt to the store.\n"
                                      "2. We run diagnostics — usually up to 3 business days.\n"
                                      "3. We repair, replace or refund."),
             _block("Not covered", "Physical damage, signs of tampering, liquid damage or misuse."),
         ]}},
    {"slug": "delivery",
     "title": _names("Условия доставки", "Eltip bermek şertleri", "Delivery"),
     "lead": {"ru": "Доставляем по Ашхабаду и всему Туркменистану. Условия согласует менеджер при подтверждении заявки.",
              "tk": "Aşgabat we tutuş Türkmenistan boýunça eltip berýäris. Şertleri menejer ýüz tutmany tassyklanda ylalaşar.",
              "en": "We deliver across Ashgabat and all of Turkmenistan; a manager confirms the terms."},
     "blocks": {
         "ru": [
             _block("По Ашхабаду", "В день заявки или на следующий день. Стоимость зависит от района и объёма заказа."),
             _block("По регионам", "Отправляем в велаяты через транспортные компании. Срок — от 2 до 5 дней."),
             _block("Самовывоз", "Бесплатно из магазина: г. Ашхабад, ул. Московская, дом 142, 1-ый этаж."),
             _block("Оплата", "Наличными или картой при получении. Оплата на сайте не требуется."),
         ],
         "tk": [
             _block("Aşgabat boýunça", "Ýüz tutulan gün ýa-da ertesi gün. Bahasy etrapdan we sargydyň göwrüminden bagly."),
             _block("Welaýatlar boýunça", "Welaýatlara ulag kompaniýalary arkaly iberýäris. Möhleti — 2-den 5 güne çenli."),
             _block("Özüň alyp gitmek", "Dükandan mugt: Aşgabat ş., Moskowskaýa köç., 142-nji jaý, 1-nji gat."),
             _block("Töleg", "Alanyňyzda nagt ýa-da kart bilen. Saýtda töleg talap edilmeýär."),
         ],
         "en": [
             _block("Ashgabat", "Same or next day. The price depends on the district and order size."),
             _block("Regions", "Shipped to the velayats by carriers within 2 to 5 days."),
             _block("Pickup", "Free from the store: 142 Moskovskaya St., 1st floor, Ashgabat."),
             _block("Payment", "Cash or card on delivery. No online payment is required."),
         ]}},
    {"slug": "install",
     "title": _names("Установка", "Gurnamak", "Installation"),
     "lead": {"ru": "Устанавливаем и настраиваем всё, что продаём, — в офисах, магазинах, складах и домах.",
              "tk": "Satýan zatlarymyzyň hemmesini ofislerde, dükanlarda, ammarlarda we öýlerde gurnaýarys we sazlaýarys.",
              "en": "We install and set up everything we sell — in offices, shops, warehouses and homes."},
     "blocks": {
         "ru": [
             _block("Видеонаблюдение", "Проект, монтаж камер и регистраторов, настройка просмотра со смартфона."),
             _block("Пожарная и охранная сигнализация", "Датчики Рубеж и Болид, приборы, подключение к пульту."),
             _block("Контроль доступа и Face Control", "Терминалы распознавания лиц, учёт рабочего времени, замки."),
             _block("Компьютерные сети", "Кабельные линии, шкафы, Wi‑Fi, настройка оборудования."),
         ],
         "tk": [
             _block("Wideogözegçilik", "Taslama, kameralary we registratorlary gurnamak, smartfondan görmegi sazlamak."),
             _block("Ýangyn we gorag duýduryşy", "Rubež we Bolid datçikleri, enjamlar, pulta birikdirmek."),
             _block("Girişe gözegçilik we Face Control", "Ýüz tanaýan terminallar, iş wagtyny hasaba almak, gulplar."),
             _block("Kompýuter torlary", "Kabel ulgamlary, şkaflar, Wi‑Fi, enjamlary sazlamak."),
         ],
         "en": [
             _block("CCTV", "Design, camera and recorder installation, phone viewing setup."),
             _block("Fire and security alarms", "Rubezh and Bolid sensors, control panels, monitoring hookup."),
             _block("Access control and Face Control", "Face recognition terminals, time tracking, locks."),
             _block("Computer networks", "Cabling, racks, Wi‑Fi, equipment setup."),
         ]}},
]


# Brands strip / brands page, in the order the design shows them. Cyrillic
# names need an explicit slug (slugify keeps ASCII only).
BRANDS = [
    "Hikvision", "Kingston", "Dahua", "TP-Link", "Intel", "AMD", "ASUS", "LIAN LI",
    ("Болид", "bolid"), "Ubiquiti", "Corsair", "MSI", "WD", "Seagate", "Deepcool",
    ("Рубеж", "rubezh"), "MikroTik", "Logitech", "G.Skill", "Gigabyte", "Samsung", "Crucial",
    "Toshiba", "be quiet!", "Seasonic", "NZXT", "Keenetic", "Mercusys", "TLK", "Hyperline",
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

# Checkout delivery options (texts from the "Условия доставки" page).
# name/note per language; free_from = goods total for free delivery.
DELIVERY_ZONES = [
    {"price": 30, "free_from": 5000, "is_default": True,
     "name": _names("По Ашхабаду", "Aşgabat boýunça", "Ashgabat"),
     "note": _names("В день заявки или на следующий день", "Şol gün ýa-da ertesi gün", "Same or next day")},
    {"price": 100, "free_from": None,
     "name": _names("По регионам", "Welaýatlara", "Regions"),
     "note": _names("Через транспортные компании, 2–5 дней", "Ulag kompaniýalary arkaly, 2–5 gün",
                    "By carrier, 2–5 days")},
    {"price": 0, "free_from": None, "is_pickup": True,
     "name": _names("Самовывоз", "Dükandan alyp gitmek", "Pickup"),
     "note": _names("ул. Московская, дом 142, 1-ый этаж", "Moskowskaýa köç., 142-nji jaý, 1-nji gat",
                    "142 Moskovskaya St., 1st floor")},
]


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
        ProductReview, ProductComponent,
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
                for i_order, filename in enumerate(p.get("images", [])):
                    prod.images.append(ProductImage(filename=filename, sort_order=i_order))
                cat.products.append(prod)
                n_prod += 1

            for s in SERVICES.get(c["slug"], []):
                svc = ShopService(
                    slug=s["slug"], price=s["price"], currency="TMT", price_from=s.get("price_from", False),
                    icon=s["icon"], enabled=True, sort_order=SERVICE_ORDER.index(s["slug"]),
                )
                for lang in LANGS:
                    svc.translations.append(ShopServiceTranslation(
                        lang=lang, title=s["titles"][lang], short=s["short"][lang],
                        body=s.get("body", {}).get(lang, ""), feats=s.get("feats", {}).get(lang, []),
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

        # ready-made builds: component lines point at products/services by slug
        svc_by_slug = {s.slug: s for cat in by_slug.values() for s in cat.services}
        for c in DATA:
            for p in c["products"]:
                for order, (kind, ref) in enumerate(p.get("components", [])):
                    line = ProductComponent(sort_order=order, qty=1)
                    if kind == "service":
                        line.service_id = svc_by_slug[ref].id
                    else:
                        line.product_id = prod_by_slug[ref].id
                    prod_by_slug[p["slug"]].components.append(line)

        # site content — only when absent, like the contacts below
        if db.query(Banner).count() == 0:
            for b_order, b in enumerate(BANNERS):
                banner = Banner(image=b["image"], link=b["link"], sort_order=b_order, enabled=True)
                for lang in LANGS:
                    banner.translations.append(BannerTranslation(
                        lang=lang, title=b["title"][lang], subtitle=b["subtitle"][lang],
                    ))
                db.add(banner)
        if db.query(DeliveryZone).count() == 0:
            for z_order, z in enumerate(DELIVERY_ZONES):
                zone = DeliveryZone(
                    price=z["price"], free_from=z["free_from"], is_pickup=z.get("is_pickup", False),
                    is_default=z.get("is_default", False), enabled=True, sort_order=z_order,
                )
                for lang in LANGS:
                    zone.translations.append(DeliveryZoneTranslation(
                        lang=lang, name=z["name"][lang], note=z["note"][lang],
                    ))
                db.add(zone)
        if db.query(Page).count() == 0:
            for pg_order, pg in enumerate(PAGES):
                page = Page(slug=pg["slug"], sort_order=pg_order, enabled=True)
                for lang in LANGS:
                    page.translations.append(PageTranslation(
                        lang=lang, title=pg["title"][lang], lead=pg["lead"].get(lang, ""),
                        blocks=pg["blocks"].get(lang, []),
                    ))
                db.add(page)

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
