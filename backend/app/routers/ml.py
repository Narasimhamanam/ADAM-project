"""
FastAPI Router for Machine Learning & SHAP Explainability
=========================================================
Exposes model training, historical benchmarks, real-time risk prediction,
and global/local SHAP biomarker explanations.
"""
from __future__ import annotations

import os
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query, status

from app.core.logging import get_logger
from app.ml.data_loader import load_dataset_df, preprocess_and_split
from app.ml.models import train_and_evaluate, get_model_instance
from app.ml.baseline_loader import (
    load_baseline_experiments,
    get_aggregated_benchmarks,
    load_baseline_shap_rankings,
)
from app.ml.shap_engine import compute_shap_explanations, explain_single_sample
from app.schemas.ml import (
    ExperimentRecord,
    BenchmarkSummaryResponse,
    TrainRequest,
    TrainResponse,
    PredictRequest,
    PredictResponse,
    FeatureContribution,
    ShapGlobalResponse,
    ShapFeatureRank,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/ml", tags=["machine-learning"])

# In-memory cached trained models
_TRAINED_MODELS: Dict[str, Any] = {}
_CACHED_DATA: Optional[Dict[str, Any]] = None


def get_cached_split(seed: int = 42) -> Dict[str, Any]:
    """Cache data split in memory for fast prediction & SHAP."""
    global _CACHED_DATA
    if _CACHED_DATA is None or _CACHED_DATA.get("seed") != seed:
        df = load_dataset_df()
        _CACHED_DATA = preprocess_and_split(df, seed=seed)
    return _CACHED_DATA


@router.get(
    "/experiments",
    response_model=List[ExperimentRecord],
    summary="List 30 baseline experiments",
    description="Returns the 30 experimental runs for XGBoost, Random Forest, and Logistic Regression.",
)
async def list_experiments(
    model: Optional[str] = Query(None, description="Filter by model: xgboost | randomforest | logisticregression")
) -> List[ExperimentRecord]:
    records = load_baseline_experiments()
    if model:
        m_filter = model.lower().replace("-", "").replace("_", "")
        records = [r for r in records if m_filter in r["model"].lower().replace("-", "").replace("_", "")]
    return records


@router.get(
    "/benchmark",
    response_model=BenchmarkSummaryResponse,
    summary="Aggregated model benchmarks",
    description="Returns mean ± std performance metrics comparing all models across 30 experiment seeds.",
)
async def get_benchmarks() -> BenchmarkSummaryResponse:
    benchmarks = get_aggregated_benchmarks()
    total_exp = sum(len(b["experiments"]) for b in benchmarks.values()) if benchmarks else 0
    return BenchmarkSummaryResponse(
        total_experiments=total_exp,
        models=benchmarks,
    )


@router.post(
    "/train",
    response_model=TrainResponse,
    summary="Train a machine learning model",
    description="Trains an XGBoost, Random Forest, or Logistic Regression model on the dataset with subject-level splitting.",
)
async def train_model(payload: TrainRequest) -> TrainResponse:
    try:
        df = load_dataset_df()
        split = preprocess_and_split(df, test_size=payload.test_size, seed=payload.seed)
        
        result = train_and_evaluate(
            model_name=payload.model_name,
            X_train=split["X_train"],
            y_train=split["y_train"],
            X_test=split["X_test"],
            y_test=split["y_test"],
            feature_names=split["feature_columns"],
            params=payload.params,
            seed=payload.seed,
            scale_pos_weight=split["scale_pos_weight"],
        )

        # Cache model instance
        _TRAINED_MODELS[payload.model_name.lower()] = {
            "model": result["model_obj"],
            "feature_names": split["feature_columns"],
            "split": split,
        }

        return TrainResponse(
            model_id=result["model_id"],
            model_name=result["model_name"],
            seed=result["seed"],
            metrics=result["metrics"],
            top_features=result["top_features"],
            train_samples_count=len(split["X_train"]),
            test_samples_count=len(split["X_test"]),
            feature_count=len(split["feature_columns"]),
        )

    except Exception as e:
        logger.error("Model training failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}",
        )


@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Predict Alzheimer's risk for a patient profile",
    description="Calculates Alzheimer's disease probability and SHAP feature contributions for a given sample or feature vector.",
)
async def predict_risk(payload: PredictRequest) -> PredictResponse:
    try:
        model_name = (payload.model_name or "xgboost").lower()
        split = get_cached_split(seed=42)
        feature_names = split["feature_columns"]

        # Ensure model is initialized
        if model_name not in _TRAINED_MODELS:
            res = train_and_evaluate(
                model_name=model_name,
                X_train=split["X_train"],
                y_train=split["y_train"],
                X_test=split["X_test"],
                y_test=split["y_test"],
                feature_names=feature_names,
                seed=42,
                scale_pos_weight=split["scale_pos_weight"],
            )
            _TRAINED_MODELS[model_name] = {
                "model": res["model_obj"],
                "feature_names": feature_names,
                "split": split,
            }

        model_entry = _TRAINED_MODELS[model_name]
        model = model_entry["model"]

        # Extract and sanitize sample vector matching exact training feature order
        if payload.sample_id:
            df = load_dataset_df()
            matching = df[df["Sample ID"] == payload.sample_id]
            if matching.empty:
                raise HTTPException(status_code=404, detail=f"Sample ID {payload.sample_id} not found in cohort")
            
            sample_row = matching.iloc[0]
            feature_vals = []
            for col in feature_names:
                if col in sample_row:
                    val = pd.to_numeric(sample_row[col], errors="coerce")
                    feature_vals.append(0.0 if pd.isna(val) else float(val))
                else:
                    feature_vals.append(0.0)
            vector = np.array(feature_vals, dtype=np.float64)
            sample_id = payload.sample_id
        elif payload.features:
            feature_vals = []
            for col in feature_names:
                val = pd.to_numeric(payload.features.get(col, 0.0), errors="coerce")
                feature_vals.append(0.0 if pd.isna(val) else float(val))
            vector = np.array(feature_vals, dtype=np.float64)
            sample_id = "custom_profile"
        else:
            # Default to first test sample
            vector = split["X_test"][0]
            sample_id = split["test_sample_ids"][0] if split.get("test_sample_ids") else "test_sample_0"

        # Compute SHAP explanation and probabilities for the vector
        explanation = explain_single_sample(
            model=model,
            sample_vector=vector,
            feature_names=feature_names,
            X_background=split["X_train"],
            top_k=15,
        )

        proba = float(explanation["prediction_probability"])
        label = int(explanation["prediction_binary"])
        confidence = float(max(proba, 1.0 - proba))
        risk_level = "High Risk" if proba >= 0.65 else "Moderate Risk" if proba >= 0.35 else "Low Risk"

        logger.info(
            "Executed ML inference",
            model_name=model_name,
            sample_id=sample_id,
            vector_shape=vector.shape,
            risk_probability=round(proba, 4),
            predicted_label=label,
            confidence=round(confidence, 4),
        )

        contributions = [
            FeatureContribution(
                feature=c["feature"],
                feature_value=c["feature_value"],
                shap_value=c["shap_value"],
                impact=c["impact"],
            )
            for c in explanation["feature_contributions"]
        ]

        return PredictResponse(
            model_name=model_name,
            sample_id=sample_id,
            alzheimers_risk_probability=proba,
            predicted_label=label,
            risk_level=risk_level,
            confidence=confidence,
            feature_contributions=contributions,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Prediction failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}",
        )


