"""
Test Suite — Longitudinal AD Risk Trajectory Module
===================================================
Tests data modeling, timeline ordering, subject-level leakage prevention,
mathematical slope & change calculations, SHAP & diversity progression,
RAG evidence retrieval, and FastAPI endpoints.
"""
import pytest
import numpy as np
import pandas as pd
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.ml.longitudinal import (
    LongitudinalTrajectoryService,
    validate_no_subject_leakage,
    SubjectLeakageError,
    RiskModelArchitecture,
    RESEARCH_DISCLAIMER,
)


@pytest.fixture
def sample_longitudinal_df():
    """Create a verified synthetic longitudinal cohort with 8 subjects and known visit schedules."""
    data = []
    # 8 subjects: 4 AD (even), 4 Control (odd)
    for s_idx in range(8):
        sid = f"SUBJ_{s_idx:03d}"
        is_ad = 1.0 if s_idx % 2 == 0 else 0.0

        if s_idx == 0:
            # SUBJ_000: 4 observations (Days 0, 30, 60, 90)
            days = [0, 30, 60, 90]
        elif s_idx == 1:
            # SUBJ_001: 2 observations (Days 0, 60)
            days = [0, 60]
        elif s_idx == 2:
            # SUBJ_002: 1 observation (Day 0)
            days = [0]
        else:
            # Others: 2 observations (Days 0, 30)
            days = [0, 30]

        for d in days:
            row = {
                "Sample ID": f"SMP_{s_idx}_{d}",
                "study_id": sid,
                "day": d,
                "Date Sample": f"2020-01-{d+1:02d}",
                "age": 75.0 + s_idx,
                "male": float(s_idx % 2),
                "clinical_frailty_scale": 3.0 + float(is_ad),
                "malnutrition_indicator_sco": float(is_ad),
                "PPI": float(is_ad),
                "abx6mo": 0.0,
                "hopsn": 0.0,
                "Alzheimers": is_ad,
                "Dementia Other": 0.0,
            }
            for f in range(20):
                row[f"Species_{f:02d}"] = 0.05 + (0.01 * f * (is_ad + 1))
            data.append(row)

    return pd.DataFrame(data)


# ── DATA MODEL & TIMELINE TESTS ─────────────────────────────────────────────

def test_subject_grouping_and_chronological_order(sample_longitudinal_df):
    """Verify observations are grouped by real subject ID and strictly sorted chronologically."""
    svc = LongitudinalTrajectoryService(sample_longitudinal_df)
    subjects = svc.list_all_subjects()

    # Verify subject count (8 subjects)
    assert len(subjects) == 8
    subj_ids = [s["subject_id"] for s in subjects]
    assert "SUBJ_000" in subj_ids
    assert "SUBJ_001" in subj_ids
    assert "SUBJ_002" in subj_ids

    # Verify Subject SUBJ_000 ordering
    traj_a = svc.get_subject_trajectory("SUBJ_000", include_shap=False)
    assert traj_a["observation_count"] == 4
    assert traj_a["follow_up_days"] == 90
    days = [obs["study_day"] for obs in traj_a["observations"]]
    assert days == [0, 30, 60, 90]
    assert days == sorted(days)


def test_single_observation_subject_handling(sample_longitudinal_df):
    """Verify subjects with only 1 observation are handled safely with Insufficient Data flag."""
    svc = LongitudinalTrajectoryService(sample_longitudinal_df)
    traj_c = svc.get_subject_trajectory("SUBJ_002", include_shap=False)

    assert traj_c["observation_count"] == 1
    assert traj_c["follow_up_days"] == 0
    assert traj_c["probability_slope_per_day"] is None
    assert traj_c["trajectory_direction"] == "Insufficient Data"
    assert "Single baseline observation" in traj_c["research_interpretation"]


# ── MATHEMATICAL TESTS ───────────────────────────────────────────────────────

def test_mathematical_metrics_and_zero_denominator_safety(sample_longitudinal_df):
    """Verify change, percentage points, slopes, and safe handling of edge cases."""
    svc = LongitudinalTrajectoryService(sample_longitudinal_df)
    traj_a = svc.get_subject_trajectory("SUBJ_000", include_shap=False)

    b_prob = traj_a["baseline_probability"]
    l_prob = traj_a["latest_probability"]
    expected_change = round(l_prob - b_prob, 4)
    expected_change_pp = round((l_prob - b_prob) * 100, 2)

    assert traj_a["probability_change"] == expected_change
    assert traj_a["probability_change_percentage_points"] == expected_change_pp
    assert isinstance(traj_a["relative_probability_change"], float)
    assert not np.isnan(traj_a["relative_probability_change"])
    assert not np.isinf(traj_a["relative_probability_change"])

    # Slope should be calculated when observations >= 2 and span > 0
    assert traj_a["probability_slope_per_day"] is not None
    assert traj_a["monthly_slope_percentage_points"] is not None
    assert traj_a["diversity_slope_per_day"] is not None


# ── LEAKAGE DETECTION & ML INTEGRITY TESTS ──────────────────────────────────

