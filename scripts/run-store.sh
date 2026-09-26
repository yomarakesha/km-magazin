#!/usr/bin/env bash
# Витрина km-store (Vite dev-сервер, /api проксируется на backend :8000).
# Запускается в своём окне из start.sh, можно и отдельно: bash scripts/run-store.sh.
# Ctrl+C — остановить.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STORE="$ROOT/km-store"
source "$ROOT/scripts/lib.sh"
echo -ne "\033]0;KM store :5173\007"

run() {
    if ! command -v pnpm &>/dev/null; then
        echo "ОШИБКА: pnpm не найден. Установите: npm install -g pnpm"
        return 1
    fi
    if [ ! -x "$STORE/node_modules/.bin/vite" ]; then
        echo "Ставим зависимости витрины..."
        (cd "$STORE" && pnpm install --frozen-lockfile) || {
            echo "ОШИБКА: pnpm install не удался — смотрите сообщение выше."
            return 1
        }
    fi
    port_free 5173 || return 1
    echo "Витрина:  http://localhost:5173"
    echo "Ctrl+C — остановить витрину."
    echo ""
    (cd "$STORE" && pnpm exec vite --port 5173 --strictPort)
    local code=$?
    echo ""
    echo "Витрина остановлена (код $code)."
}

run
hold_window
