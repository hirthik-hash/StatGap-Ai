"""Pydantic schemas for diagnostic evaluations, reasoning traces, and knowledge graphs."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class ReasoningSignal(BaseModel):
    signal: str
    value: Any
    interpretation: str

    model_config = ConfigDict(populate_by_name=True)


class ReasoningTraceResponse(BaseModel):
    diagnosisType: str
    overallScore: int
    gapPoints: int
    severity: str
    signals: List[ReasoningSignal]
    conclusion: str
    hasPrerequisites: bool = False

    model_config = ConfigDict(populate_by_name=True)


class MisconceptionResponse(BaseModel):
    id: str
    title: str
    concept: str
    explanation: str
    detectionRule: str
    confidenceLevel: str
    counterExample: str
    remediationHint: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class DiagnosticEvaluationResponse(BaseModel):
    competencyId: str
    competencyName: str
    score: int
    requiredScore: int
    gapPoints: int
    status: str
    diagnosisType: str
    severity: str
    confidence: float
    explanation: str
    evidenceReferences: Optional[Dict[str, Any]] = None
    reasoningTrace: Optional[ReasoningTraceResponse] = None
    rootCauseCompetencyId: Optional[str] = None
    misconception: Optional[MisconceptionResponse] = None
    evaluatedAt: str

    model_config = ConfigDict(populate_by_name=True)


class DiagnosticHistoryItem(BaseModel):
    id: int
    competencyId: str
    diagnosisType: str
    severity: str
    confidence: float
    explanation: str
    evaluatedAt: str

    model_config = ConfigDict(populate_by_name=True)


class KnowledgeNodeResponse(BaseModel):
    id: str
    name: str
    category: str
    level: str
    description: Optional[str] = None
    competencyId: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class KnowledgeRelationshipResponse(BaseModel):
    id: int
    sourceNodeId: str
    targetNodeId: str
    relationshipType: str
    weight: float
    description: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
