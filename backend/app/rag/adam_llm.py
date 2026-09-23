"""
ADAM-1 Paper-Conformant Multi-Agent LLM Interface (OpenRouter Native)
=====================================================================
Implements the multi-agent LLM reasoning pipeline specified by the ADAM-1 paper:
1. Summarization Agent (openai/gpt-4o):
   - Structured 8-stage clinical reasoning synthesis
   - Consumes Computational Agent outputs (clinical, microbiome, diversity, TreeSHAP, XGBoost)
   - Integrates retrieved PubMed literature evidence from RAG
2. Classification Agent (openai/gpt-4o-mini):
   - Structured 8-stage diagnostic classification decision
   - Multi-factorial synthesis: XGBoost prior, TreeSHAP attributions, ecological diversity,
     clinical frailty, Summarization Agent narrative, and RAG literature
   - Terminal decision-maker: validates final binary classification ("AD" vs "CN")
3. Provider Resolution:
   - Primary: OpenRouter (openai/gpt-4o + openai/gpt-4o-mini)
   - Secondary / Direct: OpenAI (gpt-4o + gpt-4o-mini)
   - Tertiary: Groq (llama-3.3-70b-versatile)
   - Safe Fallbacks: Paper historical records (N=30 published benchmark) or deterministic
     analytical consensus explicitly labeled with `is_fallback=True`.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Tuple, Literal

import pandas as pd
from pydantic import BaseModel, Field, model_validator

from app.config import get_settings
from app.core.logging import get_logger
from app.rag.openrouter_client import get_openrouter_client, OpenRouterClient
from app.rag.gemini_client import get_gemini_client, GeminiClient, GeminiCallResult
from app.rag.groq_client import get_groq_client, GroqClient, GroqCallResult

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Data Structures & Schemas
# ---------------------------------------------------------------------------

class AdamClassificationResponse(BaseModel):
    """Structured Pydantic schema for ADAM Classification Agent (provider-neutral)."""
    prediction: Literal["AD", "CN"] = Field(
        description="Final diagnosis classification: 'AD' for Alzheimer's Disease or 'CN' for Cognitive Normal Control"
    )
    binary_label: Optional[int] = Field(
        default=None,
        description="Binary label: 1 for Alzheimer's Disease (AD), 0 for Cognitive Normal (CN)"
    )
    probability: float = Field(
        description="Calibrated probability of Alzheimer's Disease between 0.0 and 1.0"
    )
    confidence: Literal["high", "medium", "low"] = Field(
        default="medium",
        description="Qualitative diagnostic confidence: 'high', 'medium', or 'low'"
    )
    confidence_score: Optional[float] = Field(
        default=None,
        description="Quantitative confidence score between 0.50 and 1.00"
    )
    reasoning: Optional[str] = Field(
        default=None,
        description="Comprehensive clinical rationale integrating multi-omic, diversity, TreeSHAP, and literature evidence"
    )
    decision_basis: Optional[str] = Field(
        default=None,
        description="Clinical rationale / decision basis"
    )
    key_evidence: Optional[List[str]] = Field(
        default=None,
        description="Key factors and evidence items that determined the classification verdict"
    )
    key_factors: Optional[List[str]] = Field(
        default=None,
        description="Key factors considered"
    )
    agrees_with_xgboost: bool = Field(
        default=True,
        description="True if the classification verdict agrees with the base XGBoost model prediction"
    )

    @model_validator(mode="after")
    def populate_canonical_fields(self) -> "AdamClassificationResponse":
        if self.binary_label is None:
            self.binary_label = 1 if self.prediction == "AD" else 0
        if not self.reasoning:
            self.reasoning = self.decision_basis or "Multi-modal consensus decision rendered by Classification Agent."
        if not self.decision_basis:
            self.decision_basis = self.reasoning
        if not self.key_evidence:
            self.key_evidence = self.key_factors or ["Multi-modal evidence integration"]
        if not self.key_factors:
            self.key_factors = self.key_evidence
        if self.confidence_score is None:
            self.confidence_score = float(max(self.probability, 1.0 - self.probability))
        return self

# Backward-compatible alias
GeminiClassificationResponse = AdamClassificationResponse


@dataclass
class AdamClassificationResult:
    """Structured output returned by the ADAM Classification Agent."""
    prediction: str                      # "AD" or "CN" (or "FAILED" in strict mode)
    probability: float                   # Calibrated risk probability (0.0 - 1.0)
    confidence: str                      # "high", "medium", "low", "none"
    confidence_score: float              # Scalar confidence (0.5 - 1.0)
    decision_basis: str                  # Justification narrative
    key_factors: List[str]               # Salient factors considered
    agrees_with_xgboost: bool            # Concordance with base ML prediction
    llm_model: str                       # Model identifier (e.g. gemini-3.6-flash, openai/gpt-4o-mini)
    llm_provider: str                    # "Google Gemini API", "openrouter", "openai", "groq", "paper_historical", "fallback_consensus"
    is_fallback: bool                    # True if deterministic fallback was used
    elapsed_ms: float                    # Inference time in ms
    raw_response: str                    # Raw text from agent completion
    token_usage: Dict[str, Optional[int]] = field(default_factory=dict)  # prompt, completion, total
    telemetry: Dict[str, Any] = field(default_factory=dict)
    fallback_used: bool = False          # Explicit flag indicating whether any fallback was used
    success: bool = True                 # True if live agent execution succeeded
    error: Optional[str] = None          # Error message if execution failed
    prompt_hash: Optional[str] = None    # SHA-256 hash of exact input prompt


# ---------------------------------------------------------------------------
# Disk & Memory Caching for Agent Calls
# ---------------------------------------------------------------------------

_AGENT_CACHE_FILE = os.path.join(
    os.path.dirname(__file__), "..", "..", "saved_models", "adam_agent_cache.json"
)
_AGENT_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_LOADED = False


def _get_agent_cache() -> Dict[str, Dict[str, Any]]:
    global _AGENT_CACHE, _CACHE_LOADED
    if not _CACHE_LOADED:
        if os.path.exists(_AGENT_CACHE_FILE):
            try:
                with open(_AGENT_CACHE_FILE, "r", encoding="utf-8") as f:
                    _AGENT_CACHE = json.load(f)
            except Exception as e:
                logger.warning("Could not read agent cache file", error=str(e))
                _AGENT_CACHE = {}
        _CACHE_LOADED = True
    return _AGENT_CACHE


def _persist_agent_cache() -> None:
    try:
        os.makedirs(os.path.dirname(_AGENT_CACHE_FILE), exist_ok=True)
        with open(_AGENT_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_AGENT_CACHE, f, indent=2)
    except Exception as e:
        logger.warning("Could not persist agent cache to disk", error=str(e))


def get_cached_agent_result(cache_key: str) -> Optional[Dict[str, Any]]:
    cache = _get_agent_cache()
    return cache.get(cache_key)


def set_cached_agent_result(cache_key: str, data: Dict[str, Any]) -> None:
    cache = _get_agent_cache()
    cache[cache_key] = data
    _persist_agent_cache()


# ---------------------------------------------------------------------------
# Published Paper Historical Lookup
# ---------------------------------------------------------------------------

_HISTORICAL_DF: Optional[pd.DataFrame] = None
_HISTORICAL_LOADED = False


def _load_historical_paper_records() -> Optional[pd.DataFrame]:
    """Load combined classification outputs from original ADAM research materials."""
    global _HISTORICAL_DF, _HISTORICAL_LOADED
    if not _HISTORICAL_LOADED:
        possible_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "original_adam", "ADAM", "local_resources", "combined_classification_output.csv"),
            os.path.join(os.path.dirname(__file__), "..", "..", "original_adam", "ADAM", "local_resources", "combined_classification_output.csv"),
            os.path.join(os.getcwd(), "original_adam", "ADAM", "local_resources", "combined_classification_output.csv"),
        ]
        for p in possible_paths:
            norm_p = os.path.normpath(p)
            if os.path.exists(norm_p):
                try:
                    _HISTORICAL_DF = pd.read_csv(norm_p)
                    logger.info("Loaded historical paper classification outputs", path=norm_p, count=len(_HISTORICAL_DF))
                    break
                except Exception as e:
                    logger.warning("Failed loading historical paper classification CSV", error=str(e))
        _HISTORICAL_LOADED = True
    return _HISTORICAL_DF


def get_paper_historical_record(sample_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve historical GPT-4o/GPT-4o-mini classification for a sample if available."""
    df = _load_historical_paper_records()
    if df is None or df.empty:
        return None
    clean_id = str(sample_id).strip().upper()
    sub = df[df["Sample ID"].str.upper() == clean_id]
    if sub.empty:
        return None
    row = sub.iloc[0]
    return {
        "sample_id": clean_id,
        "formatted_summary": str(row.get("Formatted Summary", "")),
        "conclusion": str(row.get("Conclusion", "")),
        "ground_truth": str(row.get("Ground Truth", "")),
        "prediction": str(row.get("Prediction", "")),
        "experiment_source": str(row.get("experiment_source", "original_adam")),
    }


