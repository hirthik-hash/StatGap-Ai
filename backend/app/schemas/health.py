"""Health check schema"""
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "stat-gap-ai"
