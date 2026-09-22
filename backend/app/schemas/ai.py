"""Pydantic schemas for AI grounded diagnostic responses, citations, and misconception analysis."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class RetrievedSourceItem(BaseModel):
    chunkId: str
    documentId: str
    documentTitle: str
    pageNumber: Optional[int] = None
    section: Optional[str] = None
    source: str
    authority: str
    similarityScore: float
    textSnippet: str

    model_config = ConfigDict(populate_by_name=True)


class GroundedContextResponse(BaseModel):
    query: str
    groundingStatus: str  # grounded, weak_grounding, insufficient_grounding
    sources: List[RetrievedSourceItem] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class MisconceptionAnalysisResponse(BaseModel):
    misconceptionId: str
    classification: str  # confirmed, rejected, uncertain
    confidence: float
    claim: str
    evidence: List[RetrievedSourceItem] = Field(default_factory=list)
    explanation: str
    counterExample: str
    remediation: str
    groundingStatus: str

    model_config = ConfigDict(populate_by_name=True)


class GroundedExplanationResponse(BaseModel):
    competencyId: str
    competencyName: str
    diagnosisType: str
    diagnosticConfidence: float
    aiConfidence: float
    groundingStatus: str  # grounded, weak_grounding, insufficient_grounding
    diagnosticSynthesis: str
    whatOfficerBelieves: str
    correctMathematicalTruth: str
    counterExample: str
    remediationPathway: str
    reasoningTrace: List[str] = Field(default_factory=list)
    sources: List[RetrievedSourceItem] = Field(default_factory=list)
    llmModel: str
    promptVersion: str
    evaluatedAt: str

    model_config = ConfigDict(populate_by_name=True)


class RemediationResponse(BaseModel):
    competencyId: str
    competencyName: str
    remediationAction: str
    counterExample: str
    curriculumModule: str
    estimatedDurationMinutes: int = 15
    sources: List[RetrievedSourceItem] = Field(default_factory=list)
    groundingStatus: str

    model_config = ConfigDict(populate_by_name=True)
