"""
ADAM-1 Enhanced — Taxonomy & Feature Harmonization Engine
==========================================================
Bridges differences between sequencing modalities:
- 16S rRNA amplicon (Genus-level resolution, e.g. AlzBiom 16S, Japanese NCGG)
- Shotgun metagenomics (Species-level resolution, 940 species in ADAM-1, AlzBiom metagenomics)

Rules:
1. NEVER silently substitute species for genus without documentation.
2. Provide explicit Taxonomic Aggregation (Species -> Genus roll-up).
3. Compute feature overlap, missingness, and lost information metrics.
4. Harmonize relative abundances to sum to 1.0 (or 100.0) with consistent zero-handling.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Tuple, Set, Any
import numpy as np
import pandas as pd


@dataclass
class HarmonizationSummary:
    source_cohort: str
    target_cohort: str
    source_modality: str
    target_modality: str
    source_feature_count: int
    target_feature_count: int
    direct_matching_features: int
    genus_aggregated_features: int
    missing_in_target_count: int
    missing_features_sample: List[str]
    information_loss_narrative: str
    transformation_applied: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_cohort": self.source_cohort,
            "target_cohort": self.target_cohort,
            "source_modality": self.source_modality,
            "target_modality": self.target_modality,
            "source_feature_count": self.source_feature_count,
            "target_feature_count": self.target_feature_count,
            "direct_matching_features": self.direct_matching_features,
            "genus_aggregated_features": self.genus_aggregated_features,
            "missing_in_target_count": self.missing_in_target_count,
            "missing_features_sample": self.missing_features_sample,
            "information_loss_narrative": self.information_loss_narrative,
            "transformation_applied": self.transformation_applied,
        }


def extract_genus_from_species(species_name: str) -> str:
    """Extract genus component from species name (e.g. 'Faecalibacterium_prausnitzii' -> 'Faecalibacterium')."""
    clean_name = species_name.replace(" ", "_")
    parts = clean_name.split("_")
    return parts[0] if parts else species_name


def aggregate_species_to_genus(abundance_df: pd.DataFrame, species_cols: List[str]) -> pd.DataFrame:
    """
    Roll up high-resolution shotgun species abundances to Genus-level abundances.
    Sums relative abundances for all species belonging to the same genus.
    """
    genus_mapping: Dict[str, List[str]] = {}
    for col in species_cols:
        genus = extract_genus_from_species(col)
        genus_mapping.setdefault(genus, []).append(col)

    genus_df = pd.DataFrame(index=abundance_df.index)
    for genus, cols in genus_mapping.items():
        genus_df[genus] = abundance_df[cols].sum(axis=1)

    return genus_df


def audit_taxonomic_harmonization(
    baseline_species: List[str],
    external_features: List[str],
    external_cohort_id: str,
    external_is_16s: bool = False,
) -> HarmonizationSummary:
    """
    Audit feature compatibility and information loss when applying ADAM-1 models
    to an external validation cohort.
    """
    baseline_genera = {extract_genus_from_species(sp) for sp in baseline_species}
    external_clean = [f.replace(" ", "_") for f in external_features]

    if external_is_16s:
        # Comparing Genus to Genus
        matched = set(baseline_genera).intersection(set(external_clean))
        missing_in_ext = set(baseline_genera) - set(external_clean)
        info_loss = (
            f"Cross-platform 16S vs Shotgun mapping: ADAM-1's {len(baseline_species)} species collapsed to "
            f"{len(baseline_genera)} genera. {len(matched)} genera overlap with external 16S profiles. "
            f"Species-specific strain heterogeneity (e.g. Bacteroides fragilis toxin-producing strains) is lost."
        )
        transform = "Species-to-Genus Abundance Rollup"
        direct_matches = 0
        genus_matches = len(matched)
    else:
        # Comparing Species to Species (Shotgun)
        baseline_set = set(sp.replace(" ", "_") for sp in baseline_species)
        matched = baseline_set.intersection(set(external_clean))
        missing_in_ext = baseline_set - set(external_clean)
        info_loss = (
            f"Shotgun-to-Shotgun comparison: {len(matched)} / {len(baseline_species)} species directly match. "
            f"{len(missing_in_ext)} species absent in target cohort database; zero-imputed or excluded."
        )
        transform = "Direct Species Alignment & Zero-Fill Missing"
        direct_matches = len(matched)
        genus_matches = len(baseline_genera)

    return HarmonizationSummary(
        source_cohort="ADAM1_BASELINE",
        target_cohort=external_cohort_id,
        source_modality="Shotgun Metagenomics (940 species)",
        target_modality="16S Amplicon (V3-V4)" if external_is_16s else "Shotgun Metagenomics",
        source_feature_count=len(baseline_species),
        target_feature_count=len(external_features),
        direct_matching_features=direct_matches,
        genus_aggregated_features=genus_matches,
        missing_in_target_count=len(missing_in_ext),
        missing_features_sample=sorted(list(missing_in_ext))[:10],
        information_loss_narrative=info_loss,
        transformation_applied=transform,
    )
