"""
FastAPI Router for Longitudinal AD Risk Trajectory
==================================================
Provides subject-level patient timelines, multi-signal trajectory analysis,
SHAP feature progression, grounded RAG literature retrieval, cohort evaluation,
and extensible risk model status.
"""
from __future__ import annotations

import hashlib
import time
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, status


from app.core.logging import get_logger
from app.ml.longitudinal import (
    get_trajectory_service,
    RiskModelArchitecture,
    RESEARCH_DISCLAIMER,
)
from app.rag.literature_store import search_literature
from app.schemas.trajectory import (
    SubjectListResponse,
    SubjectTrajectoryResponse,
    TrajectoryCompareRequest,
    TrajectoryCompareResponse,
    ObservationLiteratureResponse,
    CohortTrajectoryEvaluationResponse,
    RiskModelCapabilitiesResponse,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/trajectory", tags=["longitudinal-trajectory"])


@router.get(
    "/subjects",
    response_model=SubjectListResponse,
    summary="List all subjects with longitudinal summary metadata",
    description="Returns all 102 subjects grouped by real subject ID (study_id), with observation counts, filtering, and optional pagination.",
)
async def list_subjects(
    page: Optional[int] = Query(None, ge=1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(None, ge=1, le=200, description="Items per page"),
    diagnosis: Optional[str] = Query(None, description="Filter: 'ad', 'control', or 'all'"),
    search: Optional[str] = Query(None, description="Search study_id prefix or substring"),
    is_longitudinal: Optional[bool] = Query(None, description="Filter subjects with repeated samples (>=2 visits)"),
) -> SubjectListResponse:
    t_start = time.time()
    try:
        svc = get_trajectory_service()
        all_subjects = svc.list_all_subjects()

        # Apply filtering
        filtered = all_subjects
        if search:
            clean_search = search.strip().lower()
            filtered = [s for s in filtered if clean_search in s["subject_id"].lower()]

        if diagnosis and diagnosis.lower() != "all":
            d_clean = diagnosis.lower()
            if d_clean == "ad":
                filtered = [s for s in filtered if s["diagnosis_label"] == 1]
            elif d_clean == "control":
                filtered = [s for s in filtered if s["diagnosis_label"] == 0]

        if is_longitudinal is not None:
            filtered = [s for s in filtered if s["is_longitudinal"] is is_longitudinal]

        total_count = len(filtered)
        repeated_count = sum(1 for s in filtered if s["observation_count"] > 1)

        # Pagination
        p_num = None
        p_size = None
        tot_pages = None
        if page is not None:
            p_num = page
            p_size = page_size or 20
            tot_pages = (total_count + p_size - 1) // p_size if total_count > 0 else 1
            offset = (p_num - 1) * p_size
            items = filtered[offset : offset + p_size]
        else:
            items = filtered

        elapsed_ms = round((time.time() - t_start) * 1000, 2)
        logger.info(
            "Listed trajectory subjects",
            total=total_count,
            returned=len(items),
            page=p_num,
            elapsed_ms=elapsed_ms,
        )

        return SubjectListResponse(
            total_subjects=total_count,
            subjects_with_repeated_samples=repeated_count,
            page=p_num,
            page_size=p_size,
            total_pages=tot_pages,
            subjects=items,
        )
    except Exception as e:
        logger.error("Failed to list trajectory subjects", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/subjects/{subject_id}",
    response_model=SubjectTrajectoryResponse,
    summary="Get longitudinal AD risk trajectory for a specific subject",
    description="Builds patient timeline grouped by real subject identifier with chronological ordering, probability change, slope, and SHAP factors.",
)
async def get_subject_trajectory(
    subject_id: str,
    include_shap: bool = Query(True, description="Compute local SHAP explanations per observation"),
    max_horizon_day: Optional[int] = Query(None, description="Optional time horizon filter (day)"),
) -> SubjectTrajectoryResponse:

    t_start = time.time()
    svc = get_trajectory_service()
    try:
        traj = svc.get_subject_trajectory(
            subject_id=subject_id,
            include_shap=include_shap,
            max_horizon_day=max_horizon_day,
        )
        elapsed_ms = round((time.time() - t_start) * 1000, 2)
        logger.info(
            "Computed subject trajectory",
            subject_id=subject_id,
            observations=traj.get("observation_count", 0),
            include_shap=include_shap,
            elapsed_ms=elapsed_ms,
        )
        return SubjectTrajectoryResponse(**traj)

    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error("Failed to compute trajectory", subject_id=subject_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/subjects/{subject_id}/sample/{sample_id}/literature",
    response_model=ObservationLiteratureResponse,
    summary="Retrieve evidence-grounded literature for a trajectory observation",
    description="Queries indexed PubMed corpus using top biomarkers and diversity changes from the specified longitudinal observation.",
)
async def get_observation_literature(
    subject_id: str,
    sample_id: str,
) -> ObservationLiteratureResponse:
    svc = get_trajectory_service()
    try:
        traj = svc.get_subject_trajectory(subject_id=subject_id, include_shap=True)
        matching_obs = next((o for o in traj["observations"] if o["sample_id"].upper() == sample_id.strip().upper()), None)
        if not matching_obs:
            raise HTTPException(
                status_code=404,
                detail=f"Observation sample '{sample_id}' not found for subject '{subject_id}'",
            )

        # Extract top SHAP biomarkers and construct evidence query
        shap_feats = []
        if matching_obs.get("shap_explanation"):
            for feat_item in matching_obs["shap_explanation"].get("top_features", [])[:4]:
                f_name = feat_item.get("feature", "")
                if f_name:
                    shap_feats.append(f_name)

        query_terms = shap_feats if shap_feats else ["microbiome", "alpha diversity", "Alzheimer's"]
        query_str = " ".join(query_terms)

        articles = search_literature(query_str, top_k=4)

        # Compute deterministic prompt hash
        prompt_hash = hashlib.sha256(f"{subject_id}:{sample_id}:{query_str}".encode("utf-8")).hexdigest()

        return ObservationLiteratureResponse(
            subject_id=subject_id,
            sample_id=sample_id,
            study_day=matching_obs["study_day"],
            query=query_str,
            prompt_hash=prompt_hash,
            articles=articles,
            model_version="groq_or_hybrid_rag_v1",
            research_disclaimer=RESEARCH_DISCLAIMER,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to retrieve literature for observation", subject_id=subject_id, sample_id=sample_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/compare",
    response_model=TrajectoryCompareResponse,
    summary="Compare longitudinal risk trajectories across multiple subjects",
    description="Side-by-side comparison of baseline vs latest model probability, slope, and direction.",
)
async def compare_trajectories(payload: TrajectoryCompareRequest) -> TrajectoryCompareResponse:
    svc = get_trajectory_service()
    try:
        comps = svc.compare_subjects(payload.subject_ids)
        return TrajectoryCompareResponse(
            status="RESEARCH_ONLY",
            comparisons=comps,
            research_disclaimer=RESEARCH_DISCLAIMER,
        )
    except Exception as e:
        logger.error("Failed to compare trajectories", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/evaluation",
    response_model=CohortTrajectoryEvaluationResponse,
    summary="Cohort-level longitudinal coverage and stability evaluation",
    description="Calculates coverage of repeated subjects, median follow-up span, and confirms zero subject leakage.",
)
async def evaluate_cohort() -> CohortTrajectoryEvaluationResponse:
    svc = get_trajectory_service()
    try:
        eval_metrics = svc.evaluate_cohort_trajectories()
        return CohortTrajectoryEvaluationResponse(**eval_metrics)
    except Exception as e:
        logger.error("Failed to evaluate cohort trajectories", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/capabilities",
    response_model=RiskModelCapabilitiesResponse,
    summary="Risk model architecture and time-to-event capability status",
    description="Provides clean architectural separation of cross-sectional classification, longitudinal trajectory, and future time-to-event status.",
)
async def get_model_capabilities() -> RiskModelCapabilitiesResponse:
    caps = RiskModelArchitecture.get_capabilities()
    return RiskModelCapabilitiesResponse(**caps)


# Additional router for /api/subjects path aliases (Section 17 compliance)
subjects_router = APIRouter(prefix="/subjects", tags=["subjects"])


@subjects_router.get(
    "/{subject_id}/trajectory",
    response_model=SubjectTrajectoryResponse,
    summary="Get longitudinal risk trajectory for subject (Section 17 alias)",
)
async def get_subject_trajectory_alias(
    subject_id: str,
    include_shap: bool = Query(True),
    max_horizon_day: Optional[int] = Query(None),
) -> SubjectTrajectoryResponse:
    return await get_subject_trajectory(subject_id, include_shap, max_horizon_day)


@subjects_router.get(
    "/{subject_id}/timeline",
    response_model=SubjectTrajectoryResponse,
    summary="Get chronological observation timeline for subject (Section 17 alias)",
)
async def get_subject_timeline_alias(
    subject_id: str,
    include_shap: bool = Query(True),
    max_horizon_day: Optional[int] = Query(None),
) -> SubjectTrajectoryResponse:
    return await get_subject_trajectory(subject_id, include_shap, max_horizon_day)

