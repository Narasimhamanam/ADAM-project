"""
Baseline Experiments & Historical Benchmark Loader
==================================================
Loads and caches the 30 experimental runs for XGBoost, Random Forest, and
Logistic Regression from the original ADAM-1 paper.
"""
from __future__ import annotations

import glob
import os
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

from app.core.logging import get_logger

logger = get_logger(__name__)


def get_base_research_dir() -> str:
    """Resolve original_adam research root path."""
    env_dir = os.environ.get("ORIGINAL_ADAM_DIR")
    if env_dir and os.path.exists(env_dir):
        return os.path.dirname(env_dir)
    docker_mount = "/original_adam/ADAM"
    if os.path.exists(docker_mount):
        return docker_mount
    rel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "original_adam", "ADAM"))
    if os.path.exists(rel_path):
        return rel_path
    return r"e:\ADAM-Enhanced\original_adam\ADAM"


def load_baseline_experiments() -> List[Dict[str, Any]]:
    """
    Load the 30-experiment summary records across models.
    """
    base_dir = get_base_research_dir()
    fpath = os.path.join(base_dir, "base_model_selection", "baseline_model_experiments_summary.csv")
    
    # Fallback to output/xgboost_experiments_summary.csv if base_model_selection not present
    records = []
    if os.path.exists(fpath):
        df = pd.read_csv(fpath)
        for _, row in df.iterrows():
            records.append({
                "model": str(row["Model"]).lower(),
                "seed": int(row["Seed"]),
                "experiment_number": int(row["Experiment_Number"]),
                "accuracy": float(row["Accuracy"]),
                "auc": float(row["AUC"]),
                "f1_score": float(row["F1_Score"]),
            })
    else:
        # Fallback to xgboost_experiments_summary
        xgb_path = os.path.join(base_dir, "output", "xgboost_experiments_summary.csv")
        if os.path.exists(xgb_path):
            df = pd.read_csv(xgb_path)
            for _, row in df.iterrows():
                records.append({
                    "model": "xgboost",
                    "seed": int(row["Seed"]),
                    "experiment_number": int(row["Experiment_Number"]),
                    "accuracy": float(row["Accuracy"]),
                    "auc": float(row["AUC"]),
                    "f1_score": float(row["F1_Score"]),
                })

    return records


def get_aggregated_benchmarks() -> Dict[str, Any]:
    """Compute mean ± std for each model across all experiments."""
    records = load_baseline_experiments()
    if not records:
        return {}

    df = pd.DataFrame(records)
    summary = {}

    for model_name, group in df.groupby("model"):
        summary[model_name] = {
            "experiment_count": len(group),
            "mean_accuracy": float(group["accuracy"].mean()),
            "std_accuracy": float(group["accuracy"].std()),
            "mean_auc": float(group["auc"].mean()),
            "std_auc": float(group["auc"].std()),
            "mean_f1": float(group["f1_score"].mean()),
            "std_f1": float(group["f1_score"].std()),
            "best_auc": float(group["auc"].max()),
            "best_f1": float(group["f1_score"].max()),
            "experiments": group.to_dict(orient="records"),
        }

    return summary


def load_baseline_shap_rankings() -> List[Dict[str, Any]]:
    """Aggregate SHAP feature importance rankings across all 30 experiment SHAP files."""
    base_dir = get_base_research_dir()
    shap_files = glob.glob(os.path.join(base_dir, "output", "xgboost_experiment*_shap_values.csv"))

    if not shap_files:
        return []

    all_dfs = []
    for f in shap_files:
        try:
            df = pd.read_csv(f)
            if "Feature" in df.columns and "Mean_Abs_SHAP" in df.columns:
                all_dfs.append(df)
        except Exception as e:
            logger.warning("Failed to parse SHAP file", file=f, error=str(e))

    if not all_dfs:
        return []

    combined = pd.concat(all_dfs, ignore_index=True)
    agg = combined.groupby("Feature").agg({
        "Mean_SHAP": "mean",
        "Mean_Abs_SHAP": "mean",
        "Std_SHAP": "mean",
    }).reset_index()

    agg = agg.sort_values(by="Mean_Abs_SHAP", ascending=False)

    results = []
    for rank, (_, row) in enumerate(agg.iterrows(), 1):
        feature_name = str(row["Feature"])
        # Classify as species vs clinical covariate
        is_clinical = any(term in feature_name.lower() for term in ["score", "frailty", "scale", "age", "ppi", "inhibitor", "blocker", "indicator"])
        category = "clinical" if is_clinical else "microbiome_species"

        results.append({
            "rank": rank,
            "feature": feature_name,
            "mean_shap": float(row["Mean_SHAP"]),
            "mean_abs_shap": float(row["Mean_Abs_SHAP"]),
            "std_shap": float(row["Std_SHAP"]),
            "category": category,
        })

    return results
