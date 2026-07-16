#!/usr/bin/env bash
# KM Site — полный запуск с нуля (Linux / macOS)
# Использование: bash scripts/start.sh
#
# Что делает:
#   1. Создаёт backend/.env с случайными ключами (если нет)
#   2. Создаёт Python venv и ставит зависимости (если нет)
#   3. Ставит npm пакеты (если нет)
#   4. Заполняет БД демо-данными (если нет km.db)
#   5. Запускает backend :8000 и frontend :3000 параллельно

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
req_hash() {
    if command -v sha256sum &>/dev/null; then sha256sum "$REQ" | cut -d' ' -f1
    else shasum -a 256 "$REQ" | cut -d' ' -f1
    fi
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
    # Общий секрет мгновенного обновления лендинга — совпадает в backend/.env и .env.local.
    REV_SECRET=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)

    cat > "$ENV_FILE" <<EOF
ADMIN_PASSWORD=$ADMIN_PWD
SECRET_KEY=$SECRET_KEY
FRONTEND_ORIGIN=http://localhost:3000
PUBLIC_URL=http://localhost:8000
COOKIE_SECURE=false
REVALIDATE_SECRET=$REV_SECRET
EOF

    # frontend .env.local с тем же REVALIDATE_SECRET (если нет)
    if [ ! -f "$ROOT/.env.local" ]; then
        cat > "$ROOT/.env.local" <<EOF
API_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
REVALIDATE_SECRET=$REV_SECRET
EOF
        echo "  Создан .env.local (frontend)"
    fi

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

# ── 3. npm зависимости ────────────────────────────────────────────────────────
if [ ! -d "$ROOT/node_modules" ]; then
    echo "[3/5] Устанавливаем npm пакеты..."
    cd "$ROOT" && npm install
    echo "[3/5] npm пакеты установлены."
else
    echo "[3/5] node_modules уже есть — пропускаем"
fi

# ── 4. Seed демо-данных ───────────────────────────────────────────────────────
if [ ! -f "$DB" ]; then
    echo "[4/5] Заполняем БД демо-данными..."
    mkdir -p "$BACKEND/data"
    cd "$BACKEND" && "$PY" -m app.seed_demo
    echo "[4/5] БД создана с демо-данными."
else
    echo "[4/5] БД уже существует — пропускаем seed"
fi

# ── 5. Запуск серверов ────────────────────────────────────────────────────────
echo "[5/5] Запускаем серверы..."
echo ""

# Запуск в фоне с выводом в консоль
cd "$BACKEND" && "$PY" -m uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

sleep 2  # дать backend стартовать раньше frontend

cd "$ROOT" && npm run dev &
FRONTEND_PID=$!

# Гасим оба сервера при Ctrl+C, завершении или падении одного из них
cleanup() {
    trap - INT TERM EXIT
    echo ''
    echo 'Остановка серверов...'
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    exit 0
}
trap cleanup INT TERM EXIT

# ── Smoke: дожидаемся живого ответа, а не просто запущенного процесса ─────────
# Порт может слушаться раньше, чем приложение готово отвечать, поэтому опрашиваем.
wait_for() {
    local url="$1" name="$2" tries=60
    while [ "$tries" -gt 0 ]; do
        if curl -fsS -o /dev/null --max-time 2 "$url" 2>/dev/null; then
            echo "  OK   $name отвечает"
            return 0
        fi
        kill -0 "$BACKEND_PID" 2>/dev/null || { echo "  СБОЙ: backend упал при старте"; return 1; }
        kill -0 "$FRONTEND_PID" 2>/dev/null || { echo "  СБОЙ: frontend упал при старте"; return 1; }
        tries=$((tries - 1))
        sleep 1
    done
    echo "  СБОЙ: $name не ответил за 60 сек ($url)"
    return 1
}

echo ""
echo "Проверяем, что серверы поднялись..."
if command -v curl &>/dev/null; then
    if ! wait_for "http://localhost:8000/docs" "backend" || ! wait_for "http://localhost:3000/" "frontend"; then
        echo ""
        echo "Запуск не удался — смотрите ошибки выше."
        cleanup
    fi
else
    echo "  curl не найден — пропускаем проверку"
fi

echo ""
echo "========================================"
echo "  Сайт:   http://localhost:3000"
echo "  Админ:  http://localhost:3000/admin"
echo "  API:    http://localhost:8000/docs"
echo "========================================"
echo ""
echo "Нажмите Ctrl+C чтобы остановить оба сервера."
echo ""

# Ждём, пока живы оба; как только один упал — cleanup гасит второй (не оставляем сироту).
# Опрос вместо `wait -n` ради совместимости с bash 3.2 (macOS).
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$FRONTEND_PID" 2>/dev/null; do
    sleep 1
done
cleanup
