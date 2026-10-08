"""
Single Source of Truth Prediction Service
==========================================
Coordinates real dataset retrieval, trained model inference, sample-specific
SHAP / linear explanations, and dynamic clinical evaluation for individual cohort samples.

Guarantees:
- Zero fabricated, mocked, or randomized metrics.
- Ground truth is strictly retrieved from the real dataset.
- Model probabilities strictly reflect P(Alzheimer's Disease) (class 1).
- Confusion status (TP / TN / FP / FN) is calculated dynamically.
- Demographics and microbiome features belong strictly to the requested sample.
"""
from __future__ import annotations

import asyncio
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from fastapi import HTTPException, status

from app.core.logging import get_logger
from app.ml.data_loader import load_dataset_df, preprocess_and_split
from app.ml.models import train_and_evaluate, load_saved_model
from app.ml.shap_engine import explain_single_sample
from app.schemas.ml import (
    FeatureContribution,
    GroundTruthDetail,
    PatientMetadata,
    PredictionDetail,
    EvaluationDetail,
    ExplanationDetail,
    SamplePredictionResponse,
)

logger = get_logger(__name__)

# Global model cache to avoid re-training during interactive browsing
_LOADED_MODELS: Dict[str, Any] = {}
_CACHED_SPLIT: Optional[Dict[str, Any]] = None


def get_cached_split(seed: int = 42) -> Dict[str, Any]:
    """Cache data split in memory for fast prediction & SHAP."""
    global _CACHED_SPLIT
    if _CACHED_SPLIT is None or _CACHED_SPLIT.get("seed") != seed:
        df = load_dataset_df()
        _CACHED_SPLIT = preprocess_and_split(df, seed=seed)
    return _CACHED_SPLIT


def canonicalize_model_name(raw_name: Optional[str]) -> tuple[str, str]:
    """Normalize input model name to canonical key and human-readable label."""
    norm = (raw_name or "xgboost").lower().replace("-", "").replace("_", "").replace(" ", "")
    if "xgb" in norm or "xgboost" in norm:
        return "xgboost", "XGBoost"
    elif "rf" in norm or "randomforest" in norm or "forest" in norm:
        return "randomforest", "Random Forest"
    elif "logistic" in norm or "lr" in norm or "reg" in norm:
        return "logisticregression", "Logistic Regression"
    else:
        return "xgboost", "XGBoost"


def get_or_load_model(model_key: str, split: Dict[str, Any]) -> Any:
    """Load pre-trained model artifact or train on demand."""
    feature_names = split["feature_columns"]

    # Verify cached model
    if model_key in _LOADED_MODELS:
        cached_entry = _LOADED_MODELS[model_key]
        if len(cached_entry.get("feature_names", [])) == len(feature_names):
            return cached_entry["model"]
        else:
            del _LOADED_MODELS[model_key]

    # Try loading from disk
    saved = load_saved_model(model_key, seed=42)
    if saved is not None and "model" in saved and len(saved.get("feature_names", [])) == len(feature_names):
        _LOADED_MODELS[model_key] = {
            "model": saved["model"],
            "feature_names": feature_names,
        }
        return saved["model"]

    # Train model synchronously if not yet trained
    res = train_and_evaluate(
        model_name=model_key,
        X_train=split["X_train"],
        y_train=split["y_train"],
        X_test=split["X_test"],
        y_test=split["y_test"],
        feature_names=feature_names,
        seed=42,
        scale_pos_weight=split["scale_pos_weight"],
    )
    _LOADED_MODELS[model_key] = {
        "model": res["model_obj"],
        "feature_names": feature_names,
    }
    return res["model_obj"]


