"""Fire-and-forget owner notifications (Telegram). Failures are logged and
never propagate — an unreachable Telegram must not break order placement."""
import json
import logging
import urllib.request

from .config import TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

log = logging.getLogger(__name__)


def telegram_notify(text: str) -> None:
    """Send a message to the configured Telegram chat. No-op when unset."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": text}).encode()
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=8)
    except Exception as e:  # noqa: BLE001 — notification is best-effort
        log.warning("telegram notify failed: %s", e)


def order_message(order_id: int, name: str, phone: str, total: int, lines: list[str]) -> str:
    body = "\n".join(f"• {ln}" for ln in lines)
    return f"🛒 Новый заказ #{order_id}\n{name} · {phone}\n{body}\nИтого: {total} TMT"
