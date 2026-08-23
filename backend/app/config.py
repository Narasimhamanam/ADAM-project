"""
Configuration Management
========================
Loads environment variables using Pydantic Settings.
All configuration is sourced from .env file or environment variables.
"""
from __future__ import annotations

from functools import lru_cache
from typing import List

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
    app_debug: bool = True
    app_version: str = "1.0.0"

    # Server
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    api_prefix: str = "/api"

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

    # Security
    secret_key: str = "change-this-in-production"

    # Logging
    log_level: str = "INFO"

    # pgvector
    pgvector_enabled: bool = True


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
