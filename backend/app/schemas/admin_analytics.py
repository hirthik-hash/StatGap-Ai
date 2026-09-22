"""Pydantic schemas for Supervisor and Admin Workforce Intelligence — Phase 8."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class WorkforceOverviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_officers: int
    total_competency_evaluations: int
    cadre_breakdown: Dict[str, int]
    gap_band_summary: Dict[str, int] = Field(
        ..., description="Counts for red (critical), orange (moderate), green (competent), insufficient_evidence"
    )
    average_mastery_level: float
    verification_rate: float = Field(..., description="Percentage of competencies independently verified")
    retention_at_risk_count: int
    top_workforce_gaps: List[Dict[str, Any]]
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)


class HeatmapCell(BaseModel):
    cadre: str
    competency_id: str
    competency_name: str
    average_score: Optional[float] = None
    required_level: float = 0.75
    gap_band: str = Field(..., description="red, orange, green, or insufficient_evidence")
    officer_count: int = 0


class HeatmapMatrixResponse(BaseModel):
    cadres: List[str]
    competencies: List[Dict[str, str]]
    cells: List[HeatmapCell]
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)


class GapDistributionItem(BaseModel):
    competency_id: str
    competency_name: str
    category: str
    red_count: int
    orange_count: int
    green_count: int
    insufficient_evidence_count: int
    total_evaluated: int


class TaskReadinessAnalyticsItem(BaseModel):
    task_id: str
    task_name: str
    category: str
    ready_count: int
    partially_ready_count: int
    not_ready_count: int
    insufficient_evidence_count: int
    total_officers: int
    primary_bottleneck_competency_id: Optional[str] = None
    primary_bottleneck_competency_name: Optional[str] = None
    affected_officer_count: int = 0


class TrainingDemandRollupItem(BaseModel):
    competency_id: str
    competency_name: str
    officers_with_gap: int
    task_bottleneck_occurrences: int
    demand_priority: str  # URGENT, HIGH, MODERATE, STANDARD
    available_resources_count: int
    provider_breakdown: Dict[str, int]  # igot, nssta, tpac
    recommended_programmes: List[str] = Field(default_factory=list)


class TrainingEffectivenessResponse(BaseModel):
    status: str = Field(..., description="'evaluated' or 'insufficient_longitudinal_data'")
    data_sufficiency_note: str
    total_longitudinal_pairs: int
    competency_outcomes: List[Dict[str, Any]] = Field(default_factory=list)
    disclaimer: str = (
        "Training effectiveness is strictly evaluated from verified longitudinal pre/post observations. "
        "No speculative productivity improvements or outcome percentages are fabricated."
    )
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)


class FutureRoleComparisonItem(BaseModel):
    role_id: str
    role_name: str
    cadre: str
    description: Optional[str] = None
    target_officers_count: int
    competency_readiness_gaps: List[Dict[str, Any]]
    emerging_skills: List[str] = Field(default_factory=list)
    is_assumption_based: bool = True
    note: str = "Configured future-role benchmark (Assumption-based institutional policy standard)"


class CapacityBuildingPriorityItem(BaseModel):
    competency_id: str
    competency_name: str
    priority_rank: int
    priority_score: float
    gap_severity_factor: float
    affected_officers_count: int
    task_bottleneck_impact: bool
    available_interventions_count: int
    rationale: str


class SupervisorTeamMemberSummary(BaseModel):
    officer_id: str
    name: str
    cadre: str
    department: str
    priority_gap_name: Optional[str] = None
    priority_gap_band: Optional[str] = None
    task_readiness_status: Optional[str] = None
    refresh_risk_status: Optional[str] = None
    recommended_interventions_count: int = 0


class SupervisorAnalyticsOverview(BaseModel):
    supervisor_id: str
    supervisor_name: str
    team_size: int
    department: str
    team_gap_bands: Dict[str, int]
    top_team_bottlenecks: List[Dict[str, Any]]
    team_training_demand: List[TrainingDemandRollupItem]
    team_members: List[SupervisorTeamMemberSummary]
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
