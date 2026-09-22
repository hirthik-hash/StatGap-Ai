"""Phase 2 Comprehensive Test Suite: PostgreSQL, Authentication, RBAC, Security & Data Isolation.

Validates all 17 Phase 2 acceptance criteria:
1. User creation
2. Duplicate email rejection
3. Officer profile creation
4. Login success
5. Login failure
6. Inactive user rejection
7. JWT validation
8. Expired JWT
9. Invalid JWT
10. Missing JWT
11. OFFICER authorization
12. SUPERVISOR authorization
13. ADMIN authorization
14. Officer data isolation (IDOR protection)
15. Unauthorized access rejection
16. Audit event creation
17. PostgreSQL connection and Alembic migration consistency
"""
import os
import datetime
from datetime import timezone, timedelta
import pytest
import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "phase2-testing-jwt-secret-key-minimum-32-chars-strictly-for-testing!"

from backend.app.main import app
from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    UserRole,
)
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.audit_event import CompetencyAuditEvent
from backend.app.services.audit_service import AuditService, SecurityEventType

# In-memory SQLite engine for fast isolated execution of unit and API logic
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def db_session():
    """Provides a fresh, isolated database session per test."""
    Base.metadata.create_all(bind=TEST_ENGINE)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# =========================================================================
# OBJECTIVES 3 & 4: USER IDENTITY & OFFICER PROFILE
# =========================================================================

