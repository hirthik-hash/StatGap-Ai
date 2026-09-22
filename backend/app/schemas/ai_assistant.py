"""Pydantic schemas for the Grounded AI Learning Assistant — Phase 9."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str


class AiAssistantQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000, description="Officer learning inquiry")
    context_scope: str = Field(
        default="general",
        description="Scope of context: 'general', 'my_competencies', 'task_readiness', 'training'"
    )
    history: List[ChatMessage] = Field(default_factory=list)


class AiSourceCitation(BaseModel):
    document_title: str
    chunk_id: str
    similarity_score: float
    excerpt: str
    authority_level: str = "OFFICIAL_MOMENT_METHODOLOGY"


class ContextualActionLink(BaseModel):
    label: str
    action_type: str  # navigate, launch_quiz, verify, start_learning
    target_page: str
    target_id: Optional[str] = None


class AiAssistantQueryResponse(BaseModel):
    answer: str
    grounding_status: str = Field(..., description="GROUNDED, WEAK_GROUNDING, INSUFFICIENT_GROUNDING")
    grounding_score: float
    citations: List[AiSourceCitation] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    contextual_actions: List[ContextualActionLink] = Field(default_factory=list)
    officer_context_included: bool = False
    disclaimer: str = (
        "Grounded in official MoSPI, NSSO, and SNA methodological standards. "
        "Adheres to Phase 4 RAG strict anti-hallucination gating."
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AiAssistantSuggestionsResponse(BaseModel):
    officer_id: str
    suggested_prompts: List[str]
    active_bottlenecks: List[str] = Field(default_factory=list)
    priority_gap_competency: Optional[str] = None
