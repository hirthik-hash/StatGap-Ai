"""AI Endpoints: Grounded RAG explanation, misconception verification, and remediation."""
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.knowledge_document import KnowledgeDocument
from backend.app.repositories.competency_repository import CompetencyRepository
from backend.app.repositories.knowledge_graph_repository import KnowledgeGraphRepository
from backend.app.services.diagnosis_service import GapDiagnosisService
from backend.app.services.rag_service import RAGService
from backend.app.services.llm_service import LLMService
from backend.app.schemas.ai import (
    GroundedExplanationResponse,
    MisconceptionAnalysisResponse,
    RemediationResponse,
    RetrievedSourceItem,
)

router = APIRouter(prefix="/ai", tags=["AI & Grounded RAG Intelligence"])


@router.post(
    "/explain/{competency_id}",
    response_model=GroundedExplanationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get grounded RAG and LLM explanation for an officer's competency diagnosis",
)
def get_grounded_ai_explanation(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GroundedExplanationResponse:
    """
    Synthesizes deterministic diagnostic signals, knowledge graph concepts,
    and retrieved official curriculum materials to generate an explainable,
    hallucination-free root cause diagnosis.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer profile not found for authenticated user",
        )

    comp_repo = CompetencyRepository(db)
    comp = comp_repo.get_by_id(competency_id)
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competency with ID '{competency_id}' not found",
        )

    diag_service = GapDiagnosisService(db)
    diagnosis = diag_service.diagnose_competency(current_user, comp, persist=True)

    kg_repo = KnowledgeGraphRepository(db)
    misconception = None
    if diagnosis.misconception_id:
        misconception = kg_repo.get_misconception_by_id(diagnosis.misconception_id)

    rag_service = RAGService(db)
    query = rag_service.build_diagnostic_query(comp, diagnosis, misconception)
    grounded_context = rag_service.get_grounded_context(
        query=query,
        top_k=4,
        filters={"competency_id": comp.id},
    )

    llm_service = LLMService()
    explanation_res = llm_service.generate_grounded_explanation(comp, diagnosis, grounded_context)

    # Persist AI provenance fields back to diagnosis record
    try:
        diagnosis.ai_analysis = explanation_res.diagnosticSynthesis
        diagnosis.ai_confidence = explanation_res.aiConfidence
        diagnosis.grounding_status = explanation_res.groundingStatus
        diagnosis.retrieved_sources = json.dumps([s.model_dump() for s in explanation_res.sources])
        diagnosis.llm_model = explanation_res.llmModel
        diagnosis.prompt_version = explanation_res.promptVersion
        db.commit()
    except Exception:
        db.rollback()

    return explanation_res


@router.post(
    "/misconception/{competency_id}",
    response_model=MisconceptionAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate and analyze candidate statistical misconception using grounded curriculum RAG",
)
def analyze_misconception_grounding(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MisconceptionAnalysisResponse:
    """
    Validates candidate cognitive distortion against official statistical definitions.
    Classifies strictly into 'confirmed', 'rejected', or 'uncertain'.
    """
    profile = current_user.profile
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")

    comp_repo = CompetencyRepository(db)
    comp = comp_repo.get_by_id(competency_id)
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competency not found")

    diag_service = GapDiagnosisService(db)
    diagnosis = diag_service.diagnose_competency(current_user, comp, persist=False)

    kg_repo = KnowledgeGraphRepository(db)
    misc = None
    if diagnosis.misconception_id:
        misc = kg_repo.get_misconception_by_id(diagnosis.misconception_id)
    if not misc:
        miscs = kg_repo.list_misconceptions()
        misc = miscs[0] if miscs else None

    if not misc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No misconception catalog available")

    rag_service = RAGService(db)
    query = rag_service.build_diagnostic_query(comp, diagnosis, misc)
    grounded_context = rag_service.get_grounded_context(query, top_k=4)

    llm_service = LLMService()
    return llm_service.analyze_misconception(comp, misc, diagnosis, grounded_context)


@router.post(
    "/remediation/{competency_id}",
    response_model=RemediationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate targeted micro-learning remediation based on verified curriculum",
)
def get_grounded_remediation(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RemediationResponse:
    """Generates targeted remediation recommendations and counter-examples."""
    comp_repo = CompetencyRepository(db)
    comp = comp_repo.get_by_id(competency_id)
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competency not found")

    diag_service = GapDiagnosisService(db)
    diagnosis = diag_service.diagnose_competency(current_user, comp, persist=False)

    kg_repo = KnowledgeGraphRepository(db)
    misc = None
    if diagnosis.misconception_id:
        misc = kg_repo.get_misconception_by_id(diagnosis.misconception_id)

    rag_service = RAGService(db)
    query = f"{comp.name} remediation counter-example official guidelines"
    grounded_context = rag_service.get_grounded_context(query, top_k=3)

    sources_res = [
        RetrievedSourceItem(
            chunkId=s.chunk_id,
            documentId=s.document_id,
            documentTitle=s.document_title,
            pageNumber=s.page_number,
            section=s.section,
            source=s.source,
            authority=s.authority,
            similarityScore=s.similarity_score,
            textSnippet=s.text[:180],
        )
        for s in grounded_context.sources
    ]

    counter_ex = misc.counter_example if misc else "Consult statutory sampling guidelines before estimation."
    remediation_hint = misc.remediation_hint if misc else "Targeted 15-minute official statistics refresher."

    return RemediationResponse(
        competencyId=comp.id,
        competencyName=comp.name,
        remediationAction=remediation_hint,
        counterExample=counter_ex,
        curriculumModule="NSSTA Official Statistics Refresher Pathway",
        estimatedDurationMinutes=15,
        sources=sources_res,
        groundingStatus=grounded_context.grounding_status,
    )


@router.get(
    "/knowledge/documents",
    status_code=status.HTTP_200_OK,
    summary="List official curriculum documents indexed in vector repository",
)
def list_knowledge_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns list of indexed official knowledge documents (metadata only)."""
    docs = db.query(KnowledgeDocument).all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "filename": d.filename,
            "documentType": d.document_type,
            "authority": d.authority,
            "source": d.source,
            "version": d.version,
            "status": d.status,
            "chunksCount": len(d.chunks),
            "createdAt": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]