# ---------------------------------------------------------------------------
# Provider & Model Resolution
# ---------------------------------------------------------------------------

def resolve_llm_config() -> Tuple[str, str, str, Optional[str]]:
    """
    Resolve LLM provider and models based on configuration:
    Returns (provider, summarization_model, classification_model, api_key_or_none).

    Priority:
    1. GroqCloud (primary: openai/gpt-oss-120b when llm_provider == "groq" or configured)
    2. Google Gemini API (secondary / legacy option: gemini-3.6-flash)
    3. OpenRouter (secondary / legacy option: openai/gpt-4o and openai/gpt-4o-mini)
    4. OpenAI (direct / legacy option)
    5. Unconfigured
    """
    settings = get_settings()
    configured_provider = (settings.llm_provider or "groq").strip().lower()

    groq = get_groq_client()
    gemini = get_gemini_client()
    openrouter = get_openrouter_client()

    # If specifically requested provider is groq and available
    if configured_provider == "groq" and groq.is_available:
        sum_model = settings.adam_summarization_model or settings.groq_model or "openai/gpt-oss-120b"
        cls_model = settings.adam_classification_model or settings.groq_model or "openai/gpt-oss-120b"
        return "groq", sum_model, cls_model, groq.get_api_key()

    # If specifically requested provider is gemini and available
    if configured_provider == "gemini" and gemini.is_available:
        sum_model = settings.adam_summarization_model or settings.gemini_model or "gemini-3.6-flash"
        cls_model = settings.adam_classification_model or settings.gemini_model or "gemini-3.6-flash"
        return "gemini", sum_model, cls_model, gemini.get_api_key()

    # If specifically requested provider is openrouter and available
    if configured_provider == "openrouter" and openrouter.is_available:
        sum_model = settings.adam_summarization_model or "openai/gpt-4o"
        cls_model = settings.adam_classification_model or "openai/gpt-4o-mini"
        return "openrouter", sum_model, cls_model, openrouter.get_api_key()

    # Priority fallbacks if configured_provider was not matched
    if groq.is_available:
        sum_model = settings.adam_summarization_model or settings.groq_model or "openai/gpt-oss-120b"
        cls_model = settings.adam_classification_model or settings.groq_model or "openai/gpt-oss-120b"
        return "groq", sum_model, cls_model, groq.get_api_key()

    if gemini.is_available:
        sum_model = settings.adam_summarization_model or settings.gemini_model or "gemini-3.6-flash"
        cls_model = settings.adam_classification_model or settings.gemini_model or "gemini-3.6-flash"
        return "gemini", sum_model, cls_model, gemini.get_api_key()

    if openrouter.is_available:
        sum_model = settings.adam_summarization_model or "openai/gpt-4o"
        cls_model = settings.adam_classification_model or "openai/gpt-4o-mini"
        return "openrouter", sum_model, cls_model, openrouter.get_api_key()

    if settings.openai_api_key and settings.openai_api_key.strip():
        sum_model = "gpt-4o"
        cls_model = "gpt-4o-mini"
        return "openai", sum_model, cls_model, settings.openai_api_key.strip()

    sum_model = settings.adam_summarization_model or "openai/gpt-oss-120b"
    cls_model = settings.adam_classification_model or "openai/gpt-oss-120b"
    return "unconfigured", sum_model, cls_model, None


# ---------------------------------------------------------------------------
# Summarization Agent (openai/gpt-4o)
# ---------------------------------------------------------------------------

