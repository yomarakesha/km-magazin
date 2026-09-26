#!/usr/bin/env bash
# Backend :8000 (админка на /admin). Запускается в своём окне из start.sh,
# можно и отдельно: bash scripts/run-backend.sh. Ctrl+C — остановить.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/scripts/lib.sh"
echo -ne "\033]0;KM backend :8000\007"

code=1
if port_free 8000; then
    echo "Backend:  http://localhost:8000/docs"
    echo "Админка:  http://localhost:8000/admin"
    echo "Ctrl+C — остановить backend."
    echo ""
    RELOAD=()
    [ "${KM_RELOAD:-0}" = "1" ] && RELOAD=(--reload)
    # --timeout-graceful-shutdown: не ждать бесконечно открытых соединений браузера
    (cd "$ROOT/backend" && .venv/bin/python -m uvicorn app.main:app "${RELOAD[@]}" \
        --port 8000 --timeout-graceful-shutdown 3)
    code=$?
    echo ""
    echo "Backend остановлен (код $code)."
fi
hold_window
exit "$code"
