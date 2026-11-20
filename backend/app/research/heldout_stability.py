"""Measure attribution stability on fixed unseen subjects as training subjects vary."""
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
from xgboost import DMatrix

from app.research.repeated import _fit
from app.research.rigor import load_matrix, save_report
from app.research.subject_conformal import subject_folds


def run():
    data = load_matrix()
    X, y, groups = data["X"], data["y"], data["groups"]
    folds = []
    for number, fold in enumerate(subject_folds(groups, 42)):
        training = np.unique(groups[~fold.test])
        rng = np.random.default_rng(42 + number)
        heldout = DMatrix(X[fold.test])
        tops = []
        for _ in range(30):
            draw = rng.choice(training, len(training), replace=True)
            rows = np.concatenate([np.flatnonzero(groups == subject) for subject in draw])
            model = _fit(X[rows], y[rows], 42)
            values = model.get_booster().predict(heldout, pred_contribs=True)[:, :-1]
            importance = pd.DataFrame(abs(values)).groupby(groups[fold.test]).mean().mean()
            tops.append(set(importance.nlargest(20).index))
        overlaps = [len(a & b) / len(a | b) for a, b in combinations(tops, 2)]
        folds.append({"fold": number, "heldout_subjects": int(len(np.unique(groups[fold.test]))),
                      "mean_jaccard": float(np.mean(overlaps)),
                      "selection_counts": {data["feature_names"][i]: sum(i in t for t in tops)
                                           for i in sorted(set.union(*tops))}})
    return {"training_bootstraps_per_fold": 30, "model_seed": 42, "top_k": 20,
            "folds": folds, "mean_fold_jaccard": float(np.mean([f["mean_jaccard"] for f in folds]))}


if __name__ == "__main__":
    result = run()
    save_report(result, str(Path(__file__).parent / "artifacts/heldout_stability.json"))
    print(result["mean_fold_jaccard"])
