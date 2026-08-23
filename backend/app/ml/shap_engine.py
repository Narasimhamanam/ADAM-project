"""
SHAP Explainability Engine
==========================
Calculates global feature importance and individual sample-level SHAP contributions
for XGBoost, Random Forest, and Logistic Regression models.
Supports native XGBoost TreeSHAP (pred_contribs=True) and shap library fallback.
"""
from __future__ import annotations

from typing import Dict, Any, List, Optional
import numpy as np
import xgboost as xgb

from app.core.logging import get_logger

logger = get_logger(__name__)

# Optional import of shap
try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False


def _compute_xgboost_shap(model: Any, X: np.ndarray) -> np.ndarray:
    """Compute exact TreeSHAP values using XGBoost native predictor."""
    booster = model.get_booster()
    dmat = xgb.DMatrix(X)
    # pred_contribs=True returns (N, M + 1) where the last column is the bias term
    contribs = booster.predict(dmat, pred_contribs=True)
    # Return feature contributions excluding the last bias column
    return contribs[:, :-1]


def compute_shap_explanations(
    model: Any,
    X_background: np.ndarray,
    feature_names: List[str],
    X_explain: Optional[np.ndarray] = None,
    max_background_samples: int = 100,
) -> Dict[str, Any]:
    """
    Compute global SHAP values across feature background.
    """
    if len(X_background) > max_background_samples:
        indices = np.random.choice(len(X_background), max_background_samples, replace=False)
        bg = X_background[indices]
    else:
        bg = X_background

    if X_explain is None:
        X_explain = bg

    try:
        if hasattr(model, "get_booster"):
            # Native XGBoost TreeSHAP
            shap_array = _compute_xgboost_shap(model, X_explain)
        elif HAS_SHAP and hasattr(model, "estimators_"):
            explainer = shap.TreeExplainer(model)
            sv = explainer.shap_values(X_explain)
            shap_array = sv[1] if isinstance(sv, list) and len(sv) == 2 else sv
        elif hasattr(model, "coef_"):
            # Linear model SHAP: (X - mean(X)) * coef
            center = X_explain - np.mean(bg, axis=0)
            shap_array = center * model.coef_[0]
        else:
            # Tree / Ensemble fallback
            if hasattr(model, "feature_importances_"):
                imp = model.feature_importances_
                shap_array = np.tile(imp, (len(X_explain), 1))
            else:
                shap_array = np.zeros((len(X_explain), len(feature_names)))

        if hasattr(shap_array, "values"):
            shap_array = shap_array.values

        if shap_array.ndim == 3:
            shap_array = shap_array[:, :, 1]

        mean_abs_shap = np.mean(np.abs(shap_array), axis=0)
        mean_shap = np.mean(shap_array, axis=0)
        std_shap = np.std(shap_array, axis=0)

        sorted_indices = np.argsort(mean_abs_shap)[::-1]

        rankings = []
        for rank, idx in enumerate(sorted_indices[:50], 1):
            fname = feature_names[idx] if idx < len(feature_names) else f"feature_{idx}"
            is_clinical = any(term in fname.lower() for term in ["score", "frailty", "scale", "age", "ppi", "inhibitor", "blocker", "indicator"])
            rankings.append({
                "rank": rank,
                "feature": fname,
                "mean_abs_shap": float(mean_abs_shap[idx]),
                "mean_shap": float(mean_shap[idx]),
                "std_shap": float(std_shap[idx]),
                "category": "clinical" if is_clinical else "microbiome_species",
            })

        return {
            "base_value": 0.5,
            "top_features": rankings,
            "total_features_evaluated": len(feature_names),
        }

    except Exception as e:
        logger.error("Failed to compute SHAP values", error=str(e))
        return {
            "error": str(e),
            "top_features": [],
            "total_features_evaluated": 0,
        }


def explain_single_sample(
    model: Any,
    sample_vector: np.ndarray,
    feature_names: List[str],
    X_background: np.ndarray,
    top_k: int = 15,
) -> Dict[str, Any]:
    """
    Compute local SHAP breakdown for a single input patient vector.
    """
    if sample_vector.ndim == 1:
        sample_vector = sample_vector.reshape(1, -1)

    try:
        if hasattr(model, "get_booster"):
            # Native XGBoost TreeSHAP
            contribs = model.get_booster().predict(xgb.DMatrix(sample_vector), pred_contribs=True)
            shap_vec = contribs[0, :-1]
            base_val = float(contribs[0, -1])
        elif HAS_SHAP and hasattr(model, "estimators_"):
            explainer = shap.TreeExplainer(model)
            sv = explainer.shap_values(sample_vector)
            shap_vec = sv[1][0] if isinstance(sv, list) and len(sv) == 2 else sv[0]
            base_val = float(explainer.expected_value[1]) if isinstance(explainer.expected_value, (list, np.ndarray)) else float(explainer.expected_value)
        elif hasattr(model, "coef_"):
            center = sample_vector[0] - np.mean(X_background[:50], axis=0)
            shap_vec = center * model.coef_[0]
            base_val = float(model.intercept_[0]) if hasattr(model, "intercept_") else 0.0
        else:
            shap_vec = np.zeros(len(feature_names))
            base_val = 0.5

        abs_sorted = np.argsort(np.abs(shap_vec))[::-1]

        contributions = []
        for idx in abs_sorted[:top_k]:
            fname = feature_names[idx] if idx < len(feature_names) else f"feature_{idx}"
            val = float(sample_vector[0, idx])
            shap_val = float(shap_vec[idx])
            contributions.append({
                "feature": fname,
                "feature_value": val,
                "shap_value": shap_val,
                "impact": "increases_risk" if shap_val > 0 else "decreases_risk",
            })

        proba = float(model.predict_proba(sample_vector)[0, 1]) if hasattr(model, "predict_proba") else 0.5

        return {
            "prediction_probability": proba,
            "prediction_binary": int(proba >= 0.5),
            "base_value": base_val,
            "feature_contributions": contributions,
        }

    except Exception as e:
        logger.error("Failed to compute single sample explanation", error=str(e))
        return {
            "error": str(e),
            "prediction_probability": 0.5,
            "prediction_binary": 0,
            "base_value": 0.0,
            "feature_contributions": [],
        }
