# KM Site — Backend

API интернет-магазина Kanagatly Mahabat (компьютерная техника, системы
безопасности, сетевое оборудование) и CRM для администраторов.

- **Стек** — Python FastAPI + SQLite (`backend/`)
- **Витрина (публичный API)** — `/api/shop/*`, `/api/leads`
- **Админ API** — `/api/admin/*` (RBAC: owner / warehouse / sales / content)
- **Касса (POS)** — `/api/admin/pos/*`
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
4. Запускает backend на :8000 и ждёт, пока он ответит

**Требования:** Python 3.10+

Документация API: http://localhost:8000/docs

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
