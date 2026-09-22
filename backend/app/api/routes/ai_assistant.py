"""API endpoints for the Grounded AI Learning Assistant — Phase 9."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.schemas.ai_assistant import (
    AiAssistantQueryRequest,
    AiAssistantQueryResponse,
    AiAssistantSuggestionsResponse,
)
from backend.app.services.ai_assistant_service import AiAssistantService

ai_assistant_router = APIRouter(prefix="/ai/assistant", tags=["Grounded AI Assistant"])
router = ai_assistant_router


@ai_assistant_router.post(
    "/chat",
    response_model=AiAssistantQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask the Grounded AI Learning Assistant a question with citations",
)
def chat_with_assistant(
    payload: AiAssistantQueryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Answers officer learning and statistical questions backed by official RAG source citations."""
    service = AiAssistantService(db)
    return service.answer_query(user=current_user, request=payload)


@ai_assistant_router.get(
    "/suggestions",
    response_model=AiAssistantSuggestionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get tailored learning prompt suggestions based on officer diagnostic state",
)
def get_assistant_suggestions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Provides personalized prompt suggestions targeting active officer gaps and task bottlenecks."""
    service = AiAssistantService(db)
    return service.get_suggestions(user=current_user)
