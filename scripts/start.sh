#!/usr/bin/env bash
# KM Site — полный запуск с нуля (Linux / macOS)
# Использование: bash scripts/start.sh
#                KM_RELOAD=1 bash scripts/start.sh   (автоперезагрузка при правке кода)
#
# Что делает:
#   1. Создаёт backend/.env с случайными ключами (если нет)
#   2. Создаёт Python venv и ставит зависимости (если нет)
#   3. Заполняет БД демо-данными (если нет km.db)
#   4. Собирает админ-панель (если нет сборки или исходники изменились)
#   5. Открывает по окну на сервис: backend :8000 (админка на /admin)
#      и витрину km-store :5173. Каждый останавливается Ctrl+C в своём окне.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
VENV="$BACKEND/.venv"
PY="$VENV/bin/python"
ENV_FILE="$BACKEND/.env"
DB="$BACKEND/data/km.db"
REQ="$BACKEND/requirements.txt"
REQ_STAMP="$VENV/.requirements.sha"

# Hash of requirements.txt, so a venv built before a dependency was added gets
# topped up instead of silently running against stale packages.
sha() {
    if command -v sha256sum &>/dev/null; then sha256sum "$@"
    else shasum -a 256 "$@"
    fi
}
req_hash() { sha "$REQ" | cut -d' ' -f1; }

# Hash of everything the admin build is made from: a pulled change to the
# admin sources or dependencies triggers a rebuild instead of serving a stale dist.
ADMIN="$ROOT/admin"
ADMIN_STAMP="$ADMIN/dist/.build.sha"
admin_hash() {
    (cd "$ADMIN" && find src public index.html package.json package-lock.json vite.config.ts tsconfig.json \
        -type f 2>/dev/null | LC_ALL=C sort | while read -r f; do sha "$f"; done) | sha | cut -d' ' -f1
}

echo ""
echo "========================================"
echo "  KM Site — запуск"
echo "========================================"
echo ""

# ── 1. backend/.env ───────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
    echo "[1/5] Создаём backend/.env..."

    # Открытый пароль по умолчанию — задай свой в backend/.env перед продакшном.
    ADMIN_PWD=admin
    SECRET_KEY=$(LC_ALL=C tr -dc 'A-Za-z0-9+/' </dev/urandom | head -c 64)

    cat > "$ENV_FILE" <<EOF
ADMIN_PASSWORD=$ADMIN_PWD
SECRET_KEY=$SECRET_KEY
FRONTEND_ORIGIN=http://localhost:3000
PUBLIC_URL=http://localhost:8000
COOKIE_SECURE=false
EOF

    echo ""
    echo "  *** ПАРОЛЬ АДМИНИСТРАТОРА: $ADMIN_PWD ***"
    echo "  Логин: admin / $ADMIN_PWD"
    echo "  (сохранён в backend/.env)"
    echo "  ВНИМАНИЕ: пароль по умолчанию 'admin' — СМЕНИТЕ в backend/.env перед публикацией!"
    echo ""
