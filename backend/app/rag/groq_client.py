"""
Groq API Client for ADAM-1 Multi-Agent Pipeline
=================================================
Direct interface using the official Groq Python SDK:
`from groq import Groq`

Target Configuration:
- Provider: GroqCloud
- Model: openai/gpt-oss-120b

Handles:
- Initialization via GROQ_API_KEY from environment or Settings (never hardcoded, never logged)
- Unstructured text generation for the Summarization Agent
- Structured JSON schema generation and Pydantic validation for the Classification Agent
- Strict telemetry logging (latency_ms, prompt_tokens, completion_tokens, total_tokens, request timestamps)
- Bounded retries with exponential backoff for transient errors
- Explicit failure tracking without silent fallback in strict research mode
"""
from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Type

from groq import Groq, APIError, RateLimitError
from pydantic import BaseModel

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class GroqCallResult:
    """Standardized response from Groq API call."""
    status: str                         # "LIVE_SUCCESS" or "LIVE_FAILED"
    provider: str = "GroqCloud"
    model: str = "openai/gpt-oss-120b"
    content: Optional[str] = None
    parsed: Optional[Any] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency_ms: float = 0.0
    request_started_at: Optional[str] = None
    request_finished_at: Optional[str] = None
    error: Optional[str] = None
    telemetry: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_success(self) -> bool:
        return self.status == "LIVE_SUCCESS" and (self.content is not None or self.parsed is not None)


def _make_strict_json_schema(schema_dict: Dict[str, Any]) -> Dict[str, Any]:
    import copy
    schema = copy.deepcopy(schema_dict)

    def _recurse(d: Any) -> None:
        if isinstance(d, dict):
            if d.get("type") == "object" or "properties" in d:
                d["additionalProperties"] = False
                if "properties" in d:
                    d["required"] = list(d["properties"].keys())
            for v in d.values():
                _recurse(v)
        elif isinstance(d, list):
            for item in d:
                _recurse(item)

    _recurse(schema)
    return schema


def _parse_groq_retry_delay(err_msg: str, default_delay: float) -> float:
    """Parse retry delay from Groq rate limit error message (supports seconds and minutes)."""
    import re
    m_min = re.search(r"try again in (?:(\d+)m\s*)?(\d+(?:\.\d+)?)s", err_msg, re.IGNORECASE)
    if m_min:
        mins = float(m_min.group(1)) if m_min.group(1) else 0.0
        secs = float(m_min.group(2))
        return min(120.0, mins * 60.0 + secs + 1.0)
    return default_delay


