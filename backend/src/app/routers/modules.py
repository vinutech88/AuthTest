"""Example protected endpoints demonstrating server-side RBAC enforcement (REQ-4, REQ-6)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from ..dependencies import get_current_user, require_action
from ..security import TokenPayload
from ..store import permissions_for_role

router = APIRouter(prefix="/modules", tags=["modules"])


@router.get("/")
def list_modules(user: TokenPayload = Depends(get_current_user)) -> dict:
    """Any authenticated user can list the modules their role permits."""
    return {"modules": permissions_for_role(user.role).get("modules", [])}


@router.post("/staff-management/actions/manage-users")
def manage_users(user: TokenPayload = Depends(require_action("manage-users"))) -> dict:
    """Restricted action: rejected server-side (403) even if called directly by a non-admin."""
    return {"status": "ok", "performedBy": user.username}
