"""Tests for /modules routes — server-side RBAC enforcement (REQ-4, REQ-6).

Source issue: #9 (User Story #1 — Login)
"""
from __future__ import annotations

import pytest

from app.store import ROLE_PERMISSIONS

_UNAUTHENTICATED_DETAIL = "Authentication required."
_FORBIDDEN_DETAIL = "You do not have permission to perform this action."

_CREDENTIALS = {
    "admin": ("admin", "Admin123!"),
    "doctor": ("drsmith", "Doctor123!"),
    "nurse": ("nursejones", "Nurse123!"),
}


def _token_for(client, role: str) -> str:
    identifier, password = _CREDENTIALS[role]
    response = client.post("/auth/login", json={"identifier": identifier, "password": password})
    assert response.status_code == 200
    return response.json()["token"]


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_list_modules_requires_authentication(client):
    response = client.get("/modules/")

    assert response.status_code == 401
    assert response.json()["detail"] == _UNAUTHENTICATED_DETAIL


def test_list_modules_returns_permitted_modules_for_authenticated_admin(client):
    token = _token_for(client, "admin")

    response = client.get("/modules/", headers=_auth_header(token))

    assert response.status_code == 200
    assert response.json()["modules"] == ROLE_PERMISSIONS["admin"]["modules"]


def test_manage_users_requires_authentication(client):
    response = client.post("/modules/staff-management/actions/manage-users")

    assert response.status_code == 401
    assert response.json()["detail"] == _UNAUTHENTICATED_DETAIL


def test_manage_users_allowed_for_admin(client):
    token = _token_for(client, "admin")

    response = client.post("/modules/staff-management/actions/manage-users", headers=_auth_header(token))

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "performedBy": "admin"}


@pytest.mark.parametrize("role", ["doctor", "nurse"])
def test_manage_users_forbidden_for_non_admin_roles(client, role):
    token = _token_for(client, role)

    response = client.post("/modules/staff-management/actions/manage-users", headers=_auth_header(token))

    assert response.status_code == 403
    assert response.json()["detail"] == _FORBIDDEN_DETAIL
