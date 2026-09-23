"""
Centralized OpenRouter Client & Telemetry Engine
=================================================
Provides a robust, reusable interface for OpenRouter completions supporting:
- openai/gpt-4o (Summarization Agent)
- openai/gpt-4o-mini (Classification Agent)
- Configurable timeouts, exponential backoff retries for transient errors (429, 5xx, timeouts)
- OpenRouter headers (HTTP-Referer, X-Title)
- Safe error handling (zero key leakage)
- Circuit breaker for authentication errors (401/403)
- Detailed performance & token telemetry
- Lazy initialization: does not fail at startup when API key is missing
"""
from __future__ import annotations

import asyncio
import json
import os
import random
import time
from dataclasses import dataclass
from typing import Dict, Any, List, Optional, Tuple

import httpx

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Tracks invalidated API keys across the process runtime (prevents spamming bad keys)
_FAILED_KEYS: set[str] = set()


@dataclass
class OpenRouterCompletionResult:
    """Telemetry-rich completion result from OpenRouter."""
    content: Optional[str]
    model: str
    elapsed_ms: float
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    finish_reason: Optional[str] = None
    error: Optional[str] = None
    retries_attempted: int = 0
    status_code: Optional[int] = None

    @property
    def is_success(self) -> bool:
        return self.content is not None and self.error is None


