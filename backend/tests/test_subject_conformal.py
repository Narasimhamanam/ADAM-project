"""Statistical invariants and API integration for the paired ADAM benchmark."""
import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.research.subject_conformal import (
    MODES, compact_columns, conformal_threshold, prediction_sets,
    subject_folds, subject_maxima,
)


def test_finite_sample_rank_and_class_ties():
    assert conformal_threshold(np.arange(1, 10) / 10, 0.10) == 0.9
    assert conformal_threshold(np.array([0.2, 0.3]), 0.10) == 1
    assert conformal_threshold(np.array([0.1, 0.2, 0.3, 0.4]), 0.4) == 0.3
    np.testing.assert_array_equal(
        prediction_sets(np.array([0.25, 0.5, 0.75]), 0.5),
        [[True, False], [True, True], [False, True]],
    )
    with pytest.raises(ValueError):
        conformal_threshold(np.array([float("nan")]), 0.1)


def test_subject_calibration_uses_one_worst_visit_per_subject():
    subjects = np.array(["b", "a", "b", "a"])
    np.testing.assert_allclose(subject_maxima(np.array([0.1, 0.2, 0.7, 0.3]), subjects), [0.3, 0.7])
    np.testing.assert_allclose(
        subject_maxima(np.array([0.1, 0.2, 0.7, 0.3, 0.1]), np.append(subjects, "b")),
        [0.3, 0.7],
    )


def test_folds_partition_whole_subjects_and_test_each_visit_once():
    subjects = np.repeat(np.arange(30), [1, 2, 3] * 10)
    folds = subject_folds(subjects)
    np.testing.assert_array_equal(sum(fold.test.astype(int) for fold in folds), np.ones(len(subjects)))
    for fold in folds:
        groups = [set(subjects[part]) for part in (fold.fit, fold.calibration, fold.test)]
        assert not (groups[0] & groups[1] or groups[1] & groups[2] or groups[0] & groups[2])
        assert set.union(*groups) == set(subjects)


def test_compaction_counts_subject_presence_and_keeps_clinical_columns():
    subjects = np.array(["a"] * 12 + ["b", "c"])
    X = np.ones((14, 100))
    X[12:, 0] = 0
    X[:12, 1] = 0
    X[:, 2:97] = 1
    X[:, 97:99] = 0
    columns = compact_columns(X, subjects, np.arange(100) < 99)
    assert len(columns) == 97
    assert 99 in columns and 1 in columns and 0 not in columns


@pytest.mark.asyncio
async def test_benchmark_api_runs_real_cohort_and_supports_paired_modes():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        url = "/api/research/benchmark/subject-conformal"
        response = await client.get(url)
        assert response.status_code == 200
        data = response.json()
        assert (data["subjects"], data["samples"]) == (102, 335)
        assert set(data["results"]) == set(MODES)
        assert data["results"]["baseline"]["singleton_rate"] == 1
        core = data["results"]["compact_subject"]
        assert core["predictor_count"] == 200
        assert core["f1"] == data["results"]["compact_only"]["f1"]
        assert len(core["fold_thresholds"]) == 5
        selected = await client.get(url, params={"mode": "compact_subject"})
        assert selected.json()["results"] == {"compact_subject": core}
        assert (await client.get(url, params={"mode": "invalid"})).status_code == 422
