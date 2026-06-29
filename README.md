# KM Site — Kanagatly Mahabat

Security & automation company site (RU / TK / EN). Now **dynamic**: content lives
in a database and is edited through an admin panel.

- **Frontend** — Next.js 16 (this folder). Public page server-renders content
  fetched from the backend on every request; admin UI lives at `/admin`.
- **Backend** — Python FastAPI + SQLite (`backend/`). Stores content, services,
  media and leads; serves media files. See [`backend/README.md`](backend/README.md).

## Quick start (Windows)

```powershell
# 1. Set the admin password (writes backend\.env)
powershell -ExecutionPolicy Bypass -File scripts\create-admin.ps1

# 2. Launch backend + frontend (installs deps & seeds DB on first run)
powershell -ExecutionPolicy Bypass -File scripts\start.ps1
```

`start.ps1` opens two windows (backend :8000, frontend :3000). Close them to stop.
Then open http://localhost:3000 (site) / http://localhost:3000/admin (panel).

The manual steps below are equivalent if you prefer running each part yourself.

## Run locally (two processes)

### 1. Backend (FastAPI)

```bash
cd backend
py -m venv .venv
./.venv/Scripts/python.exe -m pip install -r requirements.txt
# set ADMIN_PASSWORD and SECRET_KEY in backend/.env
```

Seed initial content (one time):

```bash
npm run dump:seed                              # from project root → writes backend/app/seed_data.json
cd backend && ./.venv/Scripts/python.exe -m app.seed
```

Start it:

```bash
cd backend && ./.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (Next.js)

```bash
npm install        # first time
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin  (password = `ADMIN_PASSWORD` from `backend/.env`)

`.env.local` points the frontend at the backend (`API_URL` / `NEXT_PUBLIC_API_URL`,
default `http://localhost:8000`). Keep `FRONTEND_ORIGIN` in `backend/.env` matching the
frontend origin (default `http://localhost:3000`) for CORS + login cookies.

## Admin panel

`/admin` lets you edit, with no code changes:
- **Тексты** — all site texts per language (ru/tk/en)
- **Услуги** — add/edit/reorder/hide services, icons, features
- **Медиа** — upload photos/videos per service, posters, ordering
- **Заявки** — leads submitted via the contact form

## Notes
- Content is fetched uncached (per-request SSR) so admin edits show on the site
  immediately. If the backend is down, the site falls back to bundled static content.
- Fonts load via Google Fonts `<link>` (not `next/font`) to avoid a build-time
  dependency on `fonts.gstatic.com`.
- The single source for the initial seed is `lib/content.ts`.
