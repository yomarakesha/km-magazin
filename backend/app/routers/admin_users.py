"""Admin-user management (owner only): create/list/update/deactivate accounts."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import require_role
from ..db import get_db
from ..models import AdminUser
from ..schemas import AdminUserIn, AdminUserUpdateIn
from ..security import hash_password

router = APIRouter(
    prefix="/api/admin/users",
    tags=["admin-users"],
    dependencies=[Depends(require_role())],  # owner only
)


def _out(u: AdminUser) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "role": u.role,
        "active": u.active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


def _other_active_owner_exists(db: Session, except_id: int) -> bool:
    return (
        db.query(AdminUser)
        .filter(AdminUser.role == "owner", AdminUser.active.is_(True), AdminUser.id != except_id)
        .count()
        > 0
    )


@router.get("")
def list_users(db: Session = Depends(get_db)) -> list[dict]:
    return [_out(u) for u in db.query(AdminUser).order_by(AdminUser.id).all()]


@router.post("", status_code=201)
def create_user(payload: AdminUserIn, db: Session = Depends(get_db)) -> dict:
    if db.query(AdminUser).filter(AdminUser.username == payload.username).first():
        raise HTTPException(409, "username already exists")
    u = AdminUser(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(u)
    db.commit()
    return _out(u)


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    payload: AdminUserUpdateIn,
    db: Session = Depends(get_db),
    me: dict = Depends(require_role()),
) -> dict:
    u = db.get(AdminUser, user_id)
    if u is None:
        raise HTTPException(404, "user not found")
    # Never let the last active owner lock everyone out.
    demotes = payload.role is not None and payload.role != "owner"
    deactivates = payload.active is False
    if u.role == "owner" and (demotes or deactivates) and not _other_active_owner_exists(db, u.id):
        raise HTTPException(409, "cannot demote or deactivate the last owner")
    if u.id == me["id"] and deactivates:
        raise HTTPException(409, "cannot deactivate yourself")
    if payload.password is not None:
        u.password_hash = hash_password(payload.password)
    if payload.role is not None:
        u.role = payload.role
    if payload.active is not None:
        u.active = payload.active
    db.commit()
    return _out(u)


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), me: dict = Depends(require_role())) -> dict:
    u = db.get(AdminUser, user_id)
    if u is None:
        raise HTTPException(404, "user not found")
    if u.id == me["id"]:
        raise HTTPException(409, "cannot delete yourself")
    if u.role == "owner" and not _other_active_owner_exists(db, u.id):
        raise HTTPException(409, "cannot delete the last owner")
    db.delete(u)
    db.commit()
    return {"ok": True}
