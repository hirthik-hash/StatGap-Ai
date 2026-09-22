"""Comprehensive test suite for iGOT Karmayogi Integration Subsystem (Build Prompt 7).

Verifies:
- Adapter contract polymorphism (Mock vs Real)
- Consumer independence from Mock-specific behavior
- Authorized mode without configuration returns NOT_CONFIGURED
- No silent fallback to mock mode
- Authorized export cannot return fake 'synced' success
- Repeated Mock-iGOT imports are idempotent
- Audit logging of integration operations
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
from backend.app.core.security import hash_password, create_access_token
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.verification import CompetencyVerification
from backend.app.models.audit_event import CompetencyAuditEvent

from backend.app.integrations.igot.exceptions import IGOTNotConfiguredError
from backend.app.integrations.igot.factory import get_igot_adapter
from backend.app.integrations.igot.igot_adapter import IGOTAdapter
from backend.app.integrations.igot.mock_igot_adapter import MockIGOTAdapter
from backend.app.integrations.igot.real_igot_adapter import RealIGOTAdapter
from backend.app.integrations.igot.models import (
    IGOTCompetencyExport,
    IGOTSyncResult,
    IGOTSyncStatus,
)
from backend.app.integrations.igot.service import IGOTIntegrationService

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
        # Seed competencies
        c1 = Competency(
            id="comp_survey_audit",
            name="Survey Sampling & Field Auditing",
            category="Operational Statistics",
            score=60,
            required_score=75,
            gap_points=15,
            status="gap",
            description="Sample design and PLFS/NSS auditing.",
        )
        c2 = Competency(
            id="comp_stat_theory",
            name="Statistical Inference & Probability",
            category="Core Methodology",
            score=65,
            required_score=75,
            gap_points=10,
            status="gap",
            description="Inferential tests and regression modeling.",
        )
        session.add(c1)
        session.add(c2)

        # User / Officer A
        user_a = User(
            igot_id="IGOT2026_TEST_01",
            email="officer.test1@gov.in",
            password_hash=hash_password("ValidPassword123!"),
            is_active=True,
        )
        session.add(user_a)
        session.flush()

        profile_a = OfficerProfile(
            user_id=user_a.id,
            name="Officer Aditi Sharma",
            phone="9876543210",
            dob="1990-01-01",
            department="Official Statistics Division",
            designation="Assistant Director",
            years_of_experience=6,
        )
        session.add(profile_a)
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
def auth_headers():
    token = create_access_token(
        data={"sub": "IGOT2026_TEST_01", "role": "officer"},
        expires_delta=timedelta(hours=1),
    )
    return {"Authorization": f"Bearer {token}"}


# ====================================================================
# 1. Adapter Contract & Polymorphism Tests
# ====================================================================
def test_mock_and_real_adapters_satisfy_same_contract():
    """Requirement A: Both MockIGOTAdapter and RealIGOTAdapter must satisfy IGOTAdapter."""
    mock_adapter = MockIGOTAdapter()
    real_adapter = RealIGOTAdapter()

    assert isinstance(mock_adapter, IGOTAdapter)
    assert isinstance(real_adapter, IGOTAdapter)

    # Both must implement the required interface methods
    for adapter in [mock_adapter, real_adapter]:
        assert hasattr(adapter, "fetch_learning_records")
        assert hasattr(adapter, "fetch_course_completion")
        assert hasattr(adapter, "publish_competency_verification")
        assert hasattr(adapter, "publish_learning_status")


def test_consumer_service_independent_of_mock_implementation():
    """Requirement B: Consumer service does NOT depend on MockIGOTAdapter-specific behavior."""
    # Instantiating service with abstract contract reference
    mock_adapter = MockIGOTAdapter()
    real_adapter = RealIGOTAdapter()

    service_mock = IGOTIntegrationService(adapter=mock_adapter)
    service_real = IGOTIntegrationService(adapter=real_adapter)

    assert service_mock.adapter is mock_adapter
    assert service_real.adapter is real_adapter


# ====================================================================
# 2. Configuration & No Silent Fallback Tests
# ====================================================================
def test_authorized_mode_unconfigured_returns_not_configured():
    """Requirement C: Authorized mode without official configuration returns NOT_CONFIGURED."""
    real_adapter = RealIGOTAdapter(base_url=None, client_id=None, client_secret=None)

    # 1. Fetching records raises explicit IGOTNotConfiguredError
    with pytest.raises(IGOTNotConfiguredError) as exc_info:
        real_adapter.fetch_learning_records("IGOT2026_TEST_01")
    assert "Real iGOT Karmayogi integration requires official ministry API credentials" in str(exc_info.value)

    # 2. Export returns explicit NOT_CONFIGURED status (never fake synced)
    payload = IGOTCompetencyExport(
        officer_igot_id="IGOT2026_TEST_01",
        competency_id="comp_stat_theory",
        competency_name="Statistical Inference",
        verification_status="verified",
        composite_score=82.0,
    )
    result = real_adapter.publish_competency_verification(payload)
    assert result.status == IGOTSyncStatus.NOT_CONFIGURED
    assert result.error_code == "IGOT_NOT_CONFIGURED"


def test_factory_authorized_mode_never_silently_falls_back_to_mock(monkeypatch):
    """Requirement D: Authorized mode never silently falls back to Mock-iGOT."""
    monkeypatch.setattr(settings, "IGOT_MODE", "authorized")
    adapter = get_igot_adapter()
    assert isinstance(adapter, RealIGOTAdapter)
    assert not isinstance(adapter, MockIGOTAdapter)


def test_authorized_export_cannot_fabricate_fake_synced_success():
    """Requirement E: Authorized export without credentials cannot return fake 'synced' success."""
    adapter = RealIGOTAdapter(base_url=None, client_id=None, client_secret=None)
    payload = IGOTCompetencyExport(
        officer_igot_id="IGOT2026_TEST_01",
        competency_id="comp_survey_audit",
        competency_name="Survey Sampling",
        verification_status="verified",
        composite_score=85.0,
    )
    result = adapter.publish_competency_verification(payload)
    assert result.status != IGOTSyncStatus.SYNCED
    assert result.status == IGOTSyncStatus.NOT_CONFIGURED


# ====================================================================
# 3. Idempotent Import Tests
# ====================================================================
def test_repeated_mock_igot_imports_remain_idempotent(db_session):
    """Requirement F: Repeated imports of the same external learning records do NOT duplicate evidence."""
    profile = db_session.query(OfficerProfile).first()
    service = IGOTIntegrationService(adapter=MockIGOTAdapter())

    # First import
    res1 = service.import_learning_records(
        db=db_session,
        officer_profile_id=profile.id,
        officer_igot_id="IGOT2026_TEST_01",
    )
    assert res1["imported_count"] >= 1
    assert res1["skipped_count"] == 0
    first_imported = res1["imported_count"]

    count_after_first = (
        db_session.query(CompetencyEvidence)
        .filter(CompetencyEvidence.officer_profile_id == profile.id)
        .count()
    )
    assert count_after_first == first_imported

    # Second import with the exact same records
    res2 = service.import_learning_records(
        db=db_session,
        officer_profile_id=profile.id,
        officer_igot_id="IGOT2026_TEST_01",
    )
    assert res2["imported_count"] == 0
    assert res2["skipped_count"] == first_imported

    # Total database evidence rows must be unchanged!
    count_after_second = (
        db_session.query(CompetencyEvidence)
        .filter(CompetencyEvidence.officer_profile_id == profile.id)
        .count()
    )
    assert count_after_second == count_after_first


# ====================================================================
# 4. Endpoints & Audit Event Logging Tests
# ====================================================================
def test_api_igot_status_endpoint(client):
    """GET /api/igot/status reports correct configuration and adapter."""
    resp = client.get("/api/igot/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] in ["mock", "authorized"]
    assert "MockIGOTAdapter" in data["adapter_name"] or "RealIGOTAdapter" in data["adapter_name"]


def test_api_igot_import_and_sync_history(client, auth_headers, db_session):
    """POST /api/igot/import imports records and creates audit events."""
    # Import records
    resp_imp = client.post("/api/igot/import", headers=auth_headers)
    assert resp_imp.status_code == 200
    imp_data = resp_imp.json()
    assert imp_data["imported_count"] >= 1

    # Check sync history
    resp_hist = client.get("/api/igot/sync-history", headers=auth_headers)
    assert resp_hist.status_code == 200
    events = resp_hist.json()
    assert len(events) >= 1
    assert events[0]["event_type"] == "igot_learning_imported"


def test_api_igot_export_verification(client, auth_headers, db_session):
    """POST /api/igot/export/{competency_id} exports verification status."""
    profile = db_session.query(OfficerProfile).first()

    # Create verified record
    verif = CompetencyVerification(
        officer_id=profile.id,
        competency_id="comp_survey_audit",
        verification_status="verified",
        independent_score=85.0,
        practical_score=75.0,
        composite_score=82.0,
        is_current=True,
    )
    db_session.add(verif)
    db_session.commit()

    resp_exp = client.post(
        "/api/igot/export/comp_survey_audit",
        headers=auth_headers,
    )
    assert resp_exp.status_code == 200
    exp_data = resp_exp.json()
    assert exp_data["status"] == "synced"
    assert "Mock-iGOT" in exp_data["message"]
