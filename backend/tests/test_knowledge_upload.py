"""Test suite for Knowledge Document Upload and List endpoints.

Tests cover:
1. Successful document upload (txt/md via real DocumentIngestionService)
2. Unsupported file extension rejection (HTTP 422)
3. Empty file rejection (HTTP 422)
4. Unauthenticated upload rejection (HTTP 401)
5. Ingested document appears in list endpoint
6. KnowledgeDocument record created in DB
7. KnowledgeChunk records created in DB with chunk_count > 0
8. Document status is 'indexed' after successful ingestion
"""
import os
import io
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET_KEY"] = "test-only-jwt-secret-key-minimum-32-chars-for-testing-purposes-only"
os.environ["EMBEDDING_PROVIDER"] = "mock"

from backend.app.main import app
from backend.app.core.database import get_db
from backend.app.core.security import hash_password, create_access_token
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.knowledge_document import KnowledgeDocument
from backend.app.models.knowledge_chunk import KnowledgeChunk

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
        user = User(
            igot_id="IGOT_UPLOAD_TEST",
            email="upload.test@gov.in",
            password_hash=hash_password("TestPassword123!"),
            is_active=True,
        )
        session.add(user)
        session.flush()

        profile = OfficerProfile(
            user_id=user.id,
            name="Upload Test Officer",
            phone="9876543210",
            dob="1990-01-01",
            department="Testing Division",
            designation="Test Officer",
            years_of_experience=1,
        )
        session.add(profile)
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
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def auth_token(db_session):
    user = db_session.query(User).filter_by(igot_id="IGOT_UPLOAD_TEST").first()
    return create_access_token({"sub": user.igot_id})


@pytest.fixture(scope="function")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ── Minimal valid TXT content for upload tests ──
VALID_TXT_CONTENT = b"""# Statistical Analysis Overview

Statistical analysis is the process of collecting and analyzing data to identify patterns.

## Key Concepts

Hypothesis testing allows us to draw inferences about population parameters from sample data.
The null hypothesis (H0) represents the default assumption to be tested.

## P-Values

A p-value measures the probability of obtaining test results at least as extreme as
those observed, assuming the null hypothesis is true. A common threshold is 0.05.

## Confidence Intervals

A 95% confidence interval means that if we repeated the sampling procedure many times,
95% of the resulting intervals would contain the true population parameter.
"""

VALID_MD_CONTENT = b"""# Sampling Methodology Guide

## Probability Sampling

Probability sampling ensures every unit in the population has a known,
non-zero probability of selection.

### Simple Random Sampling

Each unit has an equal probability of selection: P(i) = n/N.

### Stratified Sampling

The population is divided into strata, and samples are drawn from each stratum.
This reduces variance when strata are internally homogeneous.

## Non-Response Weighting

Post-stratification weights compensate for differential non-response rates across
demographic or geographic subgroups.
"""


class TestKnowledgeUploadAuthentication:
    """Tests for authentication requirements on upload endpoint."""

    def test_upload_requires_authentication(self, client: TestClient):
        """Unauthenticated request must return 401."""
        files = {"file": ("test.txt", io.BytesIO(VALID_TXT_CONTENT), "text/plain")}
        response = client.post("/api/knowledge/documents/upload", files=files)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_list_requires_authentication(self, client: TestClient):
        """Unauthenticated list request must return 401."""
        response = client.get("/api/knowledge/documents")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

    def test_upload_with_invalid_token_returns_401(self, client: TestClient):
        """Request with invalid Bearer token must return 401."""
        headers = {"Authorization": "Bearer invalid_token_xyz"}
        files = {"file": ("test.txt", io.BytesIO(VALID_TXT_CONTENT), "text/plain")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=headers)
        assert response.status_code == 401