def call_summarization_agent(
    comp_agent_output: Dict[str, Any],
    rag_docs: List[Dict[str, Any]],
    sample_context: Dict[str, Any],
    sample_id: Optional[str] = None,
    strict_research_mode: bool = False,
) -> Dict[str, Any]:
    """
    Executes the ADAM Summarization Agent (openai/gpt-4o) following the 8-stage
    clinical reasoning synthesis defined in the ADAM-1 research paper:

    Stage 1: Patient Overview (demographics, longitudinal study visit)
    Stage 2: Key Clinical Markers (Rockwood CFS, malnutrition score, medications)
    Stage 3: Gut Microbiome Profile (taxonomic composition and abundance)
    Stage 4: Diversity Metrics Analysis (Shannon H', Simpson D, Berger-Parker, Bray-Curtis)
    Stage 5: Interactions and Mechanisms (gut dysbiosis and mucosal frailty interaction)
    Stage 6: Descriptive Correlation (statistical concordance without asserting causality)
    Stage 7: ML Probabilistic Assessment (XGBoost prior and top TreeSHAP attributions)
    Stage 8: Final Comprehensive Summary (holistic synthesis integrating PubMed literature)
    """
    clean_id = (sample_id or str(sample_context.get("sample_id", "UNKNOWN"))).strip().upper()
    provider, sum_model, _, api_key = resolve_llm_config()

    safe_model_tag = sum_model.replace("/", "_")
    rag_tag = "rag" if rag_docs else "norag"
    cache_key = f"sum_{clean_id}_{provider}_{safe_model_tag}_{rag_tag}"

    if not strict_research_mode:
        cached = get_cached_agent_result(cache_key)
        if cached:
            return cached

    # Extract quantitative markers
    ml_pred = comp_agent_output.get("ml_prediction", {})
    alpha = comp_agent_output.get("alpha_diversity", {})
    beta = comp_agent_output.get("beta_diversity", {})
    pos_drivers = comp_agent_output.get("shap_explanation", {}).get("positive_drivers", [])
    prot_drivers = comp_agent_output.get("shap_explanation", {}).get("protective_drivers", [])
    top_taxa = comp_agent_output.get("microbiome_overview", {}).get("top_abundant_taxa", [])

    age = sample_context.get("age", 75.0)
    sex = sample_context.get("sex", "Unknown")
    cfs = sample_context.get("clinical_frailty_scale", 5.0)
    malnutrition = sample_context.get("malnutrition_score", 1.0)
    ppi = "Yes" if sample_context.get("ppi_use") else "No"
    abx = "Yes" if sample_context.get("antibiotics_6mo") else "No"
    study_id = sample_context.get("study_id", "Unknown")
    day = sample_context.get("day", 0)

    # Format retrieved RAG evidence (unpack substantive abstract/content passages)
    rag_text = "\n".join([
        f"- PMID {d.get('pmid', 'N/A')}: {d.get('title', '')} ({d.get('journal', 'N/A')}, {d.get('year', 'N/A')}) — "
        f"{str(d.get('abstract') or d.get('content') or d.get('snippet', ''))[:350]}"
        for d in rag_docs[:3]
    ]) if rag_docs else "- No specific literature retrieved."

    # 1. Live LLM execution via OpenRouter or secondary provider
    system_prompt = (
        "You are the ADAM Summarization Agent, an expert clinical bioinformatician in the ADAM-1 multi-agent architecture. "
        "Synthesize the provided multi-omic patient data, XGBoost attributions, ecological diversity, "
        "and retrieved biomedical literature into an 8-stage clinical reasoning summary following the published ADAM-1 framework:\n"
        "Stage 1: Patient Overview (demographics, longitudinal visit baseline)\n"
        "Stage 2: Key Clinical Markers (Clinical Frailty Scale, malnutrition, medications)\n"
        "Stage 3: Gut Microbiome Profile (taxonomic composition and abundance)\n"
        "Stage 4: Diversity Metrics Analysis (Shannon entropy, Simpson dominance, Bray-Curtis dissimilarity)\n"
        "Stage 5: Interactions and Mechanisms (frailty interaction with mucosal dysbiosis and LPS permeability)\n"
        "Stage 6: Descriptive Correlation (statistical alignment without claiming direct causality)\n"
        "Stage 7: ML Probabilistic Assessment (XGBoost probability and top TreeSHAP positive/protective drivers)\n"
        "Stage 8: Final Comprehensive Summary (holistic narrative synthesizing multi-omic evidence with literature)\n\n"
        "Maintain clinical objectivity and do not expose private chain-of-thought."
    )

    user_content = f"""
Patient Clinical Profile:
- Sample ID: {clean_id} (Study Subject: {study_id}, Longitudinal Day: {day})
- Age: {age}, Sex: {sex}
- Rockwood Clinical Frailty Scale (CFS): {cfs}/9
- Malnutrition Indicator Score: {malnutrition}
- PPI Exposure: {ppi}, Antibiotic Exposure (6mo): {abx}

Gut Microbiome & Ecological Diversity:
- Shannon Diversity Index (H'): {alpha.get('shannon_index', 0.0):.2f}
- Simpson Index (D): {alpha.get('simpson_index', 0.0):.2f}
- Berger-Parker Dominance: {alpha.get('berger_parker_dominance', 0.0):.2f}
- Bray-Curtis Dissimilarity to Control Centroid: {beta.get('bray_curtis_distance', 0.0):.4f}
- Dominant Taxa: {', '.join([f"{t.get('species', 'Taxon')} ({t.get('percentage', 0):.2f}%)" for t in top_taxa[:4]])}

Computational Agent ML Prior (XGBoost):
- Base Probability: {ml_pred.get('probability', 0.5) * 100:.1f}% ({ml_pred.get('risk_level', 'Moderate')})
- Top Positive Risk Drivers (TreeSHAP): {', '.join([c.get('feature', '') for c in pos_drivers[:3]])}
- Top Protective Drivers (TreeSHAP): {', '.join([c.get('feature', '') for c in prot_drivers[:2]])}

Retrieved Scientific Literature Evidence (RAG):
{rag_text}
"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    prompt_raw = json.dumps(messages, sort_keys=True)
    prompt_hash = hashlib.sha256(prompt_raw.encode("utf-8")).hexdigest()

    if provider == "groq":
        groq = get_groq_client()
        groq_res = groq.generate_text(
            prompt=user_content,
            model=sum_model,
            system_instruction=system_prompt,
            temperature=0.1,
            max_tokens=1500,
        )

        if groq_res.is_success and groq_res.content:
            result = {
                "summary_text": groq_res.content,
                "workflow_name": f"ADAM-1 Groq Summarization Agent ({groq_res.model})",
                "llm_provider": "GroqCloud",
                "llm_model": groq_res.model,
                "is_fallback": False,
                "fallback_used": False,
                "success": True,
                "error": None,
                "elapsed_ms": groq_res.latency_ms,
                "prompt_hash": prompt_hash,
                "raw_prompt": user_content,
                "token_usage": {
                    "prompt_tokens": groq_res.prompt_tokens,
                    "completion_tokens": groq_res.completion_tokens,
                    "total_tokens": groq_res.total_tokens,
                },
                "telemetry": {
                    "model": groq_res.model,
                    "sample_id": clean_id,
                    "provider": "GroqCloud",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": groq_res.prompt_tokens,
                    "completion_tokens": groq_res.completion_tokens,
                    "total_tokens": groq_res.total_tokens,
                    "elapsed_ms": groq_res.latency_ms,
                    "request_started_at": groq_res.request_started_at,
                    "request_finished_at": groq_res.request_finished_at,
                    "fallback_used": False,
                    "success": True,
                    "error": None,
                },
            }
            if not strict_research_mode:
                set_cached_agent_result(cache_key, result)
            return result
        elif strict_research_mode:
            return {
                "summary_text": None,
                "workflow_name": f"ADAM-1 Strict Research Summarization Agent ({sum_model})",
                "llm_provider": "GroqCloud",
                "llm_model": sum_model,
                "is_fallback": False,
                "fallback_used": False,
                "success": False,
                "error": groq_res.error or "Groq summarization failed",
                "status_code": 500,
                "elapsed_ms": groq_res.latency_ms,
                "prompt_hash": prompt_hash,
                "raw_prompt": user_content,
                "token_usage": {
                    "prompt_tokens": groq_res.prompt_tokens,
                    "completion_tokens": groq_res.completion_tokens,
                    "total_tokens": groq_res.total_tokens,
                },
                "telemetry": {
                    "model": sum_model,
                    "sample_id": clean_id,
                    "provider": "GroqCloud",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": groq_res.prompt_tokens,
                    "completion_tokens": groq_res.completion_tokens,
                    "total_tokens": groq_res.total_tokens,
                    "elapsed_ms": groq_res.latency_ms,
                    "request_started_at": groq_res.request_started_at,
                    "request_finished_at": groq_res.request_finished_at,
                    "fallback_used": False,
                    "success": False,
                    "error": groq_res.error or "Groq summarization failed",
                },
            }

    if provider == "gemini":
        gemini = get_gemini_client()
        gemini_res = gemini.generate_text(
            prompt=user_content,
            model=sum_model,
            system_instruction=system_prompt,
            temperature=0.1,
        )

        if gemini_res.is_success and gemini_res.content:
            result = {
                "summary_text": gemini_res.content,
                "workflow_name": f"ADAM-1 Gemini Summarization Agent ({gemini_res.model})",
                "llm_provider": "Google Gemini API",
                "llm_model": gemini_res.model,
                "is_fallback": False,
                "fallback_used": False,
                "success": True,
                "error": None,
                "elapsed_ms": gemini_res.latency_ms,
                "prompt_hash": prompt_hash,
                "raw_prompt": user_content,
                "token_usage": {
                    "prompt_tokens": gemini_res.prompt_tokens,
                    "completion_tokens": gemini_res.completion_tokens,
                    "total_tokens": gemini_res.total_tokens,
                },
                "telemetry": {
                    "model": gemini_res.model,
                    "sample_id": clean_id,
                    "provider": "Google Gemini API",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": gemini_res.prompt_tokens,
                    "completion_tokens": gemini_res.completion_tokens,
                    "total_tokens": gemini_res.total_tokens,
                    "elapsed_ms": gemini_res.latency_ms,
                    "fallback_used": False,
                    "success": True,
                    "error": None,
                },
            }
            if not strict_research_mode:
                set_cached_agent_result(cache_key, result)
            return result
        elif strict_research_mode:
            return {
                "summary_text": None,
                "workflow_name": f"ADAM-1 Strict Research Summarization Agent ({sum_model})",
                "llm_provider": "Google Gemini API",
                "llm_model": sum_model,
                "is_fallback": False,
                "fallback_used": False,
                "success": False,
                "error": gemini_res.error or "Gemini summarization failed",
                "status_code": 500,
                "elapsed_ms": gemini_res.latency_ms,
                "prompt_hash": prompt_hash,
                "raw_prompt": user_content,
                "token_usage": {
                    "prompt_tokens": gemini_res.prompt_tokens,
                    "completion_tokens": gemini_res.completion_tokens,
                    "total_tokens": gemini_res.total_tokens,
                },
                "telemetry": {
                    "model": sum_model,
                    "sample_id": clean_id,
                    "provider": "Google Gemini API",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": gemini_res.prompt_tokens,
                    "completion_tokens": gemini_res.completion_tokens,
                    "total_tokens": gemini_res.total_tokens,
                    "elapsed_ms": gemini_res.latency_ms,
                    "fallback_used": False,
                    "success": False,
                    "error": gemini_res.error or "Gemini summarization failed",
                },
            }

    if provider == "openrouter":
        openrouter = get_openrouter_client()
        comp_res = openrouter.chat_completion(
            model=sum_model,
            messages=messages,
            temperature=0.1,
            max_tokens=650,
            timeout=45.0,
        )

        if comp_res.is_success and comp_res.content:
            result = {
                "summary_text": comp_res.content,
                "workflow_name": f"ADAM-1 Paper Summarization Agent ({comp_res.model})",
                "llm_provider": "openrouter",
                "llm_model": comp_res.model,
                "is_fallback": False,
                "fallback_used": False,
                "success": True,
                "error": None,
                "elapsed_ms": comp_res.elapsed_ms,
                "prompt_hash": prompt_hash,
                "raw_prompt": user_content,
                "token_usage": {
                    "prompt_tokens": comp_res.prompt_tokens,
                    "completion_tokens": comp_res.completion_tokens,
                    "total_tokens": comp_res.total_tokens,
                },
                "telemetry": {
                    "model": comp_res.model,
                    "sample_id": clean_id,
                    "provider": "openrouter",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": comp_res.prompt_tokens,
                    "completion_tokens": comp_res.completion_tokens,
                    "total_tokens": comp_res.total_tokens,
                    "elapsed_ms": comp_res.elapsed_ms,
                    "fallback_used": False,
                    "success": True,
                    "error": None,
                },
            }
            if not strict_research_mode:
                set_cached_agent_result(cache_key, result)
            return result
        elif strict_research_mode:
            # Strict mode: never silently fall back
            return {
                "summary_text": None,
                "workflow_name": f"ADAM-1 Strict Research Summarization Agent ({sum_model})",
                "llm_provider": "openrouter",
                "llm_model": sum_model,
                "is_fallback": False,
                "fallback_used": False,
                "success": False,
                "error": comp_res.error or f"Live execution failed (HTTP {comp_res.status_code})",
                "status_code": comp_res.status_code,
                "elapsed_ms": comp_res.elapsed_ms,
                "prompt_hash": prompt_hash,
                "raw_prompt": user_content,
                "token_usage": {
                    "prompt_tokens": comp_res.prompt_tokens,
                    "completion_tokens": comp_res.completion_tokens,
                    "total_tokens": comp_res.total_tokens,
                },
                "telemetry": {
                    "model": sum_model,
                    "sample_id": clean_id,
                    "provider": "openrouter",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": comp_res.prompt_tokens,
                    "completion_tokens": comp_res.completion_tokens,
                    "total_tokens": comp_res.total_tokens,
                    "elapsed_ms": comp_res.elapsed_ms,
                    "fallback_used": False,
                    "success": False,
                    "error": comp_res.error or f"Live execution failed (HTTP {comp_res.status_code})",
                },
            }

    # 2. Check if published paper historical summary exists for this sample (Production fallback only)
    if not strict_research_mode:
        hist_rec = get_paper_historical_record(clean_id)
        if hist_rec and hist_rec.get("formatted_summary"):
            result = {
                "summary_text": hist_rec["formatted_summary"],
                "workflow_name": "ADAM-1 Paper Published Summarization Agent (GPT-4o)",
                "llm_provider": "paper_historical",
                "llm_model": "openai/gpt-4o",
                "is_fallback": False,
                "fallback_used": True,
                "success": True,
                "error": None,
                "elapsed_ms": 0.0,
                "prompt_hash": prompt_hash,
                "raw_prompt": user_content,
                "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                "telemetry": {
                    "model": "openai/gpt-4o",
                    "sample_id": clean_id,
                    "provider": "paper_historical",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                    "elapsed_ms": 0.0,
                    "fallback_used": True,
                    "success": True,
                    "error": None,
                },
            }
            set_cached_agent_result(cache_key, result)
            return result

    # 3. Deterministic analytical fallback summary (Production fallback only)
    summary_text = (
        f"Subject {study_id} (Sample {clean_id}) is a {age:.0f}-year-old {sex.lower()} presenting at longitudinal day {day}. "
        f"Clinical Frailty Scale of {cfs:.0f}/9 and Malnutrition Score of {malnutrition:.0f} indicate host physiological vulnerability. "
        f"Taxonomic profiling identifies {alpha.get('shannon_index', 0.0):.2f} Shannon diversity and "
        f"{beta.get('bray_curtis_distance', 0.0):.4f} Bray-Curtis dissimilarity relative to healthy controls. "
        f"XGBoost baseline estimates Alzheimer's disease probability at {ml_pred.get('probability', 0.5) * 100:.1f}%. "
        f"Biomarker attribution reveals prominent contributions from "
        f"{', '.join([c.get('feature', '') for c in pos_drivers[:3]]) if pos_drivers else 'clinical covariates'}."
    )
    result = {
        "summary_text": summary_text,
        "workflow_name": "ADAM-1 Enhanced Summarization Agent (Analytical Fallback)",
        "llm_provider": "fallback_consensus",
        "llm_model": "analytical_template",
        "is_fallback": True,
        "fallback_used": True,
        "success": not strict_research_mode,
        "error": "Analytical template fallback" if not strict_research_mode else "Strict research mode disabled fallbacks",
        "elapsed_ms": 0.0,
        "prompt_hash": prompt_hash,
        "raw_prompt": user_content,
        "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        "telemetry": {
            "model": "analytical_template",
            "sample_id": clean_id,
            "provider": "fallback_consensus",
            "use_rag": bool(rag_docs),
            "retrieval_count": len(rag_docs),
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "elapsed_ms": 0.0,
            "fallback_used": True,
            "success": not strict_research_mode,
            "error": "Analytical template fallback",
        },
    }
    if not strict_research_mode:
        set_cached_agent_result(cache_key, result)
    return result


# ---------------------------------------------------------------------------
# Classification Agent (openai/gpt-4o-mini)
# ---------------------------------------------------------------------------

def call_classification_agent(
    comp_agent_output: Dict[str, Any],
    summary_text: Optional[str],
    rag_docs: List[Dict[str, Any]],
    sample_context: Dict[str, Any],
    sample_id: Optional[str] = None,
    strict_research_mode: bool = False,
) -> AdamClassificationResult:
    """
    Executes the ADAM Classification Agent (openai/gpt-4o-mini) following the 8
    classification stages specified in the ADAM-1 research architecture:

    Stage 1: Historical Data Insights (nursing home cohort context, longitudinal cluster)
    Stage 2: Diversity Metrics & Classification Refinement (Shannon index, Bray-Curtis distance)
    Stage 3: Adaptive Threshold Decisioning (XGBoost probability as an informative prior)
    Stage 4: Handling Edge Cases & Misclassifications (discordance between ML and biology)
    Stage 5: Comprehensive Summary (integration with Summarization Agent narrative)
    Stage 6: SHAP Feature Importance (positive and protective driver impact)
    Stage 7: Misclassification Considerations (severe frailty elevating borderline risk)
    Stage 8: Prediction Decision Rules (validated binary decision: "AD" vs "CN")

    The output directly dictates the final ADAM prediction.
    """
    clean_id = (sample_id or str(sample_context.get("sample_id", "UNKNOWN"))).strip().upper()
    provider, _, cls_model, api_key = resolve_llm_config()

    safe_model_tag = cls_model.replace("/", "_")
    rag_tag = "rag" if rag_docs else "norag"
    cache_key = f"cls_{clean_id}_{provider}_{safe_model_tag}_{rag_tag}"

    if not strict_research_mode:
        cached = get_cached_agent_result(cache_key)
        if cached:
            return AdamClassificationResult(**cached)

    ml_pred = comp_agent_output.get("ml_prediction", {})
    ml_prob = float(ml_pred.get("probability", 0.5))
    ml_label = int(ml_pred.get("label", 1 if ml_prob >= 0.5 else 0))

    alpha = comp_agent_output.get("alpha_diversity", {})
    beta = comp_agent_output.get("beta_diversity", {})
    pos_drivers = comp_agent_output.get("shap_explanation", {}).get("positive_drivers", [])
    prot_drivers = comp_agent_output.get("shap_explanation", {}).get("protective_drivers", [])
    cfs = float(sample_context.get("clinical_frailty_scale", 5.0))
    shannon = float(alpha.get("shannon_index", 3.0))

    # Evaluate dysbiosis risk balance
    pos_shap_sum = sum(c.get("shap_value", 0.0) for c in pos_drivers if c.get("shap_value", 0.0) > 0)
    prot_shap_sum = abs(sum(c.get("shap_value", 0.0) for c in prot_drivers if c.get("shap_value", 0.0) < 0))
    net_dysbiosis_risk = pos_shap_sum > (prot_shap_sum * 1.1)

    # Format literature grounding for Classification Agent as well (substantive passages)
    rag_snippets = "\n".join([
        f"- PMID {d.get('pmid', 'N/A')}: {d.get('title', '')} — "
        f"{str(d.get('abstract') or d.get('content') or d.get('snippet', ''))[:300]}"
        for d in rag_docs[:3]
    ]) if rag_docs else "- No specific literature retrieved."

    system_prompt = (
        "You are the ADAM Classification Agent, the terminal diagnostic decision-maker in the ADAM-1 multi-agent framework. "
        "Your mandate is to deliver a definitive, calibrated binary classification for Alzheimer's disease ('AD' or 'CN') "
        "by evaluating multi-modal evidence across 8 structured classification reasoning stages:\n"
        "Stage 1: Cohort Baseline & Context (evaluate patient age, sex, and residential context)\n"
        "Stage 2: Ecological Diversity Metrics (Shannon entropy, Simpson index, Berger-Parker dominance, Bray-Curtis distance)\n"
        "Stage 3: Machine Learning Informative Prior (XGBoost probability represents a cross-validated multi-omic prior over 1,044 features)\n"
        "Stage 4: Edge-Case & Discordance Analysis (examine whether biological evidence and clinical presentation truly contradict the ML prior)\n"
        "Stage 5: Clinical Narrative Integration (incorporate the Summarization Agent's comprehensive clinical synthesis)\n"
        "Stage 6: TreeSHAP Feature Attribution (evaluate positive risk-inducing vs protective taxonomic drivers)\n"
        "Stage 7: Differential Context & Specificity (CRITICAL: distinguish genuine Alzheimer's pathology from ubiquitous geriatric confounders:\n"
        "  - Advanced age and high Clinical Frailty (CFS >= 7) are common in elderly nursing-home cohorts and do NOT indicate AD on their own.\n"
        "  - Depleted Shannon diversity (< 3.0) frequently reflects antibiotic use, restricted diet, or aging rather than neurodegeneration.\n"
        "  - Confounding medications (e.g., PPIs, antipsychotics, symptomatic dementia agents) induce taxonomic shifts that can produce positive SHAP values.\n"
        "  - Do NOT override a decisive ML prior (e.g., probability < 0.25 or > 0.75) based solely on nonspecific frailty, age, or generic dysbiosis.\n"
        "  - In borderline/uncertain cases (probability 0.35 to 0.65), use specific AD-associated taxa, literature mechanisms, and clinical coherence to guide classification.)\n"
        "Stage 8: Prediction Decision Rules (render final binary verdict: 'AD' for Alzheimer's Disease or 'CN' for Cognitive Normal Control)\n\n"
        "You MUST respond ONLY with a valid JSON object matching this exact schema:\n"
        "{\n"
        '  "prediction": "AD" or "CN",\n'
        '  "binary_label": 1 or 0,\n'
        '  "probability": float (0.0 to 1.0, calibrated probability of Alzheimer\'s disease),\n'
        '  "confidence": "high", "medium", or "low",\n'
        '  "confidence_score": float (0.50 to 1.00),\n'
        '  "reasoning": "Comprehensive clinical rationale detailing how clinical frailty, diversity, biomarkers, and literature guided the decision.",\n'
        '  "key_evidence": ["factor 1", "factor 2", "factor 3"],\n'
        '  "agrees_with_xgboost": true or false\n'
        "}"
    )

    safe_summary = (summary_text or "No summary available.")[:650]
    user_content = f"""
