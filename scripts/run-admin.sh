#!/usr/bin/env bash
# Админка admin/ (Vite dev-сервер, /api проксируется на backend :8000).
# Запускается в своём окне из start.sh, можно и отдельно: bash scripts/run-admin.sh.
# Ctrl+C — остановить.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN="$ROOT/admin"
source "$ROOT/scripts/lib.sh"
echo -ne "\033]0;KM admin :5174\007"

run() {
    if ! command -v npm &>/dev/null; then
        echo "ОШИБКА: npm не найден. Установите Node.js 20+."
        return 1
    fi
    if [ ! -x "$ADMIN/node_modules/.bin/vite" ]; then
        echo "Ставим зависимости админки..."
        (cd "$ADMIN" && npm install --no-audit --no-fund) || {
            echo "ОШИБКА: npm install не удался — смотрите сообщение выше."
            return 1
        }
    fi
    port_free 5174 || return 1
    echo "Админка:  http://localhost:5174/admin/"
    echo "Ctrl+C — остановить админку."
    echo ""
    (cd "$ADMIN" && npx vite --port 5174 --strictPort)
    local code=$?
    echo ""
    echo "Админка остановлена (код $code)."
    return "$code"
}

run
code=$?
hold_window "$code"
exit "$code"
