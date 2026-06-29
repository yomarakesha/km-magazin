"""Single-password admin auth via a signed JWT stored in an httpOnly cookie."""
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Cookie, HTTPException, Response, status

from .config import (
    ADMIN_PASSWORD,
    COOKIE_NAME,
    COOKIE_SECURE,
    JWT_ALG,
    SECRET_KEY,
    SESSION_HOURS,
)


def verify_password(password: str) -> bool:
    # Constant-time comparison against the configured admin password.
    return secrets.compare_digest(password, ADMIN_PASSWORD)


def issue_session(response: Response) -> None:
    exp = datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)
    token = jwt.encode({"sub": "admin", "exp": exp}, SECRET_KEY, algorithm=JWT_ALG)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=SESSION_HOURS * 3600,
        path="/",
    )


def clear_session(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


def require_admin(km_admin: str | None = Cookie(default=None)) -> str:
    """Dependency that guards admin routes; raises 401 when not authenticated."""
    if not km_admin:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = jwt.decode(km_admin, SECRET_KEY, algorithms=[JWT_ALG])
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session") from exc
    return payload.get("sub", "admin")
