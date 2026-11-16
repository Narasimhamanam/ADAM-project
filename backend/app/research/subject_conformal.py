"""Paired subject-level benchmark for compact models and split conformal sets."""
from __future__ import annotations

from dataclasses import dataclass
from math import ceil
from time import perf_counter
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, brier_score_loss, f1_score, roc_auc_score

from app.ml.data_loader import DEFAULT_EXCLUDED_COLUMNS
from app.ml.diversity import get_taxa_columns
from app.ml.models import get_model_instance

MODES = ("baseline", "visit_conformal", "subject_conformal", "compact_only", "compact_subject")
ALPHA = 0.10
FEATURE_BUDGET = 96


def conformal_threshold(scores: np.ndarray, alpha: float) -> float:
    """Finite-sample split quantile, with a full set when calibration is too small."""
    values = np.asarray(scores, dtype=float)
    if (values.ndim != 1 or not len(values) or not np.isfinite(values).all()
            or not np.all((0 <= values) & (values <= 1)) or not 0 < alpha < 1):
        raise ValueError("Expected scores in [0, 1] and alpha in (0, 1)")
    rank = ceil((len(values) + 1) * (1 - alpha))
    return float(np.sort(values)[rank - 1]) if rank <= len(values) else 1.0


def prediction_sets(probabilities: np.ndarray, threshold: float) -> np.ndarray:
    """Columns indicate membership of classes 0 and 1, respectively."""
    return np.column_stack((probabilities, 1 - probabilities)) <= threshold


def subject_maxima(scores: np.ndarray, subjects: np.ndarray) -> np.ndarray:
    return pd.Series(scores).groupby(subjects).max().to_numpy()


@dataclass(frozen=True)
class Fold:
    fit: np.ndarray
    calibration: np.ndarray
    test: np.ndarray


def subject_folds(subjects: np.ndarray, seed: int = 42) -> list[Fold]:
    unique = np.unique(subjects)
    if len(unique) < 20:
        raise ValueError("At least 20 distinct subjects are required")
    rng = np.random.default_rng(seed)
    shuffled = rng.permutation(unique)
    folds = []
    for test in np.array_split(shuffled, 5):
        remaining = rng.permutation(shuffled[~np.isin(shuffled, test)])
        n_cal = ceil(len(remaining) / 3)
        folds.append(Fold(np.isin(subjects, remaining[n_cal:]),
                          np.isin(subjects, remaining[:n_cal]), np.isin(subjects, test)))
    return folds


def compact_columns(X: np.ndarray, subjects: np.ndarray, taxonomy: np.ndarray) -> np.ndarray:
    """Rank taxa by the fraction of fitting subjects with any nonzero visit."""
    presence = pd.DataFrame(X[:, taxonomy] > 0).groupby(subjects).any().mean().to_numpy()
    top = np.argsort(-presence, kind="stable")[:FEATURE_BUDGET]
    selected = np.concatenate((np.flatnonzero(~taxonomy), np.flatnonzero(taxonomy)[top]))
    return np.sort(selected)


def summarize(labels, probabilities, sets, subjects):
    rows = np.arange(len(labels))
    covered = sets[rows, labels]
    singleton = sets.sum(axis=1) == 1
    simultaneous = pd.Series(covered).groupby(subjects).all().mean()
    return {
        "accuracy": float(accuracy_score(labels, probabilities >= .5)),
        "f1": float(f1_score(labels, probabilities >= .5, zero_division=0)),
        "roc_auc": float(roc_auc_score(labels, probabilities)),
        "brier": float(brier_score_loss(labels, probabilities)),
        "visit_coverage": float(covered.mean()),
        "subject_simultaneous_coverage": float(simultaneous),
        "singleton_rate": float(singleton.mean()),
        "singleton_error_rate": float((~covered[singleton]).mean()) if singleton.any() else None,
        "empty_rate": float((sets.sum(axis=1) == 0).mean()),
        "mean_set_size": float(sets.sum(axis=1).mean()),
    }