def test_01_user_creation_with_role_and_cadre(client, db_session):
    """1. User creation persists role, cadre, and hashes password using Argon2id."""
    payload = {
        "name": "Ananya Sharma",
        "iGotId": "IGOT202600123",
        "email": "ananya.sharma@demo.statgap.local",
        "phone": "9876543210",
        "dob": "1992-08-14",
        "department": "National Accounts Division",
        "designation": "Statistical Officer",
        "password": "SecurePassword123!",
        "yearsOfExperience": 6,
        "role": "OFFICER",
        "cadre": "ISS",
    }
    response = client.post(f"{settings.API_PREFIX}/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["iGotId"] == "IGOT202600123"
    assert data["email"] == "ananya.sharma@demo.statgap.local"
    assert data["role"] == "OFFICER"
    assert data["cadre"] == "ISS"
    assert "password" not in data
    assert "password_hash" not in data

    # Verify directly in DB
    user = db_session.query(User).filter(User.igot_id == "IGOT202600123").first()
    assert user is not None
    assert user.is_active is True
    assert user.role == "OFFICER"
    assert verify_password("SecurePassword123!", user.password_hash)


def test_02_duplicate_email_and_igot_rejection(client):
    """2 & 3. Duplicate email and iGOT ID registrations are rejected with 409 Conflict."""
    payload1 = {
        "name": "Officer One",
        "iGotId": "IGOT-DUP-001",
        "email": "officer1@demo.statgap.local",
        "phone": "9876543211",
        "dob": "1990-01-01",
        "department": "Survey Division",
        "designation": "Field Officer",
        "password": "SecurePassword123!",
        "yearsOfExperience": 4,
    }
    res1 = client.post(f"{settings.API_PREFIX}/auth/register", json=payload1)
    assert res1.status_code == 201

    # Attempt duplicate iGOT ID
    payload_dup_igot = payload1.copy()
    payload_dup_igot["email"] = "different_email@demo.statgap.local"
    res_dup_igot = client.post(f"{settings.API_PREFIX}/auth/register", json=payload_dup_igot)
    assert res_dup_igot.status_code == 409
    assert "iGOT ID" in res_dup_igot.json()["detail"]

    # Attempt duplicate Email
    payload_dup_email = payload1.copy()
    payload_dup_email["iGotId"] = "IGOT-DUP-002"
    res_dup_email = client.post(f"{settings.API_PREFIX}/auth/register", json=payload_dup_email)
    assert res_dup_email.status_code == 409
    assert "email" in res_dup_email.json()["detail"]


def test_03_officer_profile_extended_fields(client, db_session):
    """4. Officer profile persistence supports cadre, current assignment, and qualifications."""
    payload = {
        "name": "Dr. Rajesh Verma",
        "iGotId": "IGOT-SUP-2026001",
        "email": "rajesh.verma@demo.statgap.local",
        "phone": "9876543212",
        "dob": "1982-04-12",
        "department": "Field Operations Division",
        "designation": "Director",
        "password": "SecurePassword123!",
        "yearsOfExperience": 15,
        "role": "SUPERVISOR",
        "cadre": "ISS",
    }
    res = client.post(f"{settings.API_PREFIX}/auth/register", json=payload)
    assert res.status_code == 201

    user = db_session.query(User).filter(User.igot_id == "IGOT-SUP-2026001").first()
    assert user.profile is not None
    assert user.profile.cadre == "ISS"

    # Update profile fields
    login_res = client.post(f"{settings.API_PREFIX}/auth/login", json={"iGotId": "IGOT-SUP-2026001", "password": "SecurePassword123!"})
    token = login_res.json()["access_token"]

    update_payload = {
        "currentAssignment": "PLFS Survey Coordination",
        "qualifications": "Ph.D. in Econometrics",
    }
    update_res = client.put(
        f"{settings.API_PREFIX}/officer/profile",
        json=update_payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["currentAssignment"] == "PLFS Survey Coordination"
    assert updated_data["qualifications"] == "Ph.D. in Econometrics"


# =========================================================================
# OBJECTIVES 5 & 6: AUTHENTICATION & JWT SECURITY
# =========================================================================

def test_04_login_success_and_jwt_claims(client):
    """5. Successful login returns valid JWT with sub and role claims."""
    client.post(f"{settings.API_PREFIX}/auth/register", json={
        "name": "Sanjay Mehta",
        "iGotId": "IGOT-ADM-2026001",
        "email": "admin@demo.statgap.local",
        "phone": "9876543213",
        "dob": "1978-11-20",
        "department": "DIID",
        "designation": "Joint Director",
        "password": "AdminPassword123!",
        "yearsOfExperience": 18,
        "role": "ADMIN",
    })

    login_res = client.post(f"{settings.API_PREFIX}/auth/login", json={
        "iGotId": "IGOT-ADM-2026001",
        "password": "AdminPassword123!",
    })
    assert login_res.status_code == 200
    body = login_res.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "ADMIN"

    # Validate claims in token
    claims = decode_access_token(body["access_token"])
    assert claims["sub"] == "IGOT-ADM-2026001"
    assert claims["role"] == "ADMIN"
    assert "iat" in claims
    assert "exp" in claims


def test_05_login_failure_invalid_credentials(client, db_session):
    """6. Invalid password is rejected and logs LOGIN_FAILURE audit event."""
    client.post(f"{settings.API_PREFIX}/auth/register", json={
        "name": "Test Officer",
        "iGotId": "IGOT-FAIL-001",
        "email": "fail@demo.statgap.local",
        "phone": "9876543214",
        "dob": "1994-01-01",
        "department": "CSO",
        "designation": "SSO",
        "password": "CorrectPassword123!",
        "yearsOfExperience": 3,
    })

    res = client.post(f"{settings.API_PREFIX}/auth/login", json={
        "iGotId": "IGOT-FAIL-001",
        "password": "WrongPassword!",
    })
    assert res.status_code == 401
    assert "Invalid credentials" in res.json()["detail"]

    # Verify LOGIN_FAILURE audit event
    event = (
        db_session.query(CompetencyAuditEvent)
        .filter(CompetencyAuditEvent.event_type == SecurityEventType.LOGIN_FAILURE)
        .first()
    )
    assert event is not None
    assert event.actor == "IGOT-FAIL-001"


def test_06_inactive_user_rejected(client, db_session):
    """7. Inactive / deactivated officer cannot login."""
    client.post(f"{settings.API_PREFIX}/auth/register", json={
        "name": "Deactivated Officer",
        "iGotId": "IGOT-INACT-001",
        "email": "inactive@demo.statgap.local",
        "phone": "9876543215",
        "dob": "1991-05-05",
        "department": "FOD",
        "designation": "JSO",
        "password": "Password123!",
        "yearsOfExperience": 5,
    })

    # Deactivate account
    user = db_session.query(User).filter(User.igot_id == "IGOT-INACT-001").first()
    user.is_active = False
    db_session.commit()

    res = client.post(f"{settings.API_PREFIX}/auth/login", json={
        "iGotId": "IGOT-INACT-001",
        "password": "Password123!",
    })
    assert res.status_code == 401
    assert "deactivated" in res.json()["detail"].lower()


def test_07_expired_and_invalid_and_missing_jwt(client):
    """8, 9, 10. Rejection of expired JWT, invalid signature, and missing token."""
    # 1. Missing token
    res_missing = client.get(f"{settings.API_PREFIX}/auth/me")
    assert res_missing.status_code == 401

    # 2. Invalid/Malformed token
    res_invalid = client.get(
        f"{settings.API_PREFIX}/auth/me",
        headers={"Authorization": "Bearer not-a-valid-token-string"}
    )
    assert res_invalid.status_code == 401

    # 3. Expired token
    expired_token = create_access_token(
        data={"sub": "IGOT202600123", "role": "OFFICER"},
        expires_delta=timedelta(seconds=-10),  # expired 10 seconds ago
    )
    res_expired = client.get(
        f"{settings.API_PREFIX}/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert res_expired.status_code == 401


# =========================================================================
# OBJECTIVES 7 & 8: RBAC & MULTI-TENANT DATA ISOLATION (IDOR PREVENTION)
# =========================================================================

def test_08_rbac_officer_supervisor_admin_permissions(client, db_session):
    """11, 12, 13. Verifies OFFICER, SUPERVISOR, and ADMIN permissions enforcement."""
    # Register 3 users with different roles
    # 1. Officer
    client.post(f"{settings.API_PREFIX}/auth/register", json={
        "name": "Officer User", "iGotId": "IGOT-ROLE-OFFICER", "email": "off@demo.statgap.local",
        "phone": "9876543201", "dob": "1995-01-01", "department": "NAD", "designation": "SO",
        "password": "Password123!", "yearsOfExperience": 2, "role": "OFFICER",
    })
    # 2. Supervisor
    client.post(f"{settings.API_PREFIX}/auth/register", json={
        "name": "Supervisor User", "iGotId": "IGOT-ROLE-SUP", "email": "sup@demo.statgap.local",
        "phone": "9876543202", "dob": "1985-01-01", "department": "NAD", "designation": "Director",
        "password": "Password123!", "yearsOfExperience": 12, "role": "SUPERVISOR",
    })
    # 3. Admin
    client.post(f"{settings.API_PREFIX}/auth/register", json={
        "name": "Admin User", "iGotId": "IGOT-ROLE-ADM", "email": "adm@demo.statgap.local",
        "phone": "9876543203", "dob": "1980-01-01", "department": "DIID", "designation": "Joint Sec",
        "password": "Password123!", "yearsOfExperience": 20, "role": "ADMIN",
    })

    tok_off = client.post(f"{settings.API_PREFIX}/auth/login", json={"iGotId": "IGOT-ROLE-OFFICER", "password": "Password123!"}).json()["access_token"]
    tok_sup = client.post(f"{settings.API_PREFIX}/auth/login", json={"iGotId": "IGOT-ROLE-SUP", "password": "Password123!"}).json()["access_token"]
    tok_adm = client.post(f"{settings.API_PREFIX}/auth/login", json={"iGotId": "IGOT-ROLE-ADM", "password": "Password123!"}).json()["access_token"]

    # 1. OFFICER cannot access admin endpoints
    res_off_admin = client.get(f"{settings.API_PREFIX}/admin/users", headers={"Authorization": f"Bearer {tok_off}"})
    assert res_off_admin.status_code == 403

    # 2. OFFICER cannot access supervisor endpoints
    res_off_sup = client.get(f"{settings.API_PREFIX}/supervisor/officers", headers={"Authorization": f"Bearer {tok_off}"})
    assert res_off_sup.status_code == 403

    # 3. SUPERVISOR can access supervisor endpoints
    res_sup_sup = client.get(f"{settings.API_PREFIX}/supervisor/officers", headers={"Authorization": f"Bearer {tok_sup}"})
    assert res_sup_sup.status_code == 200

    # 4. SUPERVISOR cannot access admin-only endpoints
    res_sup_adm = client.get(f"{settings.API_PREFIX}/admin/users", headers={"Authorization": f"Bearer {tok_sup}"})
    assert res_sup_adm.status_code == 403

    # 5. ADMIN can access admin-only endpoints
    res_adm_adm = client.get(f"{settings.API_PREFIX}/admin/users", headers={"Authorization": f"Bearer {tok_adm}"})
    assert res_adm_adm.status_code == 200

    # 6. ADMIN can update roles and triggers ROLE_CHANGE audit event
    user_off = db_session.query(User).filter(User.igot_id == "IGOT-ROLE-OFFICER").first()
    res_role_change = client.put(
        f"{settings.API_PREFIX}/admin/users/{user_off.id}/role",
        json={"role": "SUPERVISOR"},
        headers={"Authorization": f"Bearer {tok_adm}"},
    )
    assert res_role_change.status_code == 200
    assert res_role_change.json()["role"] == "SUPERVISOR"

    audit_role_evt = (
        db_session.query(CompetencyAuditEvent)
        .filter(CompetencyAuditEvent.event_type == SecurityEventType.ROLE_CHANGE)
        .first()
    )
    assert audit_role_evt is not None
    assert audit_role_evt.actor == "IGOT-ROLE-ADM"
    assert audit_role_evt.event_data["new_role"] == "SUPERVISOR"


def test_09_officer_data_isolation_idor_protection(client, db_session):
    """14 & 15. Officer data isolation: Officer A querying Officer B's profile strictly returns 404 (IDOR Prevention)."""
    # Create Officer A
    client.post(f"{settings.API_PREFIX}/auth/register", json={
        "name": "Officer Alpha", "iGotId": "IGOT-ALPHA-01", "email": "alpha@demo.statgap.local",
        "phone": "9876543221", "dob": "1993-01-01", "department": "SDRD", "designation": "SO",
        "password": "Password123!", "yearsOfExperience": 4, "role": "OFFICER",
    })
    # Create Officer B
    client.post(f"{settings.API_PREFIX}/auth/register", json={
        "name": "Officer Beta", "iGotId": "IGOT-BETA-02", "email": "beta@demo.statgap.local",
        "phone": "9876543222", "dob": "1994-02-02", "department": "DQAD", "designation": "SO",
        "password": "Password123!", "yearsOfExperience": 3, "role": "OFFICER",
    })
    # Create Supervisor
    client.post(f"{settings.API_PREFIX}/auth/register", json={
        "name": "Supervisor Gamma", "iGotId": "IGOT-GAMMA-03", "email": "gamma@demo.statgap.local",
        "phone": "9876543223", "dob": "1980-03-03", "department": "SDRD", "designation": "Director",
        "password": "Password123!", "yearsOfExperience": 16, "role": "SUPERVISOR",
    })

    tok_alpha = client.post(f"{settings.API_PREFIX}/auth/login", json={"iGotId": "IGOT-ALPHA-01", "password": "Password123!"}).json()["access_token"]
    tok_gamma = client.post(f"{settings.API_PREFIX}/auth/login", json={"iGotId": "IGOT-GAMMA-03", "password": "Password123!"}).json()["access_token"]

    user_beta = db_session.query(User).filter(User.igot_id == "IGOT-BETA-02").first()
    beta_profile_id = user_beta.profile.id

    # Officer Alpha attempts to access Officer Beta's private profile
    res_idor = client.get(
        f"{settings.API_PREFIX}/officer/{beta_profile_id}/profile",
        headers={"Authorization": f"Bearer {tok_alpha}"},
    )
    # MUST return 404 to eliminate enumeration of other officers' existence
    assert res_idor.status_code == 404

    # Supervisor Gamma CAN access Officer Beta's profile
    res_sup_access = client.get(
        f"{settings.API_PREFIX}/officer/{beta_profile_id}/profile",
        headers={"Authorization": f"Bearer {tok_gamma}"},
    )
    assert res_sup_access.status_code == 200
    assert res_sup_access.json()["iGotId"] == "IGOT-BETA-02"


# =========================================================================
# OBJECTIVE 9: AUDIT LOGGING & ZERO CREDENTIAL LEAKAGE
# =========================================================================

def test_10_audit_logging_sanitizes_credentials(client, db_session):
    """16. Audit events are created and automatically sanitize any sensitive credentials."""
    audit_service = AuditService(db_session)
    evt = audit_service.log_event(
        event_type="TEST_SECURITY_EVENT",
        actor="TEST_ACTOR",
        details={
            "action": "test_verification",
            "password": "PlainTextPassword!",
            "password_hash": "$argon2id$v=19$m=65536,t=3,p=4$fakehash",
            "token": "secret_token_value",
            "safe_metadata": "public_data",
        }
    )
    assert evt.id is not None
    assert "safe_metadata" in evt.event_data
    assert "password" not in evt.event_data
    assert "password_hash" not in evt.event_data
    assert "token" not in evt.event_data


# =========================================================================
# OBJECTIVE 1 & 2: POSTGRESQL CONNECTION & ALEMBIC MIGRATION CONSISTENCY
# =========================================================================

def test_11_live_postgresql_connection_and_alembic_head():
    """17. Verifies live PostgreSQL database connection and Alembic head migration consistency."""
    pg_url = os.environ.get("DATABASE_URL", "postgresql+psycopg://postgres:password@localhost:5432/statgapai")
    try:
        engine = create_engine(pg_url)
        with engine.connect() as conn:
            # 1. Test query on PostgreSQL
            res = conn.execute(text("SELECT version();")).fetchone()
            assert res is not None
            version_str = res[0]
            assert "PostgreSQL" in version_str

            # 2. Test Alembic migration table
            migration_res = conn.execute(text("SELECT version_num FROM alembic_version;")).fetchone()
            assert migration_res is not None
            current_head = migration_res[0]
            assert current_head in ("007_phase2_identity_and_rbac", "008_phase3_competency_intel")

            # 3. Verify users table has 'role' column in PostgreSQL schema
            cols_res = conn.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'users';")
            ).fetchall()
            col_names = [c[0] for c in cols_res]
            assert "role" in col_names
            assert "igot_id" in col_names
            assert "email" in col_names
            assert "password_hash" in col_names

            # 4. Verify officer_profiles has cadre and current_assignment columns
            prof_cols = conn.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name = 'officer_profiles';")
            ).fetchall()
            prof_col_names = [c[0] for c in prof_cols]
            assert "cadre" in prof_col_names
            assert "current_assignment" in prof_col_names
            assert "qualifications" in prof_col_names
    except Exception as e:
        pytest.fail(f"PostgreSQL connection or migration consistency verification failed: {e}")
