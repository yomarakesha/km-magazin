# KM Site — Backend (FastAPI + SQLite)

Dynamic content API + admin backend for the KM site. The Next.js frontend
fetches `/api/content` on every request; the admin panel (`/admin`) calls the
authenticated `/api/admin/*` endpoints.

## Requirements
- Python 3.11+ (tested on 3.14). On Windows use the `py` launcher.

## First-time setup

```bash
cd backend
py -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
```

Edit `backend/.env` — set at minimum:
- `ADMIN_PASSWORD` — password for the admin panel
- `SECRET_KEY` — long random string for signing the session cookie

## Seed initial content

Generates `seed_data.json` from the frontend's `lib/content.ts`, loads it into
SQLite, and copies the existing media from `../public/assets` into `backend/media`.

```bash
# from project root:
npm run dump:seed
# from backend/:
./.venv/Scripts/python.exe -m app.seed
```

Re-running `app.seed` wipes and reloads content (idempotent).

## Run

```bash
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000  ·  health: `/health`  ·  docs: `/docs`
- Media is served at `/media/...`

## Layout
- `app/models.py` — SQLAlchemy models (Service, ServiceTranslation, Media, ContentBlock, Lead)
- `app/content_builder.py` — assembles the public payload (TS `Content` shape)
- `app/routers/` — `public`, `auth`, `admin_content`, `admin_services`, `admin_media`, `admin_leads`
- `data/km.db` — SQLite database (gitignored)
- `media/` — uploaded/seeded media (gitignored)
