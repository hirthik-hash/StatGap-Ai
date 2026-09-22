"""Knowledge Graph and Diagnostics database repository."""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from backend.app.models.knowledge_graph import CompetencyNode, CompetencyRelationship
from backend.app.models.misconception import Misconception
from backend.app.models.gap_diagnosis import GapDiagnosis


class KnowledgeGraphRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_nodes(self) -> List[CompetencyNode]:
        return self.db.query(CompetencyNode).filter(CompetencyNode.active == True).all()

    def get_node_by_id(self, node_id: str) -> Optional[CompetencyNode]:
        return self.db.query(CompetencyNode).filter(CompetencyNode.id == node_id).first()

    def get_nodes_by_competency_id(self, competency_id: str) -> List[CompetencyNode]:
        return (
            self.db.query(CompetencyNode)
            .filter(CompetencyNode.competency_id == competency_id, CompetencyNode.active == True)
            .all()
        )

    def list_relationships(self) -> List[CompetencyRelationship]:
        return self.db.query(CompetencyRelationship).all()

    def get_prerequisites_for_node(self, node_id: str) -> List[CompetencyRelationship]:
        """Returns relationships where target_node_id == node_id and type in ('prerequisite', 'depends_on')."""
        return (
            self.db.query(CompetencyRelationship)
            .options(joinedload(CompetencyRelationship.source_node))
            .filter(
                CompetencyRelationship.target_node_id == node_id,
                CompetencyRelationship.relationship_type.in_(["prerequisite", "depends_on"]),
            )
            .all()
        )

    def get_outgoing_relationships(self, node_id: str) -> List[CompetencyRelationship]:
        return (
            self.db.query(CompetencyRelationship)
            .options(joinedload(CompetencyRelationship.target_node))
            .filter(CompetencyRelationship.source_node_id == node_id)
            .all()
        )

    def list_misconceptions(self) -> List[Misconception]:
        return self.db.query(Misconception).all()

    def get_misconception_by_id(self, misc_id: str) -> Optional[Misconception]:
        return self.db.query(Misconception).filter(Misconception.id == misc_id).first()

    def save_diagnosis(self, diagnosis: GapDiagnosis) -> GapDiagnosis:
        self.db.add(diagnosis)
        self.db.commit()
        self.db.refresh(diagnosis)
        return diagnosis

    def get_latest_diagnosis(self, profile_id: int, competency_id: str) -> Optional[GapDiagnosis]:
        return (
            self.db.query(GapDiagnosis)
            .options(joinedload(GapDiagnosis.misconception))
            .filter(
                GapDiagnosis.officer_profile_id == profile_id,
                GapDiagnosis.competency_id == competency_id,
            )
            .order_by(GapDiagnosis.created_at.desc())
            .first()
        )

    def list_diagnoses_for_officer(self, profile_id: int) -> List[GapDiagnosis]:
        return (
            self.db.query(GapDiagnosis)
            .options(joinedload(GapDiagnosis.misconception))
            .filter(GapDiagnosis.officer_profile_id == profile_id)
            .order_by(GapDiagnosis.created_at.desc())
            .all()
        )

    def get_diagnosis_history(self, profile_id: int, competency_id: str) -> List[GapDiagnosis]:
        return (
            self.db.query(GapDiagnosis)
            .options(joinedload(GapDiagnosis.misconception))
            .filter(
                GapDiagnosis.officer_profile_id == profile_id,
                GapDiagnosis.competency_id == competency_id,
            )
            .order_by(GapDiagnosis.created_at.desc())
            .all()
        )
