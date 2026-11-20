"""
Database Configuration
======================
Async SQLAlchemy engine, session factory, and base model.
Provides pgvector readiness check on startup.
"""
from __future__ import annotations

import asyncio
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

settings = get_settings()

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------
engine = create_async_engine(
    settings.database_url,
    echo=settings.app_debug,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Declarative base
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# Lifecycle helpers
# ---------------------------------------------------------------------------
async def init_db() -> bool:
    """Create all tables and verify pgvector extension."""
    try:
        # Import models so they are registered on Base.metadata
        from app.models import dataset  # noqa: F401

        async with engine.begin() as conn:
            # Enable extensions if permissions allow
            for ext in ["vector", "pg_trgm"]:
                try:
                    async with conn.begin_nested():
                        await conn.execute(text(f"CREATE EXTENSION IF NOT EXISTS {ext}"))
                except Exception as ext_err:
                    logger.warning(f"Could not auto-create extension {ext}", error=str(ext_err))
            try:
                async with conn.begin_nested():
                    await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
            except Exception as ext_err:
                logger.warning("Could not auto-create extension uuid-ossp", error=str(ext_err))

            await conn.run_sync(Base.metadata.create_all)
            await conn.execute(text("ALTER TABLE datasets ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)"))

        logger.info("Database tables created/verified")
        await _verify_pgvector()
        record_db_state(True)
        return True
    except Exception as exc:
        record_db_state(False)
        return False


async def _verify_pgvector() -> None:
    """Log whether pgvector extension is available."""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                text("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            )
            row = result.fetchone()
            if row:
                logger.info("pgvector extension confirmed available")
            else:
                logger.warning(
                    "pgvector extension NOT found — vector operations will be unavailable"
                )
        except Exception as exc:
            logger.error("Failed to verify pgvector extension", error=str(exc))


async def check_db_connection() -> dict:
    """
    Attempt a lightweight query to verify database connectivity.
    Returns a dict with 'status' and optional 'error'.
    """
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        record_db_state(True)
        return {"status": "connected"}
    except Exception as exc:
        record_db_state(False)
        return {"status": "disconnected", "error": "Database connection unavailable"}


_db_available = None


def record_db_state(available: bool) -> None:
    """One sanitized availability log per state transition, per process."""
    global _db_available
    if available == _db_available:
        return
    _db_available = available
    if available:
        logger.info("Database connection available")
    else:
        logger.warning("Database connection unavailable", optional=settings.database_optional)


async def initialize_with_backoff() -> bool:
    """Bound startup work; cancellation propagates through queries and sleeps."""
    for attempt in range(settings.database_startup_attempts):
        try:
            if await asyncio.wait_for(init_db(), settings.database_connect_timeout):
                return True
        except (TimeoutError, OSError):
            record_db_state(False)
        if attempt + 1 < settings.database_startup_attempts:
            await asyncio.sleep(min(settings.database_retry_seconds * 2 ** attempt, 30.0))
    return False
