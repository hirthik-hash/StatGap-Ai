"""Competency and CompetencyEvidence schemas."""
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CompetencyEvidenceResponse(BaseModel):
    id: int
    competencyId: str
    assessmentScore: float
    quizAccuracy: float
    practicalPerformance: float
    assessmentRatio: Optional[str] = None
    repeatedErrors: int = 0
    confidencePattern: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class CompetencyResponse(BaseModel):
    id: str
    name: str
    category: str
    score: int
    requiredScore: int
    gapPoints: int
    status: str
    description: Optional[str] = None
    evidence: Optional[CompetencyEvidenceResponse] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