def test_subject_leakage_detector_fails_on_overlap():
    """Verify SubjectLeakageError is raised if any subject appears in both train and test partitions."""
    train_subjects = ["CH1-001", "CH1-002", "CH1-003", "CH1-004"]
    test_subjects = ["CH1-005", "CH1-006"]

    # Disjoint — must pass
    validate_no_subject_leakage(train_subjects, test_subjects)

    # Overlapping — must fail explicitly with SubjectLeakageError
    leaky_test = ["CH1-003", "CH1-005"]
    with pytest.raises(SubjectLeakageError) as exc_info:
        validate_no_subject_leakage(train_subjects, leaky_test)

    assert "SUBJECT LEAKAGE DETECTED" in str(exc_info.value)
    assert "CH1-003" in str(exc_info.value)


# ── TIME HORIZON & EXTENSIBILITY TESTS ───────────────────────────────────────

def test_future_date_horizon_warning_and_no_extrapolation(sample_longitudinal_df):
    """Verify requests past observed follow-up trigger a clear warning and DO NOT extrapolate."""
    svc = LongitudinalTrajectoryService(sample_longitudinal_df)

    # Request horizon of Day 180 (observed only up to Day 90)
    traj_h = svc.get_subject_trajectory("SUBJ_000", max_horizon_day=180, include_shap=False)

    assert traj_h["horizon_warning"] is not None
    assert "No observed data are available beyond Day 90" in traj_h["horizon_warning"]
    assert "Future disease-onset prediction is not currently validated" in traj_h["horizon_warning"]
    # Observation count should remain 4, never fabricating a 5th point
    assert traj_h["observation_count"] == 4


def test_extensible_risk_model_capabilities():
    """Verify architecture cleanly exposes time-to-event as NOT_AVAILABLE without fake data."""
    caps = RiskModelArchitecture.get_capabilities()

    assert caps["current_classification_model"]["status"] == "ACTIVE"
    assert caps["longitudinal_trajectory_model"]["status"] == "ACTIVE"

    tte = caps["future_time_to_event_model"]
    assert tte["status"] == "NOT_AVAILABLE"
    assert tte["available"] is False
    assert tte["future_event_forecasting"] is False
    assert tte["observed_transition_events_in_dataset"] == 0
    assert "0" in tte["reason"] or "zero" in tte["reason"]


# ── API ENDPOINT TESTS ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_api_trajectory_endpoints():
    """Test full HTTP API endpoints for subjects, trajectory, comparison, and evaluation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. List subjects
        resp_list = await ac.get("/api/trajectory/subjects")
        assert resp_list.status_code == 200
        data_list = resp_list.json()
        assert data_list["total_subjects"] == 102
        assert data_list["subjects_with_repeated_samples"] == 75

        # 2. Get specific real subject trajectory (CH1-003)
        resp_traj = await ac.get("/api/trajectory/subjects/CH1-003")
        assert resp_traj.status_code == 200
        traj = resp_traj.json()
        assert traj["subject_id"] == "CH1-003"
        assert traj["observation_count"] == 10
        assert traj["follow_up_days"] == 90
        assert traj["status"] == "RESEARCH_ONLY"
        assert RESEARCH_DISCLAIMER in traj["research_disclaimer"]
        assert len(traj["observations"]) == 10

        # Verify first observation has SHAP explanations and diversity metrics
        first_obs = traj["observations"][0]
        assert "shannon_index" in first_obs["diversity_metrics"]
        assert "top_features" in first_obs["shap_explanation"]

        # 3. Test alias endpoint /api/subjects/CH1-003/trajectory
        resp_alias = await ac.get("/api/subjects/CH1-003/trajectory")
        assert resp_alias.status_code == 200
        assert resp_alias.json()["subject_id"] == "CH1-003"

        # 4. Test alias endpoint /api/subjects/CH1-003/timeline
        resp_timeline = await ac.get("/api/subjects/CH1-003/timeline")
        assert resp_timeline.status_code == 200
        assert resp_timeline.json()["observation_count"] == 10

        # 5. Test compare endpoint
        resp_comp = await ac.post("/api/trajectory/compare", json={"subject_ids": ["CH1-003", "CH1-017"]})
        assert resp_comp.status_code == 200
        comp_data = resp_comp.json()
        assert len(comp_data["comparisons"]) == 2

        # 6. Test evaluation endpoint
        resp_eval = await ac.get("/api/trajectory/evaluation")
        assert resp_eval.status_code == 200
        eval_data = resp_eval.json()
        assert eval_data["total_subjects"] == 102
        assert eval_data["subjects_with_repeated_samples"] == 75
        assert eval_data["subject_leakage_checks_passed"] is True

        # 7. Test capabilities endpoint
        resp_caps = await ac.get("/api/trajectory/capabilities")
        assert resp_caps.status_code == 200
        assert resp_caps.json()["future_time_to_event_model"]["status"] == "NOT_AVAILABLE"

        # 8. Test unknown subject 404
        resp_404 = await ac.get("/api/trajectory/subjects/UNKNOWN_9999")
        assert resp_404.status_code == 404

        # 9. Test observation RAG literature
        sample_id = traj["observations"][0]["sample_id"]
        resp_lit = await ac.get(f"/api/trajectory/subjects/CH1-003/sample/{sample_id}/literature")
        assert resp_lit.status_code == 200
        lit_data = resp_lit.json()
        assert len(lit_data["prompt_hash"]) == 64  # SHA-256 hash length
        assert len(lit_data["articles"]) > 0
