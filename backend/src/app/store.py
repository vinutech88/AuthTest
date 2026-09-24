"""In-memory seeded user store and role/permission definitions.

Scope-appropriate for this task per the User Story: no real DB integration.
Passwords are stored pre-hashed (never in plaintext).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from .security import hash_password

# Modules/actions each role is permitted to access. RBAC checks (both UI and
# server side) are derived from this single source of truth.
ROLE_PERMISSIONS: dict[str, dict[str, list[str]]] = {
    "admin": {
        "modules": ["patients", "appointments", "billing", "staff-management", "reports"],
        "actions": ["view", "edit", "delete", "manage-users"],
    },
    "doctor": {
        "modules": ["patients", "appointments", "reports"],
        "actions": ["view", "edit"],
    },
    "nurse": {
        "modules": ["patients", "appointments"],
        "actions": ["view"],
    },
}


@dataclass(frozen=True)
class User:
    username: str
    email: str
    password_hash: str
    role: str
    full_name: str
    display_error_context: str = field(default="", repr=False)


def _seed_users() -> dict[str, User]:
    seeded = [
        User(
            username="admin",
            email="admin@hospital.example",
            password_hash=hash_password("Admin123!"),
            role="admin",
            full_name="Alex Administrator",
        ),
        User(
            username="drsmith",
            email="drsmith@hospital.example",
            password_hash=hash_password("Doctor123!"),
            role="doctor",
            full_name="Dr. Jamie Smith",
        ),
        User(
            username="nursejones",
            email="nursejones@hospital.example",
            password_hash=hash_password("Nurse123!"),
            role="nurse",
            full_name="Jordan Jones",
        ),
    ]
    # Indexed by both username and email (lowercased) so login accepts either.
    index: dict[str, User] = {}
    for user in seeded:
        index[user.username.lower()] = user
        index[user.email.lower()] = user
    return index


USERS_BY_IDENTIFIER = _seed_users()


def find_user(identifier: str) -> User | None:
    return USERS_BY_IDENTIFIER.get(identifier.strip().lower())


def permissions_for_role(role: str) -> dict[str, list[str]]:
    return ROLE_PERMISSIONS.get(role, {"modules": [], "actions": []})
