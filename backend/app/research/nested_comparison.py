"""Nested comparison using one mean feature vector per participant (exploratory)."""
import hashlib
import json
import os
import subprocess
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.special import expit, logit
from scipy.optimize import minimize
from sklearn.base import clone
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score, roc_curve
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from app.research.rigor import load_matrix

SEED = 42
ARTIFACT = Path(__file__).with_name("artifacts") / "nested_comparison.json"


def metrics(y, p):
    rates, sens, _ = roc_curve(y, p)
    values = {"AUROC": roc_auc_score(y, p), "AUPRC": average_precision_score(y, p),
              "Brier": brier_score_loss(y, p), "Sensitivity at specificity >= 90%": max(sens[rates <= .1])}
    x = logit(np.clip(p, 1e-8, 1 - 1e-8))
    if np.ptp(x) > 1e-8:
        def loss(theta):
            z = theta[0] + theta[1] * x
            return np.logaddexp(0, z).sum() - y @ z
        def gradient(theta):
            error = expit(theta[0] + theta[1] * x) - y
            return np.array([error.sum(), error @ x])
        fit = minimize(loss, [0, 1], jac=gradient, method="BFGS")
        if fit.success:
            values.update({"Calibration intercept": fit.x[0], "Calibration slope": fit.x[1]})
    return values


def run():
    data = load_matrix()
    subjects = pd.DataFrame(data["X"]).groupby(data["groups"]).mean()
    y = pd.Series(data["y"]).groupby(data["groups"]).first().loc[subjects.index].to_numpy()
    X = subjects.to_numpy()
    models = {
        "Training prevalence": (DummyClassifier(strategy="prior"), {}),
        "Logistic regression": (LogisticRegression(max_iter=1500), {"C": [.01, .1, 1]}),
        "Random forest": (RandomForestClassifier(n_estimators=100, random_state=SEED, n_jobs=1),
                          {"min_samples_leaf": [2, 5]}),
        "XGBoost": (XGBClassifier(n_estimators=60, max_depth=2, n_jobs=1, random_state=SEED),
                    {"learning_rate": [.03, .1]}),
    }
    outer = list(StratifiedKFold(5, shuffle=True, random_state=SEED).split(X, y))
    rng = np.random.default_rng(SEED)
    draws = [rng.choice(len(y), len(y), replace=True) for _ in range(500)]
    summaries = {}
    for name, (estimator, grid) in models.items():
        p = np.empty(len(y))
        selected = []
        for tr, te in outer:
            pipeline = make_pipeline(StandardScaler(), clone(estimator))
            prefix = pipeline.steps[-1][0] + "__"
            search = GridSearchCV(pipeline, {prefix + k: v for k, v in grid.items()},
                                  scoring="neg_brier_score", cv=StratifiedKFold(3, shuffle=True, random_state=SEED))
            search.fit(X[tr], y[tr])
            p[te] = search.predict_proba(X[te])[:, 1]
            selected.append(search.best_params_)
        point = metrics(y, p)
        replicates = [metrics(y[ix], p[ix]) for ix in draws if len(set(y[ix])) == 2]
        summaries[name] = {"selected_by_fold": selected, "grid": grid, "metrics": {}}
        for key, value in point.items():
            estimates = [row[key] for row in replicates if key in row]
            summaries[name]["metrics"][key] = {"value": float(value), "ci95": np.quantile(estimates, [.025,.975]).tolist(),
                                                "valid_bootstraps": len(estimates)}
    return {"seed": SEED, "outer_folds": 5, "inner_folds": 3, "bootstrap_subjects": 500,
            "selection": "minimum inner validation Brier", "subjects": len(y), "visits": data["n_samples"],
            "unit": "mean feature vector across observed visits per participant; retrospective",
            "interval": "resampled participants conditional on fitted out-of-fold probabilities",
            "source_revision": os.environ.get("GITHUB_SHA") or subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip(),
            "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "data_sha256": hashlib.sha256(pd.util.hash_pandas_object(subjects,index=True).values.tobytes()+y.tobytes()).hexdigest(),
            "models": summaries, "ADAM agent workflow": "Unavailable: no fold-specific workflow predictions were generated."}


if __name__ == "__main__":
    ARTIFACT.write_text(json.dumps(run(), indent=2, allow_nan=False) + "\n", encoding="utf8")
