"""
Pydantic Schemas for Longitudinal AD Risk Trajectory APIs
=========================================================
"""
from __future__ import annotations

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ObservationPointResponse(BaseModel):
    sample_id: str
    study_day: int
    sample_date: Optional[str] = None
    ad_probability: float
    ad_prediction: int
    clinical_features: Dict[str, float]
    diversity_metrics: Dict[str, float]
    key_species_abundance: Dict[str, float]
    shap_explanation: Optional[Dict[str, Any]] = None


class SubjectTrajectoryResponse(BaseModel):
    subject_id: str
    status: str = "RESEARCH_ONLY"
    observation_count: int
    total_available_observations: int
    follow_up_days: int
    max_observed_day: int
    baseline_day: int
    latest_day: int
    baseline_date: Optional[str] = None
    latest_date: Optional[str] = None
    diagnosis_label: int
    diagnosis_status: str
    baseline_probability: float
    latest_probability: float
    probability_change: float
    probability_change_percentage_points: float
    relative_probability_change: float
    probability_slope_per_day: Optional[float] = None
    monthly_slope_percentage_points: Optional[float] = None
    diversity_slope_per_day: Optional[float] = None
    trajectory_direction: str
    research_interpretation: str
    research_disclaimer: str
    horizon_warning: Optional[str] = None
    observations: List[ObservationPointResponse]
    model_version: str
    feature_schema_version: str


class SubjectSummaryItem(BaseModel):
    subject_id: str
    observation_count: int
    follow_up_days: int
    baseline_day: int
    latest_day: int
    baseline_date: Optional[str] = None
    latest_date: Optional[str] = None
    sample_ids: List[str]
    diagnosis_label: int
    diagnosis_status: str
    is_longitudinal: bool


class SubjectListResponse(BaseModel):
    total_subjects: int
    subjects_with_repeated_samples: int
    subjects: List[SubjectSummaryItem]


class TrajectoryCompareRequest(BaseModel):
    subject_ids: List[str] = Field(..., min_length=1, max_length=10)


class TrajectoryCompareItem(BaseModel):
    subject_id: str
    diagnosis_status: str
    observation_count: int
    follow_up_days: int
    baseline_probability: float
    latest_probability: float
    probability_change_percentage_points: float
    monthly_slope_percentage_points: Optional[float] = None
    trajectory_direction: str
    baseline_shannon: float
    latest_shannon: float
    research_interpretation: str


class TrajectoryCompareResponse(BaseModel):
    status: str = "RESEARCH_ONLY"
    comparisons: List[TrajectoryCompareItem]
    research_disclaimer: str


class ObservationLiteratureResponse(BaseModel):
    subject_id: str
    sample_id: str
    study_day: int
    query: str
    prompt_hash: str
    articles: List[Dict[str, Any]]
    model_version: str
    research_disclaimer: str


class CohortTrajectoryEvaluationResponse(BaseModel):
    total_subjects: int
    total_samples: int
    subjects_with_repeated_samples: int
    subjects_with_three_plus_samples: int
    repeated_subjects_ratio: float
    median_follow_up_days: float
    max_follow_up_days: int
    trajectory_directions: Dict[str, int]
    mean_absolute_probability_drift_pp: float
    subject_leakage_checks_passed: bool
    disease_transitions_observed: int
    time_to_event_validation_status: str
    research_disclaimer: str


class RiskModelCapabilitiesResponse(BaseModel):
    current_classification_model: Dict[str, Any]
    longitudinal_trajectory_model: Dict[str, Any]
    future_time_to_event_model: Dict[str, Any]
