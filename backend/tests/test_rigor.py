"""Tests for the rigor suite (leakage audit, calibration, conformal, SHAP stability).

Unit tests use a small synthetic cohort with a *subject fingerprint*: every subject has a
unique feature signature and a constant label, but the signature carries no disease signal.
A leak-free evaluation must therefore score ~0.5 while naive sample-level CV scores high.
"""
import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient

from app.research import rigor


def _fingerprint_cohort(n_subjects=48, visits=4, n_noise=20, seed=0):
    rng = np.random.RandomState(seed)
    labels = np.array([0, 1] * (n_subjects // 2))
    rng.shuffle(labels)
    centers = rng.normal(0, 3, size=(n_subjects, n_noise))  # identity signal, independent of label
    X, y, g = [], [], []
    for s in range(n_subjects):
        for _ in range(visits):
            X.append(centers[s] + rng.normal(0, 0.3, size=n_noise))
            y.append(labels[s])
            g.append(f"S{s:03d}")
    X = np.asarray(X)
    names = [f"f{i}" for i in range(n_noise)]
    return {
        "X": X, "y": np.asarray(y), "groups": np.asarray(g), "feature_names": names,
        "taxa_idx": np.arange(10), "clin_idx": np.arange(10, n_noise), "proxy_idx": np.array([0]),
        "n_samples": len(y), "n_subjects": n_subjects, "n_features": n_noise,
    }


def test_leakage_audit_detects_subject_fingerprint_leak():
    data = _fingerprint_cohort()
    out = rigor.leakage_audit(data, models=("xgboost",), n_repeats=2, n_splits=4, seed=1)["models"]["xgboost"]
    assert out["auroc_sample_level_cv"]["mean"] > 0.85          # naive CV "learns" the person
    assert out["auroc_subject_grouped_cv"]["mean"] < 0.70        # grouped CV cannot
    assert out["auroc_inflation_from_leakage"]["mean"] > 0.2
    shared = out["mean_subjects_shared_between_train_and_test_per_fold"]
    assert shared["subject_grouped_cv"] == 0.0 and shared["sample_level_cv"] > 0


def test_ece_perfect_and_miscalibrated():
    y = np.array([0] * 50 + [1] * 50)
    perfect = np.array([0.0] * 50 + [1.0] * 50)
    ece, _ = rigor.expected_calibration_error(y, perfect)
    assert ece == pytest.approx(0.0, abs=1e-9)
    ece_bad, _ = rigor.expected_calibration_error(y, np.full(100, 0.95))
    assert ece_bad == pytest.approx(0.45, abs=1e-6)


def test_conformal_runs_and_coverage_is_sane():
    rng = np.random.RandomState(3)
    n_subjects, visits = 120, 2
    labels = rng.randint(0, 2, n_subjects)
    X, y, g = [], [], []
    for s in range(n_subjects):
        for _ in range(visits):
            X.append(np.r_[labels[s] * 1.0 + rng.normal(0, 1.0), rng.normal(0, 1, 5)])
            y.append(labels[s]); g.append(f"S{s}")
    data = {"X": np.asarray(X), "y": np.asarray(y), "groups": np.asarray(g)}
    rep = rigor.conformal_report(data, alpha=0.2, n_repeats=15, seed=5)
    cov = rep["empirical_coverage"]["mean"]
    assert rep["config"]["n_repeats_used"] >= 10
    assert 0.65 <= cov <= 1.0
    assert rep["fraction_empty_sets"]["mean"] <= 0.35


def test_subject_split_has_zero_overlap():
    data = _fingerprint_cohort()
    tr, ca, te = rigor._subject_split(data["groups"], data["y"], np.random.RandomState(0), (0.5, 0.25, 0.25))
    s = [set(data["groups"][i]) for i in (tr, ca, te)]
    assert not (s[0] & s[1]) and not (s[0] & s[2]) and not (s[1] & s[2])
    assert len(tr) + len(ca) + len(te) == len(data["y"])


def test_shap_stability_structure():
    data = _fingerprint_cohort(n_subjects=40, visits=3)
    rep = rigor.shap_stability(data, n_boot=3, top_k=5, seed=2)
    assert rep["config"]["n_boot_used"] >= 2
    assert 0.0 <= rep["pairwise_jaccard_top_k"]["mean"] <= 1.0
    assert len(rep["consensus_top_features"]) == 5


def test_real_cohort_matrix_matches_audited_spec():
    data = rigor.load_matrix()
    assert (data["n_samples"], data["n_subjects"]) == (335, 102)
    assert len(data["taxa_idx"]) == 940
    assert len(data["taxa_idx"]) + len(data["clin_idx"]) == data["n_features"]
    # label must be constant within a subject — the premise of the leakage audit
    import pandas as pd
    df = pd.DataFrame({"g": data["groups"], "y": data["y"]})
    assert (df.groupby("g")["y"].nunique() == 1).all()


@pytest.mark.asyncio
async def test_rigor_endpoint_served_from_artifact():
    from app.main import app
    from app.research.rigor import load_report

    if load_report() is None:
        pytest.skip("rigor_report.json not generated (run: python -m app.research.rigor)")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        full = await c.get("/api/research/rigor")
        sec = await c.get("/api/research/rigor/leakage_audit")
        bad = await c.get("/api/research/rigor/not_a_section")
    assert full.status_code == 200 and "leakage_audit" in full.json()
    assert sec.status_code == 200 and "leakage_audit" in sec.json()
    assert bad.status_code == 404
    xgb = full.json()["leakage_audit"]["models"]["xgboost"]
    assert xgb["auroc_sample_level_cv"]["mean"] > xgb["auroc_subject_grouped_cv"]["mean"]
