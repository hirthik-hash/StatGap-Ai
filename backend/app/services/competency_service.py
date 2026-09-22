"""Competency and CompetencyEvidence business service."""
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence
from backend.app.repositories.competency_repository import CompetencyRepository
from backend.app.schemas.competency import CompetencyResponse, CompetencyEvidenceResponse


class CompetencyService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CompetencyRepository(db)

    @staticmethod
    def to_evidence_response(evidence: Optional[CompetencyEvidence]) -> Optional[CompetencyEvidenceResponse]:
        if not evidence:
            return None
        return CompetencyEvidenceResponse(
            id=evidence.id,
            competencyId=evidence.competency_id,
            assessmentScore=evidence.assessment_score,
            quizAccuracy=evidence.quiz_accuracy,
            practicalPerformance=evidence.practical_performance,
            assessmentRatio=evidence.assessment_ratio,
            repeatedErrors=evidence.repeated_errors,
            confidencePattern=evidence.confidence_pattern,
        )

    def to_competency_response(
        self, comp: Competency, evidence: Optional[CompetencyEvidence] = None
    ) -> CompetencyResponse:
        return CompetencyResponse(
            id=comp.id,
            name=comp.name,
            category=comp.category,
            score=comp.score,
            requiredScore=comp.required_score,
            gapPoints=comp.gap_points,
            status=comp.status,
            description=comp.description,
            evidence=self.to_evidence_response(evidence),
        )

    def list_competencies_for_officer(self, user: User) -> List[CompetencyResponse]:
        competencies = self.repo.list_all()
        profile_id = user.profile.id if user.profile else None

        evidences_map = {}
        if profile_id:
            evidences = self.repo.list_evidences_for_officer(profile_id)
            evidences_map = {ev.competency_id: ev for ev in evidences}

        return [
            self.to_competency_response(c, evidences_map.get(c.id))
            for c in competencies
        ]

    def get_competency_for_officer(self, competency_id: str, user: User) -> CompetencyResponse:
        comp = self.repo.get_by_id(competency_id)
        if not comp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Competency with ID '{competency_id}' not found",
            )
        profile_id = user.profile.id if user.profile else None
        evidence = None
        if profile_id:
            evidence = self.repo.get_evidence_for_officer(profile_id, competency_id)

        return self.to_competency_response(comp, evidence)

    def get_evidence_for_officer(self, competency_id: str, user: User) -> CompetencyEvidenceResponse:
        comp = self.repo.get_by_id(competency_id)
        if not comp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Competency with ID '{competency_id}' not found",
            )

        if not user.profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Officer profile not found",
            )

        evidence = self.repo.get_evidence_for_officer(user.profile.id, competency_id)
        if not evidence:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No competency evidence recorded for '{competency_id}'",
            )

        return self.to_evidence_response(evidence)
