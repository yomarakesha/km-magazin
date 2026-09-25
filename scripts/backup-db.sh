#!/usr/bin/env bash
# Снимок SQLite-БД через VACUUM INTO (безопасно при работающем сервере) и
# удаление старых снимков.
# Использование: bash scripts/backup-db.sh [дней_хранить=14] [путь_к_БД] [папка_бэкапов]
# По расписанию (cron, каждый день в 03:00):
#   0 3 * * * bash /путь/к/km-magazin/scripts/backup-db.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RETENTION_DAYS="${1:-14}"
DB_PATH="${2:-$ROOT/backend/data/km.db}"
BACKUP_DIR="${3:-$ROOT/backup}"

[ -f "$DB_PATH" ] || { echo "ОШИБКА: БД не найдена: $DB_PATH" >&2; exit 1; }
mkdir -p "$BACKUP_DIR"

# python из venv backend: не нужен отдельный sqlite3, снимок сжатый и целостный
PY="$ROOT/backend/.venv/bin/python"
[ -x "$PY" ] || PY="$(command -v python3)"

STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/km-$STAMP.db"
n=1
while [ -e "$TARGET" ]; do  # два запуска в одну секунду
    TARGET="$BACKUP_DIR/km-$STAMP-$n.db"; n=$((n + 1))
done
"$PY" -c "import sqlite3, sys; con = sqlite3.connect(sys.argv[1]); con.execute('VACUUM INTO ?', (sys.argv[2],)); con.close()" \
    "$DB_PATH" "$TARGET"
echo "Бэкап записан: $TARGET"

# хранение: удаляем снимки старше N дней
find "$BACKUP_DIR" -maxdepth 1 -name 'km-*.db' -type f -mtime "+$RETENTION_DAYS" -print -delete \
    | sed 's/^/Удалён старый бэкап: /'
