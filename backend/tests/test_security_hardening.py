"""Comprehensive test suite for Security Hardening, Observability, and RBAC Isolation (Build Prompt 7).
"""
from __future__ import annotations

import os
from datetime import timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-secret-key-minimum-32-chars-for-testing-purposes-only"
os.environ["EMBEDDING_PROVIDER"] = "mock"
os.environ["RATE_LIMIT_ENABLED"] = "false"

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.middleware import rate_limiter
from backend.app.core.security import hash_password, create_access_token
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.assessment_session import AssessmentSession
from backend.app.models.verification import CompetencyVerification
from backend.app.models.retention import KnowledgeRetention

TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=TEST_ENGINE)
    session = TestingSessionLocal()
    try:
        # Competency
        comp = Competency(
            id="comp_stat_theory",
            name="Statistical Inference",
            category="Core Methodology",
            score=65,
            required_score=75,
            gap_points=10,
            status="gap",
            description="Statistical theory",
        )
        session.add(comp)
        session.flush()

        # Officer 1
        user_1 = User(
            igot_id="IGOT_OFFICER_01",
            email="officer1@gov.in",
            password_hash=hash_password("Password123!"),
            is_active=True,
        )
        session.add(user_1)
        session.flush()

        profile_1 = OfficerProfile(
            user_id=user_1.id,
            name="Officer Aditi Sharma",
            phone="9876543210",
            dob="1990-01-01",
            department="National Accounts",
            designation="Assistant Director",
            years_of_experience=6,
        )
        session.add(profile_1)
        session.flush()

        # Officer 2
        user_2 = User(
            igot_id="IGOT_OFFICER_02",
            email="officer2@gov.in",
            password_hash=hash_password("Password123!"),
            is_active=True,
        )
        session.add(user_2)
        session.flush()

        profile_2 = OfficerProfile(
            user_id=user_2.id,
            name="Officer Rajesh Verma",
            phone="9876543211",
            dob="1988-05-12",
            department="Price & Index Statistics",
            designation="Deputy Director",
            years_of_experience=10,
        )
        session.add(profile_2)
        session.commit()

        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def token_officer_1():
    token = create_access_token(
        data={"sub": "IGOT_OFFICER_01", "role": "officer"},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def token_officer_2():
    token = create_access_token(
        data={"sub": "IGOT_OFFICER_02", "role": "officer"},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


# ====================================================================
# 1. Authentication & Token Security Tests
# ====================================================================
def test_missing_auth_token_rejected(client):
    """Protected endpoints reject requests missing authorization header."""
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_malformed_auth_token_rejected(client):
    """Protected endpoints reject requests with malformed tokens."""
    resp = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer not-a-valid-jwt-token"},
    )
    assert resp.status_code == 401


def test_expired_auth_token_rejected(client):
    """Protected endpoints reject requests with expired tokens."""
    expired_token = create_access_token(
        data={"sub": "IGOT_OFFICER_01"},
        expires_delta=timedelta(seconds=-30),  # expired 30s ago
    )
    resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert resp.status_code == 401


# ====================================================================
# 2. Authorization & IDOR Cross-Officer Isolation Tests
# ====================================================================
def test_cross_officer_isolation_verifications(client, token_officer_1, token_officer_2, db_session):
    """Officer 1 creates verification; Officer 2 CANNOT see or access it."""
    # Officer 1 evaluates verification
    resp_eval = client.post(
        "/api/verifications/evaluate",
        headers=token_officer_1,
        json={"competency_id": "comp_stat_theory", "override_independent_score": 85.0},
    )
    assert resp_eval.status_code == 200

    # Officer 1 retrieves status: 1 record
    resp_o1 = client.get("/api/verifications/status", headers=token_officer_1)
    assert len(resp_o1.json()) == 1

    # Officer 2 retrieves status: 0 records (isolated)
    resp_o2 = client.get("/api/verifications/status", headers=token_officer_2)
    assert len(resp_o2.json()) == 0


def test_cross_officer_isolation_retention(client, token_officer_1, token_officer_2):
    """Officer 1 evaluates retention; Officer 2's retention view remains isolated."""
    # Officer 1 records retention
    client.post(
        "/api/retention/evaluate",
        headers=token_officer_1,
        json={"competency_id": "comp_stat_theory", "days_elapsed": 10},
    )

    # Officer 1 sees record
    resp_o1 = client.get("/api/retention/status", headers=token_officer_1)
    assert len(resp_o1.json()) == 1

    # Officer 2 sees no record
    resp_o2 = client.get("/api/retention/status", headers=token_officer_2)
    assert len(resp_o2.json()) == 0


def test_cross_officer_isolation_audit_events(client, token_officer_1, token_officer_2):
    """Audit events of Officer 1 are not accessible to Officer 2."""
    # Trigger an audit event on Officer 1
    client.post(
        "/api/verifications/evaluate",
        headers=token_officer_1,
        json={"competency_id": "comp_stat_theory", "override_independent_score": 80.0},
    )
    events_o1 = client.get("/api/audit/events", headers=token_officer_1).json()
    assert len(events_o1) >= 1

    events_o2 = client.get("/api/audit/events", headers=token_officer_2).json()
    assert len(events_o2) == 0


# ====================================================================
# 3. Secret Leakage & Observability Tests
# ====================================================================
def test_no_sensitive_secrets_leaked_in_api_responses(client, token_officer_1):
    """Responses must not leak password hashes, database URLs, or secret keys."""
    resp = client.get("/api/auth/me", headers=token_officer_1)
    assert resp.status_code == 200
    data = resp.json()
    assert "password" not in data
    assert "password_hash" not in data
    assert "JWT_SECRET_KEY" not in str(data)


def test_correlation_id_propagation_and_header(client):
    """All requests receive an X-Request-ID response header and custom headers are propagated."""
    custom_id = "custom-test-correlation-uuid-999"
    resp = client.get("/api/health", headers={"X-Request-ID": custom_id})
    assert resp.status_code == 200
    assert resp.headers.get("X-Request-ID") == custom_id

    # Auto-generated when not supplied
    resp_auto = client.get("/api/health")
    assert resp_auto.headers.get("X-Request-ID") is not None


def test_health_and_readiness_endpoints(client):
    """Health (liveness) and readiness (DB connectivity) endpoints report status safely."""
    # Health check
    resp_health = client.get("/api/health")
    assert resp_health.status_code == 200
    assert resp_health.json()["status"] == "ok"

    # Readiness check
    resp_ready = client.get("/api/readiness")
    assert resp_ready.status_code == 200
    assert resp_ready.json()["status"] == "ready"
    assert resp_ready.json()["database"] == "connected"


# ====================================================================
# 4. Test-Safe Rate Limiter Verification
# ====================================================================
def test_rate_limiter_deterministic_burst_rejection(monkeypatch):
    """Test that the rate limiter is deterministic, endpoint-aware, and resettable."""
    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    rate_limiter.reset()

    client_id = "test-client-ip"
    path = "/api/auth/login"

    # Limit = 5 for test
    for _ in range(5):
        assert rate_limiter.is_allowed(client_id, path, limit=5, window_seconds=60) is True

    # 6th request within window must be rejected
    assert rate_limiter.is_allowed(client_id, path, limit=5, window_seconds=60) is False

    # After reset, must be allowed again (test isolation)
    rate_limiter.reset()
    assert rate_limiter.is_allowed(client_id, path, limit=5, window_seconds=60) is True
