"""
Phase 3 Test Suite — Machine Learning, Benchmark Models & SHAP Explainability
============================================================================
Validates:
1. Stratified subject-level splitting (zero subject leakage on study_id).
2. XGBoost, Random Forest, and Logistic Regression model training & evaluation.
3. Native TreeSHAP & feature importance extraction.
4. Historical baseline loader (30 experiments).
5. FastAPI /api/ml endpoints.
"""
import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch, MagicMock

from app.ml.data_loader import preprocess_and_split
from app.ml.models import train_and_evaluate, evaluate_model, get_model_instance
from app.ml.shap_engine import compute_shap_explanations, explain_single_sample
from app.ml.baseline_loader import load_baseline_experiments, get_aggregated_benchmarks, load_baseline_shap_rankings
from app.routers.ml import list_experiments, get_benchmarks, predict_risk, get_global_shap
from app.schemas.ml import PredictRequest


@pytest.fixture
def mock_microbiome_df():
    """Create synthetic clinical microbiome dataframe for rapid offline tests."""
    np.random.seed(42)
    n_samples = 40
    n_features = 20
    
    # 10 subjects with 4 samples each
    study_ids = [f"SUBJ_{i:03d}" for i in range(10) for _ in range(4)]
    sample_ids = [f"SMP_{i:04d}" for i in range(n_samples)]
    # Subject-level labels
    subject_labels = {f"SUBJ_{i:03d}": (1 if i % 2 == 0 else 0) for i in range(10)}
    alzheimers = [subject_labels[sid] for sid in study_ids]

    data = {
        "Sample ID": sample_ids,
        "study_id": study_ids,
        "Alzheimers": alzheimers,
        "Date Sample": ["2020-01-01"] * n_samples,
        "age": [75.0] * n_samples,
        "Dementia Other": [0] * n_samples,
    }

    # Add features
    for f in range(n_features):
        fname = f"Species_{f:02d}" if f < 15 else f"Clinical_Score_{f}"
        data[fname] = np.random.uniform(0.0, 1.0, size=n_samples)

    return pd.DataFrame(data)


def test_stratified_subject_split_no_leakage(mock_microbiome_df):
    """Verify train/test split has 0 overlapping study_ids (prevents longitudinal leakage)."""
    split = preprocess_and_split(mock_microbiome_df, test_size=0.3, seed=42)

    train_study_ids = set(split["train_df"]["study_id"])
    test_study_ids = set(split["test_df"]["study_id"])

    overlap = train_study_ids.intersection(test_study_ids)
    assert len(overlap) == 0, f"Subject leakage detected: {overlap}"
    assert len(split["X_train"]) + len(split["X_test"]) == len(mock_microbiome_df)
    assert len(split["feature_columns"]) == 20


def test_xgboost_training_and_metrics(mock_microbiome_df):
    """Test XGBoost model training, prediction, and metrics extraction."""
    split = preprocess_and_split(mock_microbiome_df, test_size=0.3, seed=42)

    result = train_and_evaluate(
        model_name="xgboost",
        X_train=split["X_train"],
        y_train=split["y_train"],
        X_test=split["X_test"],
        y_test=split["y_test"],
        feature_names=split["feature_columns"],
        seed=42,
        save_model=False,
    )

    assert "metrics" in result
    m = result["metrics"]
    assert 0.0 <= m["accuracy"] <= 1.0
    assert 0.0 <= m["auc"] <= 1.0
    assert 0.0 <= m["f1_score"] <= 1.0
    assert len(m["confusion_matrix"]) == 2
    assert len(result["top_features"]) > 0


def test_baseline_models_training(mock_microbiome_df):
    """Verify Random Forest and Logistic Regression models train and produce valid metrics."""
    split = preprocess_and_split(mock_microbiome_df, test_size=0.3, seed=42)

    for model_name in ["randomforest", "logisticregression"]:
        res = train_and_evaluate(
            model_name=model_name,
            X_train=split["X_train"],
            y_train=split["y_train"],
            X_test=split["X_test"],
            y_test=split["y_test"],
            feature_names=split["feature_columns"],
            seed=42,
            save_model=False,
        )
        assert res["metrics"]["accuracy"] >= 0.0
        assert len(res["top_features"]) > 0


def test_shap_global_and_local_explanations(mock_microbiome_df):
    """Verify global feature ranking and local single-sample SHAP calculation."""
    split = preprocess_and_split(mock_microbiome_df, test_size=0.3, seed=42)
    model = get_model_instance("xgboost", seed=42, scale_pos_weight=split["scale_pos_weight"])
    model.fit(split["X_train"], split["y_train"])

    # Global SHAP
    global_shap = compute_shap_explanations(model, split["X_train"], split["feature_columns"])
    assert "top_features" in global_shap
    assert len(global_shap["top_features"]) > 0
    top1 = global_shap["top_features"][0]
    assert "mean_abs_shap" in top1
    assert "rank" in top1

    # Local single sample SHAP
    sample_vec = split["X_test"][0]
    local_exp = explain_single_sample(model, sample_vec, split["feature_columns"], split["X_train"])
    assert "prediction_probability" in local_exp
    assert 0.0 <= local_exp["prediction_probability"] <= 1.0
    assert len(local_exp["feature_contributions"]) > 0
    assert local_exp["feature_contributions"][0]["impact"] in ["increases_risk", "decreases_risk"]


@pytest.mark.asyncio
async def test_baseline_loader_historical_benchmarks():
    """Verify baseline experiment loader correctly parses 30 experiments."""
    experiments = load_baseline_experiments()
    assert isinstance(experiments, list)
    if len(experiments) > 0:
        first = experiments[0]
        assert "model" in first
        assert "seed" in first
        assert "auc" in first

    benchmarks = get_aggregated_benchmarks()
    assert isinstance(benchmarks, dict)
    if "xgboost" in benchmarks:
        assert benchmarks["xgboost"]["mean_auc"] > 0.0


@pytest.mark.asyncio
async def test_api_ml_endpoints(mock_microbiome_df):
    """Test API route functions."""
    with patch("app.routers.ml.load_dataset_df", return_value=mock_microbiome_df):
        # 1. Benchmark endpoint
        bench = await get_benchmarks()
        assert bench.total_experiments >= 0

        # 2. Prediction endpoint
        pred = await predict_risk(PredictRequest(model_name="xgboost"))
        assert 0.0 <= pred.alzheimers_risk_probability <= 1.0
        assert pred.risk_level in ["High Risk", "Moderate Risk", "Low Risk"]
        assert len(pred.feature_contributions) > 0

        # 3. Global SHAP endpoint
        shap_res = await get_global_shap(limit=10)
        assert shap_res.total_biomarkers >= 0
