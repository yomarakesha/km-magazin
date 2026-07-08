"""Runtime configuration loaded from backend/.env."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/
load_dotenv(BASE_DIR / ".env")

# Storage
DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = BASE_DIR / "media"
DATA_DIR.mkdir(exist_ok=True)
(MEDIA_DIR / "img").mkdir(parents=True, exist_ok=True)
(MEDIA_DIR / "video").mkdir(parents=True, exist_ok=True)
(MEDIA_DIR / "products").mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'km.db'}")

# Auth — fail closed: refuse to start without explicit credentials so a
# missing/forgotten .env can never silently expose the admin with defaults.
# Run scripts/create-admin.ps1 to generate both values.
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
SECRET_KEY = os.getenv("SECRET_KEY", "")
if not ADMIN_PASSWORD or not SECRET_KEY:
    raise RuntimeError(
        "ADMIN_PASSWORD and SECRET_KEY must be set in backend/.env "
        "(run scripts/create-admin.ps1 to generate them)"
    )
JWT_ALG = "HS256"
SESSION_HOURS = int(os.getenv("SESSION_HOURS", "168"))  # 7 days
COOKIE_NAME = "km_admin"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

# CORS
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

# Public base URL of this backend (for building media URLs in API responses)
PUBLIC_URL = os.getenv("PUBLIC_URL", "http://localhost:8000")

# Shared secret for pinging the frontend's POST /api/revalidate after admin
# writes (cache tag invalidation). Empty = pings disabled; the frontend's
# 60s revalidate window still keeps content reasonably fresh.
REVALIDATE_SECRET = os.getenv("REVALIDATE_SECRET", "")

# Online payments: which provider from backend/app/payments/ is active.
# "manual" = no gateway; admin marks orders paid by hand.
PAYMENT_PROVIDER = os.getenv("PAYMENT_PROVIDER", "manual")

# Sentry error tracking (disabled unless a DSN is set)
SENTRY_DSN = os.getenv("SENTRY_DSN", "")

# Telegram order notifications (disabled unless both are set)
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Email notifications (disabled unless SMTP_HOST and SMTP_TO are set)
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", "")
SMTP_TO = os.getenv("SMTP_TO", "")  # where order notifications go
