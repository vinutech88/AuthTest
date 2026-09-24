from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from ..models import LoginRequest, LoginResponse
from ..security import issue_token, verify_password
from ..store import find_user, permissions_for_role

router = APIRouter(prefix="/auth", tags=["auth"])

# Identical wording regardless of whether the account exists or the
# password is wrong — never reveal which field was incorrect (REQ-3).
_INVALID_CREDENTIALS_DETAIL = "Invalid username/email or password."
_BLANK_FIELD_DETAIL = "This field is required."


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    identifier = payload.identifier.strip()
    password = payload.password.strip()

    # REQ-2: blank (including whitespace-only) fields are a validation error,
    # not an authentication attempt.
    if not identifier or not password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=_BLANK_FIELD_DETAIL)

    user = find_user(identifier)
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS_DETAIL)

    permissions = permissions_for_role(user.role)
    token = issue_token(username=user.username, role=user.role)

    return LoginResponse(
        token=token,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        modules=permissions["modules"],
        actions=permissions["actions"],
    )