def run_subject_benchmark(frame: pd.DataFrame, modes=MODES) -> dict:
    """Run fixed-fold ablations with identical rows and no test-dependent fitting."""
    if not modes or set(modes) - set(MODES):
        raise ValueError("Unknown benchmark mode")
    metadata = frame[["Sample ID", "study_id", "Alzheimers"]]
    if (metadata.isna().any().any() or metadata["Sample ID"].duplicated().any()
            or not metadata["Alzheimers"].isin([0, 1]).all()):
        raise ValueError("Unique samples, subject IDs and binary labels are required")
    features = [name for name in frame.columns if name not in DEFAULT_EXCLUDED_COLUMNS]
    taxa = set(get_taxa_columns(frame))
    taxonomy = np.isin(features, list(taxa))
    if not taxonomy.any():
        raise ValueError("No columns match the ADAM taxonomy manifest")
    X = frame[features].apply(pd.to_numeric, errors="raise").fillna(0).to_numpy(dtype=float)
    labels = metadata["Alzheimers"].to_numpy(dtype=int)
    subjects = metadata["study_id"].to_numpy()
    folds = subject_folds(subjects)
    results = {}
    for compact in (False, True):
        variants = [mode for mode in modes if mode.startswith("compact") == compact]
        if not variants:
            continue
        probabilities = np.empty(len(labels))
        sets = {variant: np.empty((len(labels), 2), dtype=bool) for variant in variants}
        fit_seconds, predict_seconds, dimensions, sizes = [], [], [], []
        thresholds = {variant: [] for variant in variants}
        for fold in folds:
            fit, cal, test = fold.fit, fold.calibration, fold.test
            y_fit = labels[fit]
            if len(np.unique(y_fit)) != 2:
                raise ValueError("Both outcome classes must be present in each fitting split")
            start = perf_counter()
            cols = compact_columns(X[fit], subjects[fit], taxonomy) if compact else np.arange(X.shape[1])
            model = get_model_instance("xgboost", scale_pos_weight=float((y_fit == 0).sum() / y_fit.sum()))
            model.fit(X[fit][:, cols], y_fit)
            fit_seconds.append(perf_counter() - start)
            sizes.append(len(model.get_booster().save_raw(raw_format="ubj")))
            dimensions.append(len(cols))
            start = perf_counter()
            probabilities[test] = model.predict_proba(X[test][:, cols])[:, 1]
            predict_seconds.append(perf_counter() - start)
            p_cal = model.predict_proba(X[cal][:, cols])[:, 1]
            scores = np.where(labels[cal] == 1, 1 - p_cal, p_cal)
            for variant in variants:
                if variant in {"baseline", "compact_only"}:
                    sets[variant][test] = np.eye(2, dtype=bool)[(probabilities[test] >= .5).astype(int)]
                    continue
                units = scores if variant == "visit_conformal" else subject_maxima(scores, subjects[cal])
                threshold = conformal_threshold(units, ALPHA)
                thresholds[variant].append(threshold)
                sets[variant][test] = prediction_sets(probabilities[test], threshold)
        for variant in variants:
            results[variant] = summarize(labels, probabilities, sets[variant], subjects) | {
                "predictor_count": dimensions[0],
                "median_fit_seconds": float(np.median(fit_seconds)),
                "median_test_batch_predict_ms": float(np.median(predict_seconds) * 1000),
                "median_model_bytes": int(np.median(sizes)),
                "fold_thresholds": thresholds[variant],
            }
    return {
        "protocol": "five_subject_folds_with_disjoint_fit_and_calibration",
        "seed": 42, "alpha": ALPHA, "taxa_budget": FEATURE_BUDGET,
        "samples": len(frame), "subjects": int(len(np.unique(subjects))),
        "fold_sizes": [{"fit_subjects": int(len(np.unique(subjects[f.fit]))),
                        "calibration_subjects": int(len(np.unique(subjects[f.calibration]))),
                        "test_subjects": int(len(np.unique(subjects[f.test])))} for f in folds],
        "results": results,
    }
