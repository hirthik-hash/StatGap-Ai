"""Schemas for Competency Intelligence, Knowledge Graph, Digital Twin, and What-If Simulation."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class CompetencyNodeResponse(BaseModel):
    id: str
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    level: str
    ontologyLevel: str
    domain: str
    requiredProficiency: float
    version: str

    model_config = ConfigDict(populate_by_name=True)


class CompetencyHierarchyNodeResponse(BaseModel):
    id: str
    code: Optional[str] = None
    name: str
    description: Optional[str] = None
    level: str
    ontologyLevel: str
    domain: str
    requiredProficiency: float
    version: str
    children: List["CompetencyHierarchyNodeResponse"] = []

    model_config = ConfigDict(populate_by_name=True)


class PrerequisiteResponse(BaseModel):
    id: str
    code: Optional[str] = None
    name: str
    level: str
    relationshipType: str
    weight: float
    description: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class OfficerCompetencyStateResponse(BaseModel):
    competencyId: str
    competencyName: str
    category: str
    description: Optional[str] = None
    currentLevel: float
    requiredLevel: float
    gap: float
    rawGap: float
    status: str
    gapBand: str
    confidence: float
    confidenceCategory: str
    confidenceReason: Optional[str] = None
    isInsufficientEvidence: bool
    evidenceCount: int
    lastEvidenceAt: Optional[str] = None
    evidenceSources: List[str]
    factors: Dict[str, float]
    prerequisites: List[Dict[str, Any]]
    dependencies: List[Dict[str, Any]]
    subSkills: List[Dict[str, Any]]

    model_config = ConfigDict(populate_by_name=True)


class EvidenceRecordResponse(BaseModel):
    id: int
    competencyId: str
    subSkillId: Optional[str] = None
    sourceType: str
    sourceReference: Optional[str] = None
    rawScore: float
    normalizedScore: float
    weight: float
    validityStatus: str
    recordedAt: str

    model_config = ConfigDict(populate_by_name=True)


class DigitalTwinResponse(BaseModel):
    digitalTwinId: str
    generatedAt: str
    identityContext: Dict[str, Any]
    kpiSummary: Dict[str, Any]
    competencyStates: List[OfficerCompetencyStateResponse]
    ontologyHierarchy: List[Dict[str, Any]]

    model_config = ConfigDict(populate_by_name=True)


class DigitalTwinSnapshotResponse(BaseModel):
    snapshotId: str
    triggerEvent: str
    ontologyVersion: str
    createdAt: str
    identityContext: Dict[str, Any]

    model_config = ConfigDict(populate_by_name=True)


class WhatIfSimulationRequest(BaseModel):
    targetCompetencyId: str = Field(..., description="Target competency identifier to simulate")
    interventionType: str = Field(..., description="e.g. NSSTA_TRAINING, PRACTICAL_LAB, RE_ASSESSMENT")
    hypotheticalScore: float = Field(default=0.85, ge=0.0, le=1.0, description="Hypothetical post-intervention score")


class WhatIfSimulationResponse(BaseModel):
    simulationId: str
    targetCompetencyId: str
    targetCompetencyName: str
    interventionType: str
    baseline: Dict[str, Any]
    simulated: Dict[str, Any]
    disclaimer: str
    isSimulation: bool

    model_config = ConfigDict(populate_by_name=True)
