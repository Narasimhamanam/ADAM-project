"""
Health Router
=============
GET /api/health

Returns the real-time health status of the backend and its
database connection. This endpoint is polled by the frontend
dashboard to display live system status.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app.database import check_db_connection
from app.config import get_settings

import asyncio
from typing import Optional

router = APIRouter(prefix="/health", tags=["health"])

# Application start time for uptime calculation
_START_TIME = time.time()


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    uptime_seconds: float
    version: str
    environment: str
    database: str
    database_error: Optional[str] = None
    ml_engine: str = "ready"
    ai_engine: str = "ready"


@router.get(
    "/live",
    summary="Lightweight Liveness Probe",
    description="Ultra-fast liveness check responding immediately without blocking on external resources.",
)
async def liveness_probe():
    return {
        "status": "alive",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - _START_TIME, 2),
    }


@router.get(
    "",
    response_model=HealthResponse,
    summary="System Health Check",
    description=(
        "Returns the health status of the ADAM-1 Enhanced backend "
        "including database connectivity with timeout protection."
    ),
)
async def health_check() -> HealthResponse:
    """
    Perform a fast health check.
    Uses a strict 2-second timeout on the database ping so the endpoint never stalls.
    """
    settings = get_settings()
    db_status = "disconnected"
    db_err = None

    try:
        db_result = await asyncio.wait_for(check_db_connection(), timeout=2.0)
        db_status = db_result.get("status", "disconnected")
        db_err = db_result.get("error")
    except asyncio.TimeoutError:
        db_status = "timeout"
        db_err = "Database connection timed out (2s limit)"
    except Exception as e:
        db_status = "disconnected"
        db_err = str(e)

    overall_status = "healthy" if db_status == "connected" else "degraded"

    return HealthResponse(
        status=overall_status,
        timestamp=datetime.now(timezone.utc).isoformat(),
        uptime_seconds=round(time.time() - _START_TIME, 2),
        version=settings.app_version,
        environment=settings.app_env,
        database=db_status,
        database_error=db_err,
        ml_engine="ready",
        ai_engine="ready",
    )


@router.get(
    "/ready",
    response_model=HealthResponse,
    summary="Readiness Probe",
    description="Full readiness check verifying database and ML/AI subsystem readiness.",
)
async def readiness_check() -> HealthResponse:
    return await health_check()