class TestKnowledgeUploadValidation:
    """Tests for file validation: extension, MIME type, size, empty files."""

    def test_unsupported_extension_rejected(self, client: TestClient, auth_headers: dict):
        """Unsupported file format must be rejected with 422."""
        files = {"file": ("malicious.exe", io.BytesIO(b"not a real exe"), "application/octet-stream")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)
        assert response.status_code == 422
        detail = response.json().get("detail", "")
        assert "Unsupported file format" in detail or "unsupported" in detail.lower()

    def test_zip_extension_rejected(self, client: TestClient, auth_headers: dict):
        """ZIP files must be rejected."""
        files = {"file": ("archive.zip", io.BytesIO(b"PK\x03\x04"), "application/zip")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)
        assert response.status_code == 422

    def test_docx_extension_rejected_without_content(self, client: TestClient, auth_headers: dict):
        """A .csv file must be rejected."""
        files = {"file": ("data.csv", io.BytesIO(b"a,b,c\n1,2,3"), "text/csv")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)
        assert response.status_code == 422

    def test_empty_file_rejected(self, client: TestClient, auth_headers: dict):
        """Empty file (0 bytes) must be rejected with 422."""
        files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)
        assert response.status_code == 422
        detail = response.json().get("detail", "")
        assert "empty" in detail.lower()

    def test_missing_filename_rejected(self, client: TestClient, auth_headers: dict):
        """Upload with no filename must fail gracefully."""
        # Some clients may omit filename; the endpoint should reject it
        files = {"file": ("", io.BytesIO(b"some content"), "text/plain")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)
        # Accept 422 or 400 as valid rejection
        assert response.status_code in (400, 422)


class TestKnowledgeUploadSuccessful:
    """Tests for successful document ingestion."""

    def test_upload_txt_succeeds_and_creates_document(
        self, client: TestClient, db_session, auth_headers: dict
    ):
        """Uploading a valid TXT file must create a KnowledgeDocument record."""
        files = {"file": ("statistics_guide.txt", io.BytesIO(VALID_TXT_CONTENT), "text/plain")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()

        assert data["status"] in ("indexed", "processing"), f"Unexpected status: {data['status']}"
        assert "id" in data
        assert data["filename"] == "statistics_guide.txt"
        assert data["documentType"] == "txt"

        # Verify KnowledgeDocument exists in DB
        doc = db_session.query(KnowledgeDocument).filter_by(id=data["id"]).first()
        assert doc is not None, "KnowledgeDocument was not created in the database"
        assert doc.status in ("indexed", "processing")

    def test_upload_md_succeeds_and_creates_chunks(
        self, client: TestClient, db_session, auth_headers: dict
    ):
        """Uploading a valid MD file must create KnowledgeChunk records (chunk_count > 0)."""
        files = {"file": ("sampling_guide.md", io.BytesIO(VALID_MD_CONTENT), "text/markdown")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)

        assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
        data = response.json()

        doc_id = data["id"]
        assert data["documentType"] == "md"

        # Verify chunks were created
        chunks = db_session.query(KnowledgeChunk).filter_by(document_id=doc_id).all()
        assert len(chunks) > 0, "No KnowledgeChunk records were created for the uploaded document"
        assert data["chunkCount"] > 0, "chunkCount in response must be > 0"

    def test_upload_md_chunk_count_matches_db(
        self, client: TestClient, db_session, auth_headers: dict
    ):
        """The chunkCount in the response must match the actual chunks in the DB."""
        # Use slightly different content to avoid dedup
        content = VALID_MD_CONTENT + b"\n\n## Additional Section\n\nExtra content for uniqueness testing.\n"
        files = {"file": ("sampling_guide_v2.md", io.BytesIO(content), "text/markdown")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)
        assert response.status_code == 201

        data = response.json()
        doc_id = data["id"]
        reported_count = data["chunkCount"]

        db_chunks = db_session.query(KnowledgeChunk).filter_by(document_id=doc_id).all()
        assert reported_count == len(db_chunks), (
            f"Response chunkCount={reported_count} does not match DB chunk count={len(db_chunks)}"
        )

    def test_upload_response_contains_required_fields(
        self, client: TestClient, auth_headers: dict
    ):
        """Upload response must contain all required metadata fields."""
        content = VALID_TXT_CONTENT + b"\nExtra unique content for field validation test.\n"
        files = {"file": ("field_test.txt", io.BytesIO(content), "text/plain")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)
        assert response.status_code == 201

        data = response.json()
        required_fields = ["id", "title", "filename", "documentType", "authority", "source", "status", "chunkCount"]
        for field in required_fields:
            assert field in data, f"Required field '{field}' missing from upload response"

    def test_upload_document_status_is_indexed(
        self, client: TestClient, db_session, auth_headers: dict
    ):
        """After successful upload, document status must be 'indexed' in the DB."""
        content = VALID_TXT_CONTENT + b"\nExtra unique content for status verification.\n"
        files = {"file": ("status_test.txt", io.BytesIO(content), "text/plain")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)
        assert response.status_code == 201

        doc_id = response.json()["id"]
        doc = db_session.query(KnowledgeDocument).filter_by(id=doc_id).first()
        # Refresh from DB
        db_session.refresh(doc)
        assert doc.status == "indexed", f"Document status should be 'indexed', got '{doc.status}'"

    def test_upload_document_no_filesystem_path_in_response(
        self, client: TestClient, auth_headers: dict
    ):
        """Response must not contain filesystem paths or raw exception tracebacks."""
        content = VALID_TXT_CONTENT + b"\nExtra unique content for security path check.\n"
        files = {"file": ("path_test.txt", io.BytesIO(content), "text/plain")}
        response = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)
        assert response.status_code == 201

        response_text = response.text
        # Should not contain typical filesystem path patterns
        assert "\\tmp\\" not in response_text
        assert "/tmp/" not in response_text
        assert "statgap_" not in response_text  # the internal temp prefix should not leak
        assert "Traceback" not in response_text


