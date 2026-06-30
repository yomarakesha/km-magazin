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

# Auth
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-insecure-change-me")
JWT_ALG = "HS256"
SESSION_HOURS = int(os.getenv("SESSION_HOURS", "168"))  # 7 days
COOKIE_NAME = "km_admin"
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

# CORS
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

# Public base URL of this backend (for building media URLs in API responses)
PUBLIC_URL = os.getenv("PUBLIC_URL", "http://localhost:8000")
