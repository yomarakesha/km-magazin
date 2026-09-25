# KM Site — Backend

API интернет-магазина Kanagatly Mahabat (компьютерная техника, системы
безопасности, сетевое оборудование) и CRM для администраторов.

- **Стек** — Python FastAPI + SQLite (`backend/`)
- **Витрина (публичный API)** — `/api/shop/*`, `/api/leads`
- **Админ API** — `/api/admin/*` (RBAC: owner / warehouse / sales / content)
- **Касса (POS)** — `/api/admin/pos/*`
- **Админ-панель** — `admin/` (Vite + React + TypeScript), открывается на `/admin`
- **Макет** — Figma, фронтенд делается отдельно

---

## Быстрый старт

### Linux / macOS

```bash
bash scripts/start.sh
```

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start.ps1
```

Скрипт:
1. Создаёт `backend/.env` со случайным `SECRET_KEY` (пароль admin по умолчанию — `admin`, смените)
2. Ставит Python-зависимости в venv (и доставляет их, если `requirements.txt` изменился)
3. Заполняет БД демо-данными, если `backend/data/km.db` нет
4. Собирает админ-панель, если есть npm и нет `admin/dist`
5. Запускает backend на :8000 и ждёт, пока он ответит

**Требования:** Python 3.10+, Node.js 20+ (только для сборки админки)

- Админ-панель: http://localhost:8000/admin
- Документация API: http://localhost:8000/docs

---

## Тестовые аккаунты (после seed)

| Логин | Пароль | Роль |
|-------|--------|------|
| admin | *из backend/.env* | Владелец (полный доступ) |
| sklad | sklad12345 | Склад |
| operator | operator12345 | Продавец (касса) |
| kontent | kontent12345 | Контент |

---

## Публичный API витрины

| Эндпоинт | Экран в макете |
|----------|----------------|
| `GET /api/shop/home` | Главная: баннеры, товары по скидке, новинки, бренды |
| `GET /api/shop/catalog` | Каталог: дерево категорий с картинками, бренды, контакты |
| `GET /api/shop/categories/{slug}` | Страница раздела: плитки подкатегорий (`children`) |
| `GET /api/shop/products` | Список товаров (категория / скидки / новинки / поиск) с фильтрами и фасетами |
| `GET /api/shop/products/{slug}` | Товар (для сборки — состав `components`) |
| `GET /api/shop/products/{slug}/similar` | Похожие товары |
| `GET /api/shop/brands` | Бренды (с количеством товаров) |
| `GET /api/shop/services` | Услуги (карточки с фото и ценой «от») |
| `GET /api/shop/pages`, `/pages/{slug}` | О магазине, FAQ, Гарантия, Доставка |
| `GET /api/shop/banners` | Слайдер главной |
| `GET /api/shop/delivery-zones` | Варианты доставки (зоны, цена, «бесплатно от») |
| `POST /api/shop/cart/validate` | Корзина: актуальные цены, доставка для выбранной зоны (`delivery_zone_id`) |
| `POST /api/shop/orders` | Оформление заявки (итог = товары − промокод + доставка по зоне) |
| `POST /api/leads` | Заявка на услугу (`service` — slug услуги) |

`GET /api/shop/products` принимает:
- `q`, `category` (slug, с подкатегориями), `brand` (slug через запятую);
- `price_min`, `price_max`, `in_stock=1`, `discount=1`, `new=1`, `build=1`;
- характеристики категории («По характеристике»): `<key>=v1,v2` (например
  `socket=AM5,LGA1700`), для числовых ещё `<key>_min` / `<key>_max`;
- `sort`: `price_asc` (сначала дешевые), `price_desc` (сначала дорогие), `new`, `popular`;
- `limit`, `offset`.

В ответе `facets`: `categories`, `brands`, `price`, `attributes` (значения
характеристик с количеством). Каждый фасет считается без собственного фильтра.

Тексты приходят картами по языкам `{ru, tk, en}`; пути к медиа — относительно `mediaBase`.
Доставка настраивается в админке (раздел «Доставка», только владелец): зоны
со своей ценой, порогом бесплатной доставки и самовывозом. Если покупатель
зону не выбрал, берётся зона «по умолчанию»; без зон доставка бесплатная.

----------|----------------|
| `GET /api/shop/home` | Главная: баннеры, скидки, новинки, готовые сборки, бренды |
| `GET /api/shop/catalog` | Каталог: категории, бренды, контакты |
| `GET /api/shop/products` | Каталог / Скидки / Новинки / Поиск / Наши сборки — фильтры и фасеты |
| `GET /api/shop/categories/{slug}` | Категория с фильтрами по характеристикам |
| `GET /api/shop/products/{slug}` | Товар; для сборки — состав (`components`) |
| `GET /api/shop/products/{slug}/similar` | Похожие товары |
| `GET /api/shop/brands` | Бренды (с количеством товаров) |
| `GET /api/shop/services`, `/services/{slug}` | Услуги, страница услуги («Что входит», другие услуги) |
| `GET /api/shop/pages`, `/pages/{slug}` | О магазине, FAQ, Гарантия, Доставка, Установка |
| `GET /api/shop/banners` | Слайдер главной |
| `POST /api/shop/cart/validate` | Корзина |
| `POST /api/shop/orders` | Оформление заявки |
| `POST /api/leads` | Заявка на услугу (`service` — slug услуги) |

`GET /api/shop/products` принимает: `q`, `category` (slug, с подкатегориями),
`brand` (slug через запятую), `price_min`, `price_max`, `in_stock=1`,
`discount=1`, `new=1`, `build=1`, `sort` (`popular` | `price_asc` | `price_desc` | `new`),
`limit`, `offset`.

Тексты приходят картами по языкам `{ru, tk, en}`; пути к медиа — относительно `mediaBase`.

----------|----------------|
| `GET /api/shop/catalog` | Главная, Каталог (категории, бренды, контакты) |
| `GET /api/shop/products` | Каталог / Скидки / Новинки / Поиск — фильтры и фасеты |
| `GET /api/shop/categories/{slug}` | Категория с фильтрами по характеристикам |
| `GET /api/shop/products/{slug}` | Карточка товара |
| `GET /api/shop/brands` | Бренды (с количеством товаров) |
| `POST /api/shop/cart/validate` | Корзина |
| `POST /api/shop/orders` | Оформление заявки |
| `POST /api/leads` | Заявка на услугу |

`GET /api/shop/products` принимает: `q`, `category` (slug, с подкатегориями),
`brand` (slug через запятую), `price_min`, `price_max`, `in_stock=1`,
`discount=1`, `new=1`, `sort` (`price_asc` | `price_desc` | `new`), `limit`, `offset`.

---

## Структура

```
admin/                # админ-панель (Vite + React), см. раздел выше
├── src/pages/        # экраны: заказы, товары, касса, склад, отчёты…
└── src/api.ts        # клиент админ API + типы
backend/
├── app/
│   ├── routers/      # API эндпоинты
│   ├── models.py     # SQLAlchemy модели
│   ├── db.py         # движок + лёгкие миграции SQLite (без Alembic)
│   ├── seed_demo.py  # демо-данные
│   └── ...
├── data/km.db        # SQLite БД (в git — репозиторий приватный)
├── media/            # медиафайлы
├── tests/            # pytest
├── requirements.txt
└── .env              # секреты (не в git, создаётся скриптом)
scripts/
├── start.sh / start.ps1  # запуск
├── create-admin.ps1      # смена пароля admin
└── backup-db.ps1         # бэкап БД
```

---

## Ручной запуск

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python -m app.seed_demo            # демо-данные (первый раз)
python -m uvicorn app.main:app --reload --port 8000
```

---

## Админ-панель

Стиль — по макету витрины в Figma (цвета, шрифт, поля, кнопки-«таблетки»).
Меню зависит от роли: владелец видит всё, остальные — свои разделы.

```bash
cd admin
npm install
npm run dev      # http://localhost:5173/admin/ — /api проксируется на :8000
npm run build    # admin/dist, backend отдаёт её на /admin
```

Бэкенд для dev-сервера берётся из `API_URL` (по умолчанию http://localhost:8000).

---

## Переменные окружения (`backend/.env`)

| Переменная | Описание |
|-----------|---------|
| `ADMIN_PASSWORD` | Пароль владельца (обязательно) |
| `SECRET_KEY` | JWT-секрет (обязательно) |
| `FRONTEND_ORIGIN` | CORS origin фронтенда (default: http://localhost:3000) |
| `PUBLIC_URL` | Публичный URL backend (default: http://localhost:8000) |

Полный список — `backend/.env.example`.

---

## Тесты

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest tests -q
```
