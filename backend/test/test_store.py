"""Tests for app.store — seeded user lookup and role/permission resolution.

Source issue: #9 (User Story #1 — Login)
"""
from __future__ import annotations

from app.store import ROLE_PERMISSIONS, find_user, permissions_for_role


# ── find_user ────────────────────────────────────────────────────────────────


def test_find_user_by_username_is_case_insensitive():
    """A username lookup must succeed regardless of case."""
    user = find_user("ADMIN")
    assert user is not None
    assert user.username == "admin"


def test_find_user_by_email_is_case_insensitive():
    """An email lookup must succeed regardless of case."""
    user = find_user("DrSmith@Hospital.Example")
    assert user is not None
    assert user.username == "drsmith"


def test_find_user_trims_surrounding_whitespace():
    """Leading/trailing whitespace on the identifier must not prevent a match."""
    user = find_user("  nursejones  ")
    assert user is not None
    assert user.username == "nursejones"


def test_find_user_returns_none_for_unknown_identifier():
    """An identifier with no matching username or email returns None."""
    assert find_user("no-such-user@hospital.example") is None


# ── permissions_for_role ─────────────────────────────────────────────────────


def test_permissions_for_role_admin_matches_seeded_table():
    assert permissions_for_role("admin") == ROLE_PERMISSIONS["admin"]


def test_permissions_for_role_doctor_matches_seeded_table():
    assert permissions_for_role("doctor") == ROLE_PERMISSIONS["doctor"]


def test_permissions_for_role_nurse_matches_seeded_table():
    assert permissions_for_role("nurse") == ROLE_PERMISSIONS["nurse"]


def test_permissions_for_role_unknown_role_returns_empty_defaults():
    """An unrecognized role must resolve to empty modules/actions, never an error."""
    assert permissions_for_role("superuser") == {"modules": [], "actions": []}