class GroqClient:
    """Encapsulates the Groq Python SDK client for ADAM reasoning agents."""

    def __init__(self, api_key: Optional[str] = None):
        self._api_key = api_key or os.environ.get("GROQ_API_KEY") or get_settings().groq_api_key
        self._client: Optional[Groq] = None
        if self._api_key and self._api_key.strip():
            try:
                self._client = Groq(api_key=self._api_key.strip())
                logger.info("Initialized Groq client", provider="GroqCloud", model=get_settings().groq_model)
            except Exception as e:
                logger.error("Failed to initialize Groq client", error=str(e))
                self._client = None

    @property
    def is_available(self) -> bool:
        return self._client is not None and bool(self._api_key)

    def get_api_key(self) -> Optional[str]:
        return self._api_key

    def generate_text(
        self,
        prompt: str,
        model: str = "openai/gpt-oss-120b",
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2500,
        max_retries: int = 4,
    ) -> GroqCallResult:
        """Execute text generation for the Summarization Agent."""
        if not self.is_available:
            return GroqCallResult(
                status="LIVE_FAILED",
                provider="GroqCloud",
                model=model,
                error="GROQ_API_KEY is not configured or client failed to initialize",
            )

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        t_start = time.perf_counter()
        req_start_iso = datetime.now(timezone.utc).isoformat()
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                response = self._client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
                req_finish_iso = datetime.now(timezone.utc).isoformat()

                usage = getattr(response, "usage", None)
                p_tokens = getattr(usage, "prompt_tokens", None) if usage else None
                c_tokens = getattr(usage, "completion_tokens", None) if usage else None
                t_tokens = getattr(usage, "total_tokens", None) if usage else None

                text_content = ""
                if response.choices and len(response.choices) > 0:
                    text_content = response.choices[0].message.content or ""

                return GroqCallResult(
                    status="LIVE_SUCCESS",
                    provider="GroqCloud",
                    model=model,
                    content=text_content,
                    prompt_tokens=p_tokens,
                    completion_tokens=c_tokens,
                    total_tokens=t_tokens,
                    latency_ms=latency_ms,
                    request_started_at=req_start_iso,
                    request_finished_at=req_finish_iso,
                    telemetry={
                        "attempt": attempt,
                        "status": "LIVE_SUCCESS",
                        "provider": "GroqCloud",
                        "model": model,
                        "latency_ms": latency_ms,
                        "prompt_tokens": p_tokens,
                        "completion_tokens": c_tokens,
                        "total_tokens": t_tokens,
                        "request_started_at": req_start_iso,
                        "request_finished_at": req_finish_iso,
                    },
                )
            except RateLimitError as e:
                last_error = f"Groq RateLimitError: {str(e)}"
                logger.warning(
                    "Groq RateLimitError encountered",
                    attempt=attempt,
                    error=str(e),
                )
                err_str = str(e).lower()
                if "daily" in err_str or "per-day" in err_str or "account_deactivated" in err_str:
                    logger.warning("Groq daily quota reached; halting retries", model=model)
                    break
                if attempt < max_retries:
                    delay = _parse_groq_retry_delay(str(e), min(60.0, 4.0 * attempt))
                    logger.info("Sleeping for retry after rate limit", delay=delay, attempt=attempt)
                    time.sleep(delay)
            except APIError as e:
                code = getattr(e, "status_code", None)
                msg = getattr(e, "message", str(e))
                last_error = f"Groq APIError ({code}): {msg}"
                logger.warning(
                    "Groq API error encountered",
                    attempt=attempt,
                    status_code=code,
                    message=msg,
                )
                if code in (401, 403):
                    break
                if attempt < max_retries:
                    time.sleep(3.0 * attempt)
            except Exception as e:
                last_error = f"Groq Exception: {str(e)}"
                logger.warning("Groq invocation exception", attempt=attempt, error=str(e))
                if attempt < max_retries:
                    time.sleep(2.0 * attempt)

        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        req_finish_iso = datetime.now(timezone.utc).isoformat()
        return GroqCallResult(
            status="LIVE_FAILED",
            provider="GroqCloud",
            model=model,
            error=last_error or "Unknown failure after retries",
            latency_ms=latency_ms,
            request_started_at=req_start_iso,
            request_finished_at=req_finish_iso,
            telemetry={
                "attempts": max_retries,
                "status": "LIVE_FAILED",
                "provider": "GroqCloud",
                "model": model,
                "error": last_error,
                "latency_ms": latency_ms,
                "request_started_at": req_start_iso,
                "request_finished_at": req_finish_iso,
            },
        )

    def generate_structured(
        self,
        prompt: str,
        schema_cls: Type[BaseModel],
        model: str = "openai/gpt-oss-120b",
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2500,
        max_retries: int = 4,
    ) -> GroqCallResult:
        """Execute structured JSON schema generation and Pydantic validation for the Classification Agent."""
        if not self.is_available:
            return GroqCallResult(
                status="LIVE_FAILED",
                provider="GroqCloud",
                model=model,
                error="GROQ_API_KEY is not configured or client failed to initialize",
            )

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        # Generate JSON schema from Pydantic model with strict additionalProperties: False
        raw_schema = schema_cls.model_json_schema()
        json_schema_dict = _make_strict_json_schema(raw_schema)
        response_format = {
            "type": "json_schema",
            "json_schema": {
                "name": schema_cls.__name__,
                "strict": True,
                "schema": json_schema_dict,
            },
        }

        t_start = time.perf_counter()
        req_start_iso = datetime.now(timezone.utc).isoformat()
        last_error = None

        for attempt in range(1, max_retries + 1):
            try:
                # First try native json_schema format
                try:
                    response = self._client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        response_format=response_format,
                    )
                except Exception as schema_err:
                    # Fallback to standard json_object mode if provider schema reject
                    logger.debug("Falling back to json_object response_format", error=str(schema_err))
                    response = self._client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        response_format={"type": "json_object"},
                    )

                latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
                req_finish_iso = datetime.now(timezone.utc).isoformat()

                usage = getattr(response, "usage", None)
                p_tokens = getattr(usage, "prompt_tokens", None) if usage else None
                c_tokens = getattr(usage, "completion_tokens", None) if usage else None
                t_tokens = getattr(usage, "total_tokens", None) if usage else None

                raw_text = ""
                if response.choices and len(response.choices) > 0:
                    raw_text = response.choices[0].message.content or ""

                # Validate with Pydantic
                parsed_obj = schema_cls.model_validate_json(raw_text)

                return GroqCallResult(
                    status="LIVE_SUCCESS",
                    provider="GroqCloud",
                    model=model,
                    content=raw_text,
                    parsed=parsed_obj,
                    prompt_tokens=p_tokens,
                    completion_tokens=c_tokens,
                    total_tokens=t_tokens,
                    latency_ms=latency_ms,
                    request_started_at=req_start_iso,
                    request_finished_at=req_finish_iso,
                    telemetry={
                        "attempt": attempt,
                        "status": "LIVE_SUCCESS",
                        "provider": "GroqCloud",
                        "model": model,
                        "latency_ms": latency_ms,
                        "prompt_tokens": p_tokens,
                        "completion_tokens": c_tokens,
                        "total_tokens": t_tokens,
                        "request_started_at": req_start_iso,
                        "request_finished_at": req_finish_iso,
                    },
                )
            except RateLimitError as e:
                last_error = f"Groq RateLimitError: {str(e)}"
                logger.warning(
                    "Groq structured RateLimitError encountered",
                    attempt=attempt,
                    error=str(e),
                )
                err_str = str(e).lower()
                if "daily" in err_str or "per-day" in err_str or "account_deactivated" in err_str:
                    logger.warning("Groq quota limit reached; halting retries", model=model)
                    break
                if attempt < max_retries:
                    delay = _parse_groq_retry_delay(str(e), min(60.0, 4.0 * attempt))
                    logger.info("Sleeping for retry after structured rate limit", delay=delay, attempt=attempt)
                    time.sleep(delay)
            except APIError as e:
                code = getattr(e, "status_code", None)
                msg = getattr(e, "message", str(e))
                last_error = f"Groq APIError ({code}): {msg}"
                logger.warning(
                    "Groq structured API error encountered",
                    attempt=attempt,
                    status_code=code,
                    message=msg,
                )
                if code in (401, 403):
                    break
                if attempt < max_retries:
                    time.sleep(3.0 * attempt)
            except Exception as e:
                last_error = f"Groq structured invocation exception: {str(e)}"
                logger.warning("Groq structured invocation exception", attempt=attempt, error=str(e))
                if attempt < max_retries:
                    time.sleep(2.0 * attempt)

        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        req_finish_iso = datetime.now(timezone.utc).isoformat()
        return GroqCallResult(
            status="LIVE_FAILED",
            provider="GroqCloud",
            model=model,
            error=last_error or "Unknown failure after retries",
            latency_ms=latency_ms,
            request_started_at=req_start_iso,
            request_finished_at=req_finish_iso,
            telemetry={
                "attempts": max_retries,
                "status": "LIVE_FAILED",
                "provider": "GroqCloud",
                "model": model,
                "error": last_error,
                "latency_ms": latency_ms,
                "request_started_at": req_start_iso,
                "request_finished_at": req_finish_iso,
            },
        )


_GROQ_CLIENT: Optional[GroqClient] = None


def get_groq_client() -> GroqClient:
    """Return singleton GroqClient instance."""
    global _GROQ_CLIENT
    if _GROQ_CLIENT is None:
        _GROQ_CLIENT = GroqClient()
    return _GROQ_CLIENT
