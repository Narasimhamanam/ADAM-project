"""
ADAM-1 Enhanced — Research Extensions Router
=============================================
Endpoints providing access to:
- Dataset discovery, access statuses, and manifests
- Strict ID crosswalk & multimodal linkage gates
- Cross-cohort validation & benchmark run records
- Neuroimaging volumetric biomarkers & scan reader validations
- Longitudinal Personalized AD Research Digital Twin
- GARD formal data-access inquiry workflow
"""
from __future__ import annotations

from functools import lru_cache
from threading import Lock
from typing import List, Optional, Dict, Any, Literal
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.research.dataset_registry import (
    get_all_datasets,
    get_dataset_by_id,
    DATASET_REGISTRY,
)
from app.research.crosswalk_gate import (
    get_all_crosswalk_audits,
    get_crosswalk_audit,
    evaluate_multimodal_linkage_gate,
    CROSSWALK_AUDIT_CATALOG,
)
from app.research.harmonization import audit_taxonomic_harmonization
from app.research.benchmark_engine import (
    list_benchmark_runs,
    get_benchmark_run_by_id,
    BENCHMARK_RUNS,
)
from app.research.neuroimaging import (
    list_neuroimaging_subjects,
    get_subject_neuroimaging,
    run_modality_comparison_benchmark,
)
from app.research.digital_twin import (
    build_participant_digital_twin,
    list_digital_twin_participants,
)
from app.research.rigor import load_report as load_rigor_report
from app.research.gard_request import (
    get_gard_request_state,
    update_gard_request_state,
    GardRequestStatus,
)

router = APIRouter(prefix="/research", tags=["Research Extensions"])

_subject_benchmark_lock = Lock()


@lru_cache(maxsize=1)
def _subject_benchmark_report() -> dict:
    from app.ml.data_loader import load_dataset_df
    from app.research.subject_conformal import run_subject_benchmark

    return run_subject_benchmark(load_dataset_df())


@router.get("/benchmark/subject-conformal", summary="Compare held-out subject prediction sets")
def get_subject_conformal_benchmark(
    mode: Literal["baseline", "visit_conformal", "subject_conformal", "compact_only", "compact_subject", "all"] = "all",
) -> dict:
    """Evaluate the fixed local research cohort and return aggregate results."""
    with _subject_benchmark_lock:
        report = _subject_benchmark_report()
    if mode == "all":
        return report
    return {**report, "results": {mode: report["results"][mode]}}


# ─────────────────────────────────────────────────────────────────────────────
# 1. DATASET DISCOVERY & ACCESS REGISTRY
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/datasets", summary="List all candidate and baseline research cohorts")
async def list_datasets(category: Optional[str] = Query(None, description="Filter by cohort category")):
    """Returns all registered datasets with verified access status, accession, and license."""
    datasets = get_all_datasets()
    if category:
        datasets = [d for d in datasets if d["category"] == category]
    return {
        "total_datasets": len(datasets),
        "datasets": datasets,
    }


@router.get("/datasets/{dataset_id}", summary="Get dataset manifest by ID")
async def get_dataset(dataset_id: str):
    """Retrieve full provenance manifest for a specific dataset ID."""
    ds = get_dataset_by_id(dataset_id)
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with ID '{dataset_id}' not found in research registry.",
        )
    return ds


@router.post("/datasets/{dataset_id}/audit", summary="Run data quality & taxonomic harmonization audit")
async def audit_dataset(dataset_id: str):
    """Audits feature harmonization and information loss against ADAM-1 baseline."""
    ds = get_dataset_by_id(dataset_id)
    if not ds:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with ID '{dataset_id}' not found.",
        )

    if dataset_id != "ADAM1_BASELINE":
        raise HTTPException(status_code=409, detail="External feature manifest is not ingested; a measured audit is unavailable.")
    from app.ml.data_loader import load_dataset_df
    from app.ml.diversity import get_taxa_columns
    from app.ingestion.pipeline import get_global_resources_dir
    from pathlib import Path
    import pandas as pd
    baseline_species = pd.read_csv(Path(get_global_resources_dir()) / "clade_species_df.csv")["species_name"].tolist()
    features = get_taxa_columns(load_dataset_df())
    report = audit_taxonomic_harmonization(baseline_species, features, dataset_id)
    return {"dataset_id": dataset_id, "access_status": ds["access_status"],
            "verification_status": "MEASURED_LOCAL_TAXONOMY", "harmonization_audit": report.to_dict()}