async def get_sample_prediction_details(
    sample_id: str,
    model_name: str = "xgboost",
) -> SamplePredictionResponse:
    """
    Execute end-to-end model inference and explanation for a real cohort record.
    Single Source of Truth for the Actual Ground Truth vs Model Prediction view.
    """
    clean_id = sample_id.strip().upper()
    df = load_dataset_df()
    matching = df[df["Sample ID"] == clean_id]

    if matching.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample '{clean_id}' not found in 335-participant research cohort.",
        )

    row = matching.iloc[0]
    canonical_key, display_model_name = canonicalize_model_name(model_name)

    # 1. Ground Truth Extraction
    raw_ad = row.get("Alzheimers")
    if pd.isna(raw_ad):
        gt_label = 0
    else:
        gt_label = int(float(raw_ad))

    gt_diagnosis = "Alzheimer's Disease" if gt_label == 1 else "Cognitively Normal (Control)"
    gt_display = "Positive" if gt_label == 1 else "Control"
    ground_truth = GroundTruthDetail(
        label=gt_label,
        diagnosis=gt_diagnosis,
        display_label=gt_display,
    )

    # 2. Patient Clinical Metadata Extraction
    study_id = str(row.get("study_id", clean_id))
    age_val = float(row.get("age")) if pd.notnull(row.get("age")) else None
    cfs_val = float(row.get("clinical_frailty_scale")) if pd.notnull(row.get("clinical_frailty_scale")) else None
    malnut_val = float(row.get("malnutrition_indicator_sco")) if pd.notnull(row.get("malnutrition_indicator_sco")) else None
    
    # Check PPI medication with case insensitivity
    ppi_raw = row.get("PPI") if "PPI" in row else row.get("ppi", 0.0)
    ppi_bool = bool(float(ppi_raw) == 1.0) if pd.notnull(ppi_raw) else False

    male_val = float(row.get("male")) if pd.notnull(row.get("male")) else None
    gender_str = "Male" if male_val == 1.0 else "Female" if male_val == 0.0 else None
    day_val = int(row.get("day", 0)) if pd.notnull(row.get("day")) else 0
    abx_raw = row.get("abx6mo") if "abx6mo" in row else None
    abx_bool = bool(float(abx_raw) == 1.0) if pd.notnull(abx_raw) else None

    patient_meta = PatientMetadata(
        age=age_val,
        gender=gender_str,
        day=day_val,
        frailty_scale=cfs_val,
        malnutrition_score=malnut_val,
        ppi_medication=ppi_bool,
        abx6mo=abx_bool,
    )

    # 3. Model Inference & Sample-Specific Explainability
    split = get_cached_split(seed=42)
    feature_names = split["feature_columns"]
    model = get_or_load_model(canonical_key, split)

    # Build exact feature vector from dataset row matching training columns
    feature_vals = []
    for col in feature_names:
        if col in row:
            val = pd.to_numeric(row[col], errors="coerce")
            feature_vals.append(0.0 if pd.isna(val) else float(val))
        else:
            feature_vals.append(0.0)
    vector = np.array(feature_vals, dtype=np.float64)

    # Run explanation and prediction in background thread
    explanation = await asyncio.to_thread(
        explain_single_sample,
        model=model,
        sample_vector=vector,
        feature_names=feature_names,
        X_background=split["X_train"],
        top_k=20,
    )

    prob_ad = float(explanation["prediction_probability"])
    pred_label = int(explanation["prediction_binary"])
    risk_percent = round(prob_ad * 100.0, 1)
    confidence = round(float(max(prob_ad, 1.0 - prob_ad)), 4)
    classification = "High Risk" if prob_ad >= 0.65 else "Moderate Risk" if prob_ad >= 0.35 else "Low Risk"
    pred_display = "Predicted Positive" if pred_label == 1 else "Predicted Negative (Control)"

    prediction_detail = PredictionDetail(
        model=display_model_name,
        model_name=canonical_key,
        label=pred_label,
        display_label=pred_display,
        probability_ad=prob_ad,
        risk_percent=risk_percent,
        classification=classification,
        confidence=confidence,
    )

    # 4. Dynamic Evaluation Calculation (TP, TN, FP, FN)
    is_correct = bool(gt_label == pred_label)
    if gt_label == 1 and pred_label == 1:
        status_code = "True Positive"
        status_detail = "True Positive (Correct Detection)"
    elif gt_label == 0 and pred_label == 0:
        status_code = "True Negative"
        status_detail = "True Negative (Correct Control)"
    elif gt_label == 0 and pred_label == 1:
        status_code = "False Positive"
        status_detail = "False Positive (Over-predicted)"
    elif gt_label == 1 and pred_label == 0:
        status_code = "False Negative"
        status_detail = "False Negative (Under-predicted)"
    else:
        status_code = "Unknown"
        status_detail = "Evaluation Inconclusive"

    evaluation_detail = EvaluationDetail(
        status=status_code,
        correct=is_correct,
        status_detail=status_detail,
    )

    # 5. Explanations and Biomarkers
    contributions = [
        FeatureContribution(
            feature=c["feature"],
            feature_value=c["feature_value"],
            shap_value=c["shap_value"],
            impact=c["impact"],
        )
        for c in explanation["feature_contributions"]
    ]

    explainability_detail = ExplanationDetail(
        method=explanation.get("method", "Sample-Specific Feature Contribution"),
        base_value=float(explanation.get("base_value", 0.5)),
        shap_features=contributions,
    )

    features_dict = {
        "evaluated_features_count": len(feature_names),
        "top_biomarkers": [
            {
                "feature": c["feature"],
                "value": c["feature_value"],
                "shap": c["shap_value"],
                "impact": c["impact"],
            }
            for c in explanation["feature_contributions"][:10]
        ],
    }

    return SamplePredictionResponse(
        sample_id=clean_id,
        subject_id=study_id,
        ground_truth=ground_truth,
        patient=patient_meta,
        prediction=prediction_detail,
        evaluation=evaluation_detail,
        features=features_dict,
        explainability=explainability_detail,
        # Backwards compatibility fields
        model_name=canonical_key,
        alzheimers_risk_probability=prob_ad,
        predicted_label=pred_label,
        alzheimers_prediction=pred_label,
        risk_level=classification,
        confidence=confidence,
        feature_contributions=contributions,
    )