else
    echo "[1/5] backend/.env уже есть — пропускаем"
    ADMIN_PWD=$(grep '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
    [ -n "$ADMIN_PWD" ] && echo "  Текущий пароль admin: $ADMIN_PWD"
fi

# Проверяем, что обязательные ключи есть и непустые (защита от частичного .env)
for _key in ADMIN_PASSWORD SECRET_KEY; do
    if ! grep -q "^$_key=." "$ENV_FILE"; then
        echo "ОШИБКА: в $ENV_FILE нет $_key (или пустой). Удалите .env и перезапустите."
        exit 1
    fi
done

# ── 2. Python venv + зависимости ─────────────────────────────────────────────
if [ ! -f "$PY" ]; then
    echo "[2/5] Создаём Python venv..."

    # Ищем python3
    PY_CMD=""
    for candidate in python3 python3.12 python3.11 python3.10 python; do
        if command -v "$candidate" &>/dev/null && "$candidate" -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" 2>/dev/null; then
            PY_CMD="$candidate"
            break
        fi
    done

    if [ -z "$PY_CMD" ]; then
        echo "Python 3.10+ не найден. Установите: sudo apt install python3 (Ubuntu) или brew install python (Mac)"
        exit 1
    fi

    "$PY_CMD" -m venv "$VENV"
    # Если установка зависимостей упала (нет сети и т.п.) — удаляем venv,
    # чтобы следующий запуск попробовал заново, а не думал что venv готов.
    if ! "$PY" -m pip install --upgrade pip -q \
        || ! "$PY" -m pip install -r "$REQ"; then
        echo "Ошибка установки Python-зависимостей. Удаляю неполный venv."
        rm -rf "$VENV"
        exit 1
    fi
    req_hash > "$REQ_STAMP"
    echo "[2/5] Python зависимости установлены."
elif [ ! -f "$REQ_STAMP" ] || [ "$(cat "$REQ_STAMP")" != "$(req_hash)" ]; then
    echo "[2/5] requirements.txt изменился — доставляем зависимости..."
    if ! "$PY" -m pip install -r "$REQ"; then
        echo "Ошибка установки Python-зависимостей. Venv оставлен как есть."
        echo "Проверьте сеть и перезапустите."
        exit 1
    fi
    req_hash > "$REQ_STAMP"
    echo "[2/5] Python зависимости обновлены."
else
    echo "[2/5] Python venv актуален — пропускаем"
fi

# ── 3. Seed демо-данных ───────────────────────────────────────────────────────
if [ ! -f "$DB" ]; then
    echo "[3/5] Заполняем БД демо-данными..."
    mkdir -p "$BACKEND/data"
    cd "$BACKEND" && "$PY" -m app.seed_demo
    echo "[3/5] БД создана с демо-данными."
else
    echo "[3/5] БД уже существует — пропускаем seed"
fi

# ── 4. Админ-панель (admin/) ─────────────────────────────────────────────────
ADMIN_NOW=$(admin_hash)
if [ -f "$ADMIN/dist/index.html" ] && [ -f "$ADMIN_STAMP" ] && [ "$(cat "$ADMIN_STAMP")" = "$ADMIN_NOW" ]; then
    echo "[4/5] Админ-панель собрана и актуальна — пропускаем"
elif command -v npm &>/dev/null; then
    echo "[4/5] Собираем админ-панель..."
    if (cd "$ADMIN" && npm install --no-audit --no-fund && npm run build); then
        echo "$ADMIN_NOW" > "$ADMIN_STAMP"
        echo "[4/5] Админ-панель собрана."
    elif [ -f "$ADMIN/dist/index.html" ]; then
        echo "      ВНИМАНИЕ: сборка не удалась — остаётся предыдущая версия админки."
    else
        echo "      ВНИМАНИЕ: сборка не удалась — API работает, /admin недоступна."
    fi
elif [ -f "$ADMIN/dist/index.html" ]; then
    echo "[4/5] npm не найден — используем имеющуюся (возможно устаревшую) сборку админки."
else
    echo "[4/5] npm не найден — админ-панель не собрана (нужен Node.js 20+). API работает."
fi

# ── 5. Запуск ────────────────────────────────────────────────────────────────
# С графическим сеансом — каждый сервис в своём окне (свой Ctrl+C). Без него
# (SSH, сервер без экрана) окна открыть нельзя: backend запускается прямо здесь.
has_gui() {
    [ "$(uname)" = "Darwin" ] && [ -z "${SSH_CONNECTION:-}" ] && return 0
    [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]
}

# Возвращает 1, если окно открыть не удалось
open_window() {
    local title="$1" script="$2"
    # Окно терминала не наследует окружение этого скрипта — передаём KM_RELOAD явно
    local cmd=(env KM_RELOAD="${KM_RELOAD:-0}" bash "$script")
    if [ "$(uname)" = "Darwin" ]; then
        osascript -e "tell application \"Terminal\" to do script \"KM_RELOAD=${KM_RELOAD:-0} bash '$script'\"" >/dev/null || return 1
    elif command -v gnome-terminal &>/dev/null; then
        gnome-terminal --title="$title" -- "${cmd[@]}" 2>/dev/null || return 1
    elif command -v konsole &>/dev/null; then
        (konsole -p tabtitle="$title" -e "${cmd[@]}" &>/dev/null &)
    elif command -v x-terminal-emulator &>/dev/null; then
        (x-terminal-emulator -T "$title" -e "${cmd[@]}" &>/dev/null &)
    elif command -v xterm &>/dev/null; then
        (xterm -T "$title" -e "${cmd[@]}" &>/dev/null &)
    else
        return 1
    fi
    echo "      Открыто окно: $title"
}

# Ждём живого ответа backend: запущенное окно ещё не значит работающий сервер
wait_backend() {
    command -v curl &>/dev/null || { echo "  curl не найден — пропускаем проверку"; return 0; }
    local tries=60
    while [ "$tries" -gt 0 ]; do
        curl -fsS -o /dev/null --max-time 2 http://localhost:8000/docs 2>/dev/null && { echo "  OK   backend отвечает"; return 0; }
        tries=$((tries - 1))
        sleep 1
    done
    echo "  СБОЙ: backend не ответил за 60 сек — смотрите ошибку в его окне."
    return 1
}

# Занятый порт дал бы «ложный OK»: проверка ниже достучалась бы до чужого процесса
if (echo >/dev/tcp/127.0.0.1/8000) 2>/dev/null; then
    echo "ОШИБКА: порт 8000 уже занят (возможно, backend уже запущен)."
    echo "Закройте окно, где он запущен, или остановите процесс и запустите скрипт снова."
    exit 1
fi

if has_gui && open_window "KM backend :8000" "$ROOT/scripts/run-backend.sh"; then
    echo "[5/5] Сервисы запускаются в отдельных окнах."
    open_window "KM store :5173" "$ROOT/scripts/run-store.sh" \
        || echo "      Окно витрины не открылось — запустите вручную: bash scripts/run-store.sh"
    echo ""
    echo "Проверяем, что backend поднялся..."
    wait_backend || exit 1

    echo ""
    echo "========================================"
    echo "  Витрина: http://localhost:5173"
    echo "  Админ:   http://localhost:8000/admin"
    echo "  API:     http://localhost:8000/docs"
    echo "========================================"
    echo ""
    echo "Остановить сервис — Ctrl+C в его окне."
    echo "Перезапустить один сервис: bash scripts/run-backend.sh или bash scripts/run-store.sh"
else
    echo "[5/5] Графического окна нет (SSH или сервер) — запускаем backend в этом терминале."
    echo "      Витрину при необходимости запустите в другом терминале: bash scripts/run-store.sh"
    echo ""
    KM_NO_HOLD=1 exec bash "$ROOT/scripts/run-backend.sh"
fi
