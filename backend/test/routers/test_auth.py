"""Tests for POST /auth/login.

Source issue: #9 (User Story #1 — Login)
"""
from __future__ import annotations

import pytest

from app.store import ROLE_PERMISSIONS

_INVALID_CREDENTIALS_DETAIL = "Invalid username/email or password."
_BLANK_FIELD_DETAIL = "This field is required."


def test_login_with_valid_credentials_returns_token_modules_and_actions(client):
    response = client.post("/auth/login", json={"identifier": "admin", "password": "Admin123!"})

    assert response.status_code == 200
    body = response.json()
    assert body["username"] == "admin"
    assert body["role"] == "admin"
    assert body["full_name"] == "Alex Administrator"
    assert isinstance(body["token"], str) and body["token"]
    assert body["modules"] == ROLE_PERMISSIONS["admin"]["modules"]
    assert body["actions"] == ROLE_PERMISSIONS["admin"]["actions"]


def test_login_accepts_email_identifier_case_insensitively(client):
    response = client.post(
        "/auth/login", json={"identifier": "DrSmith@Hospital.Example", "password": "Doctor123!"}
    )

    assert response.status_code == 200
    assert response.json()["username"] == "drsmith"


@pytest.mark.parametrize(
    "identifier, password",
    [
        ("", "Admin123!"),
        ("   ", "Admin123!"),
        ("admin", ""),
        ("admin", "   "),
    ],
)
def test_login_rejects_blank_or_whitespace_only_fields(client, identifier, password):
    response = client.post("/auth/login", json={"identifier": identifier, "password": password})

    assert response.status_code == 400
    assert response.json()["detail"] == _BLANK_FIELD_DETAIL


def test_login_rejects_wrong_password_with_generic_message(client):
    response = client.post("/auth/login", json={"identifier": "admin", "password": "WrongPass1!"})

    assert response.status_code == 401
    assert response.json()["detail"] == _INVALID_CREDENTIALS_DETAIL


def test_login_rejects_unknown_user_with_generic_message(client):
    response = client.post(
        "/auth/login", json={"identifier": "nobody@hospital.example", "password": "whatever123"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == _INVALID_CREDENTIALS_DETAIL


def test_login_wrong_password_and_unknown_user_share_identical_detail(client):
    """REQ-3: never reveal whether the account exists or the password was wrong."""
    wrong_password = client.post("/auth/login", json={"identifier": "admin", "password": "WrongPass1!"})
    unknown_user = client.post(
        "/auth/login", json={"identifier": "nobody@hospital.example", "password": "whatever123"}
    )

    assert wrong_password.status_code == unknown_user.status_code == 401
    assert wrong_password.json()["detail"] == unknown_user.json()["detail"]
