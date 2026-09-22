"""
Microbiome Alpha & Beta Diversity Calculation Engine
===================================================
Provides exact mathematical implementations for:
- Alpha Diversity: Shannon Index, Simpson Index, Berger-Parker Dominance
- Beta Diversity: Bray-Curtis Dissimilarity, Jaccard Distance, Canberra Distance
Computed on genuine patient relative abundance profiles.
"""
from __future__ import annotations

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from scipy.spatial.distance import braycurtis, jaccard, canberra

from app.core.logging import get_logger

logger = get_logger(__name__)

# Cached reference control centroid (mean abundance vector across healthy controls)
_HEALTHY_CONTROL_CENTROID: Optional[np.ndarray] = None
_TAXA_COLUMNS: Optional[List[str]] = None


def get_taxa_columns(df: pd.DataFrame) -> List[str]:
    """Extract taxonomic relative abundance column names from dataset."""
    global _TAXA_COLUMNS
    if _TAXA_COLUMNS is not None:
        return _TAXA_COLUMNS

    excluded = {
        "Sample ID", "study_id", "day", "Date Sample", "age", "age_cat",
        "male", "abx6mo", "hopsn", "malnutrition_indicator_sco",
        "clinical_frailty_scale", "PPI", "Alzheimers", "Dementia Other"
    }
    _TAXA_COLUMNS = [c for c in df.columns if c not in excluded and df[c].dtype in ["float64", "int64"]]
    return _TAXA_COLUMNS


def get_control_centroid(df: pd.DataFrame) -> np.ndarray:
    """Compute and cache mean taxonomic abundance vector for healthy controls (Alzheimers == 0)."""
    global _HEALTHY_CONTROL_CENTROID
    if _HEALTHY_CONTROL_CENTROID is not None:
        return _HEALTHY_CONTROL_CENTROID

    taxa_cols = get_taxa_columns(df)
    controls = df[df["Alzheimers"] == 0.0]
    if controls.empty:
        controls = df

    centroid = controls[taxa_cols].mean(axis=0).values.astype(np.float64)
    c_sum = centroid.sum()
    if c_sum > 0:
        centroid = centroid / c_sum

    _HEALTHY_CONTROL_CENTROID = centroid
    return _HEALTHY_CONTROL_CENTROID


def compute_alpha_diversity(abundance_vector: np.ndarray) -> Dict[str, float]:
    """
    Calculate ecological alpha diversity indices for a single sample vector:
    1. Shannon Index (H'): Richness & evenness entropy: -sum(p * ln(p))
    2. Simpson Index (D): Gini-Simpson diversity: 1 - sum(p^2)
    3. Berger-Parker Dominance (d): Proportional abundance of the dominant taxon: max(p)
    """
    vec = np.asarray(abundance_vector, dtype=np.float64)
    v_sum = vec.sum()

    if v_sum <= 0:
        return {
            "shannon_index": 0.0,
            "simpson_index": 0.0,
            "berger_parker_dominance": 0.0,
        }

    # Proportional relative abundance (sums to 1.0)
    p = vec / v_sum
    p_pos = p[p > 0]

    shannon = float(-np.sum(p_pos * np.log(p_pos)))
    simpson = float(1.0 - np.sum(p ** 2))
    berger_parker = float(np.max(p))

    return {
        "shannon_index": round(shannon, 4),
        "simpson_index": round(simpson, 4),
        "berger_parker_dominance": round(berger_parker, 4),
    }


def compute_beta_diversity(
    sample_vector: np.ndarray,
    reference_vector: np.ndarray,
) -> Dict[str, float]:
    """
    Calculate beta diversity dissimilarity between a sample vector and reference:
    1. Bray-Curtis Dissimilarity: sum(|u - v|) / sum(|u + v|) in [0, 1]
    2. Jaccard Distance: Dissimilarity of presence/absence binary profiles in [0, 1]
    3. Canberra Distance: sum(|u - v| / (|u| + |v|)) sensitive to rare taxa
    """
    u = np.asarray(sample_vector, dtype=np.float64)
    v = np.asarray(reference_vector, dtype=np.float64)

    # Avoid zero divisions
    if u.sum() == 0 and v.sum() == 0:
        return {
            "bray_curtis_distance": 0.0,
            "jaccard_distance": 0.0,
            "canberra_distance": 0.0,
        }

    try:
        bc_dist = float(braycurtis(u, v))
        if np.isnan(bc_dist):
            bc_dist = 0.0
    except Exception:
        bc_dist = 0.0

    try:
        u_bin = u > 0
        v_bin = v > 0
        jac_dist = float(jaccard(u_bin, v_bin))
        if np.isnan(jac_dist):
            jac_dist = 0.0
    except Exception:
        jac_dist = 0.0

    try:
        canb_dist = float(canberra(u, v))
        if np.isnan(canb_dist):
            canb_dist = 0.0
    except Exception:
        canb_dist = 0.0

    return {
        "bray_curtis_distance": round(bc_dist, 4),
        "jaccard_distance": round(jac_dist, 4),
        "canberra_distance": round(canb_dist, 4),
    }


def compute_sample_diversity_profile(df: pd.DataFrame, sample_id: str) -> Dict[str, Any]:
    """Compute complete alpha & beta diversity profile for a given sample ID."""
    matching = df[df["Sample ID"] == sample_id]
    if matching.empty:
        raise ValueError(f"Sample ID {sample_id} not found in cohort dataset.")

    sample_row = matching.iloc[0]
    taxa_cols = get_taxa_columns(df)
    sample_vec = sample_row[taxa_cols].values.astype(np.float64)

    alpha = compute_alpha_diversity(sample_vec)
    control_centroid = get_control_centroid(df)
    beta = compute_beta_diversity(sample_vec, control_centroid)

    return {
        "sample_id": sample_id,
        "alpha_diversity": alpha,
        "beta_diversity": beta,
        "total_species_profiled": len(taxa_cols),
        "species_present_count": int(np.sum(sample_vec > 0)),
    }
