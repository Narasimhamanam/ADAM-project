"""
Tests for Centralized OpenRouter Client & Multi-Agent Paper-Conformant Integration
==================================================================================
"""
import json
import pytest
from unittest.mock import patch, MagicMock
import httpx

from app.rag.openrouter_client import OpenRouterClient, OpenRouterCompletionResult
from app.rag.adam_llm import (
    resolve_llm_config,
    call_summarization_agent,
    call_classification_agent,
    _parse_classification_response,
    AdamClassificationResult,
)


def test_openrouter_client_lazy_init():
    """Verify OpenRouterClient initializes cleanly without crashing when key is empty."""
    client = OpenRouterClient(api_key="")
    assert not client.is_available
    assert client.get_api_key() is None

    res = client.chat_completion(
        model="openai/gpt-4o",
        messages=[{"role": "user", "content": "hello"}],
    )
    assert not res.is_success
    assert "not configured" in res.error.lower()


def test_openrouter_client_headers():
    """Verify OpenRouterClient adds HTTP-Referer, X-Title, and Authorization headers."""
    client = OpenRouterClient(
        api_key="sk-or-v1-testkey12345",
        app_name="ADAM-1 Test App",
        site_url="https://adam-test.example.com",
    )
    assert client.is_available
    headers = client._get_headers()
    assert headers["Authorization"] == "Bearer sk-or-v1-testkey12345"
    assert headers["HTTP-Referer"] == "https://adam-test.example.com"
    assert headers["X-Title"] == "ADAM-1 Test App"
    assert headers["Content-Type"] == "application/json"


def test_openrouter_client_success_mock():
    """Verify chat_completion correctly parses choices, usage, and telemetry on 200 OK."""
    client = OpenRouterClient(api_key="sk-or-v1-testkey12345")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "model": "openai/gpt-4o",
        "choices": [
            {
                "message": {"content": "Clinical synthesis complete.", "role": "assistant"},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 120,
            "completion_tokens": 45,
            "total_tokens": 165,
        },
    }

    with patch.object(httpx.Client, "post", return_value=mock_resp):
        res = client.chat_completion(
            model="openai/gpt-4o",
            messages=[{"role": "user", "content": "analyze patient"}],
        )
        assert res.is_success
        assert res.content == "Clinical synthesis complete."
        assert res.model == "openai/gpt-4o"
        assert res.prompt_tokens == 120
        assert res.completion_tokens == 45
        assert res.total_tokens == 165
        assert res.elapsed_ms >= 0.0


def test_openrouter_client_auth_failure_circuit_breaker():
    """Verify 401/403 triggers circuit breaker, disables key, and doesn't loop retries."""
    client = OpenRouterClient(api_key="sk-or-invalid-test-key")

    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.text = "Unauthorized: Invalid API Key"

    with patch.object(httpx.Client, "post", return_value=mock_resp):
        res = client.chat_completion(
            model="openai/gpt-4o",
            messages=[{"role": "user", "content": "test"}],
        )
        assert not res.is_success
        assert res.status_code == 401
        assert "authentication failure" in res.error.lower()
        # Circuit breaker: client should now be marked unavailable
        assert not client.is_available


def test_parse_classification_response_strict_json():
    """Verify robust JSON parser extracts valid fields with bounds checking."""
    raw_json = json.dumps({
        "prediction": "AD",
        "probability": 0.84,
        "confidence": "high",
        "decision_basis": "Severe mucosal dysbiosis and high frailty.",
        "key_factors": ["Shannon diversity < 2.5", "High CFS"],
        "agrees_with_xgboost": True,
    })
    parsed = _parse_classification_response(raw_json, base_prob=0.8, base_label=1)
    assert parsed is not None
    assert parsed["prediction"] == "AD"
    assert parsed["probability"] == 0.84
    assert parsed["confidence"] == "high"
    assert parsed["agrees_with_xgboost"] is True
    assert len(parsed["key_factors"]) == 2


def test_parse_classification_response_markdown_fence():
    """Verify JSON embedded in markdown code blocks is stripped and parsed."""
    wrapped = "```json\n" + json.dumps({
        "prediction": "CN",
        "probability": 0.22,
        "confidence": "high",
        "decision_basis": "Robust physical resilience and intact microbial diversity.",
        "key_factors": ["High Shannon entropy", "Low CFS"],
        "agrees_with_xgboost": False,
    }) + "\n```"
    parsed = _parse_classification_response(wrapped, base_prob=0.6, base_label=1)
    assert parsed is not None
    assert parsed["prediction"] == "CN"
    assert parsed["probability"] == 0.22
    assert parsed["agrees_with_xgboost"] is False


def test_classification_agent_governs_prediction_disagreement():
    """Verify when Classification Agent disagrees with XGBoost, the agent's verdict prevails."""
    comp_output = {
        "ml_prediction": {"probability": 0.65, "label": 1, "risk_level": "High"},
        "shap_explanation": {"positive_drivers": [], "protective_drivers": []},
        "alpha_diversity": {"shannon_index": 3.8},
        "beta_diversity": {"bray_curtis_distance": 0.3},
        "microbiome_overview": {"top_abundant_taxa": []},
    }
    sample_context = {
        "sample_id": "TEST_DISCORDANT",
        "study_id": "SUBJ_999",
        "age": 70,
        "clinical_frailty_scale": 3.0,
        "malnutrition_score": 0.0,
    }
    mock_llm_json = json.dumps({
        "prediction": "CN",
        "probability": 0.30,
        "confidence": "high",
        "decision_basis": "Patient demonstrates physical resilience and high diversity; overriding borderline ML prior.",
        "key_factors": ["CFS 3.0", "Shannon 3.8"],
        "agrees_with_xgboost": False,
    })

    with patch("app.rag.adam_llm.resolve_llm_config", return_value=("openrouter", "openai/gpt-4o", "openai/gpt-4o-mini", "mock_key")):
        with patch("app.rag.adam_llm.get_openrouter_client") as mock_get_client:
            mock_client = MagicMock()
            mock_client.is_available = True
            mock_client.chat_completion.return_value = OpenRouterCompletionResult(
                content=mock_llm_json,
                model="openai/gpt-4o-mini",
                elapsed_ms=45.0,
                prompt_tokens=250,
                completion_tokens=80,
                total_tokens=330,
            )
            mock_get_client.return_value = mock_client

            cls_result = call_classification_agent(
                comp_agent_output=comp_output,
                summary_text="Patient has mild profile.",
                rag_docs=[{"pmid": "12345", "title": "Test Paper", "snippet": "Microbiome diversity preserves cognition."}],
                sample_context=sample_context,
                sample_id="TEST_DISCORDANT",
            )

            # Verification:
            # 1. Prediction must be CN despite XGBoost predicting 1 (AD)
            assert cls_result.prediction == "CN"
            assert cls_result.agrees_with_xgboost is False
            assert cls_result.llm_provider == "openrouter"
            assert cls_result.llm_model == "openai/gpt-4o-mini"
            assert cls_result.is_fallback is False
            assert cls_result.token_usage["total_tokens"] == 330