# ─────────────────────────────────────────────────────────────────────────────
# 2. PARTICIPANT-ID MATCHING & CROSSWALK GATE
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/id-matching/audit", summary="Crosswalk and patient-ID linkage audit")
async def get_id_matching_audit():
    """Returns crosswalk status, namespace isolation, and verified intersection counts across all cohorts."""
    audits = get_all_crosswalk_audits()
    return {
        "baseline_cohort": "ADAM1_BASELINE (PRJNA529586)",
        "baseline_namespace": "ADAM1:",
        "total_external_cohorts_audited": len(audits),
        "audits": audits,
        "governing_policy": (
            "Cross-cohort merging without authorized crosswalk is strictly forbidden. "
            "Neuroimaging cohorts (OASIS-1, OASIS-3, ADNI) are independent validation streams by default."
        ),
    }


class MultimodalEligibilityRequest(BaseModel):
    cohort_id: str = Field(..., json_schema_extra={"example": "ADAM1_BASELINE"})
    subject_id: str = Field(..., json_schema_extra={"example": "CH1-002"})
    requested_modalities: List[str] = Field(..., json_schema_extra={"example": ["microbiome", "mri"]})


@router.post("/multimodal/eligibility", summary="Check multimodal linkage gate eligibility")
async def check_multimodal_eligibility(req: MultimodalEligibilityRequest):
    """
    Evaluates whether requested modalities can be merged for a participant.
    Blocks unauthorized cross-cohort merges (e.g., merging OASIS scans with ADAM-1 stool samples).
    """
    decision = evaluate_multimodal_linkage_gate(
        cohort_id=req.cohort_id,
        subject_id=req.subject_id,
        requested_modalities=req.requested_modalities,
    )
    return decision


# ─────────────────────────────────────────────────────────────────────────────
# 3. BENCHMARK ENGINE & CROSS-COHORT VALIDATION
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/benchmark/runs", summary="List reproducible benchmark experiment runs")
async def get_benchmark_runs():
    """Returns all benchmark runs across internal held-out test and external validation cohorts."""
    runs = list_benchmark_runs()
    return {
        "total_runs": len(runs),
        "runs": runs,
    }


@router.get("/benchmark/runs/{run_id}", summary="Get benchmark run details")
async def get_benchmark_run(run_id: str):
    """Retrieve details, bootstrap confidence intervals, and confusion matrix for a benchmark run."""
    run = get_benchmark_run_by_id(run_id)
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Benchmark run '{run_id}' not found.",
        )
    return run


# ─────────────────────────────────────────────────────────────────────────────
# 4. NEUROIMAGING & VOLUMETRIC BIOMARKERS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/neuroimaging/subjects", summary="List neuroimaging subjects and biomarkers")
async def get_neuroimaging_subjects(cohort_id: Optional[str] = Query(None)):
    """Retrieve volumetric MRI and PET biomarkers across OASIS/ADNI cohorts."""
    subjects = list_neuroimaging_subjects(cohort_id=cohort_id)
    return {
        "verification_status": "NO_PARTICIPANT_IMAGING_INGESTED",
        "total_subjects": len(subjects),
        "subjects": subjects,
    }


@router.get("/neuroimaging/subjects/{subject_id}/sessions", summary="Get subject neuroimaging session details")
async def get_subject_sessions(subject_id: str):
    """Retrieve detailed scan series, acquisition parameters, and morphometry for a subject."""
    data = get_subject_neuroimaging(subject_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Neuroimaging records for subject '{subject_id}' not found.",
        )
    return data


