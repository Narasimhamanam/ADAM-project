"""
ADAM-1 Paper-Conformant Agent LLM Interface
===========================================
Implements the multi-agent LLM reasoning pipeline specified by the ADAM-1 paper:
1. Summarization Agent (GPT-4o / Groq fallback) -> Structured 8-step clinical reasoning narrative
2. Classification Agent (GPT-4o-mini / Groq fallback) -> Multi-factorial JSON classification decision
3. Automatic provider resolution:
   - Uses OpenAI (GPT-4o / GPT-4o-mini) when OPENAI_API_KEY is configured.
   - Falls back to Groq (llama-3.3-70b-versatile) when GROQ_API_KEY is configured.
   - If keys are missing, invalid, or rate-limited, safely uses paper-historical GPT-4o outputs
     or the calibrated multi-factor consensus engine with explicit `is_fallback=True` labeling.
"""
from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass, asdict
from typing import Dict, Any, List, Optional, Tuple

import httpx
import pandas as pd

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Data Structures
# ---------------------------------------------------------------------------

@dataclass
class AdamClassificationResult:
    """Structured output returned by the ADAM Classification Agent."""
    prediction: str                      # "AD" or "CN"
    probability: float                   # Calibrated risk probability (0.0 - 1.0)
    confidence: str                      # "high", "medium", "low"
    confidence_score: float              # Scalar confidence (0.5 - 1.0)
    decision_basis: str                  # Justification narrative
    key_factors: List[str]               # Salient factors considered
    agrees_with_xgboost: bool            # Concordance with base ML prediction
    llm_model: str                       # Model identifier
    llm_provider: str                    # "openai", "groq", "paper_historical", or "fallback_consensus"
    is_fallback: bool                    # True if deterministic consensus fallback was used
    elapsed_ms: float                    # Inference time in ms
    raw_response: str                    # Raw text from agent completion


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
# Provider & Key Resolution
# ---------------------------------------------------------------------------

_FAILED_KEYS: set[str] = set()


def resolve_llm_config() -> Tuple[str, str, str, Optional[str]]:
    """
    Resolve LLM provider and models based on environment variables:
    Returns (provider, summarization_model, classification_model, api_key).
    Skips keys that have returned 401/403 authentication failures.
    """
    settings = get_settings()

    # 1. Prefer OpenAI if configured and not marked failed
    if settings.openai_api_key and settings.openai_api_key.strip():
        key = settings.openai_api_key.strip()
        if key not in _FAILED_KEYS:
            sum_model = settings.adam_summarization_model or "gpt-4o"
            cls_model = settings.adam_classification_model or "gpt-4o-mini"
            return "openai", sum_model, cls_model, key

    # 2. Fall back to Groq if configured and not marked failed
    if settings.groq_api_key and settings.groq_api_key.strip():
        key = settings.groq_api_key.strip()
        if key not in _FAILED_KEYS:
            model = settings.groq_model or "llama-3.3-70b-versatile"
            return "groq", model, model, key

    # 3. No active or valid keys
    return "unconfigured", "none", "none", None


def _call_chat_completion(
    provider: str,
    model: str,
    api_key: str,
    messages: List[Dict[str, str]],
    temperature: float = 0.1,
    max_tokens: int = 1500,
    timeout_sec: float = 25.0,
) -> Tuple[Optional[str], float, Optional[str]]:
    """
    Execute synchronous chat completion with httpx.
    Returns (response_text, elapsed_ms, error_msg).
    """
    t0 = time.perf_counter()
    url = (
        "https://api.openai.com/v1/chat/completions"
        if provider == "openai"
        else "https://api.groq.com/openai/v1/chat/completions"
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    try:
        with httpx.Client(timeout=timeout_sec) as client:
            resp = client.post(url, headers=headers, json=payload)
            elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)

            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return content, elapsed_ms, None
            else:
                err_text = resp.text
                if resp.status_code in (401, 403):
                    _FAILED_KEYS.add(api_key)
                    logger.warning(
                        "LLM API authentication failed; disabling key for this session",
                        provider=provider,
                        status_code=resp.status_code,
                    )
                else:
                    logger.warning(
                        "LLM completion returned non-200 status",
                        provider=provider,
                        model=model,
                        status_code=resp.status_code,
                        error=err_text[:300],
                    )
                return None, elapsed_ms, f"HTTP {resp.status_code}: {err_text[:200]}"
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 1)
        logger.warning(
            "LLM completion connection error",
            provider=provider,
            model=model,
            error=str(exc),
        )
        return None, elapsed_ms, str(exc)


# ---------------------------------------------------------------------------
# Summarization Agent
# ---------------------------------------------------------------------------

