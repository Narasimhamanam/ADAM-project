"""
ADAM-1 Enhanced — Rigor Suite
=============================
Leakage-aware evaluation, calibration, conformal uncertainty and explanation
stability for the 335-sample / 102-subject longitudinal gut-microbiome cohort.

Why this module exists
----------------------
The cohort contains repeated visits per subject and the Alzheimer's label is
*constant within a subject* (verified: every ``study_id`` has exactly one label).
A sample-level cross-validation therefore lets the same person appear in both
the training and test folds, and a classifier can score well by recognising the
person rather than the disease.  Everything in this module is computed on the
real cohort; nothing is simulated, and every function returns the configuration
and seed used so a run can be reproduced exactly.

Contributions (each one is a function below):

1. ``leakage_audit``          – sample-level CV vs subject-grouped CV.
2. ``feature_group_ablation`` – microbiome-only / clinical-only / proxy-removed.
3. ``calibration_report``     – Brier, ECE, reliability bins, Platt re-calibration.
4. ``conformal_report``       – subject-level split-conformal prediction sets.
5. ``shap_stability``         – bootstrap-over-subjects stability of TreeSHAP ranks.

Honest-reporting rules enforced here:
* spread across repeats is reported as mean ± SD with min/max, **not** as a
  confidence interval (repeats reuse the same 102 subjects and are not independent);
* the conformal guarantee is marginal over *subjects* only;
* results are descriptive of this single cohort and are not external validation.
"""
from __future__ import annotations

import hashlib
import json
import os
import platform
import time
import tempfile
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold, StratifiedKFold

from app.ml.data_loader import DEFAULT_EXCLUDED_COLUMNS, load_dataset_df
from app.ml.models import get_model_instance
from app.research.subject_conformal import conformal_threshold, subject_maxima

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
ARTIFACT_PATH = os.path.join(ARTIFACT_DIR, "rigor_report.json")

#: Columns that act as (possible) proxies for age or visit timing.  ``age`` itself
#: is already excluded by the main pipeline, but ``age_cat`` is a coarse copy of it.
PROXY_COLUMNS = ["age_cat", "day"]

EPS = 1e-12


# ─────────────────────────────────────────────────────────────────────────────
# Data preparation
# ─────────────────────────────────────────────────────────────────────────────

def _taxa_names(df_columns: Sequence[str]) -> List[str]:
    """Return the species columns (940 expected) of the clinical-microbiome table."""
    from app.ingestion.pipeline import get_global_resources_dir

    path = os.path.join(get_global_resources_dir(), "clade_species_df.csv")
    species = pd.read_csv(path)["species_name"].astype(str)
    wanted = set(species) | {s.replace("_", " ") for s in species}
    return [c for c in df_columns if c in wanted]


def load_matrix(df: Optional[pd.DataFrame] = None) -> Dict[str, Any]:
    """Build X / y / groups with the *same* feature set as the production models."""
    df = load_dataset_df() if df is None else df
    feature_cols = [c for c in df.columns if c not in DEFAULT_EXCLUDED_COLUMNS]
    required = ["Sample ID", "study_id", "Alzheimers"]
    if (df[required].isna().any().any() or df["Sample ID"].duplicated().any()
            or not df["Alzheimers"].isin([0, 1]).all()
            or df.groupby("study_id")["Alzheimers"].nunique().gt(1).any()):
        raise ValueError("Unique samples, nonmissing IDs and static binary subject labels required")
    X = df[feature_cols].apply(pd.to_numeric, errors="raise").fillna(0.0).to_numpy(dtype=np.float64)
    if not np.isfinite(X).all():
        raise ValueError("Finite feature values required")
    y = df["Alzheimers"].to_numpy().astype(int)
    groups = df["study_id"].astype(str).to_numpy()

    taxa = set(_taxa_names(feature_cols))
    idx = {c: i for i, c in enumerate(feature_cols)}
    taxa_idx = np.array([idx[c] for c in feature_cols if c in taxa], dtype=int)
    clin_idx = np.array([idx[c] for c in feature_cols if c not in taxa], dtype=int)
    proxy_idx = np.array([idx[c] for c in PROXY_COLUMNS if c in idx], dtype=int)

    return {
        "X": X, "y": y, "groups": groups,
        "feature_names": feature_cols,
        "taxa_idx": taxa_idx, "clin_idx": clin_idx, "proxy_idx": proxy_idx,
        "n_samples": int(len(y)), "n_subjects": int(len(set(groups))),
        "n_features": int(X.shape[1]),
    }


