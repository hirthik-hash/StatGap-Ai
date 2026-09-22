"""Comprehensive test suite for STAT-GAP AI Backend Prompt 2.

Covers all 11 required test cases:
1. Health endpoint
2. User registration
3. Duplicate registration prevention (409 Conflict)
4. Login with correct password
5. Login with incorrect password (401 Unauthorized)
6. JWT-protected /api/auth/me
7. Unauthorized request without token (401 Unauthorized)
8. Officer profile retrieval
9. Competency retrieval
10. Password is NOT stored in plaintext (Argon2 verification)
11. Password hash is NOT returned by API responses
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

# Set test environment to satisfy config validation
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-secret-key-minimum-32-chars-for-testing-purposes-only"

from backend.app.main import app
from backend.app.core.database import get_db
from backend.app.core.security import hash_password, verify_password, create_access_token
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.schemas.auth import UserResponse


# Safe in-memory SQLite setup ONLY used as an isolated test fixture for unit tests
# (Section 3 rule specifies production application must be PostgreSQL, which is configured in app/core)
TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def db_session():
    """Provides a fresh isolated database schema for each test function."""
    Base.metadata.create_all(bind=TEST_ENGINE)
    session = TestingSessionLocal()
    try:
        # Pre-seed test competency
        comp = Competency(
            id="comp_stat_analysis",
            name="Statistical Analysis",
            category="Core Methodology",
            score=82,
            required_score=75,
            gap_points=0,
            status="competent",
            description="Inferential statistics and parametric testing.",
        )
        session.add(comp)
        session.commit()
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def client(db_session: Session):
    """Provides a TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Test 1: Health endpoint