@router.get("/neuroimaging/modality-comparison", summary="Compare predictive performance across independent modalities")
async def compare_modalities():
    """Compare performance of Microbiome-only, MRI-only, PET-only, Cognitive-only, and Multimodal models."""
    results = run_modality_comparison_benchmark()
    return {
        "comparison_title": "Independent Modality Discrimination & Multimodal Eligibility Benchmark",
        "models": results,
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. LONGITUDINAL PERSONALIZED AD RESEARCH DIGITAL TWIN
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/digital-twin/participants", summary="List available participants for Digital Twin tracking")
async def get_digital_twin_participants(cohort_id: str = Query("ADAM1_BASELINE")):
    """List participants available for longitudinal research digital twin profiles."""
    participants = list_digital_twin_participants(cohort_id=cohort_id)
    return {
        "cohort_id": cohort_id,
        "total_participants": len(participants),
        "participants": participants,
    }


@router.get("/digital-twin/{cohort_id}/{participant_id}", summary="Get longitudinal Digital Twin profile")
def get_digital_twin_profile(cohort_id: str, participant_id: str):
    """
    Retrieve personalized de-identified research digital twin:
    - Observed longitudinal timeline
    - Microbial, clinical, and uncertainty indicators
    - Static diagnostic label & exploratory stability trajectory
    """
    profile = build_participant_digital_twin(cohort_id=cohort_id, participant_id=participant_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participant '{participant_id}' in cohort '{cohort_id}' not found.",
        )
    return profile


@router.get("/digital-twin/{cohort_id}/{participant_id}/timeline", summary="Get observed history timeline")
def get_digital_twin_timeline(cohort_id: str, participant_id: str):
    """Retrieve simplified chronological timeline for charts and trendlines."""
    profile = build_participant_digital_twin(cohort_id=cohort_id, participant_id=participant_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Participant '{participant_id}' in cohort '{cohort_id}' not found.",
        )
    return {
        "participant_id": profile["participant_id"],
        "cohort_id": profile["cohort_id"],
        "observation_span_days": profile["observation_span_days"],
        "static_diagnosis": profile["static_clinical_diagnosis"],
        "trajectory_slope": profile["longitudinal_trajectory_slope"],
        "stability_verdict": profile["longitudinal_stability_verdict"],
        "timeline": profile["observed_visits"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# 6. GARD LINKED-DATA REQUEST WORKFLOW
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/gard/status", summary="Get GARD data-request state and checklist")
async def get_gard_status():
    """Retrieve the current state of the GARD linked-data feasibility inquiry."""
    return get_gard_request_state()


class GardStatusUpdateRequest(BaseModel):
    status: GardRequestStatus
    notes: str
    user: Optional[str] = "Researcher"


@router.post("/gard/status", summary="Update GARD data-request state")
async def update_gard_status(req: GardStatusUpdateRequest):
    """Update tracking status for the GARD data request."""
    updated = update_gard_request_state(
        new_status=req.status,
        notes=req.notes,
        user=req.user or "Researcher",
    )
    return updated


# ─────────────────────────────────────────────────────────────────────────────
# RIGOR SUITE — leakage audit, calibration, conformal uncertainty, SHAP stability
# ─────────────────────────────────────────────────────────────────────────────

_RIGOR_SECTIONS = ("leakage_audit", "feature_group_ablation", "calibration", "conformal", "shap_stability")


@router.get("/rigor", summary="Leakage-aware evaluation, calibration, conformal and SHAP-stability report")
async def get_rigor_report():
    """Serves the pre-computed report generated by ``python -m app.research.rigor``."""
    report = load_rigor_report()
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rigor report not generated yet. Run `python -m app.research.rigor` in backend/.",
        )
    from pathlib import Path
    from app.research.rigor import ARTIFACT_DIR
    repeated = load_rigor_report(str(Path(ARTIFACT_DIR) / "repeated_summary.json"))
    if repeated is not None:
        report["repeated"] = {key: repeated[key] for key in (
            "config", "summary", "paired_coverage_deltas", "risk_coverage")}
    report["validation_status"] = load_rigor_report(str(Path(ARTIFACT_DIR) / "validation_status.json"))
    external = load_rigor_report(str(Path(ARTIFACT_DIR) / "alzbiom_summary.json"))
    if external is not None:
        report["alzbiom"] = external
    return report


@router.get("/rigor/{section}", summary="One section of the rigor report")
async def get_rigor_section(section: str):
    if section not in _RIGOR_SECTIONS:
        raise HTTPException(status_code=404, detail=f"Unknown section '{section}'. Valid: {list(_RIGOR_SECTIONS)}")
    report = load_rigor_report()
    if report is None:
        raise HTTPException(status_code=404, detail="Rigor report not generated yet.")
    return {"provenance": report.get("provenance"), section: report.get(section)}

@router.get("/integrity", summary="Recompute local ADAM record integrity counts")
def cohort_integrity():
    from app.ml.data_loader import load_dataset_df
    from app.ml.diversity import get_taxa_columns

    frame = load_dataset_df()
    ids = frame["Sample ID"]
    checks = {
        "Duplicate sample ID rows": int(ids.duplicated(keep=False).sum()),
        "Sample IDs linked to multiple subjects": int((frame.groupby("Sample ID")["study_id"].nunique() > 1).sum()),
        "Missing subject IDs": int(frame["study_id"].isna().sum()),
        "Missing cells": int(frame.isna().sum().sum()),
        "Labels outside binary schema": int((~frame["Alzheimers"].isin([0, 1])).sum()),
        "Subjects with conflicting recorded labels": int((frame.groupby("study_id")["Alzheimers"].nunique() > 1).sum()),
        "Negative taxon abundance cells": int((frame[get_taxa_columns(frame)] < 0).sum().sum()),
    }
    return {"samples": len(frame), "subjects": frame["study_id"].nunique(),
            "cells": frame.size, "checks": checks}

@router.get("/nested-comparison", summary="Saved subject-level nested benchmark")
def nested_comparison():
    from pathlib import Path
    from app.research.rigor import ARTIFACT_DIR
    result = load_rigor_report(str(Path(ARTIFACT_DIR) / "nested_comparison.json"))
    if result is None:
        raise HTTPException(status_code=404, detail="Benchmark has not been generated.")
    return result
