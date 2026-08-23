"""
ML Data Loader & Subject-Level Stratified Splitting
===================================================
Provides robust, reproducible data preparation for model training and inference.
Implements grouped subject-level train/test splitting on `study_id` (102 subjects)
to strictly eliminate longitudinal subject leakage.
"""
from __future__ import annotations

import os
from copy import deepcopy
from typing import List, Tuple, Dict, Any, Optional

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight

from app.core.logging import get_logger
from app.ingestion.pipeline import get_global_resources_dir

logger = get_logger(__name__)

# Excluded metadata columns
DEFAULT_EXCLUDED_COLUMNS = [
    "Sample ID",
    "study_id",
    "Alzheimers",
    "Date Sample",
    "age",
    "Dementia Other",
]


def load_dataset_df(filepath: Optional[str] = None) -> pd.DataFrame:
    """Load the primary clinical microbiome dataframe."""
    if filepath is None:
        global_res = get_global_resources_dir()
        filepath = os.path.join(global_res, "clinical_microbiome_df.csv")

    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Primary dataset not found at {filepath}")

    df = pd.read_csv(filepath)
    return df


def preprocess_and_split(
    df: pd.DataFrame,
    test_size: float = 0.25,
    seed: int = 42,
    excluded_columns: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Perform subject-level stratified train/test split on `study_id`.
    
    1. Aggregates diagnosis label per subject (`study_id`).
    2. Splits subjects with stratification on Alzheimer's status.
    3. Partitions all longitudinal sample rows accordingly.
    4. Validates 0 subject overlap between train and test splits.
    """
    if excluded_columns is None:
        excluded_columns = DEFAULT_EXCLUDED_COLUMNS

    df_clean = df.copy()

    # Identify subject-level diagnosis
    study_labels = df_clean.groupby("study_id")["Alzheimers"].max().reset_index()

    train_study_ids, test_study_ids = train_test_split(
        study_labels["study_id"],
        test_size=test_size,
        stratify=study_labels["Alzheimers"],
        random_state=seed,
    )

    train_mask = df_clean["study_id"].isin(train_study_ids)
    test_mask = df_clean["study_id"].isin(test_study_ids)

    train_data = df_clean[train_mask].copy().reset_index(drop=True)
    test_data = df_clean[test_mask].copy().reset_index(drop=True)

    # Sanity check: zero subject overlap
    overlap = set(train_data["study_id"]).intersection(set(test_data["study_id"]))
    if overlap:
        raise ValueError(f"Subject leakage detected! Overlapping study_ids: {overlap}")

    # Determine feature columns (numerical only, non-excluded)
    feature_columns = [col for col in df_clean.columns if col not in excluded_columns]

    # Cast feature columns to float64
    for col in feature_columns:
        train_data[col] = pd.to_numeric(train_data[col], errors="coerce").fillna(0.0).astype(np.float64)
        test_data[col] = pd.to_numeric(test_data[col], errors="coerce").fillna(0.0).astype(np.float64)

    X_train = train_data[feature_columns].values
    y_train = train_data["Alzheimers"].values.astype(int)

    X_test = test_data[feature_columns].values
    y_test = test_data["Alzheimers"].values.astype(int)

    # Compute scale_pos_weight
    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    scale_pos_weight = float(weights[1] / weights[0]) if len(weights) > 1 else 1.0

    return {
        "X_train": X_train,
        "y_train": y_train,
        "X_test": X_test,
        "y_test": y_test,
        "train_df": train_data,
        "test_df": test_data,
        "train_sample_ids": train_data["Sample ID"].tolist(),
        "test_sample_ids": test_data["Sample ID"].tolist(),
        "feature_columns": feature_columns,
        "scale_pos_weight": scale_pos_weight,
        "train_subjects_count": len(train_study_ids),
        "test_subjects_count": len(test_study_ids),
        "seed": seed,
    }
