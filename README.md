# KM Site

Полнофункциональный сайт с CMS-панелью администратора.

- **Frontend** — Next.js + React (папка корневая)
- **Backend** — Python FastAPI + SQLite (`backend/`)
- **Админ** — `/admin` (RBAC: owner / warehouse / sales / content)
- **Касса (POS)** — `/admin/pos` (продажа, скидки, долги, чек A4)

---

## Быстрый старт

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start.ps1
```

### Linux / macOS

```bash
bash scripts/start.sh
```

Скрипт делает всё автоматически:
1. Создаёт `backend/.env` с случайным паролем (выведет его в консоли)
2. Ставит Python-зависимости в venv
3. Ставит npm-пакеты
4. Заполняет БД демо-данными (каталог, заказы, склад, POS-продажи)
5. Запускает оба сервера

**Требования:** Python 3.10+, Node.js 20.9+

---

## Адреса после запуска

| Что | URL |
|-----|-----|
| Сайт (витрина) | http://localhost:3000 |
| Админ-панель | http://localhost:3000/admin |
| API (документация) | http://localhost:8000/docs |

---

## Тестовые аккаунты (после seed)

| Логин | Пароль | Роль |
|-------|--------|------|
| admin | *из консоли / backend/.env* | Владелец (полный доступ) |
| sklad | sklad12345 | Склад |
| operator | operator12345 | Продавец (касса) |
| kontent | kontent12345 | Контент |

---

## Структура проекта

```
km-site/
├── app/                  # Next.js страницы (App Router)
│   ├── admin/            # Админ-панель
│   │   ├── pos/          # Касса, продажи, чеки
│   │   ├── shop/         # Каталог товаров
│   │   ├── warehouse/    # Склад, закупки
│   │   └── reports/      # Отчёты
│   └── [slug]/           # Публичные страницы
├── backend/
│   ├── app/              # FastAPI приложение
│   │   ├── routers/      # API эндпоинты
│   │   ├── models.py     # SQLAlchemy модели
│   │   ├── seed_demo.py  # Демо-данные
│   │   └── ...
│   ├── data/             # SQLite БД (не в git)
│   ├── media/            # Загруженные файлы (не в git)
│   ├── requirements.txt
│   └── .env              # Секреты (не в git, создаётся скриптом)
├── lib/                  # Общие утилиты (TypeScript)
├── scripts/
│   ├── start.ps1         # Запуск (Windows)
│   ├── start.sh          # Запуск (Linux/macOS)
│   └── create-admin.ps1  # Смена пароля admin
└── tests/                # E2E тесты (Playwright)
```

---

## Ручной запуск (по частям)

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Заполнить БД демо-данными (первый раз):
python -m app.seed_demo

# Запустить:
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
npm install
npm run dev
```

---

## Переменные окружения

### backend/.env (создаётся автоматически)

| Переменная | Описание |
|-----------|---------|
| `ADMIN_PASSWORD` | Пароль владельца (обязательно) |
| `SECRET_KEY` | JWT-секрет (обязательно) |
| `FRONTEND_ORIGIN` | CORS origin фронтенда (default: http://localhost:3000) |
| `PUBLIC_URL` | Публичный URL backend (default: http://localhost:8000) |

Полный список см. в `backend/.env.example`.

---

## Тесты

```bash
# Backend (pytest)
cd backend
.venv/Scripts/python.exe -m pytest          # Windows
source .venv/bin/activate && pytest         # Linux/Mac

# Frontend (vitest)
npm test

# E2E (Playwright)
npm run test:e2e
```
