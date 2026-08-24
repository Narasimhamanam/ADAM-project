"""
Database Configuration
======================
Async SQLAlchemy engine, session factory, and base model.
Provides pgvector readiness check on startup.
"""
from __future__ import annotations

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
async def init_db() -> None:
    """Create all tables and verify pgvector extension."""
    try:
        # Import models so they are registered on Base.metadata
        from app.models import dataset  # noqa: F401

        async with engine.begin() as conn:
            # Enable extensions if permissions allow
            for ext in ["vector", "pg_trgm"]:
                try:
                    await conn.execute(text(f"CREATE EXTENSION IF NOT EXISTS {ext}"))
                except Exception as ext_err:
                    logger.warning(f"Could not auto-create extension {ext}", error=str(ext_err))
            try:
                await conn.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'))
            except Exception as ext_err:
                logger.warning("Could not auto-create extension uuid-ossp", error=str(ext_err))

            await conn.run_sync(Base.metadata.create_all)
            await conn.execute(text("ALTER TABLE datasets ADD COLUMN IF NOT EXISTS checksum VARCHAR(64)"))

        logger.info("Database tables created/verified")
        await _verify_pgvector()
    except Exception as exc:
        logger.warning(
            "Database not reachable during startup - will connect on demand",
            error=str(exc),
        )


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
        return {"status": "connected"}
    except Exception as exc:
        logger.error("Database health check failed", error=str(exc))
        return {"status": "disconnected", "error": str(exc)}
