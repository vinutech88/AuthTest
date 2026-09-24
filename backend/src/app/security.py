"""Password hashing and lightweight signed-token helpers.

No external JWT/crypto dependency is required for this scope: tokens are a
base64url-encoded JSON payload signed with HMAC-SHA256, which gives the same
tamper-evidence and expiry semantics as a JWT without adding a dependency.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass

_TOKEN_SECRET = os.environ.get("AUTH_TOKEN_SECRET", "dev-only-insecure-secret-change-me")
_TOKEN_TTL_SECONDS = 60 * 60  # 1 hour
_PBKDF2_ITERATIONS = 200_000


def hash_password(password: str, salt: bytes | None = None) -> str:
    """Return a `salt$hash` string using PBKDF2-HMAC-SHA256."""
    salt = salt or os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return f"{salt.hex()}${derived.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, _ = stored_hash.split("$", 1)
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    candidate = hash_password(password, salt)
    return hmac.compare_digest(candidate, stored_hash)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _sign(payload_b64: str) -> str:
    signature = hmac.new(_TOKEN_SECRET.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).digest()
    return _b64url_encode(signature)


def issue_token(username: str, role: str, expires_in: int = _TOKEN_TTL_SECONDS) -> str:
    payload = {"sub": username, "role": role, "exp": int(time.time()) + expires_in}
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = _sign(payload_b64)
    return f"{payload_b64}.{signature}"


@dataclass(frozen=True)
class TokenPayload:
    username: str
    role: str


def verify_token(token: str) -> TokenPayload | None:
    """Return the decoded payload, or None if the token is missing/invalid/expired."""
    try:
        payload_b64, signature = token.split(".", 1)
    except ValueError:
        return None

    expected_signature = _sign(payload_b64)
    if not hmac.compare_digest(signature, expected_signature):
        return None

    try:
        payload = json.loads(_b64url_decode(payload_b64))
    except (ValueError, json.JSONDecodeError):
        return None

    if payload.get("exp", 0) < time.time():
        return None

    username = payload.get("sub")
    role = payload.get("role")
    if not username or not role:
        return None

    return TokenPayload(username=username, role=role)
