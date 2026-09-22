"""
ADAM Framework Performance & Benchmark Engine
=============================================
Calculates and distinguishes:
1. Published ADAM-1 Paper Benchmark (30 independent experiment runs from original research CSVs)
2. Current ADAM-1 Enhanced Evaluation (Live evaluated metrics supporting 'full_cohort' and 'paper_reconstructed' protocols)
3. Dynamic computation of neutral comparative metrics between ADAM and baselines:
   - Absolute Difference = ADAM metric − Baseline metric
   - Relative Difference % = ((ADAM − Baseline) / Baseline) × 100
   - Direction indicator: 'higher' | 'lower' | 'equal'
4. Full 7-condition ablation evaluation (Clinical, Microbiome, Diversity, Multi-Agent)
5. Independent computational efficiency and resource profiling (latency, memory, calls)
"""
from __future__ import annotations

import os
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

from app.core.logging import get_logger
from app.ml.baseline_loader import get_base_research_dir
from app.ml.data_loader import load_dataset_df, preprocess_and_split
from app.ml.models import train_and_evaluate
from app.agents.adam_workflow import run_adam_pipeline
from app.ml.ablation import evaluate_ablation_run
from app.ml.efficiency import profile_pipeline_efficiency

logger = get_logger(__name__)

# In-memory cache for live evaluated results keyed by (protocol, seed)
_CACHED_PERFORMANCE: Dict[str, Any] = {}


def calc_metric_comparison(adam_val: Optional[float], baseline_val: Optional[float]) -> Dict[str, Any]:
    """Calculate neutral comparative metrics dynamically between ADAM and a baseline."""
    if adam_val is None or baseline_val is None:
        return {
            "adam": None,
            "baseline": None,
            "xgboost": None,
            "absolute_diff": None,
            "relative_pct": None,
            "absolute_improvement": None,
            "relative_improvement_pct": None,
            "direction": "unevaluated",
            "status": "Not evaluated",
        }

    abs_diff = round(float(adam_val) - float(baseline_val), 4)
    rel_pct = round(((float(adam_val) - float(baseline_val)) / float(baseline_val)) * 100.0, 2) if baseline_val != 0 else 0.0
    direction = "higher" if abs_diff > 0 else "lower" if abs_diff < 0 else "equal"

    return {
        "adam": round(float(adam_val), 4),
        "baseline": round(float(baseline_val), 4),
        "xgboost": round(float(baseline_val), 4),
        "absolute_diff": abs_diff,
        "relative_pct": rel_pct,
        "absolute_improvement": abs_diff,
        "relative_improvement_pct": rel_pct,
        "direction": direction,
        "status": "Evaluated",
    }


calc_improvement = calc_metric_comparison



