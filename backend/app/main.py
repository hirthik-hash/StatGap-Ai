"""STAT-GAP AI Platform — FastAPI Main Application Entrypoint"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.middleware import (
    CorrelationIdMiddleware,
    RateLimitMiddleware,
    safe_exception_handler,
)
from .api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend API foundation for STAT-GAP AI Platform (Competency Intelligence for India's Official Statistical System)",
)

# Exception handlers for safe production error concealment
app.add_exception_handler(Exception, safe_exception_handler)

# Middlewares (executed in reverse registration order: correlation -> cors -> rate_limit)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CorrelationIdMiddleware)

# Mount API routers under configured prefix (default: /api)
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    return {
        "service": "STAT-GAP AI Backend",
        "status": "online",
        "docs_url": "/docs",
        "health_check": f"{settings.API_PREFIX}/health",
    }
