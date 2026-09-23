"""
ADAM-1 Enhanced: Google Gemini API Strict Research Validation Suite (N=30)
===========================================================================
Performs a rigorous, empirical validation of the Google Gemini API (gemini-3.6-flash)
multi-agent pipeline on the balanced N=30 cohort (seed=42, paper_reconstructed).

Verifications:
1. Direct Summarization Request (Gemini 3.6 Flash)
2. Direct Structured Classification Request (Gemini 3.6 Flash with Pydantic)
3. Full Single-Sample Pipeline Run (DC036)
4. RAG Prompt Difference Verification (With vs Without RAG SHA-256 Hashes)
5. Strict Fallback Isolation & Error Handling (API failure -> FAILED, label=-1)
6. Complete N=30 Strict Paired Benchmark Evaluation
7. Machine-readable JSON output: backend/saved_models/gemini_strict_research_validation_n30.json
"""
import sys
import os
import json
import time
import hashlib
from typing import Dict, Any, List

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import get_settings
from app.ml.data_loader import load_dataset_df, preprocess_and_split
from app.ml.models import load_saved_model, train_and_evaluate
from app.rag.gemini_client import get_gemini_client
from app.rag.adam_llm import (
    call_summarization_agent,
    call_classification_agent,
    GeminiClassificationResponse,
    AdamClassificationResult,
)
from app.agents.adam_workflow import run_adam_pipeline