def get_published_paper_benchmarks() -> Dict[str, Any]:
    """Load and aggregate the 30-experiment published results directly from research files."""
    base_dir = get_base_research_dir()
    adam_path = os.path.join(base_dir, "output", "adam_experiments_summary.csv")
    xgb_path = os.path.join(base_dir, "output", "xgboost_experiments_summary.csv")
    baseline_path = os.path.join(base_dir, "base_model_selection", "baseline_model_experiments_summary.csv")

    models: Dict[str, Any] = {}

    # 1. ADAM published runs (30 seeds)
    if os.path.exists(adam_path):
        df_adam = pd.read_csv(adam_path)
        models["adam"] = {
            "model_name": "ADAM Framework (Paper)",
            "accuracy": round(float(df_adam["Accuracy"].mean()), 4),
            "std_accuracy": round(float(df_adam["Accuracy"].std()), 4),
            "auc": round(float(df_adam["AUC"].mean()), 4),
            "std_auc": round(float(df_adam["AUC"].std()), 4),
            "f1_score": round(float(df_adam["F1_Score"].mean()), 4),
            "std_f1": round(float(df_adam["F1_Score"].std()), 4),
            "precision": None,  # Not recorded in original paper summary CSV
            "recall": None,     # Not recorded in original paper summary CSV
            "experiment_count": len(df_adam),
            "notes": "Published ADAM-1 Paper 30-seed benchmark (F1: 0.7263 ± 0.0632). Precision/Recall not recorded in paper CSV.",
        }

    # 2. XGBoost published runs (30 seeds)
    if os.path.exists(xgb_path):
        df_xgb = pd.read_csv(xgb_path)
        models["xgboost"] = {
            "model_name": "XGBoost Baseline (Paper)",
            "accuracy": round(float(df_xgb["Accuracy"].mean()), 4),
            "std_accuracy": round(float(df_xgb["Accuracy"].std()), 4),
            "auc": round(float(df_xgb["AUC"].mean()), 4),
            "std_auc": round(float(df_xgb["AUC"].std()), 4),
            "f1_score": round(float(df_xgb["F1_Score"].mean()), 4),
            "std_f1": round(float(df_xgb["F1_Score"].std()), 4),
            "precision": None,
            "recall": None,
            "experiment_count": len(df_xgb),
            "notes": "Published ADAM-1 Paper 30-seed baseline (F1: 0.6774 ± 0.1217). Precision/Recall not recorded in paper CSV.",
        }

    # 3. Baseline comparisons (Random Forest & Logistic Regression)
    if os.path.exists(baseline_path):
        df_base = pd.read_csv(baseline_path)
        for m_name in ["randomforest", "logisticregression"]:
            sub = df_base[df_base["Model"].str.lower().str.replace("-", "").str.replace("_", "") == m_name]
            if not sub.empty:
                display_name = "Random Forest" if m_name == "randomforest" else "Logistic Regression"
                models[m_name] = {
                    "model_name": f"{display_name} (Paper)",
                    "accuracy": round(float(sub["Accuracy"].mean()), 4),
                    "std_accuracy": round(float(sub["Accuracy"].std()), 4),
                    "auc": round(float(sub["AUC"].mean()), 4),
                    "std_auc": round(float(sub["AUC"].std()), 4),
                    "f1_score": round(float(sub["F1_Score"].mean()), 4),
                    "std_f1": round(float(sub["F1_Score"].std()), 4),
                    "precision": None,
                    "recall": None,
                    "experiment_count": len(sub),
                    "notes": f"Paper model selection experiment runs (N={len(sub)}).",
                }

    adam_m = models.get("adam", {})
    xgb_m = models.get("xgboost", {})

    comparisons = {
        "f1_score": calc_metric_comparison(adam_m.get("f1_score"), xgb_m.get("f1_score")),
        "accuracy": calc_metric_comparison(adam_m.get("accuracy"), xgb_m.get("accuracy")),
        "auc": calc_metric_comparison(adam_m.get("auc"), xgb_m.get("auc")),
        "precision": calc_metric_comparison(adam_m.get("precision"), xgb_m.get("precision")),
        "recall": calc_metric_comparison(adam_m.get("recall"), xgb_m.get("recall")),
    }

    return {
        "title": "Published ADAM-1 Paper Benchmark",
        "historical_title": "Historical Published ADAM-1 Paper Benchmark",
        "description": "Results published in the ADAM-1 research paper (IEEE Access, 2025) aggregated across 30 independent experiment runs.",
        "protocol": "paper_historical",
        "sample_protocol": "Balanced test sets (15 Alzheimer's vs 15 Controls per seed, N=30)",
        "models": models,
        "improvements": comparisons,  # Key for backwards compatibility
        "comparisons": comparisons,
    }



