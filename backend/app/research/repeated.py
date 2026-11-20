"""Repeated subject folds, paired ablations and cluster-bootstrap inference.

All fitting and selection use training subjects only. Repeats are not independent
cohorts: confidence intervals resample subjects while retaining all their repeats.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from time import perf_counter

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold

from app.ml.models import get_model_instance
from app.research.rigor import load_matrix, _provenance, save_report
from app.research.subject_conformal import (
    compact_columns, conformal_threshold, prediction_sets, subject_folds, subject_maxima,
)


def validate(data):
    X, y, g = data['X'], data['y'], data['groups']
    if not np.isfinite(X).all() or not np.isin(y, [0, 1]).all():
        raise ValueError('Finite features and binary labels required')
    if pd.DataFrame({'g': g, 'y': y}).groupby('g').y.nunique().gt(1).any():
        raise ValueError('Subject labels must be constant')


def clr(X, taxa):
    """Closure then fixed 1e-6 pseudocount CLR; clinical columns unchanged.

    A fixed pseudocount avoids fitting on test data. All-zero samples are invalid.
    The transform is evaluated as a sensitivity analysis, not tuned on outcomes.
    """
    out = np.array(X, dtype=float, copy=True)
    values = out[:, taxa]
    if (values < 0).any() or (values.sum(axis=1) <= 0).any():
        raise ValueError('CLR requires nonnegative abundances and positive row sums')
    logs = np.log(values / values.sum(axis=1, keepdims=True) + 1e-6)
    out[:, taxa] = logs - logs.mean(axis=1, keepdims=True)
    return out


def mondrian_sets(p_cal, y_cal, g_cal, p_test, alpha):
    """Class-conditional subject-max scores; absent/small class => full label."""
    thresholds = []
    for c in (0, 1):
        mask = y_cal == c
        scores = p_cal[mask] if c == 0 else 1 - p_cal[mask]
        units = subject_maxima(scores, g_cal[mask])
        thresholds.append(conformal_threshold(units, alpha) if len(units) else 1.0)
    return np.column_stack((p_test, 1 - p_test)) <= thresholds


def _fit(X, y, seed, params=None):
    if len(np.unique(y)) != 2:
        raise ValueError('Both classes required for fitting')
    model = get_model_instance('xgboost', params=params, seed=seed,
                               scale_pos_weight=float((y == 0).sum() / y.sum()))
    model.fit(X, y)
    return model


def subject_records(y, p, sets, groups, seed, mode):
    rows = []
    for g in np.unique(groups):
        mask = groups == g
        label = int(y[mask][0])
        s = sets[mask]
        covered = s[:, label]
        singleton = s.sum(axis=1) == 1
        rows.append(dict(seed=seed, mode=mode, subject=str(g), label=label,
                         probability=float(p[mask].mean()),
                         brier=float(np.mean((p[mask] - label) ** 2)),
                         covered=float(covered.all()), visit_coverage=float(covered.mean()),
                         singleton=float(singleton.mean()),
                         singleton_wrong=float((singleton & ~covered).mean()),
                         size=float(s.sum(axis=1).mean())))
    return rows


def cluster_summary(records, n_boot=1000, seed=2026):
    """Subject-balanced intervals, conditional on fitted OOF models.

    AUROC is of each subject's probability averaged across visits AND repeats.
    This is explicitly distinct from mean per-seed AUROC. No refitting bootstrap.
    """
    frame = pd.DataFrame(records)
    output = {}
    for mode, part in frame.groupby('mode'):
        per = part.groupby('subject').mean(numeric_only=True)
        rng = np.random.default_rng(seed)
        draw = rng.integers(0, len(per), size=(n_boot, len(per)))
        metrics = {}
        for col in ('covered', 'visit_coverage', 'singleton', 'size', 'brier'):
            v = per[col].to_numpy()
            metrics[col] = {'estimate': float(v.mean()),
                            'ci95': np.quantile(v[draw].mean(axis=1), [.025, .975]).tolist()}
        labels = per.label.to_numpy().astype(int)
        probabilities = per.probability.to_numpy()
        aucs = [roc_auc_score(labels[d], probabilities[d]) for d in draw
                if len(np.unique(labels[d])) == 2]
        metrics['subject_auc_repeat_averaged_probability'] = {
            'estimate': float(roc_auc_score(labels, probabilities)),
            'ci95': np.quantile(aucs, [.025, .975]).tolist()}
        for c in (0, 1):
            v = per.loc[per.label == c, 'covered'].to_numpy()
            d = rng.integers(0, len(v), size=(n_boot, len(v)))
            metrics[f'coverage_class_{c}'] = {'estimate': float(v.mean()),
                'ci95': np.quantile(v[d].mean(axis=1), [.025, .975]).tolist()}
        den = per.singleton.mean()
        metrics['singleton_risk'] = float(per.singleton_wrong.mean() / den) if den else None
        metrics['per_seed_subject_auc'] = [float(roc_auc_score(v.label, v.probability))
                                          for _, v in part.groupby('seed')]
        output[mode] = metrics
    return output


def run_repeated(data, seeds=range(42, 72), n_boot=1000):
    validate(data)
    X, y, g = data['X'], data['y'], data['groups']
    taxa = np.isin(np.arange(X.shape[1]), data['taxa_idx'])
    transformed = clr(X, taxa)
    rows, audit, curves = [], [], []
    alphas = [.05, .1, .2, .3, .4]
    for seed in seeds:
        for number, fold in enumerate(subject_folds(g, seed)):
            tr, ca, te = fold.fit, fold.calibration, fold.test
            partitions = [set(g[m]) for m in (tr, ca, te)]
            assert not any(partitions[i] & partitions[j] for i, j in ((0, 1), (0, 2), (1, 2)))
            cols = compact_columns(X[tr], g[tr], taxa)
            audit.append({'seed': seed, 'fold': number,
                          'fit_subjects': sorted(map(str, partitions[0])),
                          'calibration_subjects': sorted(map(str, partitions[1])),
                          'test_subjects': sorted(map(str, partitions[2])),
                          'selection_input_sha256': hashlib.sha256(X[tr].tobytes()).hexdigest(),
                          'selected_features': [data['feature_names'][i] for i in cols]})
            prior = float(pd.Series(y[tr]).groupby(g[tr]).first().mean())
            p_prior = np.full(te.sum(), prior)
            forced_prior = np.eye(2, dtype=bool)[(p_prior >= .5).astype(int)]
            rows += subject_records(y[te], p_prior, forced_prior, g[te], seed, 'class_prior')
            rows += subject_records(y[te], p_prior, np.ones((te.sum(), 2), bool), g[te], seed, 'always_both')
            for name, matrix, columns in [('full', X, np.arange(X.shape[1])), ('compact', X, cols),
                                           ('clr_full', transformed, np.arange(X.shape[1]))]:
                model = _fit(matrix[tr][:, columns], y[tr], seed)
                pc = model.predict_proba(matrix[ca][:, columns])[:, 1]
                pt = model.predict_proba(matrix[te][:, columns])[:, 1]
                scores = np.where(y[ca] == 1, 1 - pc, pc)
                for method in ('forced', 'subject', 'mondrian'):
                    if method == 'forced':
                        sets = np.eye(2, dtype=bool)[(pt >= .5).astype(int)]
                    elif method == 'subject':
                        sets = prediction_sets(pt, conformal_threshold(subject_maxima(scores, g[ca]), .1))
                    else:
                        sets = mondrian_sets(pc, y[ca], g[ca], pt, .1)
                    rows += subject_records(y[te], pt, sets, g[te], seed, f'{name}_{method}')
                for alpha in alphas:
                    for method in ('subject', 'mondrian'):
                        sets = (prediction_sets(pt, conformal_threshold(subject_maxima(scores, g[ca]), alpha))
                                if method == 'subject' else mondrian_sets(pc, y[ca], g[ca], pt, alpha))
                        curves += subject_records(y[te], pt, sets, g[te], seed, f'{name}_{method}_a{alpha}')
        print(f'Repeated folds completed: seed {seed}', flush=True)
    frame = pd.DataFrame(rows)
    paired = {}
    for left, right in [('full_subject', 'full_forced'), ('compact_subject', 'full_subject'),
                         ('compact_forced', 'full_forced'), ('full_mondrian', 'full_subject')]:
        a = frame[frame['mode'] == left].groupby('subject').mean(numeric_only=True)
        b = frame[frame['mode'] == right].groupby('subject').mean(numeric_only=True).loc[a.index]
        delta = (a.covered - b.covered).to_numpy()
        d = np.random.default_rng(2026).integers(0, len(delta), (n_boot, len(delta)))
        paired[f'{left}_minus_{right}'] = {'estimate': float(delta.mean()),
            'ci95': np.quantile(delta[d].mean(axis=1), [.025, .975]).tolist()}
    curve_frame = pd.DataFrame(curves)
    curve_summary = []
    for mode, part in curve_frame.groupby('mode'):
        per = part.groupby('subject').mean(numeric_only=True)
        rate = per.singleton.mean()
        curve_summary.append({'mode': mode, 'singleton_rate': float(rate),
            'singleton_risk': float(per.singleton_wrong.mean() / rate) if rate else None,
            'subject_coverage': float(per.covered.mean())})
    return {'summary': cluster_summary(rows, n_boot), 'paired_coverage_deltas': paired,
            'risk_coverage': curve_summary, 'fold_selection_audit': audit}, rows


def grouped_oof(data, labels, seed=42, columns=None, nested=False, trials=5, compact=False):
    """Three-fold inner tuning on outer-training subjects only."""
    import optuna
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    X, g = data['X'], data['groups']
    subj = np.unique(g)
    labs = np.array([labels[g == s][0] for s in subj])
    outer = StratifiedKFold(5, shuffle=True, random_state=seed)
    p = np.empty(len(labels)); audit = []
    taxa = np.isin(np.arange(X.shape[1]), data['taxa_idx'])
    for fold, (a, b) in enumerate(outer.split(subj, labs)):
        tr, te = np.isin(g, subj[a]), np.isin(g, subj[b])
        cols = (compact_columns(X[tr], g[tr], taxa) if compact else
                np.arange(X.shape[1]) if columns is None else columns)
        params = None
        if nested:
            inner = list(StratifiedKFold(3, shuffle=True, random_state=seed).split(subj[a], labs[a]))
            def objective(trial):
                config = {'max_depth': trial.suggest_int('max_depth', 2, 6),
                          'learning_rate': trial.suggest_float('learning_rate', .03, .2, log=True),
                          'n_estimators': trial.suggest_int('n_estimators', 50, 150, step=50)}
                scores = []
                for c, d in inner:
                    fit, val = np.isin(g, subj[a][c]), np.isin(g, subj[a][d])
                    inner_cols = compact_columns(X[fit], g[fit], taxa) if compact else cols
                    model = _fit(X[fit][:, inner_cols], labels[fit], seed, config)
                    pred = model.predict_proba(X[val][:, inner_cols])[:, 1]
                    table = pd.DataFrame({'y': labels[val], 'p': pred, 'g': g[val]}).groupby('g').mean()
                    scores.append(roc_auc_score(table.y, table.p))
                return float(np.mean(scores))
            study = optuna.create_study(direction='maximize', sampler=optuna.samplers.TPESampler(seed=seed))
            study.optimize(objective, n_trials=trials)
            params = study.best_params
            audit.append({'fold': fold, 'best_params': params, 'inner_score': study.best_value,
                          'trials': [{'params': t.params, 'value': t.value} for t in study.trials]})
        model = _fit(X[tr][:, cols], labels[tr], seed, params)
        p[te] = model.predict_proba(X[te][:, cols])[:, 1]
    table = pd.DataFrame({'label': labels, 'p': p, 'g': g}).groupby('g').mean()
    return float(roc_auc_score(table.label, table.p)), audit


def permutation_test(data, n_permutations=199, seed=42):
    """Rebuild stratified folds for each subject-label permutation; plus-one p."""
    g, y = data['groups'], data['y']
    subjects = np.unique(g)
    labels = np.array([y[g == s][0] for s in subjects])
    observed, _ = grouped_oof(data, y, seed)
    rng = np.random.default_rng(seed)
    null = []
    for i in range(n_permutations):
        lookup = dict(zip(subjects, rng.permutation(labels)))
        yp = np.array([lookup[s] for s in g])
        score, _ = grouped_oof(data, yp, seed)
        null.append(score)
        if (i + 1) % 20 == 0:
            print(f'Permutations completed: {i + 1}', flush=True)
    return {'observed_subject_auc': observed, 'null_subject_auc': null,
            'p_value': (1 + int(np.sum(np.array(null) >= observed))) / (1 + n_permutations),
            'n_permutations': n_permutations, 'seed': seed,
            'limitation': 'Unadjusted global subject-label exchangeability; not conditional on nursing home or confounders.'}


def proxy_audit(data):
    names = data['feature_names']
    # Exact names are audited against the bundled schema; no label-based selection.
    groups = {'age_day': ['age_cat', 'day'],
              'frailty_nutrition': [n for n in names if 'frailty' in n.lower() or 'malnutrition' in n.lower()],
              'medications': [n for n in names if any(t in n.lower() for t in
                  ('ppi', 'antibiotic', 'medication', 'statin', 'laxative', 'opioid', 'gaba', 'antidepress'))]}
    results = {}
    for group, excluded in groups.items():
        cols = np.array([i for i, name in enumerate(names) if name not in excluded])
        values = [grouped_oof(data, data['y'], seed=s, columns=cols)[0] for s in (42, 43, 44)]
        results[group] = {'excluded_columns': excluded, 'subject_auc_by_seed': values}
    results['interpretation'] = 'Predictive sensitivity to prespecified recorded proxies, not causal adjustment; medication list is not exhaustive.'
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--seeds', type=int, default=30)
    parser.add_argument('--permutations', type=int, default=199)
    parser.add_argument('--bootstrap', type=int, default=1000)
    parser.add_argument('--trials', type=int, default=5)
    args = parser.parse_args()
    if min(args.seeds, args.permutations, args.bootstrap, args.trials) < 1:
        parser.error('Counts must be positive')
    start = perf_counter()
    data = load_matrix()
    report, rows = run_repeated(data, range(42, 42 + args.seeds), args.bootstrap)
    report['provenance'] = _provenance(data)
    report['config'] = vars(args) | {'first_seed': 42, 'folds': 5, 'alpha': .1,
        'bootstrap_unit': 'subject retaining every repeat; fitted predictions held fixed',
        'nested_cv': 'one seed (42), five outer folds, three inner folds; separate sensitivity experiment'}
    report['permutation'] = permutation_test(data, args.permutations)
    report['nested'] = {}
    for compact in (False, True):
        auc, audit = grouped_oof(data, data['y'], nested=True, trials=args.trials, compact=compact)
        report['nested']['compact' if compact else 'full'] = {'subject_auc': auc, 'audit': audit}
    report['proxies'] = proxy_audit(data)
    report['runtime_seconds'] = perf_counter() - start
    target = Path(__file__).parent / 'artifacts'
    target.mkdir(exist_ok=True)
    pd.DataFrame(rows).to_csv(target / 'repeated_subject_predictions.csv', index=False)
    save_report(report, str(target / 'repeated_report.json'))
    public = {key: report[key] for key in (
        'config', 'summary', 'paired_coverage_deltas', 'risk_coverage', 'provenance')}
    public['nested'] = {mode: {'subject_auc': fit['subject_auc']}
                        for mode, fit in report['nested'].items()}
    public['permutation'] = {key: report['permutation'][key] for key in (
        'observed_subject_auc', 'p_value', 'n_permutations')}
    save_report(public, str(target / 'repeated_summary.json'))
    print(json.dumps({'runtime_seconds': report['runtime_seconds'], 'permutation_p': report['permutation']['p_value']}))


if __name__ == '__main__':
    main()
