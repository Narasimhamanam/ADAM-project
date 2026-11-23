"""Exploratory source-trained genus classifier; external labels used only for scoring."""
import argparse
import io
import json
from pathlib import Path
import subprocess

from scipy.optimize import brentq
from scipy.special import expit
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.metrics import roc_auc_score, brier_score_loss


def evaluate(archive, resources):
    paths = subprocess.check_output(["tar", "-tf", archive], text=True).splitlines()
    tables = []
    for partition in ("training", "validation"):
        name, = [p for p in paths if "/A_Data/" in p and p.endswith(f"/normalised_{partition}_genus.csv")]
        data = subprocess.check_output(["tar", "-xOf", archive, name])
        tables.append(pd.read_csv(io.BytesIO(data)))
    if not tables[0].columns.equals(tables[1].columns):
        raise ValueError("External partitions have different schemas")
    ext = pd.concat(tables, ignore_index=True)
    if ext.DNAID.isna().any() or ext.DNAID.duplicated().any():
        raise ValueError("Expected one unique DNAID per external observation")
    source = pd.read_csv(resources / "clinical_microbiome_df.csv")
    taxa = pd.read_csv(resources / "clade_species_df.csv")
    mapping = {}
    for species, hierarchy in taxa[["species_name", "taxonomy_hierarchy"]].dropna().itertuples(index=False):
        genus = [v[3:] for v in hierarchy.split("|") if v.startswith("g__") and len(v)>3]
        for col in {species, species.replace("_", " ")} & set(source.columns):
            if len(genus)==1 and genus[0] in ext.columns[6:]:
                if col in mapping and mapping[col] != genus[0]:
                    raise ValueError("Conflicting source taxonomy")
                mapping[col] = genus[0]
    raw = source[list(mapping)].fillna(0)
    grouped = raw.T.groupby(mapping).sum().T
    names = sorted(grouped.columns)
    def transform(frame):
        x = frame[names].to_numpy(dtype=float)
        if not np.isfinite(x).all() or (x < 0).any() or (x.sum(axis=1)<=0).any():
            raise ValueError("Invalid genus abundances")
        return np.sqrt(x / x.sum(axis=1, keepdims=True))
    inputs = pd.DataFrame(transform(grouped), index=source.study_id).groupby(level=0).mean()
    labels = source.groupby("study_id").Alzheimers
    assert labels.nunique().eq(1).all()
    model = LogisticRegression(C=1, max_iter=2000).fit(inputs.to_numpy(), labels.first().loc[inputs.index])
    scores = model.predict_proba(transform(ext))[:,1]
    y = ext.outcome.to_numpy()
    assert (y==1).sum()==75 and (y==0).sum()==100
    rng = np.random.default_rng(42)
    aucs = []
    for _ in range(2000):
        idx = np.concatenate([rng.choice(g,len(g)) for g in (np.flatnonzero(y==0),np.flatnonzero(y==1))])
        aucs.append(roc_auc_score(y[idx],scores[idx]))
    external = transform(ext)
    log_odds = model.decision_function(external)
    offset = brentq(lambda intercept: expit(intercept + log_odds).mean() - y.mean(), -40, 40)
    calibration = LogisticRegression(penalty=None, tol=1e-10).fit(log_odds[:, None], y)
    train_y = labels.first().loc[inputs.index].to_numpy()
    train_x = inputs.to_numpy()
    boot_rng = np.random.default_rng(2026)
    refit_auc = []
    for _ in range(2000):
        train = boot_rng.choice(len(train_y), len(train_y), replace=True)
        test = np.concatenate([boot_rng.choice(g, len(g)) for g in
                               (np.flatnonzero(y == 0), np.flatnonzero(y == 1))])
        refit = LogisticRegression(C=1, max_iter=2000).fit(train_x[train], train_y[train])
        refit_auc.append(roc_auc_score(y[test], refit.decision_function(external[test])))
    # Choose the penalty using only source participants and a proper probability score.
    search = GridSearchCV(LogisticRegression(max_iter=2000), {"C": [0.01, 0.1, 1, 10, 100]},
                          scoring="neg_brier_score", cv=StratifiedKFold(5, shuffle=True, random_state=42))
    search.fit(train_x, train_y)
    tuned = search.predict_proba(external)[:, 1]
    return dict(tuned_C=search.best_params_['C'], tuned_auc=roc_auc_score(y,tuned),
                tuned_brier=brier_score_loss(y,tuned), source_subjects=len(inputs), source_species=len(mapping), shared_genera=len(names),
                external_records=len(y), source_prevalence=train_y.mean(), external_prevalence=y.mean(),
                oracle_brier=y.mean()*(1-y.mean()), calibration_offset=offset,
                joint_intercept=calibration.intercept_[0], calibration_slope=calibration.coef_[0,0],
                refit_auc_ci95=np.quantile(refit_auc,[.025,.975]).tolist(), auc=roc_auc_score(y,scores), auc_ci95=np.quantile(aucs,[.025,.975]).tolist(),
                brier=brier_score_loss(y,scores), source_prior_brier=brier_score_loss(y,np.full(len(y),model_prior(labels))))

def model_prior(labels):
    return labels.first().mean()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive")
    parser.add_argument("resources",type=Path)
    args=parser.parse_args()
    print(json.dumps(evaluate(args.archive,args.resources),indent=2))
