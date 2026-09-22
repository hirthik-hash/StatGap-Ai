"""Normalized internal data contracts for iGOT Karmayogi integration.

STAT-GAP core operates on normalized data representations rather than raw external payloads.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class IGOTSyncStatus(str, Enum):
    PENDING = "pending"
    SYNCED = "synced"
    FAILED = "failed"
    NOT_CONFIGURED = "not_configured"


class IGOTLearningRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    source_system: str = Field(default="mock_igot", description="Source identifier (e.g. mock_igot or igot)")
    external_reference_id: str = Field(..., description="Unique course/learning completion ID in external system")
    officer_igot_id: str = Field(..., description="Government officer iGOT ID (e.g. IGOT202600123)")
    course_id: str = Field(..., description="External course catalog identifier")
    course_title: str = Field(..., description="Title of the completed course")
    competency_hint: Optional[str] = Field(default=None, description="Suggested competency tag")
    completion_status: str = Field(default="completed", description="Status in external system")
    score: float = Field(..., ge=0.0, le=100.0, description="Course evaluation score (0-100)")
    completion_date: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class IGOTCourseCompletion(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    external_reference_id: str
    course_id: str
    officer_igot_id: str
    completion_date: datetime
    score: float
    verified: bool = False


class IGOTCompetencyExport(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    officer_igot_id: str
    competency_id: str
    competency_name: str
    verification_status: str
    composite_score: float
    verified_at: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    correlation_id: Optional[str] = None


class IGOTSyncResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: IGOTSyncStatus
    operation: str = Field(..., description="e.g. import_learning_records or export_competency_verification")
    external_reference: Optional[str] = None
    local_reference: str = Field(..., description="Local internal record identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    error_code: Optional[str] = None
    message: str = Field(..., description="Human-readable result summary")
    correlation_id: Optional[str] = None
