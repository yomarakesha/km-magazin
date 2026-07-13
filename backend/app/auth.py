"""Admin auth: per-user accounts (admin_users table) with a signed JWT in an
httpOnly cookie. The JWT carries the user id, username and role; `require_role`
gates routes by role (owner passes everything).

Back-compat: the root `admin` account is seeded from ADMIN_PASSWORD on first
start, and ADMIN_PASSWORD always works for `admin` (env stays the master key).
"""
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .config import (
    ADMIN_PASSWORD,
    COOKIE_NAME,
    COOKIE_SECURE,
    JWT_ALG,
    SECRET_KEY,
    SESSION_HOURS,
)
from .security import verify_password_hash

ROLES = ("owner", "warehouse", "sales", "content")


def authenticate(db: Session, username: str, password: str) -> "dict | None":
    """Check credentials against admin_users; returns a user dict or None.
    ADMIN_PASSWORD (env) is always accepted for the root `admin` account."""
    from .models import AdminUser

    user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if user is not None and user.active and verify_password_hash(password, user.password_hash):
        return {"id": user.id, "username": user.username, "role": user.role}
    # Root fallback: env password unlocks `admin` even if the DB hash rotated.
    if username == "admin" and secrets.compare_digest(password, ADMIN_PASSWORD):
        return {"id": user.id if user else 0, "username": "admin", "role": "owner"}
    return None


def issue_session(response: Response, user: dict) -> None:
    exp = datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS)
    token = jwt.encode(
        {"sub": str(user["id"]), "u": user["username"], "role": user["role"], "exp": exp},
        SECRET_KEY,
        algorithm=JWT_ALG,
    )
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


def require_admin(km_admin: str | None = Cookie(default=None)) -> dict:
    """Dependency that guards admin routes; raises 401 when not authenticated.
    Returns {id, username, role}. Pre-roles tokens (sub="admin", no role)
    are honored as owner until they expire."""
    if not km_admin:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = jwt.decode(km_admin, SECRET_KEY, algorithms=[JWT_ALG])
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session") from exc
    sub = payload.get("sub", "admin")
    return {
        "id": int(sub) if sub.isdigit() else 0,
        "username": payload.get("u", "admin"),
        "role": payload.get("role", "owner"),
    }


def require_role(*roles: str):
    """Dependency factory: allow only the given roles (owner always passes).
    `require_role()` with no arguments means owner-only."""

    def dep(user: dict = Depends(require_admin)) -> dict:
        if user["role"] != "owner" and user["role"] not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Forbidden for your role")
        return user

    return dep
