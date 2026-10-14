#!/usr/bin/env bash
# KM Site — полный запуск с нуля (Linux / macOS)
# Использование: bash scripts/start.sh
#                KM_RELOAD=0 bash scripts/start.sh   (backend без автоперезагрузки)
#
# Что делает:
#   1. Создаёт backend/.env с случайными ключами (если нет)
#   2. Создаёт Python venv и ставит зависимости (если нет)
#   3. Заполняет БД демо-данными (если нет km.db)
#   4. Открывает по окну на сервис, все в dev-режиме: backend :8000 (--reload),
#      админка admin :5174 и витрина km-store :5173 (Vite). Каждый
#      останавливается Ctrl+C в своём окне.

set -e
# Dev-режим по умолчанию: backend перезапускается при правке кода
export KM_RELOAD="${KM_RELOAD:-1}"
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


echo ""
echo "========================================"
echo "  KM Site — запуск"
echo "========================================"
echo ""

# ── 1. backend/.env ───────────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
    echo "[1/4] Создаём backend/.env..."

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
    echo "[1/4] backend/.env уже есть — пропускаем"
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
    echo "[2/4] Создаём Python venv..."

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
    echo "[2/4] Python зависимости установлены."
elif [ ! -f "$REQ_STAMP" ] || [ "$(cat "$REQ_STAMP")" != "$(req_hash)" ]; then
    echo "[2/4] requirements.txt изменился — доставляем зависимости..."
    if ! "$PY" -m pip install -r "$REQ"; then
        echo "Ошибка установки Python-зависимостей. Venv оставлен как есть."
        echo "Проверьте сеть и перезапустите."
        exit 1
    fi
    req_hash > "$REQ_STAMP"
    echo "[2/4] Python зависимости обновлены."
else
    echo "[2/4] Python venv актуален — пропускаем"
fi

# ── 3. Seed демо-данных ───────────────────────────────────────────────────────
if [ ! -f "$DB" ]; then
    echo "[3/4] Заполняем БД демо-данными..."
    mkdir -p "$BACKEND/data"
    cd "$BACKEND" && "$PY" -m app.seed_demo
    echo "[3/4] БД создана с демо-данными."
else
    echo "[3/4] БД уже существует — пропускаем seed"
fi

# ── 4. Запуск ────────────────────────────────────────────────────────────────
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
source "$ROOT/scripts/lib.sh"
trap - INT
busy=0
for port in 8000 5174 5173; do
    port_free "$port" || busy=1
done
if [ "$busy" = "1" ]; then
    echo ""
    echo "Похоже, сервисы уже запущены прошлым start.sh. Остановите их (Ctrl+C в их окнах)"
    echo "или одной командой: fuser -k 8000/tcp 5174/tcp 5173/tcp — и запустите снова."
    exit 1
fi

if has_gui && open_window "KM backend :8000" "$ROOT/scripts/run-backend.sh"; then
    echo "[4/4] Сервисы запускаются в отдельных окнах."
    open_window "KM admin :5174" "$ROOT/scripts/run-admin.sh" \
        || echo "      Окно админки не открылось — запустите вручную: bash scripts/run-admin.sh"
    open_window "KM store :5173" "$ROOT/scripts/run-store.sh" \
        || echo "      Окно витрины не открылось — запустите вручную: bash scripts/run-store.sh"
    echo ""
    echo "Проверяем, что backend поднялся..."
    wait_backend || exit 1

    echo ""
    echo "========================================"
    echo "  Витрина: http://localhost:5173"
    echo "  Админ:   http://localhost:5174/admin/"
    echo "  API:     http://localhost:8000/docs"
    echo "========================================"
    echo ""
    echo "Остановить сервис — Ctrl+C в его окне."
    echo "Перезапустить один сервис: bash scripts/run-backend.sh, run-admin.sh или run-store.sh"
else
    echo "[4/4] Графического окна нет (SSH или сервер) — запускаем backend в этом терминале."
    echo "      Админку и витрину запустите в других терминалах:"
    echo "        bash scripts/run-admin.sh"
    echo "        bash scripts/run-store.sh"
    echo ""
    KM_NO_HOLD=1 exec bash "$ROOT/scripts/run-backend.sh"
fi
