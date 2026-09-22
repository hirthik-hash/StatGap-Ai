"""Competency and CompetencyEvidence database repository."""
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.competency import Competency
from backend.app.models.competency_evidence import CompetencyEvidence


class CompetencyRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_all(self) -> List[Competency]:
        return self.db.query(Competency).order_by(Competency.id).all()

    def get_by_id(self, competency_id: str) -> Optional[Competency]:
        return self.db.query(Competency).filter(Competency.id == competency_id).first()

    def get_evidence_for_officer(
        self, profile_id: int, competency_id: str
    ) -> Optional[CompetencyEvidence]:
        return (
            self.db.query(CompetencyEvidence)
            .filter(
                CompetencyEvidence.officer_profile_id == profile_id,
                CompetencyEvidence.competency_id == competency_id,
            )
            .first()
        )

    def list_evidences_for_officer(self, profile_id: int) -> List[CompetencyEvidence]:
        return (
            self.db.query(CompetencyEvidence)
            .filter(CompetencyEvidence.officer_profile_id == profile_id)
            .all()
        )
