"""Texts for the demo catalog that seed_shop.DATA keeps out of its compact
product rows: Turkmen/English short lines, descriptions, the "Характеристики"
spec rows, warranty terms, SKUs and translations of characteristic values.

Everything is keyed by slug, so seed_shop merges it in without touching the
catalog structure. A product missing here keeps its Russian `short` for every
language and an empty description.
"""

# Warranty in months per category ("Гарантия" row on the product page). The
# FAQ and "Гарантия и возврат" pages promise 12–36 months, 24 for builds.
WARRANTY_BY_CATEGORY = {
    "cpu": 36, "motherboards": 36, "ram": 36, "gpu": 36, "psu": 36, "ssd": 36,
    "hdd": 24, "cases": 12, "pc-accessories": 12,
    "cameras": 24, "fire-sensors": 12, "camera-recorders": 24, "face-control": 24,
    "motion-sensors": 12, "security-accessories": 12,
    "switches": 24, "repeaters": 24, "routers": 24, "network-adapters": 24, "modems": 24,
    "firewalls": 24, "network-accessories": 12,
    "builds": 24,
}

# SKU = KM-<prefix>-<NNN>, numbered in catalog order within the category.
SKU_PREFIX = {
    "cpu": "CPU", "motherboards": "MB", "ram": "RAM", "gpu": "GPU", "psu": "PSU", "ssd": "SSD",
    "hdd": "HDD", "cases": "CASE", "pc-accessories": "PCA",
    "cameras": "CAM", "fire-sensors": "FIRE", "camera-recorders": "NVR", "face-control": "FACE",
    "motion-sensors": "MOT", "security-accessories": "SEC",
    "switches": "SW", "repeaters": "REP", "routers": "RT", "network-adapters": "NIC", "modems": "MDM",
    "firewalls": "FW", "network-accessories": "NET",
    "builds": "PC",
}


def _t(ru: str, tk: str, en: str) -> dict:
    return {"ru": ru, "tk": tk, "en": en}


# Translations of "select" characteristic values, by attribute key. The stored
# value (Russian or a model name) stays the filter key; seed_shop attaches the
# rows whose value some product of the category actually uses.
VALUE_LABELS = {
    "igpu": {"Нет": _t("Нет", "Ýok", "None")},
    "type": {
        # accessories
        "Мышь": _t("Мышь", "Syçanjyk", "Mouse"),
        "Охлаждение": _t("Охлаждение", "Sowadyş", "Cooling"),
        "Клавиатура": _t("Клавиатура", "Klawiatura", "Keyboard"),
        # cameras
        "Цилиндрическая": _t("Цилиндрическая", "Silindr görnüşli", "Bullet"),
        "Купольная": _t("Купольная", "Gümmez görnüşli", "Dome"),
        "PTZ": _t("PTZ (поворотная)", "PTZ (aýlanýan)", "PTZ"),
        # fire / motion sensors
        "Дымовой": _t("Дымовой", "Tüsse", "Smoke"),
        "Тепловой": _t("Тепловой", "Ýylylyk", "Heat"),
        "Прибор": _t("Приёмно-контрольный прибор", "Kabul ediji-gözegçilik enjamy", "Control panel"),
        "Инфракрасный": _t("Инфракрасный", "Infragyzyl", "Infrared"),
        # security / network accessories
        "Крепление": _t("Крепление", "Berkitme", "Mount"),
        "Питание": _t("Питание", "Iýmitlenme", "Power"),
        "Кабель": _t("Кабель", "Kabel", "Cable"),
        "Шкаф": _t("Шкаф", "Şkaf", "Rack cabinet"),
        # modems
        "DSL": _t("DSL", "DSL", "DSL"),
        "4G": _t("4G (LTE)", "4G (LTE)", "4G (LTE)"),
    },
}

# Spec row labels, reused across products.
L = {
    "cores": _t("Ядра / потоки", "Ýadrolar / akymlar", "Cores / threads"),
    "base": _t("Базовая частота", "Esasy ýygylyk", "Base clock"),
    "boost": _t("Частота в бусте", "Iň ýokary ýygylyk", "Boost clock"),
    "l3": _t("Кэш L3", "L3 keşi", "L3 cache"),
    "cooler": _t("Кулер в комплекте", "Toplumdaky sowadyjy", "Cooler included"),
    "chipset": _t("Чипсет", "Çipset", "Chipset"),
    "mem": _t("Память", "Ýat", "Memory"),
    "lan": _t("Сеть", "Tor", "Network"),
    "wifi": _t("Беспроводная связь", "Simsiz aragatnaşyk", "Wireless"),
    "m2": _t("Слоты M.2", "M.2 slotlary", "M.2 slots"),
    "kit": _t("Комплект", "Toplum", "Kit"),
    "freq": _t("Частота", "Ýygylyk", "Speed"),
    "latency": _t("Тайминги", "Taýmingler", "Latency"),
    "rgb": _t("Подсветка", "Yşyklandyryş", "Lighting"),
    "vram": _t("Видеопамять", "Wideo ýady", "Video memory"),
    "bus": _t("Шина памяти", "Ýat şinasy", "Memory bus"),
    "psu_rec": _t("Рекомендуемый БП", "Maslahat berilýän energiýa bloky", "Recommended PSU"),
    "outputs": _t("Разъёмы", "Çykyşlar", "Outputs"),
    "cert": _t("Сертификат", "Sertifikat", "Efficiency"),
    "modular": _t("Кабели", "Kabeller", "Cables"),
    "fan": _t("Вентилятор", "Wentilýator", "Fan"),
    "standard": _t("Стандарт", "Standart", "Standard"),
    "form": _t("Форм-фактор", "Forma faktory", "Form factor"),
    "read": _t("Чтение", "Okamak", "Read"),
    "write": _t("Запись", "Ýazmak", "Write"),
    "cache": _t("Кэш", "Bufer", "Cache"),
    "purpose": _t("Назначение", "Niýetlenişi", "Purpose"),
    "fans": _t("Вентиляторы в комплекте", "Toplumdaky wentilýatorlar", "Fans included"),
    "mb_support": _t("Материнские платы", "Ene platalar", "Motherboards"),
    "sensor": _t("Сенсор", "Datçik", "Sensor"),
    "buttons": _t("Кнопки", "Düwmeler", "Buttons"),
    "conn": _t("Подключение", "Birikdirme", "Connection"),
    "heatpipes": _t("Тепловые трубки", "Ýylylyk turbalary", "Heat pipes"),
    "layout": _t("Раскладка", "Düzülişi", "Layout"),
    "res": _t("Разрешение", "Çözgüdi", "Resolution"),
    "lens": _t("Объектив", "Obýektiw", "Lens"),
    "ir": _t("ИК-подсветка", "IK yşyklandyryş", "IR range"),
    "protect": _t("Защита", "Goraglylyk", "Protection"),
    "power": _t("Питание", "Iýmitlenme", "Power"),
    "zoom": _t("Оптический зум", "Optiki ýakynlaşdyrma", "Optical zoom"),
    "addr": _t("Адресный", "Adresli", "Addressable"),
    "detect": _t("Принцип обнаружения", "Anyklaýyş usuly", "Detection"),
    "loops": _t("Шлейфы", "Şleýfler", "Zones"),
    "channels": _t("Каналы", "Kanallar", "Channels"),
    "hdd": _t("Отсеки HDD", "HDD ýerleri", "HDD bays"),
    "bandwidth": _t("Входящий поток", "Giriş akymy", "Incoming bandwidth"),
    "screen": _t("Экран", "Ekran", "Screen"),
    "faces": _t("База лиц", "Ýüz binýady", "Face capacity"),
    "cards": _t("Карты доступа", "Giriş kartlary", "Access cards"),
    "range": _t("Дальность", "Aralyk", "Range"),
    "ports": _t("Порты", "Portlar", "Ports"),
    "poe": _t("PoE", "PoE", "PoE"),
    "managed": _t("Управление", "Dolandyryş", "Management"),
    "speed": _t("Скорость", "Tizlik", "Speed"),
    "bands": _t("Диапазоны", "Diapazonlar", "Bands"),
    "iface": _t("Интерфейс", "Interfeýs", "Interface"),
    "sim": _t("SIM-карта", "SIM-kart", "SIM card"),
    "length": _t("Длина", "Uzynlygy", "Length"),
    "cat": _t("Категория", "Kategoriýa", "Category"),
    "color": _t("Цвет", "Reňki", "Colour"),
    "size": _t("Размеры", "Ölçegleri", "Dimensions"),
    "load": _t("Нагрузка", "Ýük", "Load"),
    "cpu": _t("Процессор", "Prosessor", "CPU"),
    "gpu": _t("Видеокарта", "Wideokarta", "Graphics"),
    "storage": _t("Накопитель", "Ýat göterijisi", "Storage"),
    "os": _t("Система", "Ulgam", "OS"),
    "throughput": _t("Пропускная способность", "Geçirijilik ukyby", "Throughput"),
}


