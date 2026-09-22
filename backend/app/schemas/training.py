"""Pydantic schemas for Training Interventions & Recommendations — Phase 7."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProviderStatusSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider: str = Field(..., description="Provider code: igot, nssta, tpac")
    name: str = Field(..., description="Display name of provider")
    mode: str = Field(..., description="Operating mode: mock, real, catalogue")
    is_configured: bool = Field(..., description="Whether provider credentials/catalogues are active")
    description: str = Field(..., description="Summary of provider integration state")


class TrainingResourceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    provider: str
    external_reference_id: str
    title: str
    description: str
    competency_id: str
    subskills: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list)
    duration_hours: float
    delivery_mode: str
    difficulty_level: str
    programme_priority: str
    target_cadre: List[str] = Field(default_factory=list)
    syllabus_highlights: List[str] = Field(default_factory=list)
    status: str = "active"
    is_mock: bool = True
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class TrainingResourceResponse(TrainingResourceBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TrainingSyncResponse(BaseModel):
    status: str
    total_synced: int
    created_count: int
    updated_count: int
    providers: Dict[str, int]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    correlation_id: Optional[str] = None


class TrainingConstraintInput(BaseModel):
    max_duration_hours: Optional[float] = Field(default=None, ge=1.0, le=200.0)
    preferred_delivery_modes: Optional[List[str]] = Field(default=None)
    target_task_id: Optional[str] = Field(default=None, description="Optional Task Definition ID to prioritize bottlenecks")
    provider_filter: Optional[List[str]] = Field(default=None, description="Filter to specific providers: igot, nssta, tpac")
    max_recommendations: int = Field(default=5, ge=1, le=20)


class FactorScoreDetail(BaseModel):
    raw_score: float
    weight: float
    weighted_score: float
    explanation: str


class InterventionRecommendation(BaseModel):
    resource: TrainingResourceResponse
    score: float = Field(..., description="Composite optimizer score")
    reasons: List[str] = Field(..., description="Transparent, deterministic reasons for recommendation")
    addresses_priority_gap: bool = False
    aligned_competency_name: str = ""
    addresses_task_bottleneck: bool = False
    bottleneck_task_title: Optional[str] = None
    satisfies_prerequisites: bool = True
    missing_prerequisites: List[str] = Field(default_factory=list)
    fits_constraints: bool = True
    factor_breakdown: Dict[str, FactorScoreDetail] = Field(default_factory=dict)


class ExcludedIntervention(BaseModel):
    resource_id: str
    title: str
    provider: str
    exclusion_reason: str


class PersonalizedRecommendationsResponse(BaseModel):
    officer_id: str
    officer_igot_id: str
    officer_name: str
    cadre: str
    priority_gap_competency_id: Optional[str] = None
    priority_gap_competency_name: Optional[str] = None
    priority_gap_severity: Optional[str] = None
    priority_gap_value: Optional[float] = None
    active_bottleneck_task: Optional[str] = None
    active_bottleneck_task_title: Optional[str] = None
    recommendations: List[InterventionRecommendation]
    excluded_interventions: List[ExcludedIntervention] = Field(default_factory=list)
    total_candidates_evaluated: int
    providers_status: List[ProviderStatusSchema]
    optimizer_disclaimer: str = (
        "Recommendations are generated deterministically based on verified competency gaps, "
        "sub-skill alignment, task-readiness bottlenecks, prerequisite satisfaction, and configured constraints. "
        "No productivity or outcome percentages are claimed or fabricated."
    )
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)


class EnrollmentRequest(BaseModel):
    resource_id: str


class EnrollmentResponse(BaseModel):
    status: str
    resource_id: str
    provider: str
    message: str
    is_mock: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)
