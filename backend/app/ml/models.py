"""
Machine Learning Models & Evaluation Engine
===========================================
Supports XGBoost, Random Forest, and Logistic Regression with comprehensive
evaluation metrics, confusion matrix, ROC curves, and model serialization.
"""
from __future__ import annotations

import os
from typing import Dict, Any, Optional, List, Tuple
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    roc_auc_score,
    f1_score,
    precision_score,
    recall_score,
    confusion_matrix,
    roc_curve,
)
from xgboost import XGBClassifier
import joblib

from app.core.logging import get_logger

logger = get_logger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)


def get_model_instance(model_name: str, params: Optional[Dict[str, Any]] = None, seed: int = 42, scale_pos_weight: float = 1.0) -> Any:
    """Instantiate a model with appropriate default/configured hyperparameters."""
    model_key = model_name.lower().replace("-", "").replace("_", "").replace(" ", "")
    params = params or {}

    if "xgboost" in model_key or "xgb" in model_key:
        default_params = {
            "objective": "binary:logistic",
            "eval_metric": "logloss",
            "scale_pos_weight": scale_pos_weight,
            "random_state": seed,
            "n_estimators": 100,
            "max_depth": 6,
            "learning_rate": 0.1,
            "subsample": 0.8,
            "colsample_bytree": 0.8,
        }
        default_params.update(params)
        return XGBClassifier(**default_params)

    elif "randomforest" in model_key or "rf" in model_key:
        default_params = {
            "n_estimators": 100,
            "max_depth": 10,
            "class_weight": "balanced",
            "random_state": seed,
            "n_jobs": -1,
        }
        default_params.update(params)
        return RandomForestClassifier(**default_params)

    elif "logistic" in model_key or "lr" in model_key:
        default_params = {
            "penalty": "l2",
            "C": 1.0,
            "class_weight": "balanced",
            "max_iter": 1000,
            "random_state": seed,
        }
        default_params.update(params)
        return LogisticRegression(**default_params)

    else:
        raise ValueError(f"Unsupported model: {model_name}. Choose 'xgboost', 'randomforest', or 'logisticregression'.")


def evaluate_model(
    model: Any,
    X_test: np.ndarray,
    y_test: np.ndarray,
) -> Dict[str, Any]:
    """Compute comprehensive performance metrics and ROC curve points."""
    y_pred_proba = model.predict_proba(X_test)[:, 1] if hasattr(model, "predict_proba") else model.predict(X_test)
    y_pred = (y_pred_proba >= 0.5).astype(int)

    acc = float(accuracy_score(y_test, y_pred))
    auc = float(roc_auc_score(y_test, y_pred_proba)) if len(np.unique(y_test)) > 1 else 0.5
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    prec = float(precision_score(y_test, y_pred, zero_division=0))
    rec = float(recall_score(y_test, y_pred, zero_division=0))

    cm = confusion_matrix(y_test, y_pred).tolist()
    
    # Compute ROC Curve (downsampled for lightweight JSON payload)
    fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
    roc_points = [{"fpr": float(f), "tpr": float(t)} for f, t in zip(fpr, tpr)]

    return {
        "accuracy": acc,
        "auc": auc,
        "f1_score": f1,
        "precision": prec,
        "recall": rec,
        "confusion_matrix": cm,
        "roc_curve": roc_points[:50],  # Keep max 50 points
    }


def train_and_evaluate(
    model_name: str,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_names: List[str],
    params: Optional[Dict[str, Any]] = None,
    seed: int = 42,
    scale_pos_weight: float = 1.0,
    save_model: bool = True,
) -> Dict[str, Any]:
    """Train model, evaluate metrics, compute feature importances, and optionally serialize."""
    model = get_model_instance(model_name, params=params, seed=seed, scale_pos_weight=scale_pos_weight)
    
    model.fit(X_train, y_train)
    metrics = evaluate_model(model, X_test, y_test)

    # Feature importance extraction
    importances = []
    if hasattr(model, "feature_importances_"):
        raw_imp = model.feature_importances_
        sorted_indices = np.argsort(raw_imp)[::-1]
        for idx in sorted_indices[:30]:
            importances.append({
                "feature": feature_names[idx],
                "importance": float(raw_imp[idx]),
            })
    elif hasattr(model, "coef_"):
        raw_coef = np.abs(model.coef_[0])
        sorted_indices = np.argsort(raw_coef)[::-1]
        for idx in sorted_indices[:30]:
            importances.append({
                "feature": feature_names[idx],
                "importance": float(raw_coef[idx]),
            })

    model_id = f"{model_name.lower()}_seed{seed}"
    model_path = None

    if save_model:
        model_path = os.path.join(MODELS_DIR, f"{model_id}.joblib")
        joblib.dump({
            "model": model,
            "model_name": model_name,
            "feature_names": feature_names,
            "seed": seed,
            "metrics": metrics,
        }, model_path)
        logger.info("Saved trained model artifact", model_id=model_id, path=model_path)

    return {
        "model_id": model_id,
        "model_name": model_name,
        "seed": seed,
        "metrics": metrics,
        "top_features": importances,
        "model_path": model_path,
        "model_obj": model,
    }