def _spw(y: np.ndarray) -> float:
    pos = max(int((y == 1).sum()), 1)
    return float((y == 0).sum()) / pos


def _fit_predict(model_name: str, Xtr, ytr, Xte, seed: int) -> np.ndarray:
    model = get_model_instance(model_name, seed=seed, scale_pos_weight=_spw(ytr))
    model.fit(Xtr, ytr)
    return model.predict_proba(Xte)[:, 1]


def _safe_auc(y: np.ndarray, p: np.ndarray) -> float:
    return float(roc_auc_score(y, p)) if len(np.unique(y)) == 2 else float("nan")


def _summ(values: Sequence[float]) -> Dict[str, float]:
    v = np.asarray([x for x in values if np.isfinite(x)], dtype=float)
    if v.size == 0:
        return {"mean": float("nan"), "sd": float("nan"), "min": float("nan"), "max": float("nan"), "n": 0}
    return {
        "mean": round(float(v.mean()), 4),
        "sd": round(float(v.std(ddof=1)) if v.size > 1 else 0.0, 4),
        "min": round(float(v.min()), 4),
        "max": round(float(v.max()), 4),
        "n": int(v.size),
    }


def _oof_predictions(
    model_name: str, X, y, groups, seed: int, n_splits: int, grouped: bool, cols: Optional[np.ndarray] = None
) -> Tuple[np.ndarray, List[int]]:
    """Out-of-fold probabilities under grouped (subject-level) or naive CV."""
    Xs = X if cols is None else X[:, cols]
    oof = np.full(len(y), np.nan)
    if grouped:
        splitter = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=seed)
        splits = splitter.split(Xs, y, groups)
    else:
        splitter = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=seed)
        splits = splitter.split(Xs, y)
    fold_overlap: List[int] = []
    for tr, te in splits:
        fold_overlap.append(len(set(groups[tr]) & set(groups[te])))
        oof[te] = _fit_predict(model_name, Xs[tr], y[tr], Xs[te], seed)
    return oof, fold_overlap


# ─────────────────────────────────────────────────────────────────────────────
# 1. Leakage audit
# ─────────────────────────────────────────────────────────────────────────────

def leakage_audit(
    data: Dict[str, Any], models: Sequence[str] = ("xgboost", "logisticregression"),
    n_repeats: int = 5, n_splits: int = 5, seed: int = 42,
) -> Dict[str, Any]:
    """Compare naive sample-level CV with subject-grouped CV (same model, same folds count)."""
    X, y, g = data["X"], data["y"], data["groups"]
    out: Dict[str, Any] = {}
    for m in models:
        naive_auc, grouped_auc, naive_overlap, grouped_overlap = [], [], [], []
        for r in range(n_repeats):
            s = seed + r
            p_n, ov_n = _oof_predictions(m, X, y, g, s, n_splits, grouped=False)
            p_g, ov_g = _oof_predictions(m, X, y, g, s, n_splits, grouped=True)
            naive_auc.append(_safe_auc(y, p_n))
            grouped_auc.append(_safe_auc(y, p_g))
            naive_overlap.append(float(np.mean(ov_n)))
            grouped_overlap.append(float(np.mean(ov_g)))
        inflation = [a - b for a, b in zip(naive_auc, grouped_auc)]
        out[m] = {
            "auroc_sample_level_cv": _summ(naive_auc),
            "auroc_subject_grouped_cv": _summ(grouped_auc),
            "auroc_inflation_from_leakage": _summ(inflation),
            "mean_subjects_shared_between_train_and_test_per_fold": {
                "sample_level_cv": round(float(np.mean(naive_overlap)), 2),
                "subject_grouped_cv": round(float(np.mean(grouped_overlap)), 2),
            },
        }
    return {"config": {"n_repeats": n_repeats, "n_splits": n_splits, "seed": seed}, "models": out}


