"""
ADAM-1 Enhanced — FastAPI Application Entry Point
==================================================
This module bootstraps the FastAPI application:
  - CORS middleware
  - Router registration
  - Database initialization on startup
  - Structured logging
  - Global exception handlers
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.core.logging import configure_logging, get_logger
from app.database import init_db
from app.routers import health, system, datasets

# ---------------------------------------------------------------------------
# Bootstrap logging before anything else
# ---------------------------------------------------------------------------
configure_logging()
logger = get_logger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage startup and shutdown lifecycle events."""
    # ── Startup ──────────────────────────────────────────────────────────
    logger.info(
        "Starting ADAM-1 Enhanced backend",
        version=settings.app_version,
        environment=settings.app_env,
    )
    await init_db()
    
    # Trigger auto-ingestion on startup
    from app.database import AsyncSessionLocal
    from app.ingestion.pipeline import execute_ingestion_pipeline
    async with AsyncSessionLocal() as session:
        try:
            res = await execute_ingestion_pipeline(session)
            logger.info("Auto-ingestion completed on startup", results=res)
        except Exception as e:
            logger.error("Auto-ingestion failed on startup", error=str(e))

    logger.info("Database initialised — application ready")

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────
    logger.info("Shutting down ADAM-1 Enhanced backend")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.app_name,
    description=(
        "AI-Powered Alzheimer's Disease and Microbiome Research Platform. "
        "Phase 1: Backend foundation providing health, system info, and dataset endpoints."
    ),
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Request timing middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add X-Process-Time header to every response."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Process-Time"] = f"{elapsed}ms"
    return response


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all exception handler — log and return structured error."""
    logger.error(
        "Unhandled exception",
        path=str(request.url),
        method=request.method,
        error=str(exc),
        exc_info=exc,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred.",
            "path": str(request.url.path),
        },
    )


# ---------------------------------------------------------------------------
# Router registration
# ---------------------------------------------------------------------------
API_PREFIX = settings.api_prefix  # /api

app.include_router(health.router, prefix=API_PREFIX)
app.include_router(system.router, prefix=API_PREFIX)
app.include_router(datasets.router, prefix=API_PREFIX)


# ---------------------------------------------------------------------------
# Root redirect
# ---------------------------------------------------------------------------
@app.get("/", include_in_schema=False)
async def root() -> dict:
    """Root endpoint — returns basic app identification."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "phase": "Phase 2 — Dataset Ingestion & Explorer",
        "docs": "/docs",
        "health": f"{API_PREFIX}/health",
    }