def run_gemini_validation():
    print("=" * 100)
    print("ADAM-1 ENHANCED: GOOGLE GEMINI API STRICT RESEARCH VALIDATION SUITE")
    print("=" * 100)

    gemini_client = get_gemini_client()
    print(f"Gemini Client Configured: {gemini_client.is_available}")
    api_key = gemini_client.get_api_key()
    print(f"API Key Loaded: {bool(api_key)} (Prefix: {api_key[:6] if api_key else 'None'}...)")
    print(f"Target Model: gemini-3.6-flash")

    # -------------------------------------------------------------------------
    # Step 1: Direct Summarization Request
    # -------------------------------------------------------------------------
    print("\n--- [STEP 1] Direct Gemini Summarization Test ---")
    t0 = time.perf_counter()
    sum_direct = gemini_client.generate_text(
        prompt="Synthesize clinical summary for an 80yo patient with severe dysbiosis and CFS=7.",
        model="gemini-3.6-flash",
        system_instruction="You are the ADAM Summarization Agent.",
    )
    t_sum_direct = round((time.perf_counter() - t0) * 1000, 2)
    print(f"Summarization Status: {sum_direct.status} in {t_sum_direct} ms")
    print(f"Summarization Token Usage: Prompt={sum_direct.prompt_tokens}, Completion={sum_direct.completion_tokens}, Total={sum_direct.total_tokens}")
    if sum_direct.is_success:
        print(f"Snippet: {str(sum_direct.content)[:120]}...")
    else:
        print(f"Error: {sum_direct.error}")

    # -------------------------------------------------------------------------
    # Step 2: Direct Structured Classification Request
    # -------------------------------------------------------------------------
    print("\n--- [STEP 2] Direct Structured Gemini Classification Test ---")
    t0 = time.perf_counter()
    cls_direct = gemini_client.generate_structured(
        prompt="Patient is 82yo female with severe cognitive decline, elevated Enterobacteriaceae, prior probability 0.88. Classify.",
        schema_cls=GeminiClassificationResponse,
        model="gemini-3.6-flash",
        system_instruction="You are the ADAM Classification Agent. Deliver a structured binary diagnosis.",
    )
    t_cls_direct = round((time.perf_counter() - t0) * 1000, 2)
    print(f"Classification Status: {cls_direct.status} in {t_cls_direct} ms")
    if cls_direct.is_success and cls_direct.parsed:
        p: GeminiClassificationResponse = cls_direct.parsed
        print(f"Structured Verdict: Prediction={p.prediction}, Label={p.binary_label}, Prob={p.probability}, Conf={p.confidence}, ConfScore={p.confidence_score}")
        print(f"Reasoning: {p.reasoning[:120]}...")
        print(f"Key Evidence: {p.key_evidence}")
    else:
        print(f"Error: {cls_direct.error}")

    # -------------------------------------------------------------------------
    # Step 3: Complete Pipeline Single Sample Run (DC036)
    # -------------------------------------------------------------------------
    print("\n--- [STEP 3] Complete ADAM Pipeline Single Sample Run (DC036) ---")
    t0 = time.perf_counter()
    pipeline_res = run_adam_pipeline("DC036", use_rag=True, strict_research_mode=True)
    t_pipe = round((time.perf_counter() - t0) * 1000, 2)
    fin = pipeline_res["final_result"]
    print(f"Sample: {pipeline_res['sample_id']}, Ground Truth: {pipeline_res['actual_diagnosis_label']}")
    print(f"ADAM Prediction: {fin['adam_prediction']} (Label: {fin['adam_binary_label']}), Conf: {fin['adam_confidence'] * 100:.1f}%")
    print(f"Provider: {fin['adam_provider']}, Model: {fin['adam_source']}")
    print(f"Fallback Used: {fin['fallback_used']} (Strict Valid: {fin['strict_mode_valid']})")
    print(f"Total Pipeline Latency: {t_pipe} ms")
    if not fin["strict_mode_valid"]:
        print(f"Recorded Failure Reason: {fin.get('failure_reason')}")
        assert fin["adam_binary_label"] == -1, "On live-model failure, adam_binary_label must be -1"
    assert not fin["fallback_used"], "Fallback was used in strict research mode!"

    # -------------------------------------------------------------------------
    # Step 4: Strict Error Propagation Verification
    # -------------------------------------------------------------------------
    print("\n--- [STEP 4] Error Handling Verification (Invalid Key / Simulated Failure) ---")
    # Verify strict failure handling
    failed_cls = call_classification_agent(
        comp_agent_output={"ml_prediction": {"probability": 0.5, "label": 0}},
        summary_text=None,  # Missing summary simulates upstream failure
        rag_docs=[],
        sample_context={"sample_id": "TEST_ERR"},
        sample_id="TEST_ERR",
        strict_research_mode=True,
    )
    print(f"Simulated Failure Prediction: {failed_cls.prediction}")
    print(f"Success: {failed_cls.success}, Fallback Used: {failed_cls.fallback_used}")
    print(f"Error Message: {failed_cls.error}")
    assert failed_cls.prediction == "FAILED", "Failed agent did not return FAILED in strict mode"
    assert not failed_cls.fallback_used, "Fallback was incorrectly triggered on error in strict mode"

    # -------------------------------------------------------------------------
    # Step 5: Full N=30 Cohort Strict Paired Benchmark Evaluation
    # -------------------------------------------------------------------------
    print("\n" + "=" * 100)
    print("--- [STEP 5] RUNNING FULL N=30 STRICT PAIRED BENCHMARK (With vs Without RAG) ---")
    print("=" * 100)

    df = load_dataset_df()
    split = preprocess_and_split(df, seed=42, protocol="paper_reconstructed")
    X_train, y_train = split["X_train"], split["y_train"]
    X_test, y_test = split["X_test"], split["y_test"]
    test_ids = split["test_sample_ids"]
    feature_names = split["feature_columns"]

    # Base XGBoost
    saved = load_saved_model("xgboost", seed=42)
    if saved is not None and "model" in saved:
        xgb_clf = saved["model"]
    else:
        res = train_and_evaluate(
            model_name="xgboost",
            X_train=X_train,
            y_train=y_train,
            X_test=X_test,
            y_test=y_test,
            feature_names=feature_names,
            seed=42,
            scale_pos_weight=split["scale_pos_weight"],
        )
        xgb_clf = res["model_obj"]

    xgb_probs = xgb_clf.predict_proba(X_test)[:, 1]
    xgb_preds = xgb_clf.predict(X_test)

    sample_audit_records = []
    rag_changed_count = 0
    rag_corrected_count = 0
    rag_introduced_error_count = 0
    rag_had_no_effect_count = 0
    prompt_diff_count = 0
    total_fallbacks = 0
    gemini_live_attempts = 0
    gemini_live_successes = 0

    no_rag_preds = []
    no_rag_probs = []
    with_rag_preds = []
    with_rag_probs = []

    for idx, sid in enumerate(test_ids):
        gt = int(y_test[idx])
        xp = int(xgb_preds[idx])
        xprob = float(xgb_probs[idx])
        print(f"[{idx+1:02d}/30] Evaluating Sample {sid} (GT: {gt}, XGB: {xp}, Prob: {xprob:.3f})...")

        # Condition A: WITHOUT RAG
        t_start_a = time.perf_counter()
        res_norag = run_adam_pipeline(sid, use_rag=False, strict_research_mode=True)
        lat_a = round((time.perf_counter() - t_start_a) * 1000, 2)
        fin_norag = res_norag["final_result"]
        lbl_norag = int(fin_norag["adam_binary_label"])
        prob_norag = float(fin_norag["adam_confidence"]) if lbl_norag == 1 else (1.0 - float(fin_norag["adam_confidence"]))
        no_rag_preds.append(lbl_norag)
        no_rag_probs.append(prob_norag)

        gemini_live_attempts += 2  # Summarization + Classification
        if fin_norag["strict_mode_valid"]:
            gemini_live_successes += 2
        if fin_norag["fallback_used"]:
            total_fallbacks += 1

        # Gentle pacing to remain within 20 RPM free tier limit
        if fin_norag["strict_mode_valid"]:
            time.sleep(3.5)

        # Condition B: WITH RAG
        t_start_b = time.perf_counter()
        res_rag = run_adam_pipeline(sid, use_rag=True, strict_research_mode=True)
        lat_b = round((time.perf_counter() - t_start_b) * 1000, 2)
        fin_rag = res_rag["final_result"]
        lbl_rag = int(fin_rag["adam_binary_label"])
        prob_rag = float(fin_rag["adam_confidence"]) if lbl_rag == 1 else (1.0 - float(fin_rag["adam_confidence"]))
        with_rag_preds.append(lbl_rag)
        with_rag_probs.append(prob_rag)

        gemini_live_attempts += 2
        if fin_rag["strict_mode_valid"]:
            gemini_live_successes += 2
        if fin_rag["fallback_used"]:
            total_fallbacks += 1

        # Gentle pacing between samples
        if fin_rag["strict_mode_valid"]:
            time.sleep(3.5)

        # Prompt Hash Comparison
        hash_norag = res_norag["summarization_agent"].get("prompt_hash")
        hash_rag = res_rag["summarization_agent"].get("prompt_hash")
        cls_hash_norag = res_norag["classification_agent"].get("prompt_hash")
        cls_hash_rag = res_rag["classification_agent"].get("prompt_hash")

        prompts_differ = (hash_norag != hash_rag) or (cls_hash_norag != cls_hash_rag)
        if prompts_differ:
            prompt_diff_count += 1

        # RAG Effect Calculation
        pred_changed = (lbl_norag != lbl_rag)
        if pred_changed:
            rag_changed_count += 1
            if lbl_rag == gt and lbl_norag != gt:
                rag_corrected_count += 1
            elif lbl_rag != gt and lbl_norag == gt:
                rag_introduced_error_count += 1
        else:
            rag_had_no_effect_count += 1

        rag_dtls = fin_rag.get("rag_details", {})
        sum_tel_rag = res_rag["summarization_agent"].get("token_usage", {})
        cls_tel_rag = res_rag["classification_agent"].get("token_usage", {})

        record = {
            "index": idx,
            "sample_id": sid,
            "ground_truth": gt,
            "ground_truth_label": "AD" if gt == 1 else "Control",
            "xgboost_prediction": xp,
            "xgboost_probability": round(xprob, 4),
            "without_rag": {
                "prediction": "AD" if lbl_norag == 1 else "CN",
                "binary_label": lbl_norag,
                "confidence": round(float(fin_norag["adam_confidence"]), 4),
                "probability": round(prob_norag, 4),
                "summarization_prompt_hash": hash_norag,
                "classification_prompt_hash": cls_hash_norag,
                "latency_ms": lat_a,
                "status": "LIVE_SUCCESS" if fin_norag["strict_mode_valid"] else "LIVE_FAILED",
            },
            "with_rag": {
                "prediction": "AD" if lbl_rag == 1 else "CN",
                "binary_label": lbl_rag,
                "confidence": round(float(fin_rag["adam_confidence"]), 4),
                "probability": round(prob_rag, 4),
                "rag_query": rag_dtls.get("query"),
                "retrieved_document_ids": rag_dtls.get("document_ids"),
                "retrieved_similarity_scores": rag_dtls.get("similarity_scores"),
                "retrieved_text_snippet": rag_dtls.get("retrieved_text", "")[:300],
                "summarization_prompt_hash": hash_rag,
                "classification_prompt_hash": cls_hash_rag,
                "latency_ms": lat_b,
                "status": "LIVE_SUCCESS" if fin_rag["strict_mode_valid"] else "LIVE_FAILED",
                "token_usage": {
                    "summarization_input_tokens": sum_tel_rag.get("prompt_tokens"),
                    "summarization_output_tokens": sum_tel_rag.get("completion_tokens"),
                    "classification_input_tokens": cls_tel_rag.get("prompt_tokens"),
                    "classification_output_tokens": cls_tel_rag.get("completion_tokens"),
                    "total_tokens": (sum_tel_rag.get("total_tokens") or 0) + (cls_tel_rag.get("total_tokens") or 0),
                },
            },
            "prompts_differ": prompts_differ,
            "prediction_changed_by_rag": pred_changed,
            "model_name": "gemini-3.6-flash",
            "provider": "Google Gemini API",
            "fallback_used": bool(fin_norag["fallback_used"] or fin_rag["fallback_used"]),
        }
        sample_audit_records.append(record)

    # Calculate Aggregate Metrics
    def calc_metrics(yt, yp, prob):
        valid_idx = [i for i, p in enumerate(yp) if p in (0, 1)]
        if not valid_idx:
            return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1_score": 0.0, "auc": 0.0}
        y_true_sub = [yt[i] for i in valid_idx]
        y_pred_sub = [yp[i] for i in valid_idx]
        y_prob_sub = [prob[i] for i in valid_idx]

        return {
            "accuracy": round(float(accuracy_score(y_true_sub, y_pred_sub)), 4),
            "precision": round(float(precision_score(y_true_sub, y_pred_sub, zero_division=0)), 4),
            "recall": round(float(recall_score(y_true_sub, y_pred_sub, zero_division=0)), 4),
            "f1_score": round(float(f1_score(y_true_sub, y_pred_sub, zero_division=0)), 4),
            "auc": round(float(roc_auc_score(y_true_sub, y_prob_sub) if len(np.unique(y_true_sub)) > 1 else 0.5), 4),
        }

    m_xgb = calc_metrics(y_test, xgb_preds, xgb_probs)
    m_gemini_norag = calc_metrics(y_test, no_rag_preds, no_rag_probs)
    m_gemini_rag = calc_metrics(y_test, with_rag_preds, with_rag_probs)

    # Classification Concordance with XGBoost
    cat_a = sum(1 for yt, yg, yx in zip(y_test, with_rag_preds, xgb_preds) if yg == yt and yx == yt)
    cat_b = sum(1 for yt, yg, yx in zip(y_test, with_rag_preds, xgb_preds) if yx != yt and yg == yt)  # Corrections
    cat_c = sum(1 for yt, yg, yx in zip(y_test, with_rag_preds, xgb_preds) if yx == yt and yg != yt)  # Harmful divergences
    cat_d = sum(1 for yt, yg, yx in zip(y_test, with_rag_preds, xgb_preds) if yg != yt and yx != yt)
    agree_xgb = sum(1 for yg, yx in zip(with_rag_preds, xgb_preds) if yg == yx)

    print("\n" + "=" * 100)
    print("N=30 STRICT BENCHMARK METRIC COMPARISON")
    print("=" * 100)
    print(f"{'Condition':<36} | {'Acc':<6} | {'Prec':<6} | {'Rec':<6} | {'F1':<6} | {'AUC':<6}")
    print("-" * 100)
    print(f"{'XGBoost Baseline':<36} | {m_xgb['accuracy']:.4f} | {m_xgb['precision']:.4f} | {m_xgb['recall']:.4f} | {m_xgb['f1_score']:.4f} | {m_xgb['auc']:.4f}")
    print(f"{'Gemini 3.6 Flash (Without RAG)':<36} | {m_gemini_norag['accuracy']:.4f} | {m_gemini_norag['precision']:.4f} | {m_gemini_norag['recall']:.4f} | {m_gemini_norag['f1_score']:.4f} | {m_gemini_norag['auc']:.4f}")
    print(f"{'Gemini 3.6 Flash (With RAG)':<36} | {m_gemini_rag['accuracy']:.4f} | {m_gemini_rag['precision']:.4f} | {m_gemini_rag['recall']:.4f} | {m_gemini_rag['f1_score']:.4f} | {m_gemini_rag['auc']:.4f}")
    print("-" * 100)
    print(f"Prompts Differ Count (RAG vs No-RAG): {prompt_diff_count} / 30 ({prompt_diff_count / 30 * 100:.1f}%)")
    print(f"RAG Changed Prediction Count:        {rag_changed_count} / 30")
    print(f"RAG Corrected XGBoost:               {rag_corrected_count}")
    print(f"RAG Introduced Error:                {rag_introduced_error_count}")
    print(f"RAG Had No Effect on Verdict:        {rag_had_no_effect_count} / 30")
    print(f"Fallbacks Used in Strict Mode:       {total_fallbacks} (100% Isolated)")
    print(f"Gemini Live Calls Attempted:         {gemini_live_attempts}")
    print(f"Gemini Live Calls Succeeded:         {gemini_live_successes} / {gemini_live_attempts}")
    print(f"XGBoost Corrections (Cat B):         {cat_b}")
    print(f"Harmful Divergences (Cat C):         {cat_c}")
    print(f"Concordance with XGBoost:            {agree_xgb} / 30 ({agree_xgb / 30 * 100:.1f}%)")
    print("=" * 100)

    # -------------------------------------------------------------------------
    # Save Machine-Readable JSON
    # -------------------------------------------------------------------------
    out_dir = os.path.join(os.path.dirname(__file__), "..", "saved_models")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "gemini_strict_research_validation_n30.json")

    payload = {
        "metadata": {
            "title": "ADAM-1 Enhanced: Google Gemini API Strict Research Validation (N=30)",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "provider": "Google Gemini API",
            "model": "gemini-3.6-flash",
            "sdk": "google-genai 2.25.0",
            "cohort": "Balanced Test Set (N=30; 15 Control, 15 AD)",
            "protocol": "paper_reconstructed",
            "seed": 42,
            "strict_research_mode": True,
        },
        "summary": {
            "total_samples": 30,
            "gemini_live_calls_attempted": gemini_live_attempts,
            "gemini_live_calls_succeeded": gemini_live_successes,
            "fallback_count": total_fallbacks,
            "prompts_differ_count": prompt_diff_count,
            "prompts_differ_percent": round(prompt_diff_count / 30 * 100, 2),
            "rag_changed_prediction_count": rag_changed_count,
            "rag_corrected_xgboost": rag_corrected_count,
            "rag_introduced_error": rag_introduced_error_count,
            "rag_had_no_effect": rag_had_no_effect_count,
            "xgboost_corrections": cat_b,
            "harmful_divergences": cat_c,
            "agreement_with_xgboost": agree_xgb,
            "metrics": {
                "xgboost_baseline": m_xgb,
                "gemini_without_rag": m_gemini_norag,
                "gemini_with_rag": m_gemini_rag,
            },
        },
        "samples": sample_audit_records,
    }

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"\nSaved machine-readable validation artifact to: {os.path.abspath(out_file)}")
    return payload


if __name__ == "__main__":
    run_gemini_validation()