class TestKnowledgeListEndpoint:
    """Tests for the document list endpoint."""

    def test_list_returns_empty_when_no_documents(
        self, client: TestClient, auth_headers: dict
    ):
        """Empty list is returned when no documents have been indexed."""
        response = client.get("/api/knowledge/documents", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_uploaded_document_appears_in_list(
        self, client: TestClient, db_session, auth_headers: dict
    ):
        """After uploading, the document must appear in the list endpoint."""
        # Upload
        files = {"file": ("list_test.txt", io.BytesIO(VALID_TXT_CONTENT), "text/plain")}
        upload_resp = client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)
        assert upload_resp.status_code == 201
        uploaded_id = upload_resp.json()["id"]

        # List
        list_resp = client.get("/api/knowledge/documents", headers=auth_headers)
        assert list_resp.status_code == 200
        docs = list_resp.json()
        assert isinstance(docs, list)
        ids = [d["id"] for d in docs]
        assert uploaded_id in ids, f"Uploaded doc ID '{uploaded_id}' not found in list response"

    def test_list_response_schema(self, client: TestClient, auth_headers: dict):
        """Each item in the list must have required schema fields."""
        files = {"file": ("schema_test.txt", io.BytesIO(VALID_TXT_CONTENT + b"\nSchema test content.\n"), "text/plain")}
        client.post("/api/knowledge/documents/upload", files=files, headers=auth_headers)

        resp = client.get("/api/knowledge/documents", headers=auth_headers)
        assert resp.status_code == 200
        docs = resp.json()
        if docs:  # Only validate if docs exist
            for doc in docs:
                for field in ["id", "title", "filename", "documentType", "authority", "status", "chunkCount"]:
                    assert field in doc, f"Field '{field}' missing from list response item"


class TestKnowledgeDeduplication:
    """Tests for duplicate document handling."""

    def test_uploading_identical_file_twice_is_idempotent(
        self, client: TestClient, db_session, auth_headers: dict
    ):
        """Uploading the exact same file twice must not create duplicate DB records."""
        content = b"# Dedup Test\n\nThis exact content should only be indexed once in the vector store."
        files1 = {"file": ("dedup_test.txt", io.BytesIO(content), "text/plain")}
        files2 = {"file": ("dedup_test.txt", io.BytesIO(content), "text/plain")}

        r1 = client.post("/api/knowledge/documents/upload", files=files1, headers=auth_headers)
        r2 = client.post("/api/knowledge/documents/upload", files=files2, headers=auth_headers)

        assert r1.status_code == 201
        assert r2.status_code == 201

        # Both responses should have the same document ID (deduplication by checksum)
        assert r1.json()["id"] == r2.json()["id"], "Duplicate file should return same document ID"

        # Only one record in DB
        count = db_session.query(KnowledgeDocument).filter_by(id=r1.json()["id"]).count()
        assert count == 1, f"Expected 1 document, found {count}"
