"""Admin authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from ..auth import clear_session, issue_session, require_admin, verify_password
from ..logging import log
from ..ratelimit import limiter
from ..schemas import LoginIn

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", dependencies=[Depends(limiter("login", 5))])
def login(payload: LoginIn, response: Response, request: Request) -> dict:
    if not verify_password(payload.password):
        log.warning(
            "auth login failed",
            extra={"event": "auth_failed", "ip": request.client.host if request.client else ""},
        )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong password")
    issue_session(response)
    return {"ok": True}


@router.post("/logout")
def logout(response: Response) -> dict:
    clear_session(response)
    return {"ok": True}


@router.get("/me")
def me(_: str = Depends(require_admin)) -> dict:
    return {"authenticated": True}
