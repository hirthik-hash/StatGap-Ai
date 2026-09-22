"""Health and Readiness endpoints for container orchestration and uptime monitoring."""
from __future__ import annotations

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.schemas.health import HealthResponse

logger = logging.getLogger("statgapai.health")

router = APIRouter(tags=["Health & Readiness"])


@router.get("/health", response_model=HealthResponse, summary="Liveness check")
async def get_health():
    """Confirms application process is running and accepting HTTP requests."""
    return HealthResponse(status="ok", service="stat-gap-ai")


@router.get("/readiness", summary="Readiness check verifying database connectivity")
def get_readiness(db: Session = Depends(get_db)):
    """Verifies that mandatory backend dependencies (database) are responsive.
    
    CRITICAL: Never leaks raw database error traces, passwords, or connection URLs.
    """
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service is currently unreachable or initializing.",
        )
