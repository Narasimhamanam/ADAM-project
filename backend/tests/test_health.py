"""
Health Endpoint Tests
=====================
Tests for GET /api/health and GET /api/system/info endpoints.
Uses HTTPX async test client (no real DB required for basic tests).
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app


@pytest.fixture
def mock_db_connected():
    """Mock database as connected."""
    with patch("app.routers.health.check_db_connection", new_callable=AsyncMock) as mock:
        mock.return_value = {"status": "connected"}
        yield mock


@pytest.fixture
def mock_db_disconnected():
    """Mock database as disconnected."""
    with patch("app.routers.health.check_db_connection", new_callable=AsyncMock) as mock:
        mock.return_value = {"status": "disconnected", "error": "Connection refused"}
        yield mock


@pytest.mark.asyncio
async def test_health_returns_200(mock_db_connected):
    """Health endpoint should return 200 when DB is connected."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "uptime_seconds" in data
    assert "version" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_health_degraded_when_db_down(mock_db_disconnected):
    """Health endpoint should return 200 but status=degraded when DB is down."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert data["database"] == "disconnected"


@pytest.mark.asyncio
async def test_system_info():
    """System info endpoint should return runtime metadata."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/system/info")

    assert response.status_code == 200
    data = response.json()
    assert data["app_name"] == "ADAM-1 Enhanced"
    assert "python_version" in data
    assert "platform_system" in data
    assert "phase" in data


@pytest.mark.asyncio
async def test_root_endpoint():
    """Root endpoint should return app identification."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert "app" in data
    assert "health" in data