def u(num: str, ru: str, other: str) -> dict:
    """A value with a unit written the Russian way and the international way."""
    return _t(f"{num} {ru}", f"{num} {other}", f"{num} {other}")


YES = _t("Да", "Hawa", "Yes")
NO = _t("Нет", "Ýok", "No")


def specs(*rows) -> dict:
    """[(label key, value)] → {lang: [{label, value}]}; a plain string value is
    the same in every language."""
    out: dict[str, list] = {"ru": [], "tk": [], "en": []}
    for key, value in rows:
        for lang in out:
            v = value[lang] if isinstance(value, dict) else value
            out[lang].append({"label": L[key][lang], "value": v})
    return out


# slug → {short: {tk, en}, body: {ru, tk, en}, specs: {lang: [...]}}
PRODUCT_TEXTS = {
    # ------------------------------------------------------------------ cpu
    "amd-ryzen-7-7800x3d": {
        "short": {"tk": "8 ýadro, AM5, 3D V-Cache", "en": "8 cores, AM5, 3D V-Cache"},
        "body": _t(
            "Один из самых быстрых игровых процессоров: 96 МБ кэша L3 с технологией 3D V-Cache заметно поднимают FPS в играх.",
            "Iň çalt oýun prosessorlarynyň biri: 3D V-Cache tehnologiýaly 96 MB L3 keşi oýunlarda FPS-i ep-esli ýokarlandyrýar.",
            "One of the fastest gaming CPUs: 96 MB of L3 cache with 3D V-Cache gives a clear FPS boost in games.",
        ),
        "specs": specs(("cores", "8 / 16"), ("base", u("4.2", "ГГц", "GHz")), ("boost", u("5.0", "ГГц", "GHz")),
                       ("l3", u("96", "МБ", "MB")), ("cooler", NO)),
    },
    "amd-ryzen-5-7600": {
        "short": {"tk": "6 ýadro, AM5", "en": "6 cores, AM5"},
        "body": _t(
            "Доступный 6-ядерный процессор на платформе AM5 для игр и работы. В комплекте кулер Wraith Stealth.",
            "Oýunlar we iş üçin AM5 platformasyndaky elýeterli 6 ýadroly prosessor. Toplumda Wraith Stealth sowadyjysy bar.",
            "An affordable 6-core AM5 processor for gaming and work. Comes with a Wraith Stealth cooler.",
        ),
        "specs": specs(("cores", "6 / 12"), ("base", u("3.8", "ГГц", "GHz")), ("boost", u("5.1", "ГГц", "GHz")),
                       ("l3", u("32", "МБ", "MB")), ("cooler", YES)),
    },
    "intel-core-i5-13400f": {
        "short": {"tk": "10 ýadro, LGA1700", "en": "10 cores, LGA1700"},
        "body": _t(
            "Сбалансированный процессор для игр и офиса: 6 производительных и 4 энергоэффективных ядра. Нужна дискретная видеокарта.",
            "Oýunlar we ofis üçin deňagramly prosessor: 6 öndürijili we 4 tygşytly ýadro. Aýratyn wideokarta gerek.",
            "A balanced CPU for gaming and office work: 6 performance and 4 efficient cores. Needs a discrete graphics card.",
        ),
        "specs": specs(("cores", "10 (6P + 4E) / 16"), ("base", u("2.5", "ГГц", "GHz")), ("boost", u("4.6", "ГГц", "GHz")),
                       ("l3", u("20", "МБ", "MB")), ("cooler", YES)),
    },
    "intel-core-i7-14700k": {
        "short": {"tk": "20 ýadro, LGA1700", "en": "20 cores, LGA1700"},
        "body": _t(
            "Мощный процессор для игр, стриминга и монтажа: 20 ядер и частота до 5.6 ГГц. Разблокированный множитель для разгона.",
            "Oýunlar, strim we montaž üçin güýçli prosessor: 20 ýadro we 5.6 GHz-e çenli ýygylyk. Artdyrmak üçin açyk köpeldiji.",
            "A powerful CPU for gaming, streaming and editing: 20 cores up to 5.6 GHz, unlocked for overclocking.",
        ),
        "specs": specs(("cores", "20 (8P + 12E) / 28"), ("boost", u("5.6", "ГГц", "GHz")), ("l3", u("33", "МБ", "MB")),
                       ("cooler", NO)),
    },
    "intel-core-i3-12100": {
        "short": {"tk": "4 ýadro, LGA1700", "en": "4 cores, LGA1700"},
        "body": _t(
            "Недорогой 4-ядерный процессор со встроенной графикой — хватит для офиса, учёбы и домашнего ПК без видеокарты.",
            "Içine gurlan grafikaly arzan 4 ýadroly prosessor — wideokartasyz ofis, okuw we öý kompýuteri üçin ýeterlik.",
            "An inexpensive 4-core CPU with integrated graphics — enough for office, study and a home PC without a graphics card.",
        ),
        "specs": specs(("cores", "4 / 8"), ("base", u("3.3", "ГГц", "GHz")), ("boost", u("4.3", "ГГц", "GHz")),
                       ("l3", u("12", "МБ", "MB")), ("cooler", YES)),
    },
    # ------------------------------------------------------------------ motherboards
    "msi-mag-b650-tomahawk-wifi": {
        "short": {"tk": "AM5, ATX, Wi‑Fi 6E", "en": "AM5, ATX, Wi‑Fi 6E"},
        "body": _t(
            "Надёжная плата для Ryzen 7000 с мощным питанием, 2.5-гигабитной сетью и Wi‑Fi 6E.",
            "Güýçli iýmitlenmeli, 2.5 gigabitlik torly we Wi‑Fi 6E-li Ryzen 7000 üçin ygtybarly plata.",
            "A solid Ryzen 7000 board with strong power delivery, 2.5 GbE and Wi‑Fi 6E.",
        ),
        "specs": specs(("chipset", "AMD B650"), ("mem", _t("4 × DDR5", "4 × DDR5", "4 × DDR5")),
                       ("lan", "2.5 GbE"), ("wifi", "Wi‑Fi 6E, Bluetooth 5.3")),
    },
    "asus-tuf-gaming-b760m-plus": {
        "short": {"tk": "LGA1700, mATX, DDR5", "en": "LGA1700, mATX, DDR5"},
        "body": _t(
            "Компактная плата серии TUF для процессоров Intel 12–14 поколений с поддержкой DDR5.",
            "DDR5 goldawly Intel 12–14 nesil prosessorlary üçin TUF seriýaly ykjam plata.",
            "A compact TUF board for 12th–14th gen Intel processors with DDR5 support.",
        ),
        "specs": specs(("chipset", "Intel B760"), ("mem", "4 × DDR5"), ("lan", "2.5 GbE")),
    },
    "gigabyte-b650m-ds3h": {
        "short": {"tk": "AM5, mATX, DDR5", "en": "AM5, mATX, DDR5"},
        "body": _t(
            "Недорогая плата формата mATX для сборки на Ryzen 7000 — всё необходимое без переплаты.",
            "Ryzen 7000 ýygnamak üçin mATX görnüşli arzan plata — artykmaç tölegsiz zerur zatlaryň hemmesi.",
            "An affordable mATX board for a Ryzen 7000 build — the essentials without overpaying.",
        ),
        "specs": specs(("chipset", "AMD B650"), ("mem", "4 × DDR5"), ("m2", "2")),
    },
    # ------------------------------------------------------------------ ram
    "gskill-trident-z5-rgb-32gb-ddr5-6400": {
        "short": {"tk": "2×16 GB, CL32", "en": "2×16 GB, CL32"},
        "body": _t(
            "Быстрый комплект DDR5 с RGB-подсветкой для игровых сборок.",
            "Oýun ýygnamalary üçin RGB yşyklandyryşly çalt DDR5 toplumy.",
            "A fast DDR5 kit with RGB lighting for gaming builds.",
        ),
        "specs": specs(("kit", u("2 × 16", "ГБ", "GB")), ("freq", u("6400", "МГц", "MHz")), ("latency", "CL32"),
                       ("rgb", YES)),
    },
    "kingston-fury-beast-16gb-ddr4-3200": {
        "short": {"tk": "2×8 GB, CL16", "en": "2×8 GB, CL16"},
        "body": _t(
            "Проверенный комплект DDR4 для офисных и домашних ПК.",
            "Ofis we öý kompýuterleri üçin synagdan geçen DDR4 toplumy.",
            "A proven DDR4 kit for office and home PCs.",
        ),
        "specs": specs(("kit", u("2 × 8", "ГБ", "GB")), ("freq", u("3200", "МГц", "MHz")), ("latency", "CL16"),
                       ("rgb", NO)),
    },
    "crucial-pro-32gb-ddr5-5600": {
        "short": {"tk": "2×16 GB, CL46", "en": "2×16 GB, CL46"},
        "body": _t(
            "Надёжная память DDR5 без лишнего — для рабочих станций и универсальных сборок.",
            "Artykmaç zatsyz ygtybarly DDR5 ýady — iş stansiýalary we uniwersal ýygnamalar üçin.",
            "Reliable no-frills DDR5 memory for workstations and all-round builds.",
        ),
        "specs": specs(("kit", u("2 × 16", "ГБ", "GB")), ("freq", u("5600", "МГц", "MHz")), ("latency", "CL46"),
                       ("rgb", NO)),
    },
    # ------------------------------------------------------------------ gpu
    "asus-dual-rtx-4060-8gb": {
        "short": {"tk": "8 GB GDDR6, DLSS 3", "en": "8 GB GDDR6, DLSS 3"},
        "body": _t(
            "Тихая видеокарта для игр в Full HD с поддержкой трассировки лучей и DLSS 3.",
            "Şöhle yzarlamasyny we DLSS 3-i goldaýan, Full HD oýunlar üçin ýuwaş wideokarta.",
            "A quiet card for Full HD gaming with ray tracing and DLSS 3.",
        ),
        "specs": specs(("vram", u("8", "ГБ GDDR6", "GB GDDR6")), ("bus", u("128", "бит", "bit")),
                       ("psu_rec", u("550", "Вт", "W")), ("outputs", "HDMI 2.1, 3 × DisplayPort 1.4a")),
    },
    "gigabyte-rx-7600-gaming-oc-8gb": {
        "short": {"tk": "8 GB GDDR6", "en": "8 GB GDDR6"},
        "body": _t(
            "Видеокарта AMD для игр в Full HD на высоких настройках, с тройным вентилятором WINDFORCE.",
            "Ýokary sazlamalarda Full HD oýunlar üçin üç wentilýatorly WINDFORCE bilen AMD wideokartasy.",
            "An AMD card for high-settings Full HD gaming with a triple-fan WINDFORCE cooler.",
        ),
        "specs": specs(("vram", u("8", "ГБ GDDR6", "GB GDDR6")), ("bus", u("128", "бит", "bit")),
                       ("psu_rec", u("550", "Вт", "W"))),
    },
    "msi-rtx-4070-super-ventus-12gb": {
        "short": {"tk": "12 GB GDDR6X", "en": "12 GB GDDR6X"},
        "body": _t(
            "Видеокарта для игр в 1440p и работы с графикой: 12 ГБ быстрой памяти и DLSS 3.",
            "1440p oýunlar we grafika bilen işlemek üçin wideokarta: 12 GB çalt ýat we DLSS 3.",
            "A card for 1440p gaming and creative work: 12 GB of fast memory and DLSS 3.",
        ),
        "specs": specs(("vram", u("12", "ГБ GDDR6X", "GB GDDR6X")), ("bus", u("192", "бит", "bit")),
                       ("psu_rec", u("650", "Вт", "W"))),
    },
    # ------------------------------------------------------------------ psu
    "corsair-rm850x": {
        "short": {"tk": "850 W, 80+ Gold, modully", "en": "850 W, 80+ Gold, fully modular"},
        "body": _t(
            "Тихий модульный блок питания с запасом мощности для игровых ПК с топовыми видеокартами.",
            "Güýçli wideokartaly oýun kompýuterleri üçin kuwwat ätiýaçly ýuwaş modully energiýa bloky.",
            "A quiet modular PSU with headroom for gaming PCs with high-end graphics cards.",
        ),
        "specs": specs(("cert", "80 PLUS Gold"), ("modular", _t("Модульные", "Modully", "Fully modular")),
                       ("fan", u("135", "мм", "mm"))),
    },
    "deepcool-pk650d": {
        "short": {"tk": "650 W, 80+ Bronze", "en": "650 W, 80+ Bronze"},
        "body": _t(
            "Доступный блок питания для офисных и игровых сборок среднего уровня.",
            "Ofis we orta derejeli oýun ýygnamalary üçin elýeterli energiýa bloky.",
            "An affordable PSU for office and mid-range gaming builds.",
        ),
        "specs": specs(("cert", "80 PLUS Bronze"), ("modular", _t("Несъёмные", "Aýrylmaýan", "Non-modular")),
                       ("fan", u("120", "мм", "mm"))),
    },
    "be-quiet-pure-power-12-m-750w": {
        "short": {"tk": "750 W, 80+ Gold, ATX 3.0", "en": "750 W, 80+ Gold, ATX 3.0"},
        "body": _t(
            "Тихий блок питания стандарта ATX 3.0 с разъёмом 12VHPWR для современных видеокарт.",
            "Häzirki zaman wideokartalary üçin 12VHPWR birikdirijili ATX 3.0 standartly ýuwaş energiýa bloky.",
            "A quiet ATX 3.0 PSU with a 12VHPWR connector for modern graphics cards.",
        ),
        "specs": specs(("cert", "80 PLUS Gold"), ("standard", "ATX 3.0"),
                       ("modular", _t("Модульные", "Modully", "Modular"))),
    },
    # ------------------------------------------------------------------ ssd
    "wd-black-sn850x-2tb": {
        "short": {"tk": "NVMe PCIe 4.0, 7300 MB/s çenli", "en": "NVMe PCIe 4.0, up to 7300 MB/s"},
        "body": _t(
            "Один из самых быстрых SSD на PCIe 4.0 — игры и проекты загружаются за секунды.",
            "PCIe 4.0-daky iň çalt SSD-leriň biri — oýunlar we taslamalar birnäçe sekuntda açylýar.",
            "One of the fastest PCIe 4.0 SSDs — games and projects load in seconds.",
        ),
        "specs": specs(("form", "M.2 2280"), ("read", u("7300", "МБ/с", "MB/s")), ("write", u("6600", "МБ/с", "MB/s"))),
    },
    "samsung-990-pro-1tb": {
        "short": {"tk": "NVMe PCIe 4.0", "en": "NVMe PCIe 4.0"},
        "body": _t(
            "Флагманский SSD Samsung для игр и профессиональной работы.",
            "Oýunlar we hünär işi üçin Samsung-yň baş SSD-si.",
            "Samsung's flagship SSD for gaming and professional work.",
        ),
        "specs": specs(("form", "M.2 2280"), ("read", u("7450", "МБ/с", "MB/s")), ("write", u("6900", "МБ/с", "MB/s"))),
    },
    "kingston-nv2-1tb": {
        "short": {"tk": "NVMe PCIe 4.0", "en": "NVMe PCIe 4.0"},
        "body": _t(
            "Недорогой NVMe-накопитель для быстрой загрузки системы и программ.",
            "Ulgamy we programmalary çalt açmak üçin arzan NVMe ýat göterijisi.",
            "An inexpensive NVMe drive for fast system and app loading.",
        ),
        "specs": specs(("form", "M.2 2280"), ("read", u("3500", "МБ/с", "MB/s")), ("write", u("2100", "МБ/с", "MB/s"))),
    },
    # ------------------------------------------------------------------ hdd
    "seagate-barracuda-2tb": {
        "short": {"tk": "3.5\", 7200 aýl/min, 256 MB", "en": "3.5\", 7200 rpm, 256 MB"},
        "body": _t(
            "Ёмкий жёсткий диск для хранения фото, видео и архивов.",
            "Suratlary, wideolary we arhiwleri saklamak üçin göwrümli gaty disk.",
            "A roomy hard drive for photos, videos and archives.",
        ),
        "specs": specs(("form", "3.5\""), ("iface", "SATA III"), ("cache", u("256", "МБ", "MB"))),
    },
    "toshiba-p300-1tb": {
        "short": {"tk": "3.5\", 7200 aýl/min", "en": "3.5\", 7200 rpm"},
        "body": _t(
            "Надёжный диск для настольного ПК: второй накопитель под файлы и игры.",
            "Stol kompýuteri üçin ygtybarly disk: faýllar we oýunlar üçin ikinji ýat göterijisi.",
            "A reliable desktop drive: a second disk for files and games.",
        ),
        "specs": specs(("form", "3.5\""), ("iface", "SATA III")),
    },
    "wd-purple-4tb": {
        "short": {"tk": "Wideogözegçilik üçin, 5400 aýl/min", "en": "For video surveillance, 5400 rpm"},
        "body": _t(
            "Диск для видеорегистраторов: рассчитан на круглосуточную запись с нескольких камер.",
            "Wideoregistratorlar üçin disk: birnäçe kameradan gije-gündizlik ýazga niýetlenen.",
            "A drive for video recorders, built for 24/7 recording from multiple cameras.",
        ),
        "specs": specs(("form", "3.5\""), ("iface", "SATA III"),
                       ("purpose", _t("Видеонаблюдение 24/7", "Wideogözegçilik 24/7", "24/7 surveillance"))),
    },
    # ------------------------------------------------------------------ cases
    "lian-li-lancool-216-argb-white": {
        "short": {"tk": "ATX, 2×160 mm ARGB", "en": "ATX, 2×160 mm ARGB"},
        "body": _t(
            "Просторный белый корпус с отличным продувом: два 160-мм ARGB-вентилятора спереди.",
            "Gowy howa aýlanyşykly giň ak korpus: öňünde iki sany 160 mm ARGB wentilýator.",
            "A roomy white case with great airflow: two 160 mm ARGB fans up front.",
        ),
        "specs": specs(("mb_support", "E-ATX, ATX, mATX, Mini-ITX"),
                       ("fans", _t("2 × 160 мм ARGB + 1 × 140 мм", "2 × 160 mm ARGB + 1 × 140 mm",
                                   "2 × 160 mm ARGB + 1 × 140 mm")),
                       ("color", _t("Белый", "Ak", "White"))),
    },
    "nzxt-h5-flow": {
        "short": {"tk": "ATX, tor görnüşli panel", "en": "ATX, mesh front panel"},
        "body": _t(
            "Компактный корпус ATX с сетчатой передней панелью и аккуратной укладкой кабелей.",
            "Tor görnüşli öň panelli we kabelleri tertipli ýerleşdirýän ykjam ATX korpus.",
            "A compact ATX case with a mesh front panel and tidy cable routing.",
        ),
        "specs": specs(("mb_support", "ATX, mATX, Mini-ITX"),
                       ("fans", _t("2 × 120 мм", "2 × 120 mm", "2 × 120 mm"))),
    },
    # ------------------------------------------------------------------ pc accessories
    "logitech-g102-lightsync": {
        "short": {"tk": "Oýun syçanjygy, 8000 DPI", "en": "Gaming mouse, 8000 DPI"},
        "body": _t(
            "Лёгкая игровая мышь с RGB-подсветкой LIGHTSYNC и шестью программируемыми кнопками.",
            "LIGHTSYNC RGB yşyklandyryşly we alty programmirlenýän düwmeli ýeňil oýun syçanjygy.",
            "A light gaming mouse with LIGHTSYNC RGB and six programmable buttons.",
        ),
        "specs": specs(("sensor", "8000 DPI"), ("buttons", "6"), ("conn", "USB")),
    },
    "deepcool-ak400": {
        "short": {"tk": "Prosessor sowadyjysy, 220 W", "en": "CPU cooler, 220 W"},
        "body": _t(
            "Башенный кулер с четырьмя тепловыми трубками — тихо охлаждает процессоры до 220 Вт.",
            "Dört ýylylyk turbaly diň görnüşli sowadyjy — 220 W-a çenli prosessorlary ýuwaş sowadýar.",
            "A tower cooler with four heat pipes that quietly handles CPUs up to 220 W.",
        ),
        "specs": specs(("heatpipes", "4"), ("fan", u("120", "мм", "mm")), ("mb_support", "AM4, AM5, LGA1700")),
    },
    "logitech-k120": {
        "short": {"tk": "Simli klawiatura", "en": "Wired keyboard"},
        "body": _t(
            "Надёжная полноразмерная клавиатура для офиса и дома, устойчивая к брызгам.",
            "Ofis we öý üçin damja çydamly ygtybarly doly ölçegli klawiatura.",
            "A reliable full-size, spill-resistant keyboard for office and home.",
        ),
        "specs": specs(("conn", "USB"), ("layout", _t("Полноразмерная", "Doly ölçegli", "Full-size"))),
    },
    # ------------------------------------------------------------------ cameras
    "hikvision-ds-2cd1043g2-i": {
        "short": {"tk": "4 MP, daşarky, IK 30 m çenli", "en": "4 MP, outdoor, IR up to 30 m"},
        "body": _t(
            "Уличная IP-камера с чёткой картинкой днём и ночью. Питание по PoE — один кабель на камеру.",
            "Gündiz we gije anyk şekilli daşarky IP-kamera. PoE arkaly iýmitlenme — kamera üçin bir kabel.",
            "An outdoor IP camera with a clear picture day and night. PoE power — one cable per camera.",
        ),
        "specs": specs(("res", "2560 × 1440"), ("lens", u("2.8", "мм", "mm")), ("ir", u("30", "м", "m")),
                       ("protect", "IP67"), ("power", "PoE, 12 V DC")),
    },
    "dahua-ipc-hdw1230t1-s5": {
        "short": {"tk": "2 MP, gümmez görnüşli, IK 30 m çenli", "en": "2 MP, dome, IR up to 30 m"},
        "body": _t(
            "Компактная купольная камера для помещений и навесов: Full HD и ночная съёмка.",
            "Jaýlar we üsti ýapyk ýerler üçin ykjam gümmez kamera: Full HD we gijeki surata düşüriş.",
            "A compact dome camera for indoors and canopies: Full HD with night vision.",
        ),
        "specs": specs(("res", "1920 × 1080"), ("lens", u("2.8", "мм", "mm")), ("ir", u("30", "м", "m")),
                       ("power", "PoE, 12 V DC")),
    },
    "hikvision-ds-2de4425iw-de": {
        "short": {"tk": "4 MP, PTZ, 25× ýakynlaşdyrma", "en": "4 MP, PTZ, 25× zoom"},
        "body": _t(
            "Поворотная камера с 25-кратным оптическим зумом для больших территорий: стоянок, складов, дворов.",
            "Uly meýdanlar — awtoduralgalar, ammarlar, howlular üçin 25 esse optiki ýakynlaşdyrmaly aýlanýan kamera.",
            "A pan-tilt-zoom camera with 25× optical zoom for large areas: car parks, warehouses, yards.",
        ),
        "specs": specs(("res", "2560 × 1440"), ("zoom", "25×"), ("ir", u("100", "м", "m")), ("power", "PoE+")),
    },
    # ------------------------------------------------------------------ fire sensors
    "rubezh-ip-212-64-prima": {
        "short": {"tk": "Tüsse habarçysy, adresli", "en": "Smoke detector, addressable"},
        "body": _t(
            "Адресный дымовой извещатель: панель точно показывает, в каком помещении сработала тревога.",
            "Adresli tüsse habarçysy: panel haýsy otagda howsala işländigini takyk görkezýär.",
            "An addressable smoke detector: the panel shows exactly which room raised the alarm.",
        ),
        "specs": specs(("detect", _t("Оптико-электронный (дым)", "Optiki-elektron (tüsse)", "Optical (smoke)")),
                       ("addr", YES)),
    },
    "bolid-s2000-ip": {
        "short": {"tk": "Ýylylyk habarçysy, adresli", "en": "Heat detector, addressable"},
        "body": _t(
            "Адресный тепловой извещатель для помещений, где дымовой датчик даёт ложные срабатывания: кухни, котельные.",
            "Tüsse datçigi ýalňyş işleýän ýerler — aşhanalar, gazan jaýlary üçin adresli ýylylyk habarçysy.",
            "An addressable heat detector for rooms where smoke detectors false-alarm: kitchens, boiler rooms.",
        ),
        "specs": specs(("detect", _t("Тепловой", "Ýylylyk", "Heat")), ("addr", YES),
                       ("conn", _t("Линия ДПЛС (Болид)", "DPLS liniýasy (Bolid)", "DPLS loop (Bolid)"))),
    },
    "bolid-signal-20p": {
        "short": {"tk": "Kabul ediji-gözegçilik enjamy, 20 şleýf", "en": "Control panel, 20 zones"},
        "body": _t(
            "Прибор для охранной и пожарной сигнализации на 20 шлейфов — сердце системы для офиса или склада.",
            "20 şleýfli gorag we ýangyn duýduryş enjamy — ofis ýa-da ammar ulgamynyň merkezi.",
            "A 20-zone security and fire alarm panel — the core of an office or warehouse system.",
        ),
        "specs": specs(("loops", "20"), ("power", _t("220 В, резервный АКБ", "220 V, ätiýaç akkumulýator",
                                                      "220 V, backup battery"))),
    },
    # ------------------------------------------------------------------ recorders
    "hikvision-ds-7608ni-k2": {
        "short": {"tk": "IP-registrator, 8 kanal, 2 HDD", "en": "IP recorder, 8 channels, 2 HDD"},
        "body": _t(
            "Сетевой видеорегистратор на 8 камер: запись, просмотр со смартфона и два отсека под диски.",
            "8 kamera üçin tor wideoregistratory: ýazga almak, smartfondan görmek we disk üçin iki ýer.",
            "An 8-camera network recorder: recording, phone viewing and two drive bays.",
        ),
        "specs": specs(("channels", "8"), ("hdd", "2 × SATA"), ("bandwidth", u("80", "Мбит/с", "Mbit/s"))),
    },
    "dahua-nvr2104hs-s3": {
        "short": {"tk": "IP-registrator, 4 kanal", "en": "IP recorder, 4 channels"},
        "body": _t(
            "Компактный регистратор на 4 камеры для дома, магазина или небольшого офиса.",
            "Öý, dükan ýa-da kiçi ofis üçin 4 kameraly ykjam registrator.",
            "A compact 4-camera recorder for a home, shop or small office.",
        ),
        "specs": specs(("channels", "4"), ("hdd", "1 × SATA")),
    },
    # ------------------------------------------------------------------ face control
    "hikvision-face-control-hk-043": {
        "short": {"tk": "4.3\" ekran, Wi‑Fi, IP65", "en": "4.3\" screen, Wi‑Fi, IP65"},
        "body": _t(
            "Терминал распознавания лиц для учёта рабочего времени и контроля доступа. Быстрое распознавание, работа с картами.",
            "Iş wagtyny hasaba almak we girişe gözegçilik üçin ýüz tanaýan terminal. Çalt tanaýar, kartlar bilen işleýär.",
            "A face recognition terminal for time tracking and access control. Fast recognition, works with cards.",
        ),
        "specs": specs(("faces", "3 000"), ("screen", "4.3\""), ("conn", "Wi‑Fi, TCP/IP"), ("protect", "IP65")),
    },
    "dahua-asi7213x-t1": {
        "short": {"tk": "7\" ekran, kartlar, temperatura", "en": "7\" screen, cards, temperature"},
        "body": _t(
            "Терминал доступа с экраном 7\": распознаёт лица, читает карты и измеряет температуру на входе.",
            "7\" ekranly giriş terminaly: ýüzleri tanaýar, kartlary okaýar we girişde temperaturany ölçeýär.",
            "An access terminal with a 7\" screen: recognises faces, reads cards and checks temperature at the door.",
        ),
        "specs": specs(("faces", "10 000"), ("screen", "7\""), ("cards", YES)),
    },
    # ------------------------------------------------------------------ motion sensors
    "bolid-s2000-ik": {
        "short": {"tk": "Adresli IK-habarçy, 12 m çenli", "en": "Addressable IR detector, up to 12 m"},
        "body": _t(
            "Адресный инфракрасный датчик движения для охраны помещений в системах Болид.",
            "Bolid ulgamlarynda otaglary goramak üçin adresli infragyzyl hereket datçigi.",
            "An addressable infrared motion detector for Bolid security systems.",
        ),
        "specs": specs(("range", u("12", "м", "m")), ("addr", YES)),
    },
    "rubezh-io-409-40": {
        "short": {"tk": "Göwrümli IK-habarçy", "en": "Volumetric IR detector"},
        "body": _t(
            "Объёмный инфракрасный извещатель: реагирует на движение человека во всём помещении.",
            "Göwrümli infragyzyl habarçy: tutuş otagda adamyň hereketine täsir edýär.",
            "A volumetric infrared detector that reacts to movement anywhere in the room.",
        ),
        "specs": specs(("detect", _t("Инфракрасный, объёмный", "Infragyzyl, göwrümli", "Infrared, volumetric"))),
    },
    # ------------------------------------------------------------------ security accessories
    "hikvision-ds-1280zj-xs": {
        "short": {"tk": "Kameralar üçin gurnama gutusy", "en": "Junction box for cameras"},
        "body": _t(
            "Монтажная коробка: прячет разъёмы и запас кабеля, аккуратно крепит камеру на стене.",
            "Gurnama gutusy: birikdirijileri we kabel ätiýajyny gizleýär, kamerany diwara tertipli berkidýär.",
            "A junction box that hides connectors and spare cable and mounts the camera neatly on a wall.",
        ),
        "specs": specs(("color", _t("Белый", "Ak", "White"))),
    },
    "tp-link-tl-poe150s": {
        "short": {"tk": "PoE-inžektor, Gigabit", "en": "PoE injector, Gigabit"},
        "body": _t(
            "Подаёт питание на камеру или точку доступа по сетевому кабелю, если коммутатор без PoE.",
            "Kommutatorda PoE ýok bolsa, kamera ýa-da giriş nokadyna tor kabeli arkaly tok berýär.",
            "Powers a camera or access point over the network cable when the switch has no PoE.",
        ),
        "specs": specs(("standard", "802.3af"), ("speed", "10/100/1000 Mbit/s")),
    },
    # ------------------------------------------------------------------ switches
    "tp-link-tl-sg108": {
        "short": {"tk": "8 port, Gigabit, dolandyrylmaýan", "en": "8 ports, Gigabit, unmanaged"},
        "body": _t(
            "Простой гигабитный коммутатор: подключил — работает. Металлический корпус.",
            "Ýönekeý gigabitlik kommutator: birikdir — işleýär. Metal korpus.",
            "A plug-and-play gigabit switch in a metal case.",
        ),
        "specs": specs(("ports", "8 × 1 GbE"), ("managed", _t("Неуправляемый", "Dolandyrylmaýan", "Unmanaged"))),
    },
    "ubiquiti-usw-lite-8-poe": {
        "short": {"tk": "8 port, 4 PoE+, dolandyrylýan", "en": "8 ports, 4 PoE+, managed"},
        "body": _t(
            "Управляемый коммутатор UniFi: 4 порта PoE+ питают камеры и точки доступа.",
            "Dolandyrylýan UniFi kommutatory: 4 sany PoE+ port kameralary we giriş nokatlaryny iýmitlendirýär.",
            "A managed UniFi switch whose 4 PoE+ ports power cameras and access points.",
        ),
        "specs": specs(("ports", "8 × 1 GbE"), ("poe", _t("4 × PoE+, 52 Вт", "4 × PoE+, 52 W", "4 × PoE+, 52 W")),
                       ("managed", _t("UniFi Network", "UniFi Network", "UniFi Network"))),
    },
    "mikrotik-crs326-24g-2s-in": {
        "short": {"tk": "24 port Gigabit, 2×SFP+", "en": "24 Gigabit ports, 2×SFP+"},
        "body": _t(
            "Стоечный коммутатор на 24 порта с двумя аплинками SFP+ 10G для офисных сетей.",
            "Ofis torlary üçin iki sany SFP+ 10G aplinkli 24 portly stoýka kommutatory.",
            "A 24-port rack switch with two 10G SFP+ uplinks for office networks.",
        ),
        "specs": specs(("ports", "24 × 1 GbE + 2 × SFP+ 10G"), ("managed", "RouterOS / SwOS")),
    },
    # ------------------------------------------------------------------ repeaters
    "tp-link-re315": {
        "short": {"tk": "Wi‑Fi güýçlendiriji AC1200, Mesh", "en": "Wi‑Fi extender AC1200, Mesh"},
        "body": _t(
            "Усилитель Wi‑Fi убирает «мёртвые зоны»; с роутерами OneMesh образует единую сеть.",
            "Wi‑Fi güýçlendiriji «öli zolaklary» aýyrýar; OneMesh routerler bilen bitewi tor döredýär.",
            "Removes Wi‑Fi dead zones and forms one network with OneMesh routers.",
        ),
        "specs": specs(("speed", "AC1200"), ("bands", _t("2.4 и 5 ГГц", "2.4 we 5 GHz", "2.4 and 5 GHz"))),
    },
    "mercusys-me30": {
        "short": {"tk": "Wi‑Fi güýçlendiriji AC1200", "en": "Wi‑Fi extender AC1200"},
        "body": _t(
            "Недорогой двухдиапазонный усилитель сигнала Wi‑Fi для квартиры или дома.",
            "Öý ýa-da kwartira üçin arzan iki diapazonly Wi‑Fi güýçlendiriji.",
            "An inexpensive dual-band Wi‑Fi extender for a flat or house.",
        ),
        "specs": specs(("speed", "AC1200"), ("bands", _t("2.4 и 5 ГГц", "2.4 we 5 GHz", "2.4 and 5 GHz"))),
    },
    # ------------------------------------------------------------------ routers
    "tp-link-archer-ax55": {
        "short": {"tk": "Wi‑Fi 6, AX3000", "en": "Wi‑Fi 6, AX3000"},
        "body": _t(
            "Двухдиапазонный роутер Wi‑Fi 6 для квартиры с большим числом устройств.",
            "Köp enjamly kwartira üçin iki diapazonly Wi‑Fi 6 router.",
            "A dual-band Wi‑Fi 6 router for homes with lots of devices.",
        ),
        "specs": specs(("speed", "AX3000"), ("ports", "4 × 1 GbE LAN + 1 × 1 GbE WAN")),
    },
    "keenetic-giga-kn-1012": {
        "short": {"tk": "Wi‑Fi 6, AX1800, SFP", "en": "Wi‑Fi 6, AX1800, SFP"},
        "body": _t(
            "Гибкий интернет-центр Keenetic с портом SFP для оптики и поддержкой Mesh.",
            "Optika üçin SFP portly we Mesh goldawly çeýe Keenetic internet-merkezi.",
            "A flexible Keenetic router with an SFP port for fibre and Mesh support.",
        ),
        "specs": specs(("speed", "AX1800"), ("ports", "5 × 1 GbE + SFP")),
    },
    "mikrotik-hap-ax2": {
        "short": {"tk": "Wi‑Fi 6, 5 port Gigabit", "en": "Wi‑Fi 6, 5 Gigabit ports"},
        "body": _t(
            "Роутер MikroTik с Wi‑Fi 6 для офиса: гибкая настройка RouterOS, VPN и VLAN.",
            "Ofis üçin Wi‑Fi 6-ly MikroTik router: RouterOS-yň çeýe sazlamasy, VPN we VLAN.",
            "A Wi‑Fi 6 MikroTik router for offices: flexible RouterOS setup, VPN and VLAN.",
        ),
        "specs": specs(("ports", "5 × 1 GbE"), ("bands", _t("2.4 и 5 ГГц", "2.4 we 5 GHz", "2.4 and 5 GHz"))),
    },
    # ------------------------------------------------------------------ network adapters
    "tp-link-archer-t3u": {
        "short": {"tk": "USB Wi‑Fi adapter AC1300", "en": "USB Wi‑Fi adapter AC1300"},
        "body": _t(
            "Добавит компьютеру двухдиапазонный Wi‑Fi через USB — без вскрытия корпуса.",
            "Korpusy açmazdan USB arkaly kompýutere iki diapazonly Wi‑Fi goşýar.",
            "Adds dual-band Wi‑Fi to a PC over USB — no need to open the case.",
        ),
        "specs": specs(("iface", "USB 3.0"), ("speed", "AC1300")),
    },
    "mercusys-ma30n": {
        "short": {"tk": "PCIe Wi‑Fi adapter AC1200", "en": "PCIe Wi‑Fi adapter AC1200"},
        "body": _t(
            "Внутренний Wi‑Fi адаптер PCIe с выносными антеннами для стабильного приёма.",
            "Durnukly kabul etmek üçin daşarky antennaly içki PCIe Wi‑Fi adapteri.",
            "An internal PCIe Wi‑Fi card with external antennas for a stable signal.",
        ),
        "specs": specs(("iface", "PCIe"), ("speed", "AC1200")),
    },
    # ------------------------------------------------------------------ modems
    "tp-link-archer-vr300": {
        "short": {"tk": "VDSL/ADSL modem-router AC1200", "en": "VDSL/ADSL modem router AC1200"},
        "body": _t(
            "Модем-роутер для интернета по телефонной линии с двухдиапазонным Wi‑Fi.",
            "Telefon liniýasy arkaly internet üçin iki diapazonly Wi‑Fi-ly modem-router.",
            "A modem router for internet over a phone line, with dual-band Wi‑Fi.",
        ),
        "specs": specs(("iface", "VDSL2 / ADSL2+"), ("speed", "AC1200")),
    },
    "tp-link-archer-mr600": {
        "short": {"tk": "4G+ router Cat6, AC1200", "en": "4G+ router Cat6, AC1200"},
        "body": _t(
            "Роутер с SIM-картой: интернет 4G+ там, где нет проводной линии.",
            "SIM-kartly router: simli liniýa ýok ýerlerde 4G+ internet.",
            "A SIM-card router: 4G+ internet where there is no wired line.",
        ),
        "specs": specs(("sim", "Nano-SIM"), ("standard", "4G+ Cat6"), ("speed", "AC1200")),
    },
    # ------------------------------------------------------------------ firewalls
    "mikrotik-rb5009ug-s-in": {
        "short": {"tk": "Router-fairwol, 2.5G + SFP+", "en": "Router firewall, 2.5G + SFP+"},
        "body": _t(
            "Производительный маршрутизатор для офиса: порт 2.5G, SFP+ 10G и гибкий файервол RouterOS.",
            "Ofis üçin öndürijili marşrutizator: 2.5G port, SFP+ 10G we RouterOS-yň çeýe fairwoly.",
            "A capable office router: 2.5G port, 10G SFP+ and the flexible RouterOS firewall.",
        ),
        "specs": specs(("ports", "7 × 1 GbE + 1 × 2.5 GbE + SFP+ 10G")),
    },
    "ubiquiti-udm-pro": {
        "short": {"tk": "Howpsuzlyk şlýuzy, IDS/IPS", "en": "Security gateway, IDS/IPS"},
        "body": _t(
            "Шлюз UniFi «всё в одном»: маршрутизатор, файервол с IDS/IPS и контроллер сети.",
            "UniFi «hemmesi birde» şlýuzy: marşrutizator, IDS/IPS-li fairwol we tor kontrolleri.",
            "An all-in-one UniFi gateway: router, IDS/IPS firewall and network controller.",
        ),
        "specs": specs(("ports", "8 × 1 GbE + 2 × SFP+"), ("throughput", _t("до 3.5 Гбит/с с IDS/IPS",
                                                                              "IDS/IPS bilen 3.5 Gbit/s çenli",
                                                                              "up to 3.5 Gbit/s with IDS/IPS"))),
    },
    # ------------------------------------------------------------------ network accessories
    "hyperline-pc-lpm-utp-rj45-1m": {
        "short": {"tk": "RJ45–RJ45, çal", "en": "RJ45–RJ45, grey"},
        "body": _t(
            "Патч-корд для подключения компьютеров, камер и коммутаторов.",
            "Kompýuterleri, kameralary we kommutatorlary birikdirmek üçin patç-kord.",
            "A patch cord for connecting computers, cameras and switches.",
        ),
        "specs": specs(("cat", "UTP Cat5e"), ("length", u("1", "м", "m")), ("color", _t("Серый", "Çal", "Grey"))),
    },
    "tlk-rack-12u-600x450": {
        "short": {"tk": "Aýna gapy, aýrylýan diwarlar", "en": "Glass door, removable side panels"},
        "body": _t(
            "Настенный шкаф 12U для коммутаторов, патч-панелей и регистраторов.",
            "Kommutatorlar, patç-panelleri we registratorlar üçin 12U diwar şkafy.",
            "A 12U wall cabinet for switches, patch panels and recorders.",
        ),
        "specs": specs(("size", _t("12U, 600 × 450 мм", "12U, 600 × 450 mm", "12U, 600 × 450 mm")),
                       ("color", _t("Серый", "Çal", "Grey"))),
    },
    # ------------------------------------------------------------------ builds
    "km-gamer-ryzen-7-7800x3d": {
        "short": {"tk": "Ryzen 7 7800X3D, 32 GB DDR5, SSD 2 TB", "en": "Ryzen 7 7800X3D, 32 GB DDR5, 2 TB SSD"},
        "body": _t(
            "Готовый компьютер, собранный и протестированный в нашем магазине. Установим систему и драйверы, выдадим с гарантией.",
            "Dükanymyzda ýygnalan we synagdan geçirilen taýýar kompýuter. Ulgamy we draýwerleri gurnap, kepillik bilen berýäris.",
            "A ready-made PC assembled and tested in our store. We install the OS and drivers and hand it over with a warranty.",
        ),
        "specs": specs(("cpu", "AMD Ryzen 7 7800X3D"), ("mem", u("32", "ГБ DDR5-6400", "GB DDR5-6400")),
                       ("storage", _t("SSD 2 ТБ NVMe", "SSD 2 TB NVMe", "2 TB NVMe SSD")),
                       ("power", u("850", "Вт, 80+ Gold", "W, 80+ Gold"))),
    },
    "km-office-core-i5": {
        "short": {"tk": "Core i5, 16 GB, SSD 1 TB", "en": "Core i5, 16 GB, 1 TB SSD"},
        "body": _t(
            "Тихий и надёжный компьютер для офиса и учёбы. Собран, настроен и проверен перед выдачей.",
            "Ofis we okuw üçin ýuwaş we ygtybarly kompýuter. Bermezden öň ýygnalýar, sazlanýar we barlanýar.",
            "A quiet, reliable PC for office and study. Assembled, set up and checked before hand-over.",
        ),
        "specs": specs(("cpu", "Intel Core i5-13400F"), ("mem", u("16", "ГБ DDR4-3200", "GB DDR4-3200")),
                       ("storage", _t("SSD 1 ТБ NVMe", "SSD 1 TB NVMe", "1 TB NVMe SSD"))),
    },
}

