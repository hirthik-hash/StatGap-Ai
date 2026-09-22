"""Pydantic v2 schemas for Task Readiness API — Phase 6."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TaskRequirementResponse(BaseModel):
    competency_id: str
    competency_name: str
    required_level: float
    current_level: Optional[float] = None
    gap: Optional[float] = None
    is_critical: bool
    status: str  # SATISFIED | GAP | INSUFFICIENT_EVIDENCE
    satisfied: bool
    notes: Optional[str] = None


class TaskDefinitionResponse(BaseModel):
    taskId: str
    taskName: str
    taskDescription: Optional[str] = None
    taskCategory: str
    cadreApplicable: Optional[str] = None
    requirementCount: int
    isActive: bool


class TaskReadinessResponse(BaseModel):
    taskId: str
    taskName: str
    taskDescription: Optional[str] = None
    taskCategory: Optional[str] = None
    readinessStatus: str  # READY | PARTIALLY_READY | NOT_READY | INSUFFICIENT_EVIDENCE
    requirements_met: int
    requirements_total: int
    bottleneckCompetencyId: Optional[str] = None
    bottleneckCompetencyName: Optional[str] = None
    requirementDetails: List[TaskRequirementResponse] = []
    evaluationSummary: Optional[Dict[str, Any]] = None
    disclaimer: str
    isSimulation: bool = False


class WhatIfHypotheticalChange(BaseModel):
    competency_id: str = Field(..., description="Competency ID to override")
    hypothetical_level: float = Field(
        ..., ge=0.0, le=1.0,
        description="Hypothetical normalized competency level [0.0, 1.0]"
    )


class TaskReadinessSimulationRequest(BaseModel):
    hypothetical_changes: List[WhatIfHypotheticalChange] = Field(
        ...,
        description="List of competency level overrides for simulation. Does NOT modify real data.",
        min_length=1,
    )


class TaskReadinessSimulationResponse(BaseModel):
    simulationId: str
    taskId: str
    taskName: str
    hypotheticalChanges: List[Dict[str, Any]]
    baseline: Dict[str, Any]
    simulated: Dict[str, Any]
    readinessChanged: bool
    disclaimer: str
    isSimulation: bool = True
