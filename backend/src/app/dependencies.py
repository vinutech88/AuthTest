"""Auth/RBAC enforcement dependencies for protected routes (REQ-4, REQ-5, REQ-6)."""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .security import TokenPayload, verify_token
from .store import permissions_for_role

_bearer_scheme = HTTPBearer(auto_error=False)

# Generic, non-sensitive messages only — never leak *why* access was denied.
_UNAUTHENTICATED_DETAIL = "Authentication required."
_FORBIDDEN_DETAIL = "You do not have permission to perform this action."


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> TokenPayload:
    """Reject any request without a valid, unexpired auth token (401)."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_UNAUTHENTICATED_DETAIL)

    payload = verify_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_UNAUTHENTICATED_DETAIL)

    return payload


def require_module(module: str):
    """Dependency factory: reject (403) unless the caller's role permits `module`."""

    def _check(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if module not in permissions_for_role(user.role).get("modules", []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_FORBIDDEN_DETAIL)
        return user

    return _check


def require_action(action: str):
    """Dependency factory: reject (403) unless the caller's role permits `action`."""

    def _check(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if action not in permissions_for_role(user.role).get("actions", []):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_FORBIDDEN_DETAIL)
        return user

    return _check
