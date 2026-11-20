"""Strict taxonomy alignment and evaluation of an already fitted model.

No imputation of missing taxa or clinical fields, retraining or external-label
tuning. Call only after independently checking dataset terms and phenotype.
"""
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score, brier_score_loss


def harmonize_frozen_features(frame, expected_features):
    def canonical(name):
        return ' '.join(str(name).replace('_', ' ').split())
    lookup = {}
    for col in frame.columns:
        key = canonical(col)
        if key in lookup:
            raise ValueError('Ambiguous duplicate taxonomic names')
        lookup[key] = col
    expected = [canonical(n) for n in expected_features]
    if len(set(expected)) != len(expected):
        raise ValueError('Ambiguous frozen feature schema')
    missing = [name for name in expected if name not in lookup]
    if missing:
        raise ValueError(f'Missing {len(missing)} required frozen features; no zero substitution allowed')
    X = frame[[lookup[name] for name in expected]].apply(pd.to_numeric, errors='raise').to_numpy(float)
    if not np.isfinite(X).all():
        raise ValueError('External features must be finite')
    return X, {'matched': len(expected), 'ignored_extra_columns': len(frame.columns) - len(expected),
               'mapping': 'Whitespace/underscore normalization only; no inferred genus/species equivalence'}


def evaluate_frozen(model, frame, expected_features, labels, subjects):
    X, audit = harmonize_frozen_features(frame, expected_features)
    y, g = np.asarray(labels), np.asarray(subjects)
    if len(y) != len(X) or len(g) != len(X) or pd.isna(g).any() or not np.isin(y, [0, 1]).all():
        raise ValueError('Aligned external subject IDs and binary labels required')
    if pd.DataFrame({'y': y, 'g': g}).groupby('g').y.nunique().gt(1).any():
        raise ValueError('Static diagnoses required')
    p = model.predict_proba(X)[:, 1]
    per = pd.DataFrame({'y': y, 'p': p, 'g': g}).groupby('g').mean()
    return {'harmonization': audit, 'subjects': len(per),
            'subject_auc': float(roc_auc_score(per.y, per.p)) if per.y.nunique() == 2 else None,
            'subject_brier': float(brier_score_loss(per.y, per.p))}
