"""Shared pytest fixtures. Adds backend/src to sys.path so `import app...` resolves
regardless of the working directory pytest is invoked from.
"""
from __future__ import annotations

import os
import sys

_SRC_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")
if _SRC_PATH not in sys.path:
    sys.path.insert(0, _SRC_PATH)

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
