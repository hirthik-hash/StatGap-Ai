"""Security, Observability, and Request Middleware for STAT-GAP AI.

Features:
- Lightweight request correlation IDs (X-Request-ID)
- Deterministic, endpoint-aware, test-safe in-memory rate limiting
- Safe production error masking
"""
from __future__ import annotations

import logging
import time
import uuid
from collections import defaultdict
from typing import Dict, List, Tuple

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.app.core.config import settings

logger = logging.getLogger("statgapai.security")


# ----------------------------------------------------
# 1. Correlation ID Middleware
# ----------------------------------------------------
class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Assigns or propagates a unique X-Request-ID to every HTTP request and response."""

    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = req_id

        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response


# ----------------------------------------------------
# 2. Test-Safe In-Memory Rate Limiter
# ----------------------------------------------------
class InMemoryRateLimiter:
    """Deterministic, endpoint-aware in-memory sliding-window rate limiter.
    
    PROTOTYPE DISCLAIMER:
    This in-memory rate limiter provides single-instance prototype and demonstration protection.
    It is not a distributed rate limiter. Production enterprise deployment across multiple
    containers should use an API gateway or Redis-backed distributed token bucket.
    
    TEST ISOLATION:
    Provides reset() method and respects settings.RATE_LIMIT_ENABLED to prevent test cross-contamination.
    """

    def __init__(self) -> None:
        # Key: (client_identifier, endpoint_group) -> list of timestamp floats
        self._history: Dict[Tuple[str, str], List[float]] = defaultdict(list)

    def reset(self) -> None:
        """Clears all stored rate limit history. Useful for resetting test environments."""
        self._history.clear()

    def is_allowed(self, client_id: str, endpoint_path: str, limit: int = 60, window_seconds: int = 60) -> bool:
        if not settings.RATE_LIMIT_ENABLED:
            return True

        now = time.time()
        # Group endpoints logically
        if endpoint_path.startswith("/api/auth"):
            group = "auth"
        elif endpoint_path.startswith("/api/assessments"):
            group = "assessments"
        elif endpoint_path.startswith("/api/ai"):
            group = "ai"
        elif endpoint_path.startswith("/api/igot"):
            group = "igot"
        else:
            group = "general"

        key = (client_id, group)
        timestamps = self._history[key]

        # Prune timestamps older than window
        cutoff = now - window_seconds
        self._history[key] = [t for t in timestamps if t > cutoff]

        if len(self._history[key]) >= limit:
            return False

        self._history[key].append(now)
        return True


rate_limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware enforcing sliding-window rate limits on sensitive endpoints."""

    async def dispatch(self, request: Request, call_next):
        if not settings.RATE_LIMIT_ENABLED or settings.ENVIRONMENT == "test":
            return await call_next(request)


        # Bypass health and readiness checks
        if request.url.path in ("/api/health", "/api/readiness", "/docs", "/openapi.json"):
            return await call_next(request)

        # Client IP extraction
        client_ip = request.client.host if request.client else "127.0.0.1"
        req_id = getattr(request.state, "request_id", str(uuid.uuid4()))

        # Stricter limit for auth endpoints, standard for others
        limit = 30 if request.url.path.startswith("/api/auth/login") else settings.RATE_LIMIT_PER_MINUTE

        if not rate_limiter.is_allowed(client_ip, request.url.path, limit=limit):
            logger.warning(
                f"Rate limit exceeded for IP {client_ip} on path {request.url.path} [request_id={req_id}]"
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please slow down.",
                    "code": "rate_limit_exceeded",
                    "request_id": req_id,
                },
                headers={"X-Request-ID": req_id, "Retry-After": "60"},
            )

        return await call_next(request)


from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


# ----------------------------------------------------
# 3. Global Exception Handler
# ----------------------------------------------------
async def safe_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Conceals internal stack traces, paths, and SQL errors from external clients,
    while preserving standard HTTP status codes and validation errors.
    """
    req_id = getattr(request.state, "request_id", str(uuid.uuid4()))

    if isinstance(exc, StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "code": "http_error",
                "request_id": req_id,
            },
            headers={"X-Request-ID": req_id},
        )

    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": exc.errors(),
                "code": "validation_error",
                "request_id": req_id,
            },
            headers={"X-Request-ID": req_id},
        )

    logger.error(
        f"Unhandled application exception on {request.method} {request.url.path} "
        f"[request_id={req_id}]: {str(exc)}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please contact the system administrator.",
            "code": "internal_server_error",
            "request_id": req_id,
        },
        headers={"X-Request-ID": req_id},
    )
