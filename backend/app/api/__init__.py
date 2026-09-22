"""API router registration for STAT-GAP AI Backend."""
from fastapi import APIRouter
from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.officer import router as officer_router
from backend.app.api.routes.competencies import router as competencies_router
from backend.app.api.routes.diagnostics import router as diagnostics_router
from backend.app.api.routes.ai import router as ai_router
from backend.app.api.routes.assessments import router as assessments_router
from backend.app.api.routes.verifications import router as verifications_router
from backend.app.api.routes.igot import router as igot_router
from backend.app.api.routes.knowledge import router as knowledge_router
from backend.app.api.routes.admin import admin_router, supervisor_router
from backend.app.api.routes.digital_twin import router as digital_twin_router
from backend.app.api.routes.task_readiness import router as task_readiness_router
from backend.app.api.routes.training import router as training_router
from backend.app.api.routes.ai_assistant import router as ai_assistant_router
from backend.app.api.routes.career import router as career_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(officer_router)
api_router.include_router(competencies_router)
api_router.include_router(diagnostics_router)
api_router.include_router(ai_router)
api_router.include_router(assessments_router)
api_router.include_router(verifications_router)
api_router.include_router(igot_router)
api_router.include_router(knowledge_router)
api_router.include_router(admin_router)
api_router.include_router(supervisor_router)
api_router.include_router(digital_twin_router)
api_router.include_router(task_readiness_router)
api_router.include_router(training_router)
api_router.include_router(ai_assistant_router)
api_router.include_router(career_router)


__all__ = ["api_router", "knowledge_router"]