def evaluate_current_enhanced_cohort(protocol: str = "full_cohort", seed: int = 42) -> Dict[str, Any]:
    """
    Evaluate XGBoost, Random Forest, Logistic Regression, and ADAM Framework
    on the current test cohort split using actual inference and multi-agent consensus.
    Supports protocol='full_cohort' (natural prevalence) and 'paper_reconstructed' (balanced 15 AD / 15 Control).
    """
    df = load_dataset_df()
    split = preprocess_and_split(df, test_size=0.25, seed=seed, protocol=protocol)
    X_train, y_train = split["X_train"], split["y_train"]
    X_test, y_test = split["X_test"], split["y_test"]
    feature_names = split["feature_columns"]
    test_sample_ids = split["test_sample_ids"]

    models: Dict[str, Any] = {}

    # 1. Evaluate traditional ML baselines
    for m in ["xgboost", "randomforest", "logisticregression"]:
        res = train_and_evaluate(
            model_name=m,
            X_train=X_train,
            y_train=y_train,
            X_test=X_test,
            y_test=y_test,
            feature_names=feature_names,
            seed=seed,
            scale_pos_weight=split["scale_pos_weight"],
        )
        met = res["metrics"]
        display_name = "XGBoost Baseline" if m == "xgboost" else "Random Forest" if m == "randomforest" else "Logistic Regression"
        models[m] = {
            "model_name": f"{display_name} (Current)",
            "accuracy": round(float(met["accuracy"]), 4),
            "precision": round(float(met["precision"]), 4),
            "recall": round(float(met["recall"]), 4),
            "f1_score": round(float(met["f1_score"]), 4),
            "auc": round(float(met["auc"]), 4),
            "sample_count": len(y_test),
            "notes": f"Evaluated live on current {protocol} test split (N={len(y_test)}).",
        }

    # 2. Evaluate ADAM Framework across the test cohort
    y_pred_adam = []
    y_prob_adam = []
    for sid in test_sample_ids:
        pipe_res = run_adam_pipeline(sid)
        fin = pipe_res["final_result"]
        lbl = int(fin["adam_binary_label"])
        y_pred_adam.append(lbl)
        conf = float(fin["adam_confidence"])
        y_prob_adam.append(conf if lbl == 1 else 1.0 - conf)

    acc = float(accuracy_score(y_test, y_pred_adam))
    prec = float(precision_score(y_test, y_pred_adam, zero_division=0))
    rec = float(recall_score(y_test, y_pred_adam, zero_division=0))
    f1 = float(f1_score(y_test, y_pred_adam, zero_division=0))
    auc = float(roc_auc_score(y_test, y_prob_adam)) if len(np.unique(y_test)) > 1 else 0.5

    models["adam"] = {
        "model_name": "ADAM Framework (Current)",
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "auc": round(auc, 4),
        "sample_count": len(y_test),
        "notes": f"Evaluated live using multi-agent consensus pipeline on current {protocol} test split (N={len(y_test)}).",
    }

    adam_m = models["adam"]
    xgb_m = models["xgboost"]

    comparisons = {
        "f1_score": calc_metric_comparison(adam_m["f1_score"], xgb_m["f1_score"]),
        "recall": calc_metric_comparison(adam_m["recall"], xgb_m["recall"]),
        "accuracy": calc_metric_comparison(adam_m["accuracy"], xgb_m["accuracy"]),
        "precision": calc_metric_comparison(adam_m["precision"], xgb_m["precision"]),
        "auc": calc_metric_comparison(adam_m["auc"], xgb_m["auc"]),
    }

    n_pos = int(np.sum(y_test == 1))
    n_neg = int(np.sum(y_test == 0))
    protocol_label = "Natural Cohort Prevalence" if protocol == "full_cohort" else "Paper-Reconstructed Balanced Protocol"

    return {
        "title": "Current ADAM-1 Enhanced Results",
        "evaluation_title": "Current ADAM-1 Enhanced Evaluation",
        "description": f"Live dynamic evaluation on current test cohort ({protocol_label}, N={len(y_test)} samples, seed={seed}).",
        "protocol": protocol,
        "protocol_label": protocol_label,
        "sample_count": len(y_test),
        "positive_cases": n_pos,
        "control_cases": n_neg,
        "seed": seed,
        "models": models,
        "improvements": comparisons,  # Key for backwards compatibility
        "comparisons": comparisons,
    }


def get_full_performance_comparison(
    protocol: str = "full_cohort",
    seed: int = 42,
    force_refresh: bool = False,
) -> Dict[str, Any]:
    """Retrieve comprehensive comparison bundle including historical paper benchmark, current evaluation, ablation, and efficiency."""
    cache_key = f"{protocol}_{seed}"
    if not force_refresh and cache_key in _CACHED_PERFORMANCE:
        return _CACHED_PERFORMANCE[cache_key]

    published = get_published_paper_benchmarks()
    current = evaluate_current_enhanced_cohort(protocol=protocol, seed=seed)
    ablation = evaluate_ablation_run(protocol=protocol, seeds=[seed])
    efficiency = profile_pipeline_efficiency(sample_count=5)

    payload = {
        "published_benchmark": published,
        "current_evaluation": current,
        "ablation_study": ablation,
        "efficiency_metrics": efficiency,
        "active_protocol": protocol,
        "active_seed": seed,
    }

    _CACHED_PERFORMANCE[cache_key] = payload
    return payload
