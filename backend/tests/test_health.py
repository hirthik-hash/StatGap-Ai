"""Test suite for STAT-GAP AI Backend Health Endpoint"""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify GET /api/health returns 200 and expected payload."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data == {
        "status": "ok",
        "service": "stat-gap-ai",
    }


def test_root_endpoint():
    """Verify GET / returns online status and health check reference."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["health_check"] == "/api/health"
