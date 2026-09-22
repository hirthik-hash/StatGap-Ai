"""Pydantic v2 Schemas for Adaptive Assessment API contracts."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class StartAssessmentRequest(BaseModel):
    target_competency_id: str = Field(..., description="ID of the target competency to assess")


class AssessmentItemPayload(BaseModel):
    id: str
    competencyId: str
    questionType: str
    stem: str
    options: List[str]
    difficultyLabel: str  # "easy" | "medium" | "hard"
    cognitiveLevel: str

    # CRITICAL SECURITY RULE:
    # correct_answer and explanation are deliberately omitted from pre-submission payloads


class SubmitResponseRequest(BaseModel):
    itemId: str = Field(..., description="ID of the item currently assigned to the session")
    selectedAnswer: int = Field(..., description="0-indexed chosen option")
    confidence: str = Field(default="Medium", description="Very Low | Low | Medium | High | Very High")
    responseTimeMs: int = Field(default=0, description="Response latency in milliseconds")


class AssessmentResultResponse(BaseModel):
    sessionId: str
    targetCompetencyId: str
    targetCompetencyName: str
    itemsAnswered: int
    correctCount: int
    accuracyPercentage: float
    initialTheta: float
    finalTheta: float
    standardError: float
    abilityBand: str
    stoppingReason: str
    integratedPerformance: Optional[float] = None
    misconceptionSignalsDetected: int = 0
    evaluatedCompetencyScore: Optional[int] = None
    newDiagnosisType: Optional[str] = None


class ResponseOutcomeResponse(BaseModel):
    isCorrect: bool
    correctAnswer: int
    explanation: str
    thetaAfter: float
    standardError: float
    itemsAnswered: int
    nextItem: Optional[AssessmentItemPayload] = None
    isCompleted: bool = False
    result: Optional[AssessmentResultResponse] = None