class OpenRouterClient:
    """
    Centralized HTTP client for OpenRouter API (https://openrouter.ai/api/v1).
    Features lazy initialization, automatic retries with backoff, and usage telemetry.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        app_name: Optional[str] = None,
        site_url: Optional[str] = None,
        default_timeout: float = 35.0,
        max_retries: int = 2,
    ):
        settings = get_settings()
        if api_key is not None:
            self._api_key = api_key.strip()
        else:
            self._api_key = (
                os.environ.get("OPENROUTER_API_KEY")
                or settings.openrouter_api_key
                or ""
            ).strip()
        self.base_url = (
            base_url
            or os.environ.get("OPENROUTER_BASE_URL")
            or settings.openrouter_base_url
            or "https://openrouter.ai/api/v1"
        ).rstrip("/")
        self.app_name = (
            app_name
            or getattr(settings, "openrouter_app_name", None)
            or "ADAM-1 Enhanced"
        )
        self.site_url = (
            site_url
            or getattr(settings, "openrouter_site_url", None)
            or "http://localhost:5173"
        )
        self.default_timeout = default_timeout
        self.max_retries = max_retries

    @property
    def is_available(self) -> bool:
        """Check whether a non-empty, non-blacklisted API key is configured."""
        if not self._api_key:
            return False
        return self._api_key not in _FAILED_KEYS

    def get_api_key(self) -> Optional[str]:
        """Return configured key or None if unconfigured or blacklisted."""
        if not self.is_available:
            return None
        return self._api_key

    def _get_headers(self) -> Dict[str, str]:
        """Construct standard OpenRouter request headers."""
        headers = {
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.app_name,
        }
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    def chat_completion(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 1500,
        timeout: Optional[float] = None,
        response_format: Optional[Dict[str, str]] = None,
    ) -> OpenRouterCompletionResult:
        """
        Execute synchronous chat completion with retries and telemetry.
        """
        if not self.is_available:
            return OpenRouterCompletionResult(
                content=None,
                model=model,
                elapsed_ms=0.0,
                error="OpenRouter API key is not configured or has been disabled due to authentication failure.",
            )

        timeout_sec = timeout or self.default_timeout
        url = f"{self.base_url}/chat/completions"
        headers = self._get_headers()
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            payload["response_format"] = response_format

        t0 = time.perf_counter()
        retries = 0
        last_error: Optional[str] = None
        last_status: Optional[int] = None

        while retries <= self.max_retries:
            try:
                with httpx.Client(timeout=timeout_sec) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    last_status = resp.status_code
                    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)

                    if resp.status_code == 200:
                        data = resp.json()
                        choice = data.get("choices", [{}])[0]
                        msg = choice.get("message", {})
                        content = msg.get("content")
                        finish_reason = choice.get("finish_reason")

                        usage = data.get("usage", {})
                        prompt_tokens = usage.get("prompt_tokens", 0)
                        comp_tokens = usage.get("completion_tokens", 0)
                        tot_tokens = usage.get("total_tokens", prompt_tokens + comp_tokens)

                        return OpenRouterCompletionResult(
                            content=content,
                            model=data.get("model", model),
                            elapsed_ms=elapsed_ms,
                            prompt_tokens=prompt_tokens,
                            completion_tokens=comp_tokens,
                            total_tokens=tot_tokens,
                            finish_reason=finish_reason,
                            error=None,
                            retries_attempted=retries,
                            status_code=200,
                        )

                    # Authentication failure: fail immediately, do not retry, blacklist key
                    if resp.status_code in (401, 403):
                        _FAILED_KEYS.add(self._api_key)
                        err_msg = f"OpenRouter authentication failure (HTTP {resp.status_code}). API key disabled."
                        logger.warning(
                            "OpenRouter auth failed; disabling key for this session",
                            status_code=resp.status_code,
                            model=model,
                        )
                        return OpenRouterCompletionResult(
                            content=None,
                            model=model,
                            elapsed_ms=elapsed_ms,
                            error=err_msg,
                            retries_attempted=retries,
                            status_code=resp.status_code,
                        )

                    # Transient status codes: 429, 500, 502, 503, 504 -> Retry
                    err_text = resp.text[:300]
                    last_error = f"HTTP {resp.status_code}: {err_text}"
                    logger.warning(
                        "OpenRouter returned non-200 status",
                        status_code=resp.status_code,
                        model=model,
                        retry=retries,
                        error=err_text,
                    )

            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)
                last_error = f"Network/Timeout error: {type(exc).__name__} - {str(exc)}"
                logger.warning(
                    "OpenRouter request network or timeout error",
                    model=model,
                    retry=retries,
                    error=last_error,
                )
            except Exception as exc:
                elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)
                last_error = f"Unexpected client error: {str(exc)}"
                logger.warning("OpenRouter unexpected client exception", error=str(exc))

            retries += 1
            if last_status in (401, 402):
                break
            if retries <= self.max_retries:
                # Exponential backoff with jitter: (1.0s, 2.0s...)
                backoff = (1.5 ** retries) + random.uniform(0.1, 0.5)
                time.sleep(backoff)

        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)
        return OpenRouterCompletionResult(
            content=None,
            model=model,
            elapsed_ms=elapsed_ms,
            error=last_error or "OpenRouter request failed after retries.",
            retries_attempted=retries - 1,
            status_code=last_status,
        )

    async def achat_completion(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 1500,
        timeout: Optional[float] = None,
        response_format: Optional[Dict[str, str]] = None,
    ) -> OpenRouterCompletionResult:
        """
        Execute asynchronous chat completion with retries and telemetry.
        """
        if not self.is_available:
            return OpenRouterCompletionResult(
                content=None,
                model=model,
                elapsed_ms=0.0,
                error="OpenRouter API key is not configured or has been disabled.",
            )

        timeout_sec = timeout or self.default_timeout
        url = f"{self.base_url}/chat/completions"
        headers = self._get_headers()
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            payload["response_format"] = response_format

        t0 = time.perf_counter()
        retries = 0
        last_error: Optional[str] = None
        last_status: Optional[int] = None

        while retries <= self.max_retries:
            try:
                async with httpx.AsyncClient(timeout=timeout_sec) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    last_status = resp.status_code
                    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)

                    if resp.status_code == 200:
                        data = resp.json()
                        choice = data.get("choices", [{}])[0]
                        msg = choice.get("message", {})
                        content = msg.get("content")
                        finish_reason = choice.get("finish_reason")

                        usage = data.get("usage", {})
                        prompt_tokens = usage.get("prompt_tokens", 0)
                        comp_tokens = usage.get("completion_tokens", 0)
                        tot_tokens = usage.get("total_tokens", prompt_tokens + comp_tokens)

                        return OpenRouterCompletionResult(
                            content=content,
                            model=data.get("model", model),
                            elapsed_ms=elapsed_ms,
                            prompt_tokens=prompt_tokens,
                            completion_tokens=comp_tokens,
                            total_tokens=tot_tokens,
                            finish_reason=finish_reason,
                            error=None,
                            retries_attempted=retries,
                            status_code=200,
                        )

                    if resp.status_code in (401, 403):
                        _FAILED_KEYS.add(self._api_key)
                        err_msg = f"OpenRouter authentication failure (HTTP {resp.status_code}). API key disabled."
                        logger.warning(
                            "OpenRouter async auth failed; disabling key",
                            status_code=resp.status_code,
                            model=model,
                        )
                        return OpenRouterCompletionResult(
                            content=None,
                            model=model,
                            elapsed_ms=elapsed_ms,
                            error=err_msg,
                            retries_attempted=retries,
                            status_code=resp.status_code,
                        )

                    err_text = resp.text[:300]
                    last_error = f"HTTP {resp.status_code}: {err_text}"
                    logger.warning(
                        "OpenRouter async returned non-200 status",
                        status_code=resp.status_code,
                        model=model,
                        retry=retries,
                    )

            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)
                last_error = f"Network/Timeout error: {type(exc).__name__} - {str(exc)}"
            except Exception as exc:
                elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)
                last_error = f"Unexpected client error: {str(exc)}"

            retries += 1
            if last_status in (401, 402):
                break
            if retries <= self.max_retries:
                backoff = (1.5 ** retries) + random.uniform(0.1, 0.5)
                await asyncio.sleep(backoff)

        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)
        return OpenRouterCompletionResult(
            content=None,
            model=model,
            elapsed_ms=elapsed_ms,
            error=last_error or "OpenRouter async request failed after retries.",
            retries_attempted=retries - 1,
            status_code=last_status,
        )


# Singleton factory with lazy instantiation
_GLOBAL_CLIENT: Optional[OpenRouterClient] = None


def get_openrouter_client() -> OpenRouterClient:
    """Return the global cached OpenRouterClient instance."""
    global _GLOBAL_CLIENT
    if _GLOBAL_CLIENT is None:
        _GLOBAL_CLIENT = OpenRouterClient()
    return _GLOBAL_CLIENT