# Service pages in Turkmen (ru/en live in seed_shop.SERVICES).
SERVICE_TEXTS_TK = {
    "pc-build": {
        "body": "Iş, okuw ýa-da oýun üçin kompýuter ýygnaýarys — biziň böleklerimizden ýa-da siziňkilerden. "
                "Kabelleri tertipli ýerleşdirip, BIOS-y täzeläp, ulgamy gurnarys we ýük astynda durnuklylygy barlarys.",
        "feats": ["Býujete görä gabat gelýän bölekleri saýlamak", "Ýygnamak we kabelleri tertiplemek",
                  "Windows we draýwerleri gurnamak", "Ýük synagy"],
    },
    "pc-maintenance": {
        "body": "Kompýuteriňize ýa-da noutbugyňyza ümsümligi we salkynlygy gaýtaryp bereris: tozandan arassalarys, "
                "termopastany çalyşarys, diskleri barlarys we draýwerleri täzeläris.",
        "feats": ["Tozandan arassalamak", "Termopastany çalyşmak", "Diskleri we ýady barlamak",
                  "Draýwerleri we BIOS-y täzelemek"],
    },
    "pc-repair": {
        "body": "Näsazlygyň sebäbini taparys, bahasyny we möhletini ylalaşarys, näsaz bölekleri çalyşarys. "
                "Zeperlenen disklerden maglumatlary dikeltmäge kömek ederis.",
        "feats": ["Abatlanda mugt diagnostika", "Bölekleri çalyşmak", "Maglumatlary dikeltmek",
                  "Işlere kepillik"],
    },
    "cam-install": {
        "body": "Obýekte laýyk kameralary saýlarys, gurnarys, ýazgyny we smartfondan uzakdan görmegi sazlarys.",
        "feats": ["Barmak we taslama", "Kameralary we kabeli gurnamak", "Registratory sazlamak",
                  "Smartfondan görmek"],
    },
    "net-setup": {
        "body": "Ofis, dükan ýa-da ammar üçin tor taslaýarys we gurnaýarys: kabel ulgamlary, şkaflar, Wi‑Fi, "
                "kommutatorlary we routerleri sazlamak.",
        "feats": ["Toruň taslamasy", "Kabel çekmek we şkaflary gurnamak", "Wi‑Fi we VLAN sazlamak",
                  "Dolandyrmak"],
    },
}
