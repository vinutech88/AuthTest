"""Tests for app.security — password hashing and signed-token helpers.

Source issue: #9 (User Story #1 — Login)
"""
from __future__ import annotations

import json
import time

import pytest

from app import security
from app.security import TokenPayload, hash_password, issue_token, verify_password, verify_token


# ── hash_password / verify_password ─────────────────────────────────────────


def test_hash_password_roundtrip_verifies_correct_password():
    """A password hashed and then verified with the same value succeeds."""
    stored = hash_password("Correct-Horse-1")
    assert verify_password("Correct-Horse-1", stored) is True


def test_hash_password_with_explicit_salt_is_deterministic():
    """Supplying the same salt twice must yield an identical hash (no randomness)."""
    salt = bytes.fromhex("00112233445566778899aabbccddeeff")[:16]
    first = hash_password("same-password", salt)
    second = hash_password("same-password", salt)
    assert first == second


def test_hash_password_without_salt_generates_a_random_salt():
    """Omitting the salt must produce different hashes across calls (random salt branch)."""
    first = hash_password("same-password")
    second = hash_password("same-password")
    assert first != second


def test_verify_password_rejects_wrong_password():
    """A wrong password against a valid stored hash must fail verification."""
    stored = hash_password("Correct-Horse-1")
    assert verify_password("wrong-password", stored) is False


def test_verify_password_rejects_malformed_stored_hash():
    """A stored hash missing the `$` separator hits the ValueError guard and returns False."""
    assert verify_password("anything", "not-a-valid-stored-hash") is False


def test_verify_password_rejects_stored_hash_with_non_hex_salt():
    """A stored hash with a non-hex salt must fail closed instead of raising."""
    assert verify_password("anything", "not-hex$deadbeef") is False


# ── issue_token / verify_token ──────────────────────────────────────────────


def test_issue_token_and_verify_token_roundtrip():
    """A freshly issued token must verify and decode back to the same username/role."""
    token = issue_token(username="admin", role="admin")
    payload = verify_token(token)
    assert payload == TokenPayload(username="admin", role="admin")


def test_verify_token_rejects_tampered_signature():
    """Altering the signature segment must invalidate the token (HMAC mismatch)."""
    token = issue_token(username="admin", role="admin")
    payload_b64, signature = token.split(".", 1)
    tampered_signature = ("a" if signature[0] != "a" else "b") + signature[1:]
    tampered_token = f"{payload_b64}.{tampered_signature}"
    assert verify_token(tampered_token) is None


def test_verify_token_rejects_expired_token():
    """A token issued with a negative TTL is already expired and must be rejected."""
    expired_token = issue_token(username="admin", role="admin", expires_in=-10)
    assert verify_token(expired_token) is None


def test_verify_token_rejects_malformed_token_missing_separator():
    """A token with no `.` separator hits the split() ValueError guard."""
    assert verify_token("no-separator-here") is None


def test_verify_token_rejects_non_json_payload():
    """A validly signed but non-JSON payload hits the json.JSONDecodeError guard."""
    payload_b64 = security._b64url_encode(b"this-is-not-json")
    signature = security._sign(payload_b64)
    token = f"{payload_b64}.{signature}"
    assert verify_token(token) is None


def test_verify_token_rejects_payload_missing_role():
    """A validly signed payload missing `role` hits the missing-claim guard."""
    payload = {"sub": "admin", "exp": int(time.time()) + 3600}
    payload_b64 = security._b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = security._sign(payload_b64)
    token = f"{payload_b64}.{signature}"
    assert verify_token(token) is None


def test_verify_token_rejects_payload_missing_subject():
    """A validly signed payload missing `sub` hits the missing-claim guard."""
    payload = {"role": "admin", "exp": int(time.time()) + 3600}
    payload_b64 = security._b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = security._sign(payload_b64)
    token = f"{payload_b64}.{signature}"
    assert verify_token(token) is None