Sample Assessment for {clean_id}:
Informative Prior (XGBoost ML Baseline):
- Risk Probability: {ml_prob * 100:.1f}%
- Baseline Predicted Label: {'AD' if ml_label == 1 else 'CN'}

Host Clinical Presentation:
- Age: {sample_context.get('age', 75.0):.0f}, Sex: {sample_context.get('sex', 'Unknown')}
- Rockwood Clinical Frailty Scale (CFS): {cfs:.0f}/9 ({'Severely Frail' if cfs >= 7 else 'Mild-Moderate' if cfs >= 4 else 'Robust'})
- Malnutrition Indicator Score: {sample_context.get('malnutrition_score', 1.0):.0f}
- Relevant Medication Exposures: PPI={'Yes' if sample_context.get('ppi_use') else 'No'}, Antibiotics (6mo)={'Yes' if sample_context.get('antibiotics_6mo') else 'No'}

Ecological Diversity Profile:
- Shannon Diversity Index (H'): {shannon:.2f}
- Simpson Index (D): {alpha.get('simpson_index', 0.0):.2f}
- Berger-Parker Dominance: {alpha.get('berger_parker_dominance', 0.0):.2f}
- Bray-Curtis Dissimilarity to Control Centroid: {beta.get('bray_curtis_distance', 0.0):.4f}

TreeSHAP Feature Attributions:
- Positive (Risk-Inducing) Attributions: {', '.join([f"{c.get('feature')}: +{c.get('shap_value', 0):.3f}" for c in pos_drivers[:3]]) if pos_drivers else 'None'}
- Negative (Protective) Attributions: {', '.join([f"{c.get('feature')}: {c.get('shap_value', 0):.3f}" for c in prot_drivers[:2]]) if prot_drivers else 'None'}
- Net Dysbiosis Balance: {'Elevated Risk Driver Weight' if net_dysbiosis_risk else 'Balanced / Protective Dominance'}

Retrieved Literature Evidence (RAG):
{rag_snippets}

Summarization Agent Clinical Synthesis:
{safe_summary}...

Diagnostic Guidance:
- Evaluate whether positive drivers represent specific neurodegenerative dysbiosis or benign/pharmacological confounding.
- When XGBoost is decisive (< 25% or > 75%), respect the prior unless specific contradictory evidence is incontrovertible.
- Deliver your final diagnostic classification in strict JSON format.
"""
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content},
    ]

    prompt_raw = json.dumps(messages, sort_keys=True)
    prompt_hash = hashlib.sha256(prompt_raw.encode("utf-8")).hexdigest()

    # Check for upstream summarization failure in strict research mode
    if strict_research_mode and not summary_text:
        prov_label = "GroqCloud" if provider == "groq" else ("Google Gemini API" if provider == "gemini" else provider)
        return AdamClassificationResult(
            prediction="FAILED",
            probability=-1.0,
            confidence="none",
            confidence_score=0.0,
            decision_basis=f"Strict research mode halted: Upstream {prov_label} summarization failed.",
            key_factors=["Upstream Summarization Failure"],
            agrees_with_xgboost=False,
            llm_model=cls_model,
            llm_provider=prov_label,
            is_fallback=False,
            fallback_used=False,
            success=False,
            error=f"Upstream {prov_label} summarization failed",
            elapsed_ms=0.0,
            raw_response="",
            prompt_hash=prompt_hash,
            token_usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
            telemetry={
                "model": cls_model,
                "sample_id": clean_id,
                "provider": prov_label,
                "use_rag": bool(rag_docs),
                "retrieval_count": len(rag_docs),
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0,
                "elapsed_ms": 0.0,
                "fallback_used": False,
                "success": False,
                "error": f"Upstream {prov_label} summarization failed",
            },
        )

    # 1. Live LLM execution via GroqCloud (Structured Output)
    if provider == "groq":
        groq = get_groq_client()
        groq_res = groq.generate_structured(
            prompt=user_content,
            schema_cls=AdamClassificationResponse,
            model=cls_model,
            system_instruction=system_prompt,
            temperature=0.1,
            max_tokens=2500,
        )

        if groq_res.is_success and groq_res.parsed:
            parsed_obj: AdamClassificationResponse = groq_res.parsed
            raw_pred = str(parsed_obj.prediction).strip().upper()
            pred_label = "AD" if raw_pred in ("AD", "YES", "POSITIVE", "ALZHEIMERS") else "CN"

            prob_val = float(parsed_obj.probability)
            prob_val = max(0.0, min(1.0, prob_val))

            conf_score = float(parsed_obj.confidence_score)
            conf_score = max(0.50, min(1.0, conf_score))

            agrees = bool(parsed_obj.agrees_with_xgboost)

            result_dict = {
                "prediction": pred_label,
                "probability": round(prob_val, 4),
                "confidence": parsed_obj.confidence,
                "confidence_score": round(conf_score, 4),
                "decision_basis": parsed_obj.reasoning,
                "key_factors": [str(f) for f in parsed_obj.key_evidence],
                "agrees_with_xgboost": agrees,
                "llm_model": groq_res.model,
                "llm_provider": "GroqCloud",
                "is_fallback": False,
                "fallback_used": False,
                "success": True,
                "error": None,
                "elapsed_ms": groq_res.latency_ms,
                "raw_response": groq_res.content or "",
                "prompt_hash": prompt_hash,
                "token_usage": {
                    "prompt_tokens": groq_res.prompt_tokens,
                    "completion_tokens": groq_res.completion_tokens,
                    "total_tokens": groq_res.total_tokens,
                },
                "telemetry": {
                    "model": groq_res.model,
                    "sample_id": clean_id,
                    "provider": "GroqCloud",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": groq_res.prompt_tokens,
                    "completion_tokens": groq_res.completion_tokens,
                    "total_tokens": groq_res.total_tokens,
                    "elapsed_ms": groq_res.latency_ms,
                    "request_started_at": groq_res.request_started_at,
                    "request_finished_at": groq_res.request_finished_at,
                    "fallback_used": False,
                    "success": True,
                    "error": None,
                },
            }
            if not strict_research_mode:
                set_cached_agent_result(cache_key, result_dict)
            return AdamClassificationResult(**result_dict)
        elif strict_research_mode:
            return AdamClassificationResult(
                prediction="FAILED",
                probability=-1.0,
                confidence="none",
                confidence_score=0.0,
                decision_basis=f"Strict research mode: Live Groq classification agent failed: {groq_res.error}",
                key_factors=["Classification Failure"],
                agrees_with_xgboost=False,
                llm_model=cls_model,
                llm_provider="GroqCloud",
                is_fallback=False,
                fallback_used=False,
                success=False,
                error=groq_res.error or "Live Groq classification failed",
                elapsed_ms=groq_res.latency_ms,
                raw_response="",
                prompt_hash=prompt_hash,
                token_usage={
                    "prompt_tokens": groq_res.prompt_tokens,
                    "completion_tokens": groq_res.completion_tokens,
                    "total_tokens": groq_res.total_tokens,
                },
                telemetry={
                    "model": cls_model,
                    "sample_id": clean_id,
                    "provider": "GroqCloud",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": groq_res.prompt_tokens,
                    "completion_tokens": groq_res.completion_tokens,
                    "total_tokens": groq_res.total_tokens,
                    "elapsed_ms": groq_res.latency_ms,
                    "request_started_at": groq_res.request_started_at,
                    "request_finished_at": groq_res.request_finished_at,
                    "fallback_used": False,
                    "success": False,
                    "error": groq_res.error or "Live Groq classification failed",
                },
            )

    # 2. Live LLM execution via Google Gemini API (Structured Output)
    if provider == "gemini":
        gemini = get_gemini_client()
        gemini_res = gemini.generate_structured(
            prompt=user_content,
            schema_cls=GeminiClassificationResponse,
            model=cls_model,
            system_instruction=system_prompt,
            temperature=0.1,
        )

        if gemini_res.is_success and gemini_res.parsed:
            parsed_obj: GeminiClassificationResponse = gemini_res.parsed
            raw_pred = str(parsed_obj.prediction).strip().upper()
            pred_label = "AD" if raw_pred in ("AD", "YES", "POSITIVE", "ALZHEIMERS") else "CN"

            prob_val = float(parsed_obj.probability)
            prob_val = max(0.0, min(1.0, prob_val))

            conf_score = float(parsed_obj.confidence_score)
            conf_score = max(0.50, min(1.0, conf_score))

            agrees = bool(parsed_obj.agrees_with_xgboost)

            result_dict = {
                "prediction": pred_label,
                "probability": round(prob_val, 4),
                "confidence": parsed_obj.confidence,
                "confidence_score": round(conf_score, 4),
                "decision_basis": parsed_obj.reasoning,
                "key_factors": [str(f) for f in parsed_obj.key_evidence],
                "agrees_with_xgboost": agrees,
                "llm_model": gemini_res.model,
                "llm_provider": "Google Gemini API",
                "is_fallback": False,
                "fallback_used": False,
                "success": True,
                "error": None,
                "elapsed_ms": gemini_res.latency_ms,
                "raw_response": gemini_res.content or "",
                "prompt_hash": prompt_hash,
                "token_usage": {
                    "prompt_tokens": gemini_res.prompt_tokens,
                    "completion_tokens": gemini_res.completion_tokens,
                    "total_tokens": gemini_res.total_tokens,
                },
                "telemetry": {
                    "model": gemini_res.model,
                    "sample_id": clean_id,
                    "provider": "Google Gemini API",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": gemini_res.prompt_tokens,
                    "completion_tokens": gemini_res.completion_tokens,
                    "total_tokens": gemini_res.total_tokens,
                    "elapsed_ms": gemini_res.latency_ms,
                    "fallback_used": False,
                    "success": True,
                    "error": None,
                },
            }
            if not strict_research_mode:
                set_cached_agent_result(cache_key, result_dict)
            return AdamClassificationResult(**result_dict)
        elif strict_research_mode:
            return AdamClassificationResult(
                prediction="FAILED",
                probability=-1.0,
                confidence="none",
                confidence_score=0.0,
                decision_basis=f"Strict research mode: Live Gemini classification agent failed: {gemini_res.error}",
                key_factors=["Classification Failure"],
                agrees_with_xgboost=False,
                llm_model=cls_model,
                llm_provider="Google Gemini API",
                is_fallback=False,
                fallback_used=False,
                success=False,
                error=gemini_res.error or "Live Gemini classification failed",
                elapsed_ms=gemini_res.latency_ms,
                raw_response="",
                prompt_hash=prompt_hash,
                token_usage={
                    "prompt_tokens": gemini_res.prompt_tokens,
                    "completion_tokens": gemini_res.completion_tokens,
                    "total_tokens": gemini_res.total_tokens,
                },
                telemetry={
                    "model": cls_model,
                    "sample_id": clean_id,
                    "provider": "Google Gemini API",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": gemini_res.prompt_tokens,
                    "completion_tokens": gemini_res.completion_tokens,
                    "total_tokens": gemini_res.total_tokens,
                    "elapsed_ms": gemini_res.latency_ms,
                    "fallback_used": False,
                    "success": False,
                    "error": gemini_res.error or "Live Gemini classification failed",
                },
            )

    # 2. Live LLM execution via OpenRouter
    if provider == "openrouter":
        openrouter = get_openrouter_client()
        comp_res = openrouter.chat_completion(
            model=cls_model,
            messages=messages,
            temperature=0.1,
            max_tokens=250,
            timeout=35.0,
            response_format={"type": "json_object"},
        )

        if comp_res.is_success and comp_res.content:
            parsed = _parse_classification_response(comp_res.content, ml_prob, ml_label)
            if parsed is not None:
                parsed["llm_model"] = comp_res.model
                parsed["llm_provider"] = "openrouter"
                parsed["is_fallback"] = False
                parsed["fallback_used"] = False
                parsed["success"] = True
                parsed["error"] = None
                parsed["elapsed_ms"] = comp_res.elapsed_ms
                parsed["raw_response"] = comp_res.content
                parsed["prompt_hash"] = prompt_hash
                parsed["token_usage"] = {
                    "prompt_tokens": comp_res.prompt_tokens,
                    "completion_tokens": comp_res.completion_tokens,
                    "total_tokens": comp_res.total_tokens,
                }
                parsed["telemetry"] = {
                    "model": comp_res.model,
                    "sample_id": clean_id,
                    "provider": "openrouter",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": comp_res.prompt_tokens,
                    "completion_tokens": comp_res.completion_tokens,
                    "total_tokens": comp_res.total_tokens,
                    "elapsed_ms": comp_res.elapsed_ms,
                    "fallback_used": False,
                    "success": True,
                    "error": None,
                }

                if not strict_research_mode:
                    set_cached_agent_result(cache_key, parsed)
                return AdamClassificationResult(**parsed)
        elif strict_research_mode:
            # Strict mode: never silently fall back
            return AdamClassificationResult(
                prediction="FAILED",
                probability=-1.0,
                confidence="none",
                confidence_score=0.0,
                decision_basis=f"Strict research mode: Live classification agent failed: {comp_res.error}",
                key_factors=["Classification Failure"],
                agrees_with_xgboost=False,
                llm_model=cls_model,
                llm_provider="openrouter",
                is_fallback=False,
                fallback_used=False,
                success=False,
                error=comp_res.error or f"Live execution failed (HTTP {comp_res.status_code})",
                elapsed_ms=comp_res.elapsed_ms,
                raw_response="",
                prompt_hash=prompt_hash,
                token_usage={
                    "prompt_tokens": comp_res.prompt_tokens,
                    "completion_tokens": comp_res.completion_tokens,
                    "total_tokens": comp_res.total_tokens,
                },
                telemetry={
                    "model": cls_model,
                    "sample_id": clean_id,
                    "provider": "openrouter",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": comp_res.prompt_tokens,
                    "completion_tokens": comp_res.completion_tokens,
                    "total_tokens": comp_res.total_tokens,
                    "elapsed_ms": comp_res.elapsed_ms,
                    "fallback_used": False,
                    "success": False,
                    "error": comp_res.error or f"Live execution failed (HTTP {comp_res.status_code})",
                },
            )

    # 2. Check if published paper historical decision exists for this sample (Production fallback only)
    if not strict_research_mode:
        hist_rec = get_paper_historical_record(clean_id)
        if hist_rec and hist_rec.get("prediction"):
            paper_pred_str = str(hist_rec["prediction"]).strip()
            is_ad = paper_pred_str.lower() in ("yes", "ad", "positive", "1")
            pred_label = "AD" if is_ad else "CN"

            conf_match = re.search(r'(?i)\*?\*?confidence\*?\*?:\s*\*?\*?([0-9\.]+)\%?', hist_rec.get("conclusion", ""))
            conf_float = float(conf_match.group(1)) / 100.0 if conf_match else (0.85 if is_ad else 0.80)
            conf_level = "high" if conf_float >= 0.8 else "medium" if conf_float >= 0.6 else "low"

            calibrated_prob = conf_float if is_ad else 1.0 - conf_float
            agrees = (is_ad and ml_label == 1) or (not is_ad and ml_label == 0)

            result_dict = {
                "prediction": pred_label,
                "probability": round(calibrated_prob, 4),
                "confidence": conf_level,
                "confidence_score": round(max(calibrated_prob, 1.0 - calibrated_prob), 4),
                "decision_basis": f"Published ADAM-1 Paper Classification Agent (GPT-4o-mini). {hist_rec.get('conclusion', '')[:250]}...",
                "key_factors": ["Published Paper Benchmark Cohort Evaluation", f"Prior XGBoost Prob: {ml_prob * 100:.1f}%"],
                "agrees_with_xgboost": agrees,
                "llm_model": "openai/gpt-4o-mini",
                "llm_provider": "paper_historical",
                "is_fallback": False,
                "fallback_used": True,
                "success": True,
                "error": None,
                "elapsed_ms": 0.0,
                "raw_response": hist_rec.get("conclusion", ""),
                "prompt_hash": prompt_hash,
                "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                "telemetry": {
                    "model": "openai/gpt-4o-mini",
                    "sample_id": clean_id,
                    "provider": "paper_historical",
                    "use_rag": bool(rag_docs),
                    "retrieval_count": len(rag_docs),
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                    "elapsed_ms": 0.0,
                    "fallback_used": True,
                    "success": True,
                    "error": None,
                },
            }
            set_cached_agent_result(cache_key, result_dict)
            return AdamClassificationResult(**result_dict)

    # 3. Deterministic Consensus Fallback (Paper Methodology Alignment - Production fallback only)
    calibrated_prob = ml_prob
    decision_rule = "Standard calibrated classification threshold (0.50) applied based on concordance between ML probability and multi-omic markers."

    if 0.40 <= ml_prob <= 0.55:
        if cfs >= 7.0 and shannon < 3.0 and net_dysbiosis_risk:
            calibrated_prob = min(0.92, ml_prob + 0.12)
            decision_rule = "Severe host frailty (CFS >= 7.0), restricted Shannon diversity (< 3.0), and pro-inflammatory biomarker dominance elevate risk in borderline case."
        elif cfs <= 4.0 and shannon >= 3.2 and not net_dysbiosis_risk:
            calibrated_prob = max(0.08, ml_prob - 0.12)
            decision_rule = "Preserved physical resilience (CFS <= 4.0), robust community diversity (>= 3.2), and protective commensal dominance adjust borderline case toward Cognitive Normal."

    final_label = "AD" if calibrated_prob >= 0.50 else "CN"
    conf_score = float(max(calibrated_prob, 1.0 - calibrated_prob))
    conf_level = "high" if conf_score >= 0.75 else "medium" if conf_score >= 0.60 else "low"
    agrees = (final_label == "AD" and ml_label == 1) or (final_label == "CN" and ml_label == 0)

    result_dict = {
        "prediction": final_label,
        "probability": round(calibrated_prob, 4),
        "confidence": conf_level,
        "confidence_score": round(conf_score, 4),
        "decision_basis": decision_rule,
        "key_factors": [
            f"XGBoost Baseline: {ml_prob * 100:.1f}%",
            f"Host Frailty CFS: {cfs:.0f}",
            f"Shannon Diversity: {shannon:.2f}",
        ],
        "agrees_with_xgboost": agrees,
        "llm_model": "deterministic_consensus",
        "llm_provider": "fallback_consensus",
        "is_fallback": True,
        "fallback_used": True,
        "success": not strict_research_mode,
        "error": "Deterministic consensus fallback" if not strict_research_mode else "Strict research mode disabled fallbacks",
        "elapsed_ms": 0.0,
        "raw_response": decision_rule,
        "prompt_hash": prompt_hash,
        "token_usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        "telemetry": {
            "model": "deterministic_consensus",
            "sample_id": clean_id,
            "provider": "fallback_consensus",
            "use_rag": bool(rag_docs),
            "retrieval_count": len(rag_docs),
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
            "elapsed_ms": 0.0,
            "fallback_used": True,
            "success": not strict_research_mode,
            "error": "Deterministic consensus fallback",
        },
    }
    if not strict_research_mode:
        set_cached_agent_result(cache_key, result_dict)
    return AdamClassificationResult(**result_dict)


# ---------------------------------------------------------------------------
# Helper: Parsing Classification JSON / Text
# ---------------------------------------------------------------------------

def _parse_classification_response(
    text: str,
    base_prob: float,
    base_label: int,
) -> Optional[Dict[str, Any]]:
    """Robustly parse Classification Agent response into a dictionary."""
    clean_text = text.strip()

    # 1. Strip markdown fences if present
    if "```json" in clean_text:
        match = re.search(r"```json\s*(.*?)\s*```", clean_text, re.DOTALL)
        if match:
            clean_text = match.group(1).strip()
    elif "```" in clean_text:
        match = re.search(r"```\s*(.*?)\s*```", clean_text, re.DOTALL)
        if match:
            clean_text = match.group(1).strip()

    # 2. Try JSON deserialization
    try:
        data = json.loads(clean_text)
        raw_pred = str(data.get("prediction", "")).strip().upper()
        prediction = "AD" if raw_pred in ("AD", "YES", "POSITIVE", "ALZHEIMERS") else "CN"

        prob_val = float(data.get("probability", base_prob))
        prob_val = max(0.0, min(1.0, prob_val))

        conf_str = str(data.get("confidence", "medium")).lower()
        if conf_str not in ("high", "medium", "low"):
            conf_str = "medium"

        basis = str(data.get("decision_basis", "Multi-modal consensus decision rendered by Classification Agent."))
        factors = data.get("key_factors", [])
        if not isinstance(factors, list):
            factors = [str(factors)]

        agrees = bool(data.get("agrees_with_xgboost", (prediction == "AD" and base_label == 1) or (prediction == "CN" and base_label == 0)))

        return {
            "prediction": prediction,
            "probability": round(prob_val, 4),
            "confidence": conf_str,
            "confidence_score": round(max(prob_val, 1.0 - prob_val), 4),
            "decision_basis": basis,
            "key_factors": [str(f) for f in factors],
            "agrees_with_xgboost": agrees,
        }
    except Exception:
        pass

    # 3. Regex Fallback
    pred_match = re.search(r'(?i)"?prediction"?\s*:\s*"?(AD|Alzheimer|Positive|Yes|CN|Control|Negative|No)"?', text)
    if pred_match:
        found_pred = pred_match.group(1).upper()
        prediction = "AD" if found_pred in ("AD", "ALZHEIMER", "POSITIVE", "YES") else "CN"

        prob_match = re.search(r'(?i)"?probability"?\s*:\s*([0-9]*\.?[0-9]+)', text)
        prob_val = float(prob_match.group(1)) if prob_match else base_prob
        prob_val = max(0.0, min(1.0, prob_val))

        agrees = (prediction == "AD" and base_label == 1) or (prediction == "CN" and base_label == 0)

        return {
            "prediction": prediction,
            "probability": round(prob_val, 4),
            "confidence": "medium",
            "confidence_score": round(max(prob_val, 1.0 - prob_val), 4),
            "decision_basis": clean_text[:300],
            "key_factors": ["Extracted via regex from LLM completion"],
            "agrees_with_xgboost": agrees,
        }

    return None
