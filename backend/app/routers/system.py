"""
System Info Router
==================
GET /api/system/info

Returns runtime environment information about the backend host,
Python version, and platform. Does NOT expose sensitive configuration.
"""
from __future__ import annotations

import platform
import sys
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter(prefix="/system", tags=["system"])


class SystemInfoResponse(BaseModel):
    app_name: str
    version: str
    environment: str
    python_version: str
    platform_system: str
    platform_release: str
    timestamp: str
    pgvector_enabled: bool
    phase: str
    description: str


@router.get(
    "/info",
    response_model=SystemInfoResponse,
    summary="System Runtime Information",
    description="Returns non-sensitive runtime information about the backend environment.",
)
async def system_info() -> SystemInfoResponse:
    """Return backend runtime metadata."""
    settings = get_settings()
    return SystemInfoResponse(
        app_name=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        python_version=sys.version,
        platform_system=platform.system(),
        platform_release=platform.release(),
        timestamp=datetime.now(timezone.utc).isoformat(),
        pgvector_enabled=settings.pgvector_enabled,
        phase="ADAM-1 Enhanced Full-Stack Platform",
        description=(
            "ADAM-1 Enhanced: AI-Powered Alzheimer's Disease & Microbiome "
            "Research Platform with PostgreSQL + pgvector, ML XGBoost/SHAP pipeline, "
            "PubMed Literature RAG, and AIRA Multi-Agent Orchestration."
        ),
    )

