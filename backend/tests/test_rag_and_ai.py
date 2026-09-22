"""Comprehensive test suite for STAT-GAP AI Build Prompt 4:
LLM, Grounded RAG, and Statistical Misconception Intelligence.
All tests run offline using MockEmbeddingProvider and MockLLMProvider.
"""
import os
import math
import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
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
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.models.misconception import Misconception
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.models.knowledge_document import KnowledgeDocument
from backend.app.models.knowledge_chunk import KnowledgeChunk

from backend.app.ingestion.text_extractor import TextExtractor, ExtractedSection
from backend.app.ingestion.chunker import StatisticalDocumentChunker
from backend.app.ingestion.ingestion_service import DocumentIngestionService
from backend.app.services.embedding_service import (
    MockEmbeddingProvider,
    get_embedding_provider,
)
from backend.app.services.retrieval_service import VectorRetrievalService, RetrievedChunk, _cosine_similarity
from backend.app.services.rag_service import RAGService
from backend.app.services.llm_service import (
    LLMService,
    MockLLMProvider,
    SYSTEM_PROMPT,
)

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
        # Seed test user 1 (Officer A)
        user_a = User(
            igot_id="IGOT202600123",
            email="officer.a@gov.in",
            password_hash=hash_password("ValidPassword123!"),
            is_active=True,
        )
        session.add(user_a)
        session.flush()

        profile_a = OfficerProfile(
            user_id=user_a.id,
            name="Ananya Sharma",
            phone="9876543210",
            dob="1992-08-14",
            department="Official Statistics Division",
            designation="Statistical Officer",
            years_of_experience=6,
        )
        session.add(profile_a)
        session.flush()

        # Seed test user 2 (Officer B)
        user_b = User(
            igot_id="IGOT202600456",
            email="officer.b@gov.in",
            password_hash=hash_password("ValidPassword123!"),
            is_active=True,
        )
        session.add(user_b)
        session.flush()

        profile_b = OfficerProfile(
            user_id=user_b.id,
            name="Rajesh Verma",
            phone="9876543211",
            dob="1989-05-20",
            department="Sample Survey Division",
            designation="Senior Statistical Officer",
            years_of_experience=10,
        )
        session.add(profile_b)
        session.flush()

        # Seed competency
        comp = Competency(
            id="comp_stat_analysis",
            name="Statistical Analysis & Modeling",
            category="Core Methodology",
            score=58,
            required_score=75,
            gap_points=17,
            status="gap",
            description="OLS regression, hypothesis testing, and inference.",
        )
        session.add(comp)

        # Seed evidence for Officer A
        ev_a = CompetencyEvidence(
            officer_profile_id=profile_a.id,
            competency_id="comp_stat_analysis",
            assessment_score=48,
            quiz_accuracy=52,
            practical_performance=45,
            repeated_errors=3,
            confidence_pattern="overconfident",
        )
        session.add(ev_a)

        # Seed evidence for Officer B
        ev_b = CompetencyEvidence(
            officer_profile_id=profile_b.id,
            competency_id="comp_stat_analysis",
            assessment_score=80,
            quiz_accuracy=82,
            practical_performance=78,
            repeated_errors=0,
            confidence_pattern="calibrated",
        )
        session.add(ev_b)

        # Seed misconceptions
        misc1 = Misconception(
            id="misc_reg_slope_01",
            title="Conflating Marginal Slope with Elasticity",
            concept="OLS Regression Interpretation",
            explanation="Officer interprets slope coefficient beta_1 in a linear model as percentage change.",
            detection_rule="practical_performance < 50 AND repeated_errors >= 2",
            confidence_level="High",
            counter_example="In Crop Yield (kg/ha) = 500 + 45 * Fertilizer (kg/ha), beta_1 = 45 kg/ha, NOT 45%.",
            remediation_hint="Complete 15-minute micro-module on Linear vs Logarithmic specifications.",
        )
        misc2 = Misconception(
            id="misc_p_val_01",
            title="P-Value as Probability of False Null Hypothesis",
            concept="Hypothesis Testing",
            explanation="Officer interprets p < 0.05 as a 95% probability that the null hypothesis is false.",
            detection_rule="quiz_accuracy < 55",
            confidence_level="Very High",
            counter_example="A p-value of 0.03 means that if H0 were true, there is a 3% chance of extreme results.",
            remediation_hint="Review conditional probability and Bayesian vs Frequentist inference.",
        )
        session.add_all([misc1, misc2])

        # Seed gap diagnosis for officer A
        diagnosis_a = GapDiagnosis(
            officer_profile_id=profile_a.id,
            competency_id="comp_stat_analysis",
            diagnosis_type="statistical_misconception",
            misconception_id="misc_reg_slope_01",
            severity="high",
            confidence=0.88,
            explanation="Officer exhibits classic conflation of marginal unit change with elasticity percentage.",
            reasoning_trace=json.dumps({
                "signals": [
                    {"signal": "practical_performance", "value": 45, "interpretation": "Below 50% threshold"},
                    {"signal": "repeated_errors", "value": 3, "interpretation": "Repeated error pattern"}
                ],
                "conclusion": "Conflating Marginal Slope with Elasticity"
            }),
            evidence_references=json.dumps({
                "practical_performance": 45,
                "repeated_errors": 3,
                "quiz_accuracy": 52,
            }),
        )
        session.add(diagnosis_a)

        # Seed knowledge document and chunks
        doc = KnowledgeDocument(
            id="doc_sample_manual",
            title="NSSTA Advanced Regression Analysis Guide",
            filename="nssta_regression_and_inference_guide.md",
            document_type="md",
            source="Official Curriculum: NSSTA",
            authority="NSSTA",
            version="2025.1",
            checksum="mock_hash_12345",
            status="indexed",
        )
        session.add(doc)

        provider = MockEmbeddingProvider(dimension=768)
        chunk1_text = (
            "Section 4.1: Linear Regression Interpretation. In an ordinary least squares (OLS) linear model "
            "Y = beta_0 + beta_1 * X + epsilon, the coefficient beta_1 denotes the expected absolute change in the "
            "dependent variable Y (in its native measurement units) for every one-unit absolute change in the explanatory "
            "variable X, holding all other covariates strictly constant (ceteris paribus). It is mathematically invalid "
            "to interpret beta_1 as a percentage change. For elasticity or percentage interpretations, a log-log specification "
            "ln(Y) = beta_0 + beta_1 * ln(X) + epsilon must be estimated."
        )
        chunk1_emb = provider.embed_text(chunk1_text)

        chunk1 = KnowledgeChunk(
            id="chunk_reg_01",
            document_id="doc_sample_manual",
            chunk_index=0,
            text=chunk1_text,
            token_count=120,
            section_title="Section 4.1",
            page_number=1,
            embedding=chunk1_emb,
            chunk_metadata=json.dumps({"authority": "NSSTA", "section": "4.1"}),
        )

        chunk2_text = (
            "Section 6.2: Hypothesis Testing and P-values. The p-value is defined as the probability of observing a test "
            "statistic at least as extreme as the value actually calculated from sample data, under the strict assumption "
            "that the null hypothesis H0 is true: P(T >= t_obs | H0). A p-value does NOT represent the probability that the null "
            "hypothesis is true, nor does 1 - p represent the probability that the alternative hypothesis is true."
        )
        chunk2_emb = provider.embed_text(chunk2_text)

        chunk2 = KnowledgeChunk(
            id="chunk_pval_02",
            document_id="doc_sample_manual",
            chunk_index=1,
            text=chunk2_text,
            token_count=110,
            section_title="Section 6.2",
            page_number=2,
            embedding=chunk2_emb,
            chunk_metadata=json.dumps({"authority": "NSSTA", "section": "6.2"}),
        )
        session.add_all([chunk1, chunk2])

        session.commit()
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(scope="function")
def client(db_session: Session):
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
def auth_headers_officer_a():
    token = create_access_token(data={"sub": "IGOT202600123"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def auth_headers_officer_b():
    token = create_access_token(data={"sub": "IGOT202600456"})
    return {"Authorization": f"Bearer {token}"}


# =========================================================================
# 1. TEXT EXTRACTOR TESTS
# =========================================================================

def test_extract_text_txt_and_md(tmp_path):
    txt_file = tmp_path / "sample.txt"
    txt_file.write_text("Line 1: Survey methodology.\nLine 2: Stratified sampling.", encoding="utf-8")
    sections_txt = TextExtractor.extract_from_file(str(txt_file))
    assert len(sections_txt) >= 1
    assert "Stratified sampling" in sections_txt[0].text

    md_file = tmp_path / "manual.md"
    md_file.write_text("# Chapter 1\n## Section 1.1\nNational sample survey guidelines.", encoding="utf-8")
    sections_md = TextExtractor.extract_from_file(str(md_file))
    assert len(sections_md) >= 1
    assert "National sample survey" in sections_md[0].text


def test_extract_text_unsupported_format(tmp_path):
    bad_file = tmp_path / "archive.zip"
    bad_file.write_bytes(b"dummy")
    with pytest.raises(ValueError, match="Unsupported file format"):
        TextExtractor.extract_from_file(str(bad_file))


# =========================================================================
# 2. CHUNKER TESTS
# =========================================================================

def test_chunker_statistical_document():
    chunker = StatisticalDocumentChunker(target_chunk_words=30, overlap_words=10)
    sections = [
        ExtractedSection(
            text="This is sentence one about statistical inference. This is sentence two discussing OLS regression estimators. This is sentence three on Gauss-Markov assumptions. This is sentence four discussing homoscedasticity and variance stabilization in official sample data.",
            page_number=1,
            section_title="Section 1"
        )
    ]
    chunks = chunker.chunk_sections(document_id="doc_test_1", sections=sections)
    assert len(chunks) >= 1
    for chunk in chunks:
        assert chunk.document_id == "doc_test_1"
        assert len(chunk.text) > 0
        assert chunk.token_count > 0


# =========================================================================
# 3. EMBEDDING PROVIDER TESTS
# =========================================================================

def test_mock_embedding_provider_shape_and_norm():
    provider = MockEmbeddingProvider(dimension=768)
    vec = provider.embed_text("linear regression slope coefficient")
    assert len(vec) == 768
    # Verify vector is unit normalized: sum(x^2) approx 1.0
    norm = math.sqrt(sum(x * x for x in vec))
    assert pytest.approx(norm, rel=1e-3) == 1.0


def test_mock_embedding_provider_semantic_similarity():
    provider = MockEmbeddingProvider(dimension=768)
    v_slope1 = provider.embed_text("OLS regression slope marginal change")
    v_slope2 = provider.embed_text("Ordinary least squares regression coefficient interpretation")
    v_unrelated = provider.embed_text("Geographic census boundary demarcation in district headquarters")

    # Cosine similarity between unit vectors is dot product
    sim_related = _cosine_similarity(v_slope1, v_slope2)
    sim_unrelated = _cosine_similarity(v_slope1, v_unrelated)

    assert sim_related > sim_unrelated


def test_get_embedding_provider_mock():
    provider = get_embedding_provider(provider_type="mock")
    assert isinstance(provider, MockEmbeddingProvider)
    assert provider.dimension == 768


# =========================================================================
# 4. VECTOR RETRIEVAL SERVICE TESTS
# =========================================================================

def test_vector_retrieval_ranking(db_session: Session):
    provider = MockEmbeddingProvider(dimension=768)
    retrieval = VectorRetrievalService(db=db_session, embedding_provider=provider)

    results = retrieval.retrieve(
        query="regression slope coefficient marginal change in Y",
        top_k=5,
        min_similarity=0.1,
    )

    assert len(results) > 0
    top_chunk = results[0]
    assert top_chunk.similarity_score > 0.0
    assert "Section 4.1: Linear Regression Interpretation" in top_chunk.text


def test_vector_retrieval_authority_filtering(db_session: Session):
    provider = MockEmbeddingProvider(dimension=768)
    retrieval = VectorRetrievalService(db=db_session, embedding_provider=provider)

    # Filter for non-matching authority
    results_empty = retrieval.retrieve(
        query="regression slope",
        filters={"authority": "NON_EXISTENT_AUTHORITY"}
    )
    assert len(results_empty) == 0

    # Filter for matching authority
    results_match = retrieval.retrieve(
        query="regression slope",
        filters={"authority": "NSSTA"}
    )
    assert len(results_match) > 0


# =========================================================================
# 5. RAG SERVICE GROUNDING TESTS
# =========================================================================

def test_rag_service_grounding_status(db_session: Session):
    provider = MockEmbeddingProvider(dimension=768)
    retrieval = VectorRetrievalService(db=db_session, embedding_provider=provider)
    rag_service = RAGService(db=db_session, retrieval_service=retrieval)

    # 1. Relevant query -> grounded
    result_grounded = rag_service.get_grounded_context(
        query="OLS linear regression coefficient beta_1 marginal change in Y ceteris paribus",
        top_k=4,
    )
    assert result_grounded.grounding_status in ("grounded", "weak_grounding")
    assert len(result_grounded.sources) > 0

    # 2. Unrelated query with high threshold -> insufficient_grounding
    result_unrelated = rag_service.get_grounded_context(
        query="Quantum entanglement cryptographic algorithms in telecommunication satellites",
        top_k=2,
        grounded_threshold=0.99,
        weak_threshold=0.95,
    )
    assert result_unrelated.grounding_status == "insufficient_grounding"


def test_rag_grounding_threshold_boundary_conditions(db_session: Session):
    """
    Explicit boundary condition testing for the Phase 4 specification grounding thresholds:
    - similarity >= 0.65 -> grounded
    - 0.48 <= similarity < 0.65 -> weak_grounding
    - similarity < 0.48 or empty retrieval -> insufficient_grounding

    Values sourced from: Phase 4 specification Section 8 "GROUNDING GATE"
    and config.py RAG_GROUNDED_THRESHOLD / RAG_WEAK_GROUNDING_THRESHOLD.
    """
    class StubRetrieval:
        def __init__(self, score: float | None):
            self.score = score

        def retrieve(self, query: str, top_k: int = 4, filters=None, min_similarity=0.0):
            if self.score is None:
                return []
            return [
                RetrievedChunk(
                    chunk_id="chunk_test",
                    document_id="doc_test",
                    text="Sample text",
                    similarity_score=self.score,
                    document_title="Sample Doc",
                    authority="NSSTA",
                )
            ]

    # 1. similarity = 0.65 -> grounded (exact lower boundary of Tier 1)
    rag_65 = RAGService(db=db_session, retrieval_service=StubRetrieval(0.65))
    ctx_65 = rag_65.get_grounded_context("query")
    assert ctx_65.grounding_status == "grounded", (
        f"Expected 'grounded' at 0.65, got '{ctx_65.grounding_status}'"
    )

    # 2. similarity = 0.64 -> weak_grounding (just below Tier 1 boundary)
    rag_64 = RAGService(db=db_session, retrieval_service=StubRetrieval(0.64))
    ctx_64 = rag_64.get_grounded_context("query")
    assert ctx_64.grounding_status == "weak_grounding", (
        f"Expected 'weak_grounding' at 0.64, got '{ctx_64.grounding_status}'"
    )

    # 3. similarity = 0.48 -> weak_grounding (exact lower boundary of Tier 2)
    rag_48 = RAGService(db=db_session, retrieval_service=StubRetrieval(0.48))
    ctx_48 = rag_48.get_grounded_context("query")
    assert ctx_48.grounding_status == "weak_grounding", (
        f"Expected 'weak_grounding' at 0.48, got '{ctx_48.grounding_status}'"
    )

    # 4. similarity = 0.47 -> insufficient_grounding (just below Tier 2 boundary)
    rag_47 = RAGService(db=db_session, retrieval_service=StubRetrieval(0.47))
    ctx_47 = rag_47.get_grounded_context("query")
    assert ctx_47.grounding_status == "insufficient_grounding", (
        f"Expected 'insufficient_grounding' at 0.47, got '{ctx_47.grounding_status}'"
    )

    # 5. empty retrieval -> insufficient_grounding
    rag_empty = RAGService(db=db_session, retrieval_service=StubRetrieval(None))
    ctx_empty = rag_empty.get_grounded_context("query")
    assert ctx_empty.grounding_status == "insufficient_grounding", (
        f"Expected 'insufficient_grounding' on empty retrieval, got '{ctx_empty.grounding_status}'"
    )


# =========================================================================
# 6. LLM SERVICE & STRICT ANTI-HALLUCINATION
# =========================================================================

def test_strict_anti_hallucination_system_prompt():
    assert "DO NOT invent" in SYSTEM_PROMPT
    assert "insufficient_grounding" in SYSTEM_PROMPT
    assert "verified" in SYSTEM_PROMPT.lower()


def test_mock_llm_provider_grounded_explanation():
    provider = MockLLMProvider()
    resp = provider.generate_json(
        prompt="COMPETENCY: Statistical Analysis\nMISCONCEPTION: Conflating Marginal Slope with Elasticity\nGROUNDING: grounded",
        schema_description="GroundedExplanation"
    )
    assert "INSUFFICIENT_GROUNDING" not in resp["diagnostic_synthesis"]
    assert "marginal" in resp["correct_mathematical_truth"].lower() or "absolute" in resp["correct_mathematical_truth"].lower()
    assert resp["grounding_status"] == "grounded"


def test_mock_llm_provider_insufficient_grounding_refusal():
    provider = MockLLMProvider()
    resp = provider.generate_json(
        prompt="COMPETENCY: Quantum Signals\nGROUNDING: insufficient_grounding\n[NO OFFICIAL EVIDENCE RETRIEVED",
        schema_description="GroundedExplanation"
    )
    assert resp["grounding_status"] == "insufficient_grounding"
    assert "INSUFFICIENT_GROUNDING" in resp["diagnostic_synthesis"]


def test_llm_service_generate_grounded_explanation(db_session: Session):
    llm_service = LLMService(provider=MockLLMProvider())
    comp = db_session.query(Competency).filter(Competency.id == "comp_stat_analysis").first()
    diag = db_session.query(GapDiagnosis).first()

    rag = RAGService(db=db_session)
    grounded_context = rag.get_grounded_context(
        query="linear regression slope coefficient marginal change in Y ceteris paribus",
        top_k=2,
    )

    res = llm_service.generate_grounded_explanation(comp, diag, grounded_context)
    assert res.competencyId == "comp_stat_analysis"
    assert res.groundingStatus in ("grounded", "weak_grounding")
    assert len(res.correctMathematicalTruth) > 0
    assert len(res.whatOfficerBelieves) > 0
    assert len(res.counterExample) > 0


def test_llm_service_analyze_misconception(db_session: Session):
    llm_service = LLMService(provider=MockLLMProvider())
    comp = db_session.query(Competency).filter(Competency.id == "comp_stat_analysis").first()
    diag = db_session.query(GapDiagnosis).first()
    misc = db_session.query(Misconception).filter(Misconception.id == "misc_p_val_01").first()

    rag = RAGService(db=db_session)
    context = rag.get_grounded_context(query="hypothesis testing p-value probability null hypothesis", top_k=2)

    res = llm_service.analyze_misconception(comp, misc, diag, context)
    assert res.misconceptionId == "misc_p_val_01"
    assert res.classification in ("confirmed", "rejected", "uncertain")
    assert res.confidence > 0.5


# =========================================================================
# 7. DOCUMENT INGESTION SERVICE TESTS
# =========================================================================

def test_document_ingestion_pipeline(tmp_path, db_session: Session):
    test_doc = tmp_path / "nssta_test_doc.md"
    test_doc.write_text(
        "# NSSTA Handbook of Statistical Sampling\n\n"
        "## Section 1: Stratification Principles\n"
        "Stratified sampling reduces variance when units within strata are homogeneous.",
        encoding="utf-8"
    )

    ingestion = DocumentIngestionService(db=db_session)
    doc = ingestion.ingest_file(
        file_path=str(test_doc),
        title="NSSTA Handbook of Statistical Sampling",
        authority="NSSTA",
        source="Official Curriculum: NSSTA",
    )

    assert doc.id is not None
    assert doc.status == "indexed"
    assert len(doc.chunks) >= 1

    # Ingesting same file again should return existing document (deduplication)
    doc_dup = ingestion.ingest_file(
        file_path=str(test_doc),
        title="NSSTA Handbook of Statistical Sampling Duplicate",
    )
    assert doc_dup.id == doc.id


# =========================================================================
# 8. API ENDPOINT & SECURITY TESTS
# =========================================================================

def test_api_explain_gap_authenticated(client: TestClient, auth_headers_officer_a):
    response = client.post(
        "/api/ai/explain/comp_stat_analysis",
        headers=auth_headers_officer_a,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["competencyId"] == "comp_stat_analysis"
    assert data["groundingStatus"] in ("grounded", "weak_grounding")
    assert len(data["correctMathematicalTruth"]) > 0
    assert len(data["whatOfficerBelieves"]) > 0
    assert "sources" in data


def test_api_explain_gap_unauthenticated(client: TestClient):
    response = client.post("/api/ai/explain/comp_stat_analysis")
    assert response.status_code == 401


def test_api_misconception_endpoint(client: TestClient, auth_headers_officer_a):
    response = client.post(
        "/api/ai/misconception/comp_stat_analysis",
        headers=auth_headers_officer_a,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["classification"] in ("confirmed", "rejected", "uncertain")
    assert "explanation" in data


def test_api_remediation_endpoint(client: TestClient, auth_headers_officer_a):
    response = client.post(
        "/api/ai/remediation/comp_stat_analysis",
        headers=auth_headers_officer_a,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["competencyId"] == "comp_stat_analysis"
    assert data["estimatedDurationMinutes"] == 15
    assert len(data["remediationAction"]) > 0


def test_api_list_knowledge_documents(client: TestClient, auth_headers_officer_a):
    response = client.get(
        "/api/ai/knowledge/documents",
        headers=auth_headers_officer_a,
    )
    assert response.status_code == 200
    docs = response.json()
    assert isinstance(docs, list)
    assert len(docs) >= 1
    assert docs[0]["id"] == "doc_sample_manual"
