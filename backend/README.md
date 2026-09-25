# KM Site — Backend (FastAPI + SQLite)

Запуск, API и переменные окружения — в корневом [README](../README.md).

## Схема БД

Миграций через Alembic нет: `app/db.py::init_db()` вызывает `create_all` и
затем `_migrate()`, который идемпотентно добавляет новые колонки в
существующие таблицы. Новое поле модели → добавьте `ALTER TABLE` туда же.

## Модули
- `app/models.py` — модели: каталог (категории, товары, бренды, атрибуты),
  заказы, склад, касса, пользователи, заявки
- `app/routers/shop_public.py` — публичный API витрины
- `app/routers/admin_*.py` — админ API по доменам (shop, warehouse, pos, reports, users…)
- `app/seed_demo.py` — демо-данные; `app/seed.py` — контент старого лендинга
- `media/` — медиафайлы, отдаются по `/media/...`
