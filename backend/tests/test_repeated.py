"""Deterministic mathematical and fold-isolation regression tests."""
import json
import numpy as np
import pytest

from app.research.repeated import clr, mondrian_sets, cluster_summary, subject_records
from app.research.rigor import save_report, load_matrix
from app.research.subject_conformal import compact_columns, subject_folds


def test_clr_scale_invariance_and_clinical_preservation():
    X = np.array([[0., 2., 7.], [1., 3., 9.]])
    taxa = np.array([True, True, False])
    a = clr(X, taxa)
    scaled = X.copy(); scaled[:, :2] *= 100
    assert np.allclose(a, clr(scaled, taxa))
    assert np.allclose(a[:, :2].sum(axis=1), 0)
    assert np.array_equal(a[:, 2], X[:, 2])
    with pytest.raises(ValueError):
        clr(np.zeros((2, 3)), taxa)


def test_mondrian_uses_subjects_not_number_of_visits():
    p = np.array([.1, .2, .8, .9])
    y = np.array([0, 0, 1, 1]); g = np.array(['a', 'b', 'c', 'd'])
    expected = mondrian_sets(p, y, g, np.array([.4, .6]), .1)
    assert expected.all()  # too few calibration subjects: conservative fallback
    assert np.array_equal(expected, mondrian_sets(np.repeat(p, 10), np.repeat(y, 10),
        np.repeat(g, 10), np.array([.4, .6]), .1))


def test_real_fold_feature_selection_cannot_see_test_perturbation():
    data = load_matrix(); X, g = data['X'], data['groups']
    taxa = np.isin(np.arange(X.shape[1]), data['taxa_idx'])
    for fold in subject_folds(g):
        selected = compact_columns(X[fold.fit], g[fold.fit], taxa)
        other = X.copy(); other[~fold.fit] = 1e9
        assert np.array_equal(selected, compact_columns(other[fold.fit], g[fold.fit], taxa))
        assert not set(g[fold.fit]) & set(g[fold.calibration])
        assert not set(g[fold.test]) & set(g[fold.calibration])


def test_always_both_baseline_and_cluster_bootstrap():
    y = np.array([0, 0, 1, 1]); g = np.array(['a', 'a', 'b', 'b'])
    rows = subject_records(y, np.full(4, .5), np.ones((4, 2), bool), g, 42, 'both')
    rows += subject_records(y, np.full(4, .5), np.ones((4, 2), bool), g, 43, 'both')
    summary = cluster_summary(rows, n_boot=100)['both']
    assert summary['covered'] == {'estimate': 1., 'ci95': [1., 1.]}
    assert summary['singleton']['estimate'] == 0
    assert summary['singleton_risk'] is None


def test_report_serialization_rejects_non_json_numbers(tmp_path):
    path = tmp_path / 'report.json'
    save_report({'undefined': float('nan'), 'infinite': float('inf')}, str(path))
    assert json.loads(path.read_text()) == {'undefined': None, 'infinite': None}
