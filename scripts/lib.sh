# Общие функции для run-*.sh. Подключается через source.

# Окно не закрывается сразу после остановки сервиса: видно, почему он упал.
hold_window() {
    # started from start.sh in the current terminal (no window to keep open)
    [ "${KM_NO_HOLD:-0}" = "1" ] && return
    echo ""
    read -rp "Нажмите Enter, чтобы закрыть окно..." _ || true
}

# Порт занят — показываем, каким процессом, вместо непонятного сбоя запуска.
port_free() {
    local port="$1"
    if (echo >"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
        echo "ОШИБКА: порт $port уже занят."
        if command -v lsof &>/dev/null; then
            lsof -nP -iTCP:"$port" -sTCP:LISTEN
        elif command -v ss &>/dev/null; then
            ss -ltnp "sport = :$port"
        fi
        echo "Закройте окно, где этот сервис уже запущен, или остановите процесс: kill <PID>"
        return 1
    fi
}

# Ctrl+C должен остановить сам сервис, а не этот скрипт до него: у bash свой
# обработчик (не пустой — пустой trap унаследовал бы и сервис), сервис получает
# SIGINT от терминала как обычно.
trap ':' INT