# ─────────────────────────────────────────────────────────────────────────────
# 2. Feature-group ablation (grouped CV only)
# ─────────────────────────────────────────────────────────────────────────────

def feature_group_ablation(
    data: Dict[str, Any], model_name: str = "xgboost", n_repeats: int = 3, n_splits: int = 5, seed: int = 42,
) -> Dict[str, Any]:
    X, y, g = data["X"], data["y"], data["groups"]
    all_idx = np.arange(X.shape[1])
    no_proxy = np.setdiff1d(all_idx, data["proxy_idx"])
    settings = {
        "all_features": all_idx,
        "microbiome_only": data["taxa_idx"],
        "clinical_covariates_only": data["clin_idx"],
        "all_minus_age_cat_and_day": no_proxy,
    }
    res: Dict[str, Any] = {}
    for name, cols in settings.items():
        aucs = []
        for r in range(n_repeats):
            oof, _ = _oof_predictions(model_name, X, y, g, seed + r, n_splits, grouped=True, cols=cols)
            aucs.append(_safe_auc(y, oof))
        res[name] = {"n_features": int(len(cols)), "auroc_subject_grouped_cv": _summ(aucs)}
    return {
        "config": {"model": model_name, "n_repeats": n_repeats, "n_splits": n_splits, "seed": seed,
                   "proxy_columns": [data["feature_names"][i] for i in data["proxy_idx"]]},
        "settings": res,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. Calibration
# ─────────────────────────────────────────────────────────────────────────────

def expected_calibration_error(y: np.ndarray, p: np.ndarray, n_bins: int = 10) -> Tuple[float, List[Dict[str, float]]]:
    bins = np.linspace(0.0, 1.0, n_bins + 1)
    ids = np.clip(np.digitize(p, bins[1:-1], right=False), 0, n_bins - 1)
    ece, table = 0.0, []
    for b in range(n_bins):
        m = ids == b
        if not m.any():
            continue
        conf, acc, w = float(p[m].mean()), float(y[m].mean()), float(m.mean())
        ece += w * abs(conf - acc)
        table.append({"bin": b, "n": int(m.sum()), "mean_predicted": round(conf, 4), "observed_rate": round(acc, 4)})
    return float(ece), table


def _logit(p: np.ndarray) -> np.ndarray:
    p = np.clip(p, EPS, 1 - EPS)
    return np.log(p / (1 - p)).reshape(-1, 1)


def _metrics(y: np.ndarray, p: np.ndarray) -> Dict[str, float]:
    p = np.clip(p, EPS, 1 - EPS)
    ece, _ = expected_calibration_error(y, p)
    return {"auroc": round(_safe_auc(y, p), 4), "brier": round(float(brier_score_loss(y, p)), 4),
            "log_loss": round(float(log_loss(y, p)), 4), "ece_10bin": round(ece, 4)}


def calibration_report(
    data: Dict[str, Any], model_name: str = "xgboost", n_repeats: int = 3, n_splits: int = 5,
    seed: int = 42, calib_subject_frac: float = 0.25,
) -> Dict[str, Any]:
    """Grouped-CV calibration of raw probabilities vs. Platt scaling fit on held-out *subjects*."""
    X, y, g = data["X"], data["y"], data["groups"]
    raw_runs, platt_runs, last_bins = [], [], []
    for r in range(n_repeats):
        s = seed + r
        rng = np.random.RandomState(s)
        raw = np.full(len(y), np.nan)
        platt = np.full(len(y), np.nan)
        outer = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=s)
        for tr, te in outer.split(X, y, g):
            subj_tr = np.unique(g[tr])
            subj_lab = {sid: int(y[tr][g[tr] == sid].max()) for sid in subj_tr}
            labs = np.array([subj_lab[sid] for sid in subj_tr])
            cal_subj: List[str] = []
            for cls in (0, 1):
                members = subj_tr[labs == cls]
                k = max(1, int(round(calib_subject_frac * len(members))))
                cal_subj.extend(rng.choice(members, size=min(k, len(members)), replace=False).tolist())
            cal_mask = np.isin(g[tr], cal_subj)
            fit_idx, cal_idx = tr[~cal_mask], tr[cal_mask]
            model = get_model_instance(model_name, seed=s, scale_pos_weight=_spw(y[fit_idx]))
            model.fit(X[fit_idx], y[fit_idx])
            p_cal = model.predict_proba(X[cal_idx])[:, 1]
            p_te = model.predict_proba(X[te])[:, 1]
            raw[te] = p_te
            if len(np.unique(y[cal_idx])) == 2:
                platt_model = LogisticRegression(C=1e6, solver="lbfgs", max_iter=1000)
                platt_model.fit(_logit(p_cal), y[cal_idx])
                platt[te] = platt_model.predict_proba(_logit(p_te))[:, 1]
            else:
                platt[te] = p_te
        raw_runs.append(_metrics(y, raw))
        platt_runs.append(_metrics(y, platt))
        _, last_bins = expected_calibration_error(y, np.clip(raw, EPS, 1 - EPS))

    def agg(runs: List[Dict[str, float]]) -> Dict[str, Any]:
        return {k: _summ([r[k] for r in runs]) for k in runs[0]}

    return {
        "config": {"model": model_name, "n_repeats": n_repeats, "n_splits": n_splits, "seed": seed,
                   "calibration_subject_fraction_per_training_fold": calib_subject_frac},
        "raw_probabilities": agg(raw_runs),
        "platt_scaled_on_held_out_subjects": agg(platt_runs),
        "reliability_bins_raw_last_repeat": last_bins,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. Subject-level split-conformal prediction
# ─────────────────────────────────────────────────────────────────────────────

def _subject_split(g: np.ndarray, y: np.ndarray, rng: np.random.RandomState,
                   fracs: Tuple[float, float, float]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    subj = np.unique(g)
    lab = np.array([int(y[g == s].max()) for s in subj])
    parts: List[List[str]] = [[], [], []]
    for cls in (0, 1):
        members = rng.permutation(subj[lab == cls])
        n = len(members)
        a = int(round(fracs[0] * n))
        b = a + int(round(fracs[1] * n))
        parts[0].extend(members[:a]); parts[1].extend(members[a:b]); parts[2].extend(members[b:])
    return tuple(np.where(np.isin(g, p))[0] for p in parts)  # type: ignore[return-value]


def conformal_report(
    data: Dict[str, Any], model_name: str = "xgboost", alpha: float = 0.10,
    n_repeats: int = 20, seed: int = 42, fracs: Tuple[float, float, float] = (0.5, 0.25, 0.25),
) -> Dict[str, Any]:
    """Split-conformal classification.  Train / calibration / test are disjoint *subjects*.

    Non-conformity score = 1 - P(true class).  A label enters the prediction set when
    its score is <= the finite-sample-corrected (1-alpha) quantile of the calibration scores.
    The guarantee is marginal over exchangeable *subjects*; it says nothing about a new cohort.
    """
    X, y, g = data["X"], data["y"], data["groups"]
    cov, size, singleton, empty, both, auc = [], [], [], [], [], []
    cov_by_class = {0: [], 1: []}
    for r in range(n_repeats):
        s = seed + r
        rng = np.random.RandomState(s)
        tr, ca, te = _subject_split(g, y, rng, fracs)
        if len(np.unique(y[tr])) < 2 or len(np.unique(y[ca])) < 2 or len(np.unique(y[te])) < 2:
            continue
        model = get_model_instance(model_name, seed=s, scale_pos_weight=_spw(y[tr]))
        model.fit(X[tr], y[tr])
        p_ca = model.predict_proba(X[ca])[:, 1]
        p_te = model.predict_proba(X[te])[:, 1]
        scores = 1.0 - np.where(y[ca] == 1, p_ca, 1 - p_ca)
        units = subject_maxima(scores, g[ca])
        qhat = conformal_threshold(units, alpha)
        in_set1 = (1.0 - p_te) <= qhat
        in_set0 = p_te <= qhat
        truth_in = np.where(y[te] == 1, in_set1, in_set0)
        n_labels = in_set0.astype(int) + in_set1.astype(int)
        cov.append(float(pd.Series(truth_in).groupby(g[te]).all().mean()))
        size.append(float(n_labels.mean()))
        singleton.append(float((n_labels == 1).mean()))
        empty.append(float((n_labels == 0).mean()))
        both.append(float((n_labels == 2).mean()))
        auc.append(_safe_auc(y[te], p_te))
        for c in (0, 1):
            if (y[te] == c).any():
                cov_by_class[c].append(float(pd.Series(truth_in[y[te] == c]).groupby(g[te][y[te] == c]).all().mean()))
    return {
        "config": {"model": model_name, "alpha": alpha, "target_coverage": round(1 - alpha, 3),
                   "n_repeats_requested": n_repeats, "n_repeats_used": len(cov), "seed": seed,
                   "subject_fractions_train_calibration_test": list(fracs)},
        "empirical_coverage": _summ(cov),
        "coverage_given_true_class": {"control": _summ(cov_by_class[0]), "alzheimers": _summ(cov_by_class[1])},
        "mean_prediction_set_size": _summ(size),
        "fraction_singleton_sets": _summ(singleton),
        "fraction_both_labels_abstain": _summ(both),
        "fraction_empty_sets": _summ(empty),
        "test_auroc_of_underlying_model": _summ(auc),
        "caveat": "Empirical all-visit subject coverage, calibrated on subject maxima. Exchangeability is an assumption; test sets are small "
                  "(~25 subjects) so per-repeat coverage is noisy. Not external validation.",
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. SHAP stability
# ─────────────────────────────────────────────────────────────────────────────

def _spearman(a: np.ndarray, b: np.ndarray) -> float:
    ra, rb = pd.Series(a).rank().to_numpy(), pd.Series(b).rank().to_numpy()
    if ra.std() == 0 or rb.std() == 0:
        return float("nan")
    return float(np.corrcoef(ra, rb)[0, 1])


def shap_stability(
    data: Dict[str, Any], model_name: str = "xgboost", n_boot: int = 10, top_k: int = 20, seed: int = 42,
) -> Dict[str, Any]:
    """Bootstrap *subjects*, refit, and measure how much the global TreeSHAP ranking moves."""
    import shap  # local import: heavy

    X, y, g, names = data["X"], data["y"], data["groups"], data["feature_names"]
    subj = np.unique(g)
    rng = np.random.RandomState(seed)
    importances, tops = [], []
    for b in range(n_boot):
        draw = rng.choice(subj, size=len(subj), replace=True)
        idx = np.concatenate([np.where(g == s)[0] for s in draw])
        if len(np.unique(y[idx])) < 2:
            continue
        model = get_model_instance(model_name, seed=seed + b, scale_pos_weight=_spw(y[idx]))
        model.fit(X[idx], y[idx])
        sv = shap.TreeExplainer(model).shap_values(X[idx])
        if isinstance(sv, list):
            sv = sv[1]
        imp = np.abs(np.asarray(sv)).mean(axis=0)
        importances.append(imp)
        tops.append(set(np.argsort(-imp)[:top_k].tolist()))
    if len(importances) < 2:
        return {"config": {"n_boot_used": len(importances)}, "error": "not enough valid bootstrap fits"}
    jac, rho = [], []
    for i in range(len(importances)):
        for j in range(i + 1, len(importances)):
            jac.append(len(tops[i] & tops[j]) / len(tops[i] | tops[j]))
            rho.append(_spearman(importances[i], importances[j]))
    mean_imp = np.mean(importances, axis=0)
    freq = {}
    for t in tops:
        for k in t:
            freq[k] = freq.get(k, 0) + 1
    consensus = sorted(freq.items(), key=lambda kv: (-kv[1], -mean_imp[kv[0]]))[:top_k]
    return {
        "config": {"model": model_name, "n_boot_requested": n_boot, "n_boot_used": len(importances),
                   "top_k": top_k, "seed": seed, "resampling_unit": "subject (study_id)"},
        "pairwise_jaccard_top_k": _summ(jac),
        "pairwise_spearman_all_features": _summ(rho),
        "consensus_top_features": [
            {"feature": names[k], "selected_in_n_bootstraps": int(v),
             "selection_frequency": round(v / len(importances), 3), "mean_abs_shap": round(float(mean_imp[k]), 5)}
            for k, v in consensus
        ],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Orchestration, provenance and artifact I/O
# ─────────────────────────────────────────────────────────────────────────────

def _provenance(data: Dict[str, Any]) -> Dict[str, Any]:
    import sklearn, xgboost
    h = hashlib.sha256(np.ascontiguousarray(data["X"]).tobytes() + data["y"].tobytes()
                       + json.dumps([data["groups"].tolist(), data["feature_names"]]).encode()).hexdigest()
    return {
        "n_samples": data["n_samples"], "n_subjects": data["n_subjects"], "n_features": data["n_features"],
        "n_microbiome_features": int(len(data["taxa_idx"])), "n_clinical_features": int(len(data["clin_idx"])),
        "design_matrix_sha256": h,
        "python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__,
        "scikit_learn": sklearn.__version__, "xgboost": xgboost.__version__,
    }


def run_rigor_suite(quick: bool = False, seed: int = 42) -> Dict[str, Any]:
    """Run every analysis.  ``quick=True`` shrinks repeats for CI / smoke tests."""
    t0 = time.time()
    data = load_matrix()
    n_rep = 2 if quick else 5
    steps: Dict[str, Callable[[], Dict[str, Any]]] = {
        "leakage_audit": lambda: leakage_audit(data, n_repeats=n_rep, seed=seed),
        "feature_group_ablation": lambda: feature_group_ablation(data, n_repeats=2 if quick else 3, seed=seed),
        "calibration": lambda: calibration_report(data, n_repeats=2 if quick else 3, seed=seed),
        "conformal": lambda: conformal_report(data, n_repeats=5 if quick else 20, seed=seed),
        "shap_stability": lambda: shap_stability(data, n_boot=3 if quick else 10, seed=seed),
    }
    report: Dict[str, Any] = {"provenance": _provenance(data), "quick_mode": quick}
    for name, fn in steps.items():
        s = time.time()
        report[name] = fn()
        report[name]["runtime_seconds"] = round(time.time() - s, 1)
    report["total_runtime_seconds"] = round(time.time() - t0, 1)
    return report


def save_report(report: Dict[str, Any], path: str = ARTIFACT_PATH) -> str:
    parent = os.path.dirname(os.path.abspath(path))
    os.makedirs(parent, exist_ok=True)
    def clean(value):
        if isinstance(value, dict):
            return {k: clean(v) for k, v in value.items()}
        if isinstance(value, (list, tuple)):
            return [clean(v) for v in value]
        if isinstance(value, (float, np.floating)) and not np.isfinite(value):
            return None
        return value
    fd, tmp = tempfile.mkstemp(dir=parent, suffix=".json.tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(clean(report), f, indent=2, allow_nan=False)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    return path


def load_report(path: str = ARTIFACT_PATH) -> Optional[Dict[str, Any]]:
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":  # python -m app.research.rigor [--quick]
    import sys

    quick = "--quick" in sys.argv
    rep = run_rigor_suite(quick=quick)
    out = save_report(rep, ARTIFACT_PATH if not quick else ARTIFACT_PATH.replace(".json", "_quick.json"))
    print(f"Wrote {out} in {rep['total_runtime_seconds']}s")
