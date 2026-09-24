from __future__ import annotations

from pydantic import BaseModel, field_validator


class LoginRequest(BaseModel):
    identifier: str  # username or email
    password: str

    @field_validator("identifier", "password")
    @classmethod
    def reject_blank(cls, value: str) -> str:
        # Intentionally permissive here — blank/whitespace-only is a
        # *validation* error (REQ-2), handled explicitly by the endpoint so
        # it can return a field-scoped error rather than a generic 422.
        return value


class LoginResponse(BaseModel):
    token: str
    username: str
    full_name: str
    role: str
    modules: list[str]
    actions: list[str]


class ErrorResponse(BaseModel):
    detail: str
