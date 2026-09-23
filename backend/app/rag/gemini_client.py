"""
Google Gemini API Client for ADAM-1 Multi-Agent Pipeline
=========================================================
Direct interface using the official Python Google GenAI SDK:
`from google import genai`
`from google.genai import types`

Handles:
- Initialization via GEMINI_API_KEY from environment or Settings
- Unstructured text generation for the Summarization Agent
- Structured Pydantic schema generation for the Classification Agent
- Strict telemetry logging (latency_ms, prompt_tokens, completion_tokens)
- Transient error retry with exponential backoff
- Explicit failure tracking without silent fallback
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Optional, Type

from google import genai
from google.genai import types
from google.genai import errors
from pydantic import BaseModel

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class GeminiCallResult:
    """Standardized response from Google Gemini API call."""
    status: str                         # "LIVE_SUCCESS" or "LIVE_FAILED"
    provider: str = "Google Gemini API"
    model: str = "gemini-3.6-flash"
    content: Optional[str] = None
    parsed: Optional[Any] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency_ms: float = 0.0
    error: Optional[str] = None
    telemetry: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_success(self) -> bool:
        return self.status == "LIVE_SUCCESS" and (self.content is not None or self.parsed is not None)


class GeminiClient:
    """Encapsulates the Google GenAI SDK client for ADAM reasoning agents."""

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key or os.environ.get("GEMINI_API_KEY") or get_settings().gemini_api_key
        self._client: Optional[genai.Client] = None
        if self._api_key and self._api_key.strip():
            try:
                self._client = genai.Client(api_key=self._api_key.strip())
                logger.info("Initialized Google Gemini client", model="gemini-3.6-flash")
            except Exception as e:
                logger.error("Failed to initialize Google Gemini client", error=str(e))
                self._client = None

    @property
    def is_available(self) -> bool:
        return self._client is not None and bool(self._api_key)

    def get_api_key(self) -> Optional[str]:
        return self._api_key

    def generate_text(
        self,
        prompt: str,
        model: str = "gemini-3.6-flash",
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        max_retries: int = 4,
    ) -> GeminiCallResult:
        """Execute text generation for the Summarization Agent."""
        if not self.is_available:
            return GeminiCallResult(
                status="LIVE_FAILED",
                model=model,
                error="GEMINI_API_KEY is not configured or client failed to initialize",
            )

        config_kwargs: Dict[str, Any] = {
            "temperature": temperature,
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction

        config = types.GenerateContentConfig(**config_kwargs)

        t_start = time.perf_counter()
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                response = self._client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config,
                )
                latency_ms = round((time.perf_counter() - t_start) * 1000, 2)

                usage = getattr(response, "usage_metadata", None)
                p_tokens = getattr(usage, "prompt_token_count", None) if usage else None
                c_tokens = getattr(usage, "candidates_token_count", None) if usage else None
                t_tokens = getattr(usage, "total_token_count", None) if usage else None

                text_content = response.text if hasattr(response, "text") else str(response)

                return GeminiCallResult(
                    status="LIVE_SUCCESS",
                    model=model,
                    content=text_content,
                    prompt_tokens=p_tokens,
                    completion_tokens=c_tokens,
                    total_tokens=t_tokens,
                    latency_ms=latency_ms,
                    telemetry={
                        "attempt": attempt,
                        "status": "LIVE_SUCCESS",
                        "latency_ms": latency_ms,
                        "prompt_tokens": p_tokens,
                        "completion_tokens": c_tokens,
                        "total_tokens": t_tokens,
                    },
                )
            except errors.APIError as e:
                last_error = f"Gemini APIError ({e.code}): {e.message}"
                logger.warning(
                    "Gemini API error encountered",
                    attempt=attempt,
                    code=e.code,
                    message=e.message,
                )
                err_str = str(e) + " " + str(getattr(e, "message", ""))
                if "PerDay" in err_str or "free_tier_requests" in err_str:
                    logger.warning("Daily free tier quota exhausted; halting retries", model=model)
                    break

                if attempt < max_retries:
                    delay = 2.0 * attempt
                    if e.code == 429:
                        import re
                        m = re.search(r"retry in ([0-9\.]+)s", str(e.message))
                        if m:
                            delay = min(65.0, float(m.group(1)) + 1.5)
                        else:
                            delay = 10.0 * attempt
                    time.sleep(delay)
            except Exception as e:
                last_error = f"Gemini Exception: {str(e)}"
                logger.warning("Gemini invocation exception", attempt=attempt, error=str(e))
                if attempt < max_retries:
                    time.sleep(2.0 * attempt)

        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        return GeminiCallResult(
            status="LIVE_FAILED",
            model=model,
            error=last_error or "Unknown failure after retries",
            latency_ms=latency_ms,
            telemetry={
                "attempts": max_retries,
                "status": "LIVE_FAILED",
                "error": last_error,
                "latency_ms": latency_ms,
            },
        )

    def generate_structured(
        self,
        prompt: str,
        schema_cls: Type[BaseModel],
        model: str = "gemini-3.6-flash",
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        max_retries: int = 4,
    ) -> GeminiCallResult:
        """Execute structured JSON schema generation for the Classification Agent."""
        if not self.is_available:
            return GeminiCallResult(
                status="LIVE_FAILED",
                model=model,
                error="GEMINI_API_KEY is not configured or client failed to initialize",
            )

        config_kwargs: Dict[str, Any] = {
            "response_mime_type": "application/json",
            "response_schema": schema_cls,
            "temperature": temperature,
        }
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction

        config = types.GenerateContentConfig(**config_kwargs)

        t_start = time.perf_counter()
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                response = self._client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=config,
                )
                latency_ms = round((time.perf_counter() - t_start) * 1000, 2)

                usage = getattr(response, "usage_metadata", None)
                p_tokens = getattr(usage, "prompt_token_count", None) if usage else None
                c_tokens = getattr(usage, "candidates_token_count", None) if usage else None
                t_tokens = getattr(usage, "total_token_count", None) if usage else None

                parsed = getattr(response, "parsed", None)
                raw_text = response.text if hasattr(response, "text") else ""

                return GeminiCallResult(
                    status="LIVE_SUCCESS",
                    model=model,
                    content=raw_text,
                    parsed=parsed,
                    prompt_tokens=p_tokens,
                    completion_tokens=c_tokens,
                    total_tokens=t_tokens,
                    latency_ms=latency_ms,
                    telemetry={
                        "attempt": attempt,
                        "status": "LIVE_SUCCESS",
                        "latency_ms": latency_ms,
                        "prompt_tokens": p_tokens,
                        "completion_tokens": c_tokens,
                        "total_tokens": t_tokens,
                    },
                )
            except errors.APIError as e:
                last_error = f"Gemini APIError ({e.code}): {e.message}"
                logger.warning(
                    "Gemini structured API error encountered",
                    attempt=attempt,
                    code=e.code,
                    message=e.message,
                )
                err_str = str(e) + " " + str(getattr(e, "message", ""))
                if "PerDay" in err_str or "free_tier_requests" in err_str:
                    logger.warning("Daily free tier quota exhausted; halting retries", model=model)
                    break

                if attempt < max_retries:
                    delay = 2.0 * attempt
                    if e.code == 429:
                        import re
                        m = re.search(r"retry in ([0-9\.]+)s", str(e.message))
                        if m:
                            delay = min(65.0, float(m.group(1)) + 1.5)
                        else:
                            delay = 10.0 * attempt
                    time.sleep(delay)
            except Exception as e:
                last_error = f"Gemini structured invocation exception: {str(e)}"
                logger.warning("Gemini structured invocation exception", attempt=attempt, error=str(e))
                if attempt < max_retries:
                    time.sleep(2.0 * attempt)

        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        return GeminiCallResult(
            status="LIVE_FAILED",
            model=model,
            error=last_error or "Unknown failure after retries",
            latency_ms=latency_ms,
            telemetry={
                "attempts": max_retries,
                "status": "LIVE_FAILED",
                "error": last_error,
                "latency_ms": latency_ms,
            },
        )


_GEMINI_CLIENT: Optional[GeminiClient] = None


def get_gemini_client() -> GeminiClient:
    """Return singleton GeminiClient instance."""
    global _GEMINI_CLIENT
    if _GEMINI_CLIENT is None:
        _GEMINI_CLIENT = GeminiClient()
    return _GEMINI_CLIENT