# ---------------------------------------------------------------------------
def test_01_health_endpoint(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "stat-gap-ai"




# ---------------------------------------------------------------------------
# Test 2: User registration
# ---------------------------------------------------------------------------
def test_02_user_registration(client: TestClient, db_session: Session):
    payload = {
        "name": "Rajesh Verma",
        "iGotId": "IGOT202600999",
        "email": "rajesh.verma@gov.in",
        "phone": "9811223344",
        "dob": "1990-05-20",
        "department": "National Statistical Office",
        "designation": "Assistant Director",
        "password": "SecurePassword@123",
        "yearsOfExperience": 7,
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Rajesh Verma"
    assert data["iGotId"] == "IGOT202600999"
    assert data["email"] == "rajesh.verma@gov.in"
    assert data["department"] == "National Statistical Office"
    # Ensure id was generated
    assert "id" in data


# ---------------------------------------------------------------------------
# Test 3: Duplicate registration
# ---------------------------------------------------------------------------
def test_03_duplicate_registration(client: TestClient):
    payload = {
        "name": "Kavita Rao",
        "iGotId": "IGOT202600444",
        "email": "kavita.rao@gov.in",
        "phone": "9822334455",
        "dob": "1993-11-12",
        "department": "Price Statistics Division",
        "designation": "Senior Statistical Officer",
        "password": "SecurePassword@123",
        "yearsOfExperience": 5,
    }
    # First registration must succeed
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    # Second registration with duplicate iGOT ID must fail with 409 Conflict
    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already registered" in res2.json()["detail"]


# ---------------------------------------------------------------------------
# Test 4: Login with correct password
# ---------------------------------------------------------------------------
def test_04_login_with_correct_password(client: TestClient):
    # Register first
    reg_payload = {
        "name": "Suresh Patel",
        "iGotId": "IGOT202600555",
        "email": "suresh.patel@gov.in",
        "phone": "9833445566",
        "dob": "1988-02-14",
        "department": "Survey Design Research Division",
        "designation": "Director",
        "password": "CorrectPassword@2026",
        "yearsOfExperience": 12,
    }
    client.post("/api/auth/register", json=reg_payload)

    # Login
    login_payload = {
        "iGotId": "IGOT202600555",
        "password": "CorrectPassword@2026",
    }
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["iGotId"] == "IGOT202600555"


# ---------------------------------------------------------------------------
# Test 5: Login with incorrect password
# ---------------------------------------------------------------------------
def test_05_login_with_incorrect_password(client: TestClient):
    reg_payload = {
        "name": "Pooja Mehta",
        "iGotId": "IGOT202600777",
        "email": "pooja.mehta@gov.in",
        "phone": "9844556677",
        "dob": "1994-09-03",
        "department": "Field Operations Division",
        "designation": "Statistical Officer",
        "password": "RealPassword@123",
        "yearsOfExperience": 4,
    }
    client.post("/api/auth/register", json=reg_payload)

    # Attempt login with wrong password
    bad_login = {
        "iGotId": "IGOT202600777",
        "password": "WrongPassword@999",
    }
    res = client.post("/api/auth/login", json=bad_login)
    assert res.status_code == 401
    assert "Invalid credentials" in res.json()["detail"]


# ---------------------------------------------------------------------------
# Test 6: JWT-protected /api/auth/me
# ---------------------------------------------------------------------------
def test_06_jwt_protected_auth_me(client: TestClient):
    reg_payload = {
        "name": "Amit Saxena",
        "iGotId": "IGOT202600888",
        "email": "amit.saxena@gov.in",
        "phone": "9855667788",
        "dob": "1991-07-25",
        "department": "Coordination and Publication Division",
        "designation": "Deputy Director",
        "password": "PasswordAmit@123",
        "yearsOfExperience": 8,
    }
    client.post("/api/auth/register", json=reg_payload)

    login_res = client.post("/api/auth/login", json={
        "iGotId": "IGOT202600888",
        "password": "PasswordAmit@123",
    })
    token = login_res.json()["access_token"]

    # Call /api/auth/me with Bearer token
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    data = me_res.json()
    assert data["iGotId"] == "IGOT202600888"
    assert data["name"] == "Amit Saxena"


# ---------------------------------------------------------------------------
# Test 7: Unauthorized request without token
# ---------------------------------------------------------------------------
def test_07_unauthorized_request_without_token(client: TestClient):
    # No Authorization header
    res_no_token = client.get("/api/auth/me")
    assert res_no_token.status_code == 401

    # Invalid token
    res_bad_token = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer completely-invalid-jwt-token"}
    )
    assert res_bad_token.status_code == 401


# ---------------------------------------------------------------------------
# Test 8: Officer profile retrieval
# ---------------------------------------------------------------------------
def test_08_officer_profile_retrieval(client: TestClient):
    reg_payload = {
        "name": "Deepa Nair",
        "iGotId": "IGOT202600222",
        "email": "deepa.nair@gov.in",
        "phone": "9866778899",
        "dob": "1995-04-18",
        "department": "National Accounts Division",
        "designation": "Junior Statistical Officer",
        "password": "DeepaPassword@2026",
        "yearsOfExperience": 3,
    }
    client.post("/api/auth/register", json=reg_payload)

    login_res = client.post("/api/auth/login", json={
        "iGotId": "IGOT202600222",
        "password": "DeepaPassword@2026",
    })
    token = login_res.json()["access_token"]

    # Retrieve profile
    prof_res = client.get(
        "/api/officer/profile",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["name"] == "Deepa Nair"
    assert prof["iGotId"] == "IGOT202600222"
    assert prof["department"] == "National Accounts Division"


# ---------------------------------------------------------------------------
# Test 9: Competency retrieval
# ---------------------------------------------------------------------------
def test_09_competency_retrieval(client: TestClient):
    reg_payload = {
        "name": "Manoj Joshi",
        "iGotId": "IGOT202600333",
        "email": "manoj.joshi@gov.in",
        "phone": "9877889900",
        "dob": "1989-12-05",
        "department": "Economic Statistics Division",
        "designation": "Joint Director",
        "password": "ManojPassword@2026",
        "yearsOfExperience": 14,
    }
    client.post("/api/auth/register", json=reg_payload)

    login_res = client.post("/api/auth/login", json={
        "iGotId": "IGOT202600333",
        "password": "ManojPassword@2026",
    })
    token = login_res.json()["access_token"]

    # List competencies
    comp_list_res = client.get(
        "/api/competencies",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert comp_list_res.status_code == 200
    comps = comp_list_res.json()
    assert len(comps) >= 1
    assert comps[0]["id"] == "comp_stat_analysis"

    # Get single competency
    comp_res = client.get(
        "/api/competencies/comp_stat_analysis",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["name"] == "Statistical Analysis"


# ---------------------------------------------------------------------------
# Test 10: Password is NOT stored in plaintext
# ---------------------------------------------------------------------------
def test_10_password_not_stored_in_plaintext(client: TestClient, db_session: Session):
    plain_password = "SuperSecretPassword#2026"
    reg_payload = {
        "name": "Vikram Singh",
        "iGotId": "IGOT202600111",
        "email": "vikram.singh@gov.in",
        "phone": "9888990011",
        "dob": "1992-01-30",
        "department": "Data Quality Division",
        "designation": "Senior Statistical Officer",
        "password": plain_password,
        "yearsOfExperience": 6,
    }
    client.post("/api/auth/register", json=reg_payload)

    # Query the database directly to inspect stored record
    stored_user = db_session.query(User).filter(User.igot_id == "IGOT202600111").first()
    assert stored_user is not None

    # Verify password is NOT in plaintext
    assert stored_user.password_hash != plain_password
    assert plain_password not in stored_user.password_hash

    # Verify hash is an Argon2 hash
    assert stored_user.password_hash.startswith("$argon2")
    assert verify_password(plain_password, stored_user.password_hash) is True
    assert verify_password("wrong_password", stored_user.password_hash) is False


# ---------------------------------------------------------------------------
# Test 11: Password hash is NOT returned by API
# ---------------------------------------------------------------------------
def test_11_password_hash_not_returned_by_api(client: TestClient):
    reg_payload = {
        "name": "Sunita Rao",
        "iGotId": "IGOT202600666",
        "email": "sunita.rao@gov.in",
        "phone": "9899001122",
        "dob": "1990-10-10",
        "department": "Sample Survey Division",
        "designation": "Deputy Director",
        "password": "SunitaPassword@2026",
        "yearsOfExperience": 9,
    }

    # 1. Check Register response
    reg_res = client.post("/api/auth/register", json=reg_payload)
    reg_data = reg_res.json()
    assert "password" not in reg_data
    assert "password_hash" not in reg_data

    # 2. Check Login response
    login_res = client.post("/api/auth/login", json={
        "iGotId": "IGOT202600666",
        "password": "SunitaPassword@2026",
    })
    login_data = login_res.json()
    assert "password" not in login_data
    assert "password_hash" not in login_data
    assert "password" not in login_data["user"]
    assert "password_hash" not in login_data["user"]
    token = login_data["access_token"]

    # 3. Check /me response
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    me_data = me_res.json()
    assert "password" not in me_data
    assert "password_hash" not in me_data

    # 4. Check Profile response
    prof_res = client.get(
        "/api/officer/profile",
        headers={"Authorization": f"Bearer {token}"}
    )
    prof_data = prof_res.json()
    assert "password" not in prof_data
    assert "password_hash" not in prof_data

    # 5. Check UserResponse schema itself
    assert "password" not in UserResponse.model_fields
    assert "password_hash" not in UserResponse.model_fields
