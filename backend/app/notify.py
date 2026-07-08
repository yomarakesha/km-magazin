"""Fire-and-forget owner notifications (Telegram + optional SMTP email).
Failures are logged and never propagate — an unreachable Telegram/SMTP must
not break order placement or status updates."""
import json
import logging
import smtplib
import urllib.request
from email.message import EmailMessage

from .config import (
    SMTP_FROM,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_TO,
    SMTP_USER,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
)

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


def email_notify(subject: str, text: str) -> None:
    """Send a plain-text email through the configured SMTP relay. No-op until
    SMTP_HOST and SMTP_TO are set in backend/.env."""
    if not SMTP_HOST or not SMTP_TO:
        return
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM or SMTP_USER or "km-site@localhost"
    msg["To"] = SMTP_TO
    msg.set_content(text)
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
            smtp.starttls()
            if SMTP_USER:
                smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(msg)
    except Exception as e:  # noqa: BLE001 — notification is best-effort
        log.warning("email notify failed: %s", e)


def order_message(order_id: int, name: str, phone: str, total: int, lines: list[str]) -> str:
    body = "\n".join(f"• {ln}" for ln in lines)
    return f"🛒 Новый заказ #{order_id}\n{name} · {phone}\n{body}\nИтого: {total} TMT"


STATUS_RU = {
    "new": "Новый",
    "confirmed": "Подтверждён",
    "delivered": "Доставлен",
    "cancelled": "Отменён",
}


def status_message(order_id: int, name: str, phone: str, status: str) -> str:
    label = STATUS_RU.get(status, status)
    return f"📦 Заказ #{order_id} → {label}\n{name} · {phone}"