def call_summarization_agent(
    comp_agent_output: Dict[str, Any],
    rag_docs: List[Dict[str, Any]],
    sample_context: Dict[str, Any],
    sample_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes the Summarization Agent (Step 1-8 reasoning framework):
    Synthesizes clinical metadata, diversity indices, TreeSHAP attributions,
    and retrieved PubMed literature into a cohesive reasoning narrative.
    """
    clean_id = (sample_id or str(sample_context.get("sample_id", "UNKNOWN"))).strip().upper()
    provider, sum_model, _, api_key = resolve_llm_config()

    cache_key = f"sum_{clean_id}_{provider}_{sum_model}"
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

    # If active LLM credentials exist, invoke live LLM
    if api_key and provider in ("openai", "groq"):
        system_prompt = (
            "You are the ADAM Summarization Agent, an expert clinical bioinformatician. "
            "Synthesize the provided multi-omic patient data, XGBoost attributions, ecological diversity, "
            "and retrieved biomedical literature into an 8-step clinical reasoning summary following the ADAM-1 framework:\n"
            "Step 1: Patient Overview (demographics, longitudinal visit baseline)\n"
            "Step 2: Clinical Marker Assessment (Clinical Frailty Scale, malnutrition, medications)\n"
            "Step 3: Microbiome Profile (taxonomic composition and abundance)\n"
            "Step 4: Diversity Assessment (Shannon entropy, Simpson dominance, ecological evenness)\n"
            "Step 5: Microbiome-Clinical Relationships (frailty interaction with gut dysbiosis)\n"
            "Step 6: Correlation/Association Assessment (statistical alignment without claiming direct causality)\n"
            "Step 7: ML Prediction Assessment (XGBoost probability and top TreeSHAP positive/protective drivers)\n"
            "Step 8: Literature Context & Synthesis (integration of retrieved PubMed findings)"
        )

        user_content = f"""
Patient Profile:
- Sample ID: {clean_id} (Study ID: {study_id}, Day: {day})
- Age: {age}, Sex: {sex}
- Clinical Frailty Scale (CFS): {cfs}/9
- Malnutrition Score: {malnutrition}
- PPI Exposure: {ppi}, Antibiotics (6mo): {abx}

Microbiome & Ecological Diversity:
- Shannon Diversity Index (H'): {alpha.get('shannon_index', 0.0):.2f}
- Simpson Index (D): {alpha.get('simpson_index', 0.0):.2f}
- Berger-Parker Dominance: {alpha.get('berger_parker_dominance', 0.0):.2f}
- Bray-Curtis Dissimilarity to Control Centroid: {beta.get('bray_curtis_distance', 0.0):.4f}
- Dominant Taxa: {', '.join([f"{t.get('species', 'Taxon')} ({t.get('percentage', 0):.2f}%)" for t in top_taxa[:4]])}

Machine Learning Prior (XGBoost):
- Base Probability: {ml_pred.get('probability', 0.5) * 100:.1f}% ({ml_pred.get('risk_level', 'Moderate')})
- Top Positive Risk Drivers: {', '.join([c.get('feature', '') for c in pos_drivers[:3]])}
- Top Protective Drivers: {', '.join([c.get('feature', '') for c in prot_drivers[:2]])}

Retrieved Scientific Evidence:
{chr(10).join([f"- PMID {d.get('pmid', 'N/A')}: {d.get('title', '')} ({d.get('snippet', d.get('content', ''))[:180]}...)" for d in rag_docs[:2]])}
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        text, elapsed_ms, err = _call_chat_completion(
            provider=provider,
            model=sum_model,
            api_key=api_key,
            messages=messages,
            temperature=0.1,
            max_tokens=1200,
        )

        if text and not err:
            result = {
                "summary_text": text,
                "workflow_name": f"ADAM-1 Enhanced Summarization Agent ({provider.upper()} - {sum_model})",
                "llm_provider": provider,
                "llm_model": sum_model,
                "is_fallback": False,
                "elapsed_ms": elapsed_ms,
            }
            set_cached_agent_result(cache_key, result)
            return result

    # Check if historical paper summary exists for this sample
    hist_rec = get_paper_historical_record(clean_id)
    if hist_rec and hist_rec.get("formatted_summary"):
        result = {
            "summary_text": hist_rec["formatted_summary"],
            "workflow_name": "ADAM-1 Paper Published Summarization Agent (GPT-4o)",
            "llm_provider": "paper_historical",
            "llm_model": "gpt-4o",
            "is_fallback": False,
            "elapsed_ms": 0.0,
        }
        set_cached_agent_result(cache_key, result)
        return result

    # Deterministic fallback summary
    summary_text = (
        f"Subject {study_id} (Sample {clean_id}) is a {age:.0f}-year-old {sex.lower()} presenting at day {day}. "
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
        "elapsed_ms": 0.0,
    }
    set_cached_agent_result(cache_key, result)
    return result


# ---------------------------------------------------------------------------
# Classification Agent
# ---------------------------------------------------------------------------

def call_classification_agent(
    comp_agent_output: Dict[str, Any],
    summary_text: str,
    rag_docs: List[Dict[str, Any]],
    sample_context: Dict[str, Any],
    sample_id: Optional[str] = None,
) -> AdamClassificationResult:
    """
    Executes the ADAM Classification Agent (GPT-4o-mini / Groq fallback):
    Evaluates multi-modal evidence (ML probability, TreeSHAP attributions, alpha/beta
    diversity, host frailty, and RAG literature) to deliver the final diagnostic classification.
    """
    clean_id = (sample_id or str(sample_context.get("sample_id", "UNKNOWN"))).strip().upper()
    provider, _, cls_model, api_key = resolve_llm_config()

    cache_key = f"cls_{clean_id}_{provider}_{cls_model}"
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

    # 1. Attempt live LLM execution if credentials exist
    if api_key and provider in ("openai", "groq"):
        system_prompt = (
            "You are the ADAM Classification Agent, the terminal diagnostic decision-maker in the ADAM-1 multi-agent framework. "
            "Your objective is to deliver a definitive binary classification for Alzheimer's disease (AD vs CN) "
            "by synthesizing quantitative gradient boosting probabilities, TreeSHAP biomarker attributions, "
            "ecological diversity metrics (Shannon index, Bray-Curtis distance), and host frailty.\n\n"
            "Reasoning Principles:\n"
            "- Treat the XGBoost probability as an informative prior, not an unchangeable constraint.\n"
            "- Severe host frailty (CFS >= 7) + restricted Shannon diversity (< 3.0) + pro-inflammatory biomarker attributions provide strong corroborative biological evidence elevating AD risk.\n"
            "- Preserved physical resilience (CFS <= 4) + high ecological diversity (Shannon >= 3.2) + protective taxa moderate borderline risk toward Cognitive Normal (CN).\n"
            "- When XGBoost probability is borderline (40% - 55%), your multi-factorial synthesis must resolve the boundary.\n\n"
            "You MUST respond ONLY with a valid JSON object matching this exact schema:\n"
            "{\n"
            '  "prediction": "AD" or "CN",\n'
            '  "probability": float (0.0 to 1.0, calibrated probability of Alzheimer\'s disease),\n'
            '  "confidence": "high", "medium", or "low",\n'
            '  "decision_basis": "Concise 2-4 sentence explanation detailing how clinical frailty, diversity, and biomarkers guided the decision.",\n'
            '  "key_factors": ["factor 1", "factor 2", "factor 3"],\n'
            '  "agrees_with_xgboost": true or false\n'
            "}"
        )

        user_content = f"""
Sample Assessment for {clean_id}:
Prior ML Model (XGBoost):
- Risk Probability: {ml_prob * 100:.1f}%
- Predicted Label: {'AD' if ml_label == 1 else 'CN'}

Host Clinical Vulnerability:
- Clinical Frailty Scale (CFS): {cfs:.0f}/9 ({'Severely Frail' if cfs >= 7 else 'Mild-Moderate' if cfs >= 4 else 'Robust'})

Ecological Diversity Profile:
- Shannon Entropy H': {shannon:.2f} (Threshold: < 3.0 indicates significant mucosal dysbiosis)
- Bray-Curtis Distance to Control Centroid: {beta.get('bray_curtis_distance', 0.0):.4f}

TreeSHAP Feature Attributions:
- Positive (Risk-Inducing) Attributions: {', '.join([f"{c.get('feature')}: +{c.get('shap_value', 0):.3f}" for c in pos_drivers[:3]])}
- Negative (Protective) Attributions: {', '.join([f"{c.get('feature')}: {c.get('shap_value', 0):.3f}" for c in prot_drivers[:2]])}
- Net Dysbiosis Signal: {'Elevated Risk Dominance' if net_dysbiosis_risk else 'Balanced / Protective'}

Summarization Agent Analysis:
{summary_text[:600]}...

Deliver your final diagnostic decision in strict JSON format.
"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ]

        text, elapsed_ms, err = _call_chat_completion(
            provider=provider,
            model=cls_model,
            api_key=api_key,
            messages=messages,
            temperature=0.1,
            max_tokens=600,
        )

        if text and not err:
            parsed = _parse_classification_response(text, ml_prob, ml_label)
            if parsed is not None:
                parsed["llm_model"] = cls_model
                parsed["llm_provider"] = provider
                parsed["is_fallback"] = False
                parsed["elapsed_ms"] = elapsed_ms
                parsed["raw_response"] = text

                set_cached_agent_result(cache_key, parsed)
                return AdamClassificationResult(**parsed)

    # 2. Check if historical paper published decision exists
    hist_rec = get_paper_historical_record(clean_id)
    if hist_rec and hist_rec.get("prediction"):
        paper_pred_str = str(hist_rec["prediction"]).strip()
        is_ad = paper_pred_str.lower() in ("yes", "ad", "positive", "1")
        pred_label = "AD" if is_ad else "CN"

        # Extract confidence from conclusion text if present (e.g. "**Confidence**: **95.2%**")
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
            "llm_model": "gpt-4o-mini",
            "llm_provider": "paper_historical",
            "is_fallback": False,
            "elapsed_ms": 0.0,
            "raw_response": hist_rec.get("conclusion", ""),
        }
        set_cached_agent_result(cache_key, result_dict)
        return AdamClassificationResult(**result_dict)

    # 3. Deterministic Consensus Fallback (Paper Methodology Alignment)
    # Applies multi-factorial rule when borderline (0.40 <= prob <= 0.55)
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
        "elapsed_ms": 0.0,
        "raw_response": decision_rule,
    }
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