@router.get(
    "/shap/global",
    response_model=ShapGlobalResponse,
    summary="Global SHAP biomarker rankings",
    description="Returns global Mean Absolute SHAP feature importance rankings across the cohort.",
)
async def get_global_shap(
    category: Optional[str] = Query(None, description="Filter by category: microbiome_species | clinical"),
    limit: int = Query(50, ge=1, le=200, description="Max number of top biomarkers to return"),
) -> ShapGlobalResponse:
    rankings = load_baseline_shap_rankings()

    if not rankings:
        # Compute on the fly if baseline files not found
        split = get_cached_split(seed=42)
        model = get_model_instance("xgboost", seed=42, scale_pos_weight=split["scale_pos_weight"])
        model.fit(split["X_train"], split["y_train"])
        exp = compute_shap_explanations(model, split["X_train"], split["feature_columns"])
        rankings = exp.get("top_features", [])

    if category:
        rankings = [r for r in rankings if r.get("category") == category]

    return ShapGlobalResponse(
        total_biomarkers=len(rankings),
        rankings=rankings[:limit],
    )


@router.get(
    "/shap/sample/{sample_id}",
    summary="Sample-level local SHAP explanation",
    description="Returns individual biomarker SHAP contributions explaining prediction for a single patient sample.",
)
async def get_sample_shap(
    sample_id: str,
    model_name: Optional[str] = Query("xgboost", description="xgboost | randomforest | logisticregression"),
) -> Dict[str, Any]:
    pred_res = await predict_risk(PredictRequest(model_name=model_name, sample_id=sample_id))
    return pred_res.model_dump()
