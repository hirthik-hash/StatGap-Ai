"""Competency endpoints: list, detail, and evidence."""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.schemas.competency import CompetencyResponse, CompetencyEvidenceResponse
from backend.app.services.competency_service import CompetencyService

router = APIRouter(prefix="/competencies", tags=["Competencies"])


@router.get(
    "",
    response_model=List[CompetencyResponse],
    status_code=status.HTTP_200_OK,
    summary="List all statutory competencies for authenticated officer",
)
def list_competencies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[CompetencyResponse]:
    """Retrieves all competencies with officer's persisted evaluation evidence."""
    service = CompetencyService(db)
    return service.list_competencies_for_officer(current_user)


@router.get(
    "/ontology/hierarchy",
    status_code=status.HTTP_200_OK,
    summary="Get canonical 4-level competency hierarchy (Cadre -> Function -> Competency -> Sub-skill)",
)
def get_ontology_hierarchy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from backend.app.repositories.competency_graph_repository import CompetencyGraphRepository
    repo = CompetencyGraphRepository(db)
    return repo.get_full_ontology_hierarchy()


@router.get(
    "/{competency_id}",
    response_model=CompetencyResponse,
    status_code=status.HTTP_200_OK,
    summary="Get single competency detail by identifier",
)
def get_competency(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompetencyResponse:
    """Retrieves specific competency details and attached evidence."""
    service = CompetencyService(db)
    return service.get_competency_for_officer(competency_id, current_user)


@router.get(
    "/{competency_id}/evidence",
    response_model=CompetencyEvidenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get evidence breakdown for specific competency",
)
def get_competency_evidence(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompetencyEvidenceResponse:
    """Retrieves evidence breakdown (quiz accuracy, practical, ratio, errors) for an officer."""
    service = CompetencyService(db)
    return service.get_evidence_for_officer(competency_id, current_user)


@router.get(
    "/{competency_id}/children",
    status_code=status.HTTP_200_OK,
    summary="Get sub-skills or children for a target competency",
)
def get_competency_children(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from backend.app.repositories.competency_graph_repository import CompetencyGraphRepository
    repo = CompetencyGraphRepository(db)
    children = repo.get_children(competency_id)
    return [
        {
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "description": c.description,
            "level": c.level,
            "ontologyLevel": c.ontology_level,
            "domain": c.domain,
            "requiredProficiency": c.required_proficiency,
            "version": c.version,
            "parentId": c.parent_id,
            "parent_id": c.parent_id,
        }
        for c in children
    ]


@router.get(
    "/{competency_id}/dependencies",
    status_code=status.HTTP_200_OK,
    summary="Get prerequisites and outgoing dependencies for a competency",
)
def get_competency_dependencies(
    competency_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from backend.app.repositories.competency_graph_repository import CompetencyGraphRepository
    repo = CompetencyGraphRepository(db)
    return {
        "competencyId": competency_id,
        "prerequisites": repo.get_prerequisites(competency_id),
        "dependencies": repo.get_dependencies(competency_id),
    }

