from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


# ----------------------------------------------------
# Verification Schemas
# ----------------------------------------------------
class PracticalVerificationCreate(BaseModel):
    competency_id: str
    practical_type: str = Field(
        ...,
        description="dataset_audit, field_survey_audit, code_review, or practical_exercise",
    )
    practical_score: float = Field(..., ge=0.0, le=100.0)
    evaluator_notes: Optional[str] = None
    evidence_data: Optional[Dict[str, Any]] = None


class PracticalVerificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    officer_id: int
    competency_id: str
    practical_type: str
    practical_score: float
    passed: bool
    evaluator_notes: Optional[str] = None
    evidence_data: Dict[str, Any] = {}
    verified_at: datetime
    created_at: datetime


class VerificationEvaluationRequest(BaseModel):
    competency_id: str
    assessment_session_id: Optional[str] = None
    override_independent_score: Optional[float] = None
    verification_notes: Optional[str] = None


class CompetencyVerificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    officer_id: int
    competency_id: str
    verification_status: str
    independent_score: Optional[float] = None
    practical_score: Optional[float] = None
    composite_score: Optional[float] = None
    assessment_session_id: Optional[str] = None
    verified_at: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    criteria_details: Dict[str, Any] = {}
    verification_notes: Optional[str] = None
    is_current: bool = True
    created_at: datetime
    updated_at: datetime


# ----------------------------------------------------
# Retention Schemas
# ----------------------------------------------------
class KnowledgeRetentionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    officer_id: int
    competency_id: str
    baseline_retention: float
    stability_days: float
    calculated_retention: float
    risk_level: str
    last_evaluated_at: datetime
    days_since_last_interaction: int
    decay_parameters: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime


class RetentionEvaluateRequest(BaseModel):
    competency_id: str
    days_elapsed: Optional[int] = None
    stability_days: Optional[float] = None


# ----------------------------------------------------
# Refresh Recommendations Schemas
# ----------------------------------------------------
class RefreshRecommendationCreate(BaseModel):
    competency_id: str
    trigger_reason: str = "retention_decay"
    priority: str = "medium"


class RefreshRecommendationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    officer_id: int
    competency_id: str
    trigger_reason: str
    priority: str
    status: str
    recommended_modules: List[Dict[str, Any]] = []
    reassessment_session_id: Optional[str] = None
    triggered_at: datetime
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ReassessmentProcessRequest(BaseModel):
    competency_id: str
    recommendation_id: Optional[str] = None
    assessment_session_id: Optional[str] = None
    override_independent_score: Optional[float] = None


class ReassessmentResultResponse(BaseModel):
    reassessment_passed: bool
    status: str
    composite_score: Optional[float] = None
    criteria_details: Dict[str, Any] = {}


# ----------------------------------------------------
# Audit Event Schemas
# ----------------------------------------------------
class CompetencyAuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    officer_id: int
    competency_id: Optional[str] = None
    event_type: str
    actor: str
    event_data: Dict[str, Any] = {}
    timestamp: datetime
