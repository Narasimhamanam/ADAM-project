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
    database_error: str | None = None


@router.get(
    "",
    response_model=HealthResponse,
    summary="System Health Check",
    description=(
        "Returns the health status of the ADAM-1 Enhanced backend "
        "including real-time database connectivity."
    ),
)
async def health_check() -> HealthResponse:
    """
    Perform a live health check.

    - Queries the database with a lightweight SELECT 1
    - Reports uptime since backend start
    - Returns non-2xx status only on critical failure
    """
    settings = get_settings()
    db_result = await check_db_connection()

    return HealthResponse(
        status="healthy" if db_result["status"] == "connected" else "degraded",
        timestamp=datetime.now(timezone.utc).isoformat(),
        uptime_seconds=round(time.time() - _START_TIME, 2),
        version=settings.app_version,
        environment=settings.app_env,
        database=db_result["status"],
        database_error=db_result.get("error"),
    )
