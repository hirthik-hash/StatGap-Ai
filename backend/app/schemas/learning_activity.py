"""Pydantic schemas for Interactive Learning Activities and Virtual Labs — Phase 9."""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LearningActivityResponse(BaseModel):
    """Normalized response for an interactive learning or virtual-lab activity."""

    id: str
    title: str
    description: Optional[str] = None
    activity_type: str = Field(..., description="READING, QUIZ, SIMULATION, PRACTICAL_EXERCISE, VIRTUAL_LAB")
    competency_id: str
    competency_name: Optional[str] = None
    task_id: Optional[str] = None
    task_name: Optional[str] = None
    estimated_duration_minutes: int
    difficulty_level: str
    instructions: Optional[str] = None
    interactive_payload: Dict[str, Any] = Field(default_factory=dict)
    architecture_label: str = "Virtual Lab Activity Interface"
    is_active: bool = True


class LearningActivityCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    activity_type: str = Field(default="PRACTICAL_EXERCISE")
    competency_id: str
    task_id: Optional[str] = None
    estimated_duration_minutes: int = 15
    difficulty_level: str = "intermediate"
    instructions: Optional[str] = None
    interactive_payload: Dict[str, Any] = Field(default_factory=dict)


class ActivityCompletionSubmit(BaseModel):
    activity_id: str
    officer_id: str
    completion_time_seconds: int
    score: Optional[float] = None
    interactive_output: Dict[str, Any] = Field(default_factory=dict)


LearningActivityCreate = LearningActivityCreateRequest
