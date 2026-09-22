"""Tests verifying JWT secret security validation and demo password requirement."""
import os
import pytest
from pydantic import ValidationError
from backend.app.core.config import Settings
from backend.app.core.security import hash_password, verify_password


def test_jwt_secret_rejection_for_empty_key():
    """Verify that Settings rejects empty or placeholder JWT_SECRET_KEY in production mode."""
    # Temporarily remove PYTEST_CURRENT_TEST to test production behavior
    pytest_test = os.environ.pop("PYTEST_CURRENT_TEST", None)
    try:
        with pytest.raises((ValueError, ValidationError)) as exc_info:
            Settings(
                ENVIRONMENT="production",
                JWT_SECRET_KEY="",
            )
        assert "JWT_SECRET_KEY is not set or contains an unsafe placeholder" in str(exc_info.value)
    finally:
        if pytest_test:
            os.environ["PYTEST_CURRENT_TEST"] = pytest_test


def test_jwt_secret_rejection_for_placeholder():
    """Verify that Settings rejects placeholder CHANGE_ME keys in production mode."""
    pytest_test = os.environ.pop("PYTEST_CURRENT_TEST", None)
    try:
        with pytest.raises((ValueError, ValidationError)) as exc_info:
            Settings(
                ENVIRONMENT="production",
                JWT_SECRET_KEY="CHANGE_ME_TO_A_RANDOM_SECRET",
            )
        assert "JWT_SECRET_KEY is not set or contains an unsafe placeholder" in str(exc_info.value)
    finally:
        if pytest_test:
            os.environ["PYTEST_CURRENT_TEST"] = pytest_test


def test_jwt_secret_rejection_for_short_key():
    """Verify that Settings rejects keys under 32 characters in production mode."""
    pytest_test = os.environ.pop("PYTEST_CURRENT_TEST", None)
    try:
        with pytest.raises((ValueError, ValidationError)) as exc_info:
            Settings(
                ENVIRONMENT="production",
                JWT_SECRET_KEY="short-secret-key-under-32-chars",
            )
        assert "must be at least 32 characters long" in str(exc_info.value)
    finally:
        if pytest_test:
            os.environ["PYTEST_CURRENT_TEST"] = pytest_test


def test_jwt_secret_accepted_for_valid_key():
    """Verify that Settings accepts a 32+ character key."""
    pytest_test = os.environ.pop("PYTEST_CURRENT_TEST", None)
    try:
        cfg = Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="a-sufficiently-long-and-secure-random-jwt-secret-key-2026",
        )
        assert cfg.JWT_SECRET_KEY == "a-sufficiently-long-and-secure-random-jwt-secret-key-2026"
    finally:
        if pytest_test:
            os.environ["PYTEST_CURRENT_TEST"] = pytest_test


def test_argon2_password_hashing():
    """Verify Argon2 hashing and verification behavior."""
    pwd = "MyGovSecretPassword@2026"
    h = hash_password(pwd)
    assert h.startswith("$argon2")
    assert verify_password(pwd, h) is True
    assert verify_password("WrongPassword@2026", h) is False
