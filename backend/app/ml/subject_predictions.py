"""Out-of-fold predictions for retrospective displays, never fitted on the subject."""
from __future__ import annotations

import hashlib
import threading
import numpy as np
import pandas as pd

from app.ml.data_loader import DEFAULT_EXCLUDED_COLUMNS
from app.ml.models import get_model_instance

_LOCK = threading.Lock()
_CACHE = {}


def subject_held_out_predictions(df: pd.DataFrame) -> dict[str, float]:
    """Five deterministic subject folds. These probabilities are not calibrated."""
    fingerprint = hashlib.sha256(pd.util.hash_pandas_object(df, index=True).values.tobytes()).hexdigest()
    with _LOCK:
        if fingerprint in _CACHE:
            return dict(_CACHE[fingerprint])
        subjects = np.array(sorted(df['study_id'].unique()))
        if len(subjects) < 5:
            raise ValueError('At least five subjects are required for held-out predictions')
        np.random.default_rng(42).shuffle(subjects)
        features = [c for c in df.columns if c not in DEFAULT_EXCLUDED_COLUMNS]
        X = df[features].apply(pd.to_numeric, errors='coerce').fillna(0).to_numpy(dtype=float)
        y = df['Alzheimers'].to_numpy(dtype=int)
        probabilities = np.empty(len(df))
        for held_out in np.array_split(subjects, 5):
            test = df['study_id'].isin(held_out).to_numpy()
            train = ~test
            if len(np.unique(y[train])) != 2:
                raise ValueError('Every training fold must contain both classes')
            model = get_model_instance('xgboost', seed=42, scale_pos_weight=float((y[train] == 0).sum() / (y[train] == 1).sum()))
            model.fit(X[train], y[train])
            probabilities[test] = model.predict_proba(X[test])[:, 1]
        result = dict(zip(df['Sample ID'], probabilities.tolist()))
        _CACHE.clear()  # Bound memory to one dataset version.
        _CACHE[fingerprint] = result
        return dict(result)
