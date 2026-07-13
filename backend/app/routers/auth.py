"""Admin authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from ..auth import authenticate, clear_session, issue_session, require_admin
from ..db import get_db
from ..logging import log
from ..ratelimit import limiter
from ..schemas import LoginIn

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", dependencies=[Depends(limiter("login", 5))])
def login(payload: LoginIn, response: Response, request: Request, db: Session = Depends(get_db)) -> dict:
    user = authenticate(db, payload.username, payload.password)
    if user is None:
        log.warning(
            "auth login failed",
            extra={"event": "auth_failed", "ip": request.client.host if request.client else ""},
        )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong username or password")
    issue_session(response, user)
    return {"ok": True, "username": user["username"], "role": user["role"]}


@router.post("/logout")
def logout(response: Response) -> dict:
    clear_session(response)
    return {"ok": True}


@router.get("/me")
def me(user: dict = Depends(require_admin)) -> dict:
    return {"authenticated": True, "username": user["username"], "role": user["role"]}
