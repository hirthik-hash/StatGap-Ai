"""Diagnostic Gap Engine API endpoints."""
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.gap_diagnosis import GapDiagnosis
from backend.app.repositories.competency_repository import CompetencyRepository
from backend.app.repositories.knowledge_graph_repository import KnowledgeGraphRepository
from backend.app.services.diagnosis_service import GapDiagnosisService
from backend.app.services.evaluation_service import CompetencyEvaluationService
from backend.app.schemas.diagnostic import (
    DiagnosticEvaluationResponse,
    DiagnosticHistoryItem,
    ReasoningTraceResponse,
    MisconceptionResponse,
    KnowledgeNodeResponse,
    KnowledgeRelationshipResponse,
)

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics & Knowledge Graph"])


def _format_diagnosis_response(
    diagnosis: GapDiagnosis, competency_name: str
) -> DiagnosticEvaluationResponse:
    ev_refs = json.loads(diagnosis.evidence_references) if diagnosis.evidence_references else {}
    trace_raw = json.loads(diagnosis.reasoning_trace) if diagnosis.reasoning_trace else {}

    reasoning_trace: Optional[ReasoningTraceResponse] = None
    if trace_raw:
        reasoning_trace = ReasoningTraceResponse(
            diagnosisType=trace_raw.get("diagnosis_type", diagnosis.diagnosis_type),
            overallScore=int(trace_raw.get("overall_score", 0)),
            gapPoints=int(trace_raw.get("gap_points", 0)),
            severity=trace_raw.get("severity", diagnosis.severity),
            signals=trace_raw.get("signals", []),
            conclusion=trace_raw.get("conclusion", ""),
            hasPrerequisites=trace_raw.get("has_prerequisites", False),
        )

    misc_res: Optional[MisconceptionResponse] = None
    if diagnosis.misconception:
        misc_res = MisconceptionResponse(
            id=diagnosis.misconception.id,
            title=diagnosis.misconception.title,
            concept=diagnosis.misconception.concept,
            explanation=diagnosis.misconception.explanation,
            detectionRule=diagnosis.misconception.detection_rule,
            confidenceLevel=diagnosis.misconception.confidence_level,
            counterExample=diagnosis.misconception.counter_example,
            remediationHint=diagnosis.misconception.remediation_hint,
        )

    return DiagnosticEvaluationResponse(
        competencyId=diagnosis.competency_id,
        competencyName=competency_name,
        score=reasoning_trace.overallScore if reasoning_trace else 0,
        requiredScore=75,
        gapPoints=reasoning_trace.gapPoints if reasoning_trace else 0,
        status=diagnosis.severity,
        diagnosisType=diagnosis.diagnosis_type,
        severity=diagnosis.severity,
        confidence=diagnosis.confidence,
        explanation=diagnosis.explanation,
        evidenceReferences=ev_refs,
        reasoningTrace=reasoning_trace,
        rootCauseCompetencyId=diagnosis.root_cause_competency_id,
        misconception=misc_res,
        evaluatedAt=diagnosis.created_at.isoformat() if diagnosis.created_at else "",
    )


@router.get(
    "/competencies",
    response_model=List[DiagnosticEvaluationResponse],
    status_code=status.HTTP_200_OK,
    summary="Get evaluated competency diagnostics for authenticated officer",
)
def get_officer_diagnostics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[DiagnosticEvaluationResponse]:
    """
    Evaluates each competency for the authenticated officer and returns
    full diagnostic classifications, scores, and reasoning traces.
    """
    comp_repo = CompetencyRepository(db)
    diag_service = GapDiagnosisService(db)
    competencies = comp_repo.list_all()

    results: List[DiagnosticEvaluationResponse] = []
    for comp in competencies:
        diagnosis = diag_service.diagnose_competency(current_user, comp, persist=True)
        results.append(_format_diagnosis_response(diagnosis, comp.name))

    return results


@router.get(
    "/competencies/{competency_id}",
    response_model=DiagnosticEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get diagnosis and reasoning trace for a specific competency",
)
def get_competency_diagnosis(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DiagnosticEvaluationResponse:
    """Retrieves or executes diagnosis for a single competency."""
    comp_repo = CompetencyRepository(db)
    comp = comp_repo.get_by_id(competency_id)
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competency with ID '{competency_id}' not found",
        )

    diag_service = GapDiagnosisService(db)
    diagnosis = diag_service.diagnose_competency(current_user, comp, persist=True)
    return _format_diagnosis_response(diagnosis, comp.name)


@router.post(
    "/competencies/{competency_id}/evaluate",
    response_model=DiagnosticEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Recalculate and persist fresh competency diagnosis",
)
def evaluate_competency(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DiagnosticEvaluationResponse:
    """Forces a fresh calculation of competency diagnosis from latest evidence."""
    comp_repo = CompetencyRepository(db)
    comp = comp_repo.get_by_id(competency_id)
    if not comp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competency with ID '{competency_id}' not found",
        )

    diag_service = GapDiagnosisService(db)
    diagnosis = diag_service.diagnose_competency(current_user, comp, persist=True)
    return _format_diagnosis_response(diagnosis, comp.name)


@router.get(
    "/competencies/{competency_id}/history",
    response_model=List[DiagnosticHistoryItem],
    status_code=status.HTTP_200_OK,
    summary="Get historical diagnostic audit trail for a competency",
)
def get_diagnosis_history(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[DiagnosticHistoryItem]:
    """Returns chronological previous evaluations for the officer."""
    if not current_user.profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Officer profile not found")

    kg_repo = KnowledgeGraphRepository(db)
    diagnoses = kg_repo.get_diagnosis_history(current_user.profile.id, competency_id)

    return [
        DiagnosticHistoryItem(
            id=d.id,
            competencyId=d.competency_id,
            diagnosisType=d.diagnosis_type,
            severity=d.severity,
            confidence=d.confidence,
            explanation=d.explanation,
            evaluatedAt=d.created_at.isoformat() if d.created_at else "",
        )
        for d in diagnoses
    ]


@router.get(
    "/knowledge-graph/nodes",
    response_model=List[KnowledgeNodeResponse],
    status_code=status.HTTP_200_OK,
    summary="List all concept nodes in statistical knowledge graph",
)
def list_graph_nodes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[KnowledgeNodeResponse]:
    """Returns knowledge graph concept nodes."""
    kg_repo = KnowledgeGraphRepository(db)
    nodes = kg_repo.list_nodes()
    return [
        KnowledgeNodeResponse(
            id=n.id,
            name=n.name,
            category=n.category,
            level=n.level,
            description=n.description,
            competencyId=n.competency_id,
        )
        for n in nodes
    ]


@router.get(
    "/knowledge-graph/relationships",
    response_model=List[KnowledgeRelationshipResponse],
    status_code=status.HTTP_200_OK,
    summary="List all relationships in statistical knowledge graph",
)
def list_graph_relationships(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[KnowledgeRelationshipResponse]:
    """Returns knowledge graph concept relationships."""
    kg_repo = KnowledgeGraphRepository(db)
    rels = kg_repo.list_relationships()
    return [
        KnowledgeRelationshipResponse(
            id=r.id,
            sourceNodeId=r.source_node_id,
            targetNodeId=r.target_node_id,
            relationshipType=r.relationship_type,
            weight=r.weight,
            description=r.description,
        )
        for r in rels
    ]
