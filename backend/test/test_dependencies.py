"""Tests for app.dependencies — auth/RBAC enforcement dependencies.

Source issue: #9 (User Story #1 — Login)
"""
from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.dependencies import get_current_user, require_action, require_module
from app.security import TokenPayload, issue_token

_FORBIDDEN_DETAIL = "You do not have permission to perform this action."
_UNAUTHENTICATED_DETAIL = "Authentication required."


# ── get_current_user ─────────────────────────────────────────────────────────


def test_get_current_user_raises_401_when_credentials_missing():
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=None)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == _UNAUTHENTICATED_DETAIL


def test_get_current_user_raises_401_when_credentials_empty():
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="")
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=credentials)
    assert exc_info.value.status_code == 401


def test_get_current_user_raises_401_when_token_invalid():
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="garbage-token")
    with pytest.raises(HTTPException) as exc_info:
        get_current_user(credentials=credentials)
    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == _UNAUTHENTICATED_DETAIL


def test_get_current_user_returns_payload_for_valid_token():
    token = issue_token(username="admin", role="admin")
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
    payload = get_current_user(credentials=credentials)
    assert payload == TokenPayload(username="admin", role="admin")


# ── require_module ───────────────────────────────────────────────────────────


def test_require_module_allows_permitted_role():
    check = require_module("patients")
    user = TokenPayload(username="drsmith", role="doctor")
    assert check(user=user) == user


def test_require_module_raises_403_with_generic_detail_for_denied_role():
    check = require_module("staff-management")
    user = TokenPayload(username="nursejones", role="nurse")
    with pytest.raises(HTTPException) as exc_info:
        check(user=user)
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == _FORBIDDEN_DETAIL


# ── require_action ───────────────────────────────────────────────────────────


def test_require_action_allows_permitted_role():
    check = require_action("manage-users")
    user = TokenPayload(username="admin", role="admin")
    assert check(user=user) == user


def test_require_action_raises_403_with_generic_detail_for_denied_role():
    check = require_action("manage-users")
    user = TokenPayload(username="drsmith", role="doctor")
    with pytest.raises(HTTPException) as exc_info:
        check(user=user)
    assert exc_info.value.status_code == 403
    assert exc_info.value.detail == _FORBIDDEN_DETAIL


def test_require_module_and_require_action_denials_share_identical_detail():
    """403 responses must never leak *why* access was denied — same generic text everywhere."""
    module_check = require_module("staff-management")
    action_check = require_action("manage-users")
    user = TokenPayload(username="nursejones", role="nurse")

    with pytest.raises(HTTPException) as module_exc:
        module_check(user=user)
    with pytest.raises(HTTPException) as action_exc:
        action_check(user=user)

    assert module_exc.value.detail == action_exc.value.detail == _FORBIDDEN_DETAIL
