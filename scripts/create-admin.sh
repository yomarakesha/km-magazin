#!/usr/bin/env bash
# Смена пароля владельца (логин admin): пишет ADMIN_PASSWORD и новый SECRET_KEY
# в backend/.env и обновляет пароль учётки admin в БД, чтобы старый пароль
# перестал работать. Новый SECRET_KEY разлогинивает все текущие сессии.
# Использование: bash scripts/create-admin.sh   (потом перезапустите backend)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
ENV_FILE="$BACKEND/.env"
PY="$BACKEND/.venv/bin/python"

[ -x "$PY" ] || { echo "ОШИБКА: нет venv. Сначала запустите: bash scripts/start.sh" >&2; exit 1; }

read -r -s -p "Новый пароль admin: " P1; echo
read -r -s -p "Повторите пароль:   " P2; echo
[ -n "$P1" ] || { echo "Пароль не может быть пустым." >&2; exit 1; }
[ "$P1" = "$P2" ] || { echo "Пароли не совпадают." >&2; exit 1; }
[ "${#P1}" -ge 8 ] || { echo "Пароль короче 8 символов." >&2; exit 1; }

# .env: меняем два ключа, остальные сохраняем; значения по умолчанию для пустого файла
NEW_PASSWORD="$P1" "$PY" - "$ENV_FILE" <<'PYEOF'
import os, secrets, sys
from pathlib import Path

path = Path(sys.argv[1])
lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
values = {
    "ADMIN_PASSWORD": os.environ["NEW_PASSWORD"],
    "SECRET_KEY": secrets.token_urlsafe(48),
}
defaults = {
    "FRONTEND_ORIGIN": "http://localhost:3000",
    "PUBLIC_URL": "http://localhost:8000",
    "COOKIE_SECURE": "false",
}
out, seen = [], set()
for line in lines:
    key = line.split("=", 1)[0].strip()
    if key in values:
        out.append(f"{key}={values[key]}")
        seen.add(key)
    else:
        out.append(line)
        seen.add(key)
for key, val in {**values, **defaults}.items():
    if key not in seen:
        out.append(f"{key}={val}")
path.write_text("\n".join(out) + "\n", encoding="utf-8")
os.chmod(path, 0o600)
PYEOF

# БД: пароль учётки admin (если БД уже есть; иначе её создаст первый запуск)
if [ -f "$BACKEND/data/km.db" ]; then
    (cd "$BACKEND" && NEW_PASSWORD="$P1" "$PY" -c "
import os
from app.db import SessionLocal
from app.models import AdminUser
from app.security import hash_password
with SessionLocal() as db:
    u = db.query(AdminUser).filter_by(username='admin').first()
    if u:
        u.password_hash = hash_password(os.environ['NEW_PASSWORD'])
        db.commit()
")
fi

echo ""
echo "Сохранено в backend/.env, пароль admin в БД обновлён."
echo "Перезапустите backend, чтобы применить."
