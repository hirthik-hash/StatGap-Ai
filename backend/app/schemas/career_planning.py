"""Pydantic schemas for Career Progression & Future Role Planning — Phase 9.

Enables officers and supervisors to compare current officer competencies against
configured cadre progression benchmarks (e.g., JSO -> SSO -> Director), identifying
competency deltas, emerging skill requirements, and recommended training pathways.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TargetRoleSummary(BaseModel):
    """Summary of a target future role or cadre benchmark."""
    id: str
    role_name: str
    cadre: str
    description: Optional[str] = None
    required_competencies_count: int = 0
    emerging_skills: List[str] = Field(default_factory=list)
    is_active: bool = True


class CompetencyDeltaItem(BaseModel):
    """Competency comparison for career progression."""
    competency_id: str
    competency_name: str
    domain: str = "Statistical Operations"
    required_level: float
    current_level: float
    gap: float
    status: str  # "MET", "MODERATE_GAP", "CRITICAL_GAP"
    recommended_interventions: List[Dict[str, Any]] = Field(default_factory=list)


class CareerComparisonRequest(BaseModel):
    """Request payload for comparing an officer against a target future role."""
    officer_id: str
    target_role_id: str


class CareerComparisonResponse(BaseModel):
    """Full career progression analysis response."""
    officer_id: str
    officer_name: str
    current_designation: str
    current_cadre: str
    target_role_id: str
    target_role_name: str
    target_cadre: str
    target_description: Optional[str] = None
    overall_readiness_score: float  # 0.0 to 100.0%
    met_competencies_count: int
    total_required_competencies_count: int
    competency_deltas: List[CompetencyDeltaItem] = Field(default_factory=list)
    emerging_skills_required: List[str] = Field(default_factory=list)
    recommended_pathway: List[Dict[str, Any]] = Field(default_factory=list)
    disclaimer: str = (
        "Institutional Notice: Career progression analysis is an assumption-based institutional "
        "competency benchmarking tool for personal development planning. It does NOT constitute "
        "an official administrative promotion decision, seniority list, or service guarantee."
    )
