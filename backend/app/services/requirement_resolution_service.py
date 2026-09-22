"""Requirement resolution service determining required competency levels per officer context."""
from typing import Dict, Optional
from sqlalchemy.orm import Session
from backend.app.models.officer_profile import OfficerProfile
from backend.app.models.competency_requirement import CompetencyRequirement
from backend.app.models.knowledge_graph import CompetencyNode


class RequirementResolutionService:
    def __init__(self, db: Session):
        self.db = db

    def resolve_required_level(
        self,
        profile: OfficerProfile,
        competency_id: str,
        role: Optional[str] = "OFFICER",
    ) -> float:
        """
        Determines deterministic required competency proficiency for an officer.
        Matches hierarchical scopes with priority ranking:
        1. Exact current assignment match (highest priority, priority=4)
        2. Department / Function match (priority=3)
        3. Cadre match (priority=2)
        4. Role match (priority=1)
        5. CompetencyNode default requirement or fallback 0.75
        """
        # Query matching requirements for this competency
        query = self.db.query(CompetencyRequirement).filter(
            CompetencyRequirement.competency_id == competency_id
        )

        candidates = query.all()
        best_match: Optional[CompetencyRequirement] = None
        best_score = -1

        cadre = (getattr(profile, "cadre", None) or "ISS").strip().upper()
        curr_assign = (getattr(profile, "current_assignment", None) or "").strip().lower()
        dept = (getattr(profile, "department", None) or "").strip().lower()
        desig = (getattr(profile, "designation", None) or "").strip().lower()
        role_upper = (role or "OFFICER").strip().upper()

        for req in candidates:
            score = 0
            # Check assignment
            if req.current_assignment:
                if req.current_assignment.strip().lower() in curr_assign:
                    score += 40
                else:
                    continue  # Specific requirement didn't match

            # Check function / department
            if req.function_name:
                if req.function_name.strip().lower() in dept:
                    score += 30
                else:
                    continue

            # Check cadre
            if req.cadre:
                if req.cadre.strip().upper() == cadre:
                    score += 20
                else:
                    continue

            # Check role
            if req.role:
                if req.role.strip().upper() == role_upper:
                    score += 10
                else:
                    continue

            # Add baseline priority
            score += req.priority

            if score > best_score:
                best_score = score
                best_match = req

        if best_match is not None:
            return round(best_match.required_level, 4)

        # Fall back to CompetencyNode's required_proficiency if defined
        node = self.db.query(CompetencyNode).filter(CompetencyNode.id == competency_id).first()
        if node and node.required_proficiency:
            return round(node.required_proficiency, 4)

        return 0.75

    def resolve_all_requirements(
        self,
        profile: OfficerProfile,
        role: Optional[str] = "OFFICER",
    ) -> Dict[str, float]:
        """Resolves required proficiency for all known competencies."""
        from backend.app.models.competency import Competency
        all_comps = self.db.query(Competency).all()
        return {
            c.id: self.resolve_required_level(profile, c.id, role)
            for c in all_comps
        }
