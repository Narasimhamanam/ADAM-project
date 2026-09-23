import sys
sys.path.insert(0, '.')

import json
import time
import hashlib
from typing import Dict, Any, List

from app.ml.data_loader import load_dataset_df, preprocess_and_split
from app.ml.models import load_saved_model, train_and_evaluate
from app.agents.adam_workflow import run_adam_pipeline
from app.rag.openrouter_client import get_openrouter_client

def run_strict_validation():
    print("=" * 100)
    print("STRICT RESEARCH BENCHMARK VALIDATION PASS (N=30, seed=42)")
    print("=" * 100)

    # 1. Inspect live OpenRouter provider status
    client = get_openrouter_client()
    print(f"OpenRouter configured: {client.is_available}")
    print(f"OpenRouter base URL: {client.base_url}")
    print(f"OpenRouter API key prefix: {client._api_key[:12] if client._api_key else 'None'}...")

    # Load dataset & split
    df = load_dataset_df()
    split = preprocess_and_split(df, seed=42, protocol="paper_reconstructed")
    test_ids = split["test_sample_ids"]
    y_test = split["y_test"]
    X_test = split["X_test"]
    feature_names = split["feature_columns"]

    # Load base XGBoost
    saved = load_saved_model("xgboost", seed=42)
    if saved and "model" in saved:
        clf = saved["model"]
    else:
        res = train_and_evaluate(
            model_name="xgboost",
            X_train=split["X_train"],
            y_train=split["y_train"],
            X_test=split["X_test"],
            y_test=split["y_test"],
            feature_names=feature_names,
            seed=42,
            scale_pos_weight=split["scale_pos_weight"],
        )
        clf = res["model_obj"]

    xgb_preds = clf.predict(X_test)
    xgb_probs = clf.predict_proba(X_test)[:, 1]

    # Containers for benchmark records
    gpt4o_audit_records = []
    gpt4o_mini_audit_records = []
    rag_input_verification_records = []
    per_sample_ablation = []

    print("\n--- Running Strict Research Paired Benchmark on N=30 ---")
    for i, sid in enumerate(test_ids):
        gt = int(y_test[i])
        xgb_p = int(xgb_preds[i])
        xgb_prob = float(xgb_probs[i])

        print(f"[{i+1}/30] Evaluating Sample {sid} (GT={gt}, XGB={xgb_p})...", flush=True)

        # Condition A: Strict Mode WITHOUT RAG
        t0 = time.perf_counter()
        res_norag = run_adam_pipeline(sid, use_rag=False, strict_research_mode=True)
        t_norag = round((time.perf_counter() - t0) * 1000.0, 1)

        # Condition B: Strict Mode WITH RAG
        t0 = time.perf_counter()
        res_rag = run_adam_pipeline(sid, use_rag=True, strict_research_mode=True)
        t_rag = round((time.perf_counter() - t0) * 1000.0, 1)

        fin_norag = res_norag["final_result"]
        fin_rag = res_rag["final_result"]
        sum_rag = res_rag["summarization_agent"]
        cls_rag = res_rag["classification_agent"]

        # 1. Audit GPT-4o Summarization Agent Record
        sum_tel = res_rag["final_result"]["telemetry"]
        gpt4o_rec = {
            "sample_id": sid,
            "model": "openai/gpt-4o",
            "provider": sum_rag.get("llm_provider"),
            "success": bool(not sum_rag.get("error") and sum_rag.get("summary_text")),
            "failure_reason": sum_rag.get("error"),
            "latency_ms": sum_rag.get("elapsed_ms", 0.0),
            "prompt_tokens": sum_rag.get("token_usage", {}).get("prompt_tokens", 0),
            "completion_tokens": sum_rag.get("token_usage", {}).get("completion_tokens", 0),
            "fallback_used": sum_rag.get("is_fallback", False) or (sum_rag.get("llm_provider") in ("paper_historical", "fallback_consensus")),
        }
        gpt4o_audit_records.append(gpt4o_rec)

        # 2. Audit GPT-4o-mini Classification Agent Record
        gpt4o_mini_rec = {
            "sample_id": sid,
            "model": "openai/gpt-4o-mini",
            "provider": cls_rag.get("llm_provider"),
            "success": bool(cls_rag.get("prediction") in ("AD", "CN")),
            "failure_reason": cls_rag.get("error") if hasattr(cls_rag, "error") else None,
            "latency_ms": cls_rag.get("elapsed_ms", 0.0),
            "prompt_tokens": cls_rag.get("token_usage", {}).get("prompt_tokens", 0),
            "completion_tokens": cls_rag.get("token_usage", {}).get("completion_tokens", 0),
            "fallback_used": cls_rag.get("is_fallback", False) or (cls_rag.get("llm_provider") in ("paper_historical", "fallback_consensus")),
        }
        gpt4o_mini_audit_records.append(gpt4o_mini_rec)

        # 3. Audit RAG Input Difference
        hash_norag = fin_norag.get("prompt_verification", {}).get("classification_prompt_hash")
        hash_rag = fin_rag.get("prompt_verification", {}).get("classification_prompt_hash")
        sum_hash_norag = fin_norag.get("prompt_verification", {}).get("summarization_prompt_hash")
        sum_hash_rag = fin_rag.get("prompt_verification", {}).get("summarization_prompt_hash")
        prompts_differ = (hash_norag != hash_rag) and (sum_hash_norag != sum_hash_rag)

        rag_verif = {
            "sample_id": sid,
            "without_rag": {
                "classification_prompt_hash": hash_norag,
                "summarization_prompt_hash": sum_hash_norag,
                "input_summary_length": len(fin_norag.get("explanation", "")),
            },
            "with_rag": {
                "retrieval_query": fin_rag.get("rag_details", {}).get("query", ""),
                "document_ids": fin_rag.get("rag_details", {}).get("document_ids", []),
                "similarity_scores": fin_rag.get("rag_details", {}).get("similarity_scores", []),
                "retrieved_text_snippet": fin_rag.get("rag_details", {}).get("retrieved_text", "")[:250],
                "classification_prompt_hash": hash_rag,
                "summarization_prompt_hash": sum_hash_rag,
            },
            "prompts_differ": prompts_differ,
            "summarization_prompts_differ": bool(sum_hash_norag != sum_hash_rag),
            "classification_prompts_differ": bool(hash_norag != hash_rag),
        }
        rag_input_verification_records.append(rag_verif)

        # 4. Record Per-Sample Ablation Decision
        p_norag = fin_norag.get("adam_binary_label", -1)
        p_rag = fin_rag.get("adam_binary_label", -1)
        prob_norag = fin_norag.get("adam_confidence", 0.5)
        prob_rag = fin_rag.get("adam_confidence", 0.5)
        chg = bool(p_norag != p_rag)

        per_sample_ablation.append({
            "sample_id": sid,
            "ground_truth": gt,
            "xgboost_prediction": xgb_p,
            "xgboost_probability": round(xgb_prob, 4),
            "no_rag_prediction": p_norag,
            "no_rag_confidence": prob_norag,
            "rag_prediction": p_rag,
            "rag_confidence": prob_rag,
            "prediction_changed": chg,
            "retrieved_sources": [c.get("title") for c in fin_rag.get("citations", [])],
        })

    # Summary Statistics
    total = len(test_ids)
    diff_prompts_count = sum(1 for r in rag_input_verification_records if r["prompts_differ"])
    rag_changed_pred = sum(1 for r in per_sample_ablation if r["prediction_changed"])
    rag_corrected_xgb = sum(1 for r in per_sample_ablation if r["no_rag_prediction"] != r["ground_truth"] and r["rag_prediction"] == r["ground_truth"])
    rag_introduced_err = sum(1 for r in per_sample_ablation if r["no_rag_prediction"] == r["ground_truth"] and r["rag_prediction"] != r["ground_truth"])
    rag_no_effect = sum(1 for r in per_sample_ablation if not r["prediction_changed"])

    gpt4o_successes = sum(1 for r in gpt4o_audit_records if r["success"])
    gpt4o_fallbacks = sum(1 for r in gpt4o_audit_records if r["fallback_used"])
    gpt4o_mini_successes = sum(1 for r in gpt4o_mini_audit_records if r["success"])
    gpt4o_mini_fallbacks = sum(1 for r in gpt4o_mini_audit_records if r["fallback_used"])

    output_payload = {
        "metadata": {
            "cohort": "balanced_test_set_n30",
            "seed": 42,
            "strict_research_mode": True,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
        "summary": {
            "total_samples": total,
            "prompts_differ_count": diff_prompts_count,
            "prompts_differ_percent": round(diff_prompts_count / total * 100.0, 1),
            "rag_changed_prediction": rag_changed_pred,
            "rag_corrected_xgboost": rag_corrected_xgb,
            "rag_introduced_error": rag_introduced_err,
            "rag_had_no_effect": rag_no_effect,
            "gpt4o_live_success_count": gpt4o_successes,
            "gpt4o_fallback_count": gpt4o_fallbacks,
            "gpt4o_mini_live_success_count": gpt4o_mini_successes,
            "gpt4o_mini_fallback_count": gpt4o_mini_fallbacks,
        },
        "gpt4o_audit": gpt4o_audit_records,
        "gpt4o_mini_audit": gpt4o_mini_audit_records,
        "rag_input_verification": rag_input_verification_records,
        "per_sample_ablation": per_sample_ablation,
    }

    out_file = "saved_models/strict_research_verification_n30.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(output_payload, f, indent=2)

    print("\n" + "=" * 100)
    print("STRICT RESEARCH BENCHMARK SUMMARY (N=30)")
    print("=" * 100)
    print(f"Total Samples Evaluated:            {total}")
    print(f"Prompts Differ (With vs Without RAG): {diff_prompts_count}/{total} ({diff_prompts_count/total*100:.1f}%)")
    print(f"RAG Changed Prediction:             {rag_changed_pred}/{total} ({rag_changed_pred/total*100:.1f}%)")
    print(f"RAG Corrected XGBoost:              {rag_corrected_xgb}/{total} ({rag_corrected_xgb/total*100:.1f}%)")
    print(f"RAG Introduced Error:               {rag_introduced_err}/{total} ({rag_introduced_err/total*100:.1f}%)")
    print(f"RAG Had No Effect on Decision:      {rag_no_effect}/{total} ({rag_no_effect/total*100:.1f}%)")
    print("-" * 100)
    print(f"GPT-4o Live Successes:              {gpt4o_successes}/{total}")
    print(f"GPT-4o Fallbacks Used:              {gpt4o_fallbacks}/{total}")
    print(f"GPT-4o-mini Live Successes:         {gpt4o_mini_successes}/{total}")
    print(f"GPT-4o-mini Fallbacks Used:         {gpt4o_mini_fallbacks}/{total}")
    print("=" * 100)
    print(f"Detailed output saved to: {out_file}")

if __name__ == "__main__":
    run_strict_validation()
