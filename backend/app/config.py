"""
Configuration Management
========================
Loads environment variables using Pydantic Settings.
All configuration is sourced from .env file or environment variables.
Supports automatic URL transformation for Render PostgreSQL.
"""
from __future__ import annotations

import os
from functools import lru_cache
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "ADAM-1 Enhanced"
    app_env: str = "development"
    app_debug: bool = False
    app_version: str = "1.0.0"

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    port: Optional[int] = None
    api_prefix: str = "/api"

    @property
    def effective_port(self) -> int:
        return self.port or self.backend_port or int(os.environ.get("PORT", 8000))

    # CORS — comma-separated in env, parsed into list
    cors_origins: str = (
        "http://localhost:5173,http://localhost:3000,http://frontend:3000,"
        "http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:8000,http://localhost:8000"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # Database
    database_url: str = (
        "postgresql+asyncpg://adam_user:adam_dev_password@localhost:5432/adam_enhanced"
    )
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "adam_enhanced"
    postgres_user: str = "adam_user"
    postgres_password: str = "adam_dev_password"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, v: Optional[str]) -> str:
        if not v:
            return "postgresql+asyncpg://adam_user:adam_dev_password@localhost:5432/adam_enhanced"
        # Render and Heroku provide postgres:// or postgresql://
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    # Security
    secret_key: str = "change-this-in-production"

    # Logging
    log_level: str = "INFO"

    # pgvector
    pgvector_enabled: bool = True

    # AI / LLM Provider (Groq)
    groq_api_key: Optional[str] = None
    groq_model: str = "groq/compound-mini"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
