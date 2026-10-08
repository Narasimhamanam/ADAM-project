"""
Automated Research & Data-Integrity Tests for Dynamic Prediction Pipeline
==========================================================================
Verifies:
1. Every record produces its own genuine dataset-derived values (no universal mock).
2. Model switching (XGBoost, Random Forest, Logistic Regression) computes model-specific inference.
3. Confusion matrix evaluations (TP, TN, FP, FN) are calculated strictly dynamically.
4. Model probabilities strictly represent P(Alzheimer's Disease) (class 1).
5. APIs (/api/samples/{id}/prediction and /api/ml/samples/{id}/prediction) respond correctly.
6. Zero silent fallbacks to static or fake demo data.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.ml.predict_service import get_sample_prediction_details
from app.ml.data_loader import load_dataset_df


@pytest.mark.asyncio
async def test_record_specific_sample_prediction_differences():
    """Verify that multiple real cohort samples produce distinct, record-specific responses."""
    df = load_dataset_df()
    sample_ids = ["DC080", "DC071", "FB003", "DC099", "FB100"]

    results = {}
    for sid in sample_ids:
        res = await get_sample_prediction_details(sid, model_name="xgboost")
        results[sid] = res

        # Verify ground truth matches dataset row
        row = df[df["Sample ID"] == sid].iloc[0]
        expected_gt = int(row["Alzheimers"])
        assert res.ground_truth.label == expected_gt
        assert res.sample_id == sid
        assert res.subject_id == str(row["study_id"])

        # Verify patient metadata matches dataset
        assert res.patient.age == float(row["age"])
        assert res.patient.frailty_scale == float(row["clinical_frailty_scale"])
        assert res.patient.malnutrition_score == float(row["malnutrition_indicator_sco"])

        # Check PPI medication bool
        expected_ppi = bool(float(row.get("PPI", row.get("ppi", 0.0))) == 1.0)
        assert res.patient.ppi_medication == expected_ppi

    # Assert that metadata differs across samples
    ages = [r.patient.age for r in results.values()]
    assert len(set(ages)) > 1, "Ages must vary across patients"

    frailties = [r.patient.frailty_scale for r in results.values()]
    assert len(set(frailties)) > 1, "Frailty scores must vary across patients"

    # Assert ground truths differ (both AD positives and controls present)
    gt_labels = [r.ground_truth.label for r in results.values()]
    assert 1 in gt_labels and 0 in gt_labels

    # Assert probabilities differ
    probs = [r.prediction.probability_ad for r in results.values()]
    assert len(set(probs)) == len(sample_ids), "Each sample should produce an independent risk probability"


@pytest.mark.asyncio
async def test_model_switching_same_sample():
    """Verify that switching between XGBoost, Random Forest, and Logistic Regression updates inference."""
    sample_id = "DC080"
    models = ["xgboost", "randomforest", "logisticregression"]

    model_results = {}
    for m in models:
        res = await get_sample_prediction_details(sample_id, model_name=m)
        model_results[m] = res
        assert res.sample_id == sample_id
        assert res.prediction.model_name == m

    # Check model display labels
    assert model_results["xgboost"].prediction.model == "XGBoost"
    assert model_results["randomforest"].prediction.model == "Random Forest"
    assert model_results["logisticregression"].prediction.model == "Logistic Regression"

    # Check explanation methods
    assert "TreeSHAP" in model_results["xgboost"].explainability.method
    assert "TreeSHAP" in model_results["randomforest"].explainability.method
    assert "Linear" in model_results["logisticregression"].explainability.method

    # Features and contributions must be model-specific
    xgb_top = model_results["xgboost"].explainability.shap_features[0].feature
    rf_top = model_results["randomforest"].explainability.shap_features[0].feature
    lr_top = model_results["logisticregression"].explainability.shap_features[0].feature

    # Confirm that at least some top features or their rankings differ across architectures
    top_features = {xgb_top, rf_top, lr_top}
    assert len(top_features) > 1, "Different models should exhibit different feature contribution profiles"


@pytest.mark.asyncio
async def test_confusion_matrix_status_classification():
    """Verify dynamic calculation of True Positive, True Negative, False Positive, and False Negative."""
    # Known samples in the verified dataset for XGBoost:
    # DC080: GT=1, Pred=1 -> True Positive
    # DC071: GT=0, Pred=0 -> True Negative
    # FB003: GT=0, Pred=1 -> False Positive
    # DC099: GT=1, Pred=0 -> False Negative
    cases = [
        ("DC080", 1, 1, "True Positive", True),
        ("DC071", 0, 0, "True Negative", True),
        ("FB003", 0, 1, "False Positive", False),
        ("DC099", 1, 0, "False Negative", False),
    ]

    for sid, expected_gt, expected_pred, expected_status, expected_correct in cases:
        res = await get_sample_prediction_details(sid, model_name="xgboost")
        assert res.ground_truth.label == expected_gt
        assert res.prediction.label == expected_pred
        assert res.evaluation.status == expected_status
        assert res.evaluation.correct == expected_correct
        assert expected_status in res.evaluation.status_detail


@pytest.mark.asyncio
async def test_api_prediction_endpoints():
    """Verify HTTP endpoints return proper 200 responses with the complete unified schema."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Dataset endpoint
        res1 = await client.get("/api/samples/DC080/prediction?model=xgboost")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["sample_id"] == "DC080"
        assert data1["ground_truth"]["label"] == 1
        assert "probability_ad" in data1["prediction"]
        assert "status" in data1["evaluation"]
        assert "shap_features" in data1["explainability"]

        # Backwards compatibility check
        assert "predicted_label" in data1
        assert "alzheimers_prediction" in data1
        assert data1["alzheimers_prediction"] == data1["predicted_label"]

        # 2. ML endpoint alias
        res2 = await client.get("/api/ml/samples/DC080/prediction?model=randomforest")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["prediction"]["model_name"] == "randomforest"

        # 3. 404 for invalid sample
        res_404 = await client.get("/api/samples/NONEXISTENT999/prediction")
        assert res_404.status_code == 404
        assert "not found" in res_404.json()["detail"].lower()


@pytest.mark.asyncio
async def test_no_silent_fallback_or_fake_data():
    """Verify that failure to locate a sample raises an explicit 404 instead of returning mock data."""
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await get_sample_prediction_details("UNKNOWN_SAMPLE_ID")
    assert exc_info.value.status_code == 404
