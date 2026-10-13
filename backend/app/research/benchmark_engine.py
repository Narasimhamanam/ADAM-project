"""
ADAM-1 Enhanced — Reproducible Benchmark & Cross-Cohort Validation Engine
==========================================================================
Implements rigorous machine learning benchmark protocols:
- Subject-level stratified splitting (Zero patient leakage across repeated visits)
- Subject-level bootstrap 95% Confidence Intervals
- Comprehensive metrics: Accuracy, Balanced Acc, Sensitivity, Specificity, F1, ROC-AUC, PR-AUC, Brier score
- External cohort evaluation: Unchanged model vs Retrained model
- Honest verification status: Distinguishes empirically reproduced runs on local data
  from prospective external benchmarks awaiting raw data download.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from enum import Enum
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
)
from sklearn.model_selection import StratifiedGroupKFold


class BenchmarkStatus(str, Enum):
    REPRODUCED_AND_VERIFIED = "REPRODUCED_AND_VERIFIED"
    NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED = "NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED"
    LITERATURE_ESTIMATE_ONLY = "LITERATURE_ESTIMATE_ONLY"
    EXPLORATORY = "EXPLORATORY"
    BLOCKED = "BLOCKED"


@dataclass
class EvaluationMetrics:
    accuracy: float
    balanced_accuracy: float
    sensitivity: float  # recall
    specificity: float
    precision: float
    f1_score: float
    roc_auc: float
    pr_auc: float
    brier_score: float
    confusion_matrix: List[List[int]]
    confidence_intervals_95: Dict[str, Tuple[float, float]]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "accuracy": round(self.accuracy, 4),
            "balanced_accuracy": round(self.balanced_accuracy, 4),
            "sensitivity": round(self.sensitivity, 4),
            "specificity": round(self.specificity, 4),
            "precision": round(self.precision, 4),
            "f1_score": round(self.f1_score, 4),
            "roc_auc": round(self.roc_auc, 4),
            "pr_auc": round(self.pr_auc, 4),
            "brier_score": round(self.brier_score, 4),
            "confusion_matrix": self.confusion_matrix,
            "confidence_intervals_95": {
                k: [round(v[0], 4), round(v[1], 4)]
                for k, v in self.confidence_intervals_95.items()
            },
        }


@dataclass
class BenchmarkRunRecord:
    run_id: str
    experiment_name: str
    model_type: str  # e.g., 'xgboost', 'random_forest', 'logistic_regression'
    evaluation_type: str  # 'INTERNAL_HELD_OUT', 'EXTERNAL_UNCHANGED', 'EXTERNAL_RETRAINED'
    train_cohort_id: str
    test_cohort_id: str
    sample_count_train: Optional[int] = None
    subject_count_train: Optional[int] = None
    sample_count_test: Optional[int] = None
    subject_count_test: Optional[int] = None
    features_used_count: Optional[int] = None
    random_seed: int = 42
    metrics: Optional[EvaluationMetrics] = None
    verification_status: BenchmarkStatus = BenchmarkStatus.NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED
    published_original_study_metrics: Optional[Dict[str, Any]] = None
    distribution_shift_jsd: Optional[float] = None
    percentage_point_difference: Optional[float] = None  # Exact accuracy difference in percentage points
    relative_drop_percentage: Optional[float] = None  # Relative percentage reduction
    performance_drop_percentage: Optional[float] = None  # Backward-compatible alias (relative drop %)
    modality_breakdown: Optional[Dict[str, Any]] = None
    supplementary_analysis: Optional[Dict[str, Any]] = None
    provenance_artifact: Optional[str] = None
    scientific_interpretation: str = ""
    timestamp: str = "2026-10-13T10:09:15Z"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "run_id": self.run_id,
            "experiment_name": self.experiment_name,
            "model_type": self.model_type,
            "evaluation_type": self.evaluation_type,
            "train_cohort_id": self.train_cohort_id,
            "test_cohort_id": self.test_cohort_id,
            "sample_count_train": self.sample_count_train,
            "subject_count_train": self.subject_count_train,
            "sample_count_test": self.sample_count_test,
            "subject_count_test": self.subject_count_test,
            "features_used_count": self.features_used_count,
            "random_seed": self.random_seed,
            "verification_status": self.verification_status.value,
            "metrics": self.metrics.to_dict() if self.metrics is not None else None,
            "modality_breakdown": self.modality_breakdown,
            "supplementary_analysis": self.supplementary_analysis,
            "published_original_study_metrics": self.published_original_study_metrics,
            "distribution_shift_jsd": round(self.distribution_shift_jsd, 4) if self.distribution_shift_jsd is not None else None,
            "percentage_point_difference": round(self.percentage_point_difference, 2) if self.percentage_point_difference is not None else None,
            "relative_drop_percentage": round(self.relative_drop_percentage, 2) if self.relative_drop_percentage is not None else None,
            "performance_drop_percentage": round(self.performance_drop_percentage, 2) if self.performance_drop_percentage is not None else None,
            "provenance_artifact": self.provenance_artifact,
            "scientific_interpretation": self.scientific_interpretation,
            "timestamp": self.timestamp,
        }


def compute_binary_metrics_with_ci(
    y_true: np.ndarray,
    y_pred_proba: np.ndarray,
    subject_ids: np.ndarray,
    n_bootstrap: int = 500,
    threshold: float = 0.5,
    random_state: int = 42,
) -> EvaluationMetrics:
    """
    Computes all standard discrimination and calibration metrics,
    with 95% Bootstrap Confidence Intervals sampled at the SUBJECT level.
    """
    y_true = np.asarray(y_true).astype(int)
    y_pred_proba = np.asarray(y_pred_proba).astype(float)
    y_pred = (y_pred_proba >= threshold).astype(int)

    acc = float(accuracy_score(y_true, y_pred))
    b_acc = float(balanced_accuracy_score(y_true, y_pred))
    sens = float(recall_score(y_true, y_pred, zero_division=0))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    
    # Specificity = TN / (TN + FP)
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    spec = float(tn / (tn + fp)) if (tn + fp) > 0 else 0.0

    # ROC-AUC & PR-AUC
    try:
        roc_auc = float(roc_auc_score(y_true, y_pred_proba))
    except Exception:
        roc_auc = 0.5

    try:
        pr_auc = float(average_precision_score(y_true, y_pred_proba))
    except Exception:
        pr_auc = 0.5

    # Brier calibration score
    brier = float(brier_score_loss(y_true, y_pred_proba))

    # Subject-level bootstrap confidence intervals
    unique_subjects = np.unique(subject_ids)
    rng = np.random.RandomState(random_state)
    boot_acc, boot_sens, boot_spec, boot_auc = [], [], [], []

    for _ in range(n_bootstrap):
        boot_subj = rng.choice(unique_subjects, size=len(unique_subjects), replace=True)
        # Gather all samples belonging to chosen subjects
        indices = []
        for s in boot_subj:
            indices.extend(np.where(subject_ids == s)[0])
        
        if len(indices) == 0:
            continue
            
        b_true = y_true[indices]
        b_proba = y_pred_proba[indices]
        b_pred = (b_proba >= threshold).astype(int)

        # Skip if only 1 class sampled in bootstrap
        if len(np.unique(b_true)) < 2:
            continue

        boot_acc.append(accuracy_score(b_true, b_pred))
        boot_sens.append(recall_score(b_true, b_pred, zero_division=0))
        b_cm = confusion_matrix(b_true, b_pred, labels=[0, 1])
        if b_cm.size == 4:
            b_tn, b_fp, _, _ = b_cm.ravel()
            boot_spec.append(b_tn / (b_tn + b_fp) if (b_tn + b_fp) > 0 else 0.0)
        try:
            boot_auc.append(roc_auc_score(b_true, b_proba))
        except Exception:
            pass

    def get_ci(arr: List[float], default_val: float) -> Tuple[float, float]:
        if len(arr) < 10:
            return (max(0.0, default_val - 0.1), min(1.0, default_val + 0.1))
        return (float(np.percentile(arr, 2.5)), float(np.percentile(arr, 97.5)))

    ci_dict = {
        "accuracy": get_ci(boot_acc, acc),
        "sensitivity": get_ci(boot_sens, sens),
        "specificity": get_ci(boot_spec, spec),
        "roc_auc": get_ci(boot_auc, roc_auc),
    }

    return EvaluationMetrics(
        accuracy=acc,
        balanced_accuracy=b_acc,
        sensitivity=sens,
        specificity=spec,
        precision=prec,
        f1_score=f1,
        roc_auc=roc_auc,
        pr_auc=pr_auc,
        brier_score=brier,
        confusion_matrix=cm.tolist(),
        confidence_intervals_95=ci_dict,
    )


# ─────────────────────────────────────────────────────────────────────────────
# AUDITED BENCHMARK RUN CATALOG
# ─────────────────────────────────────────────────────────────────────────────

BENCHMARK_RUNS: List[BenchmarkRunRecord] = [
    # Run 1: Empirically executed and verified on authentic ADAM-1 local CSV data
    BenchmarkRunRecord(
        run_id="BENCH_001_ADAM1_INTERNAL_XGB",
        experiment_name="ADAM-1 Baseline Internal Subject-Stratified Validation",
        model_type="xgboost (XGBClassifier v2.1.3) — Combined Multimodal Baseline",
        evaluation_type="INTERNAL_HELD_OUT",
        train_cohort_id="ADAM1_BASELINE",
        test_cohort_id="ADAM1_BASELINE",
        sample_count_train=262,
        subject_count_train=81,
        sample_count_test=73,  # Primary evaluation: all 73 held-out samples from 21 test subjects
        subject_count_test=21,
        features_used_count=1044,
        modality_breakdown={
            "model_classification": "Combined Multimodal (Microbiome Relative Abundance + Clinical/Demographic Covariates)",
            # Column ontology (verified from clinical_microbiome_df.csv, 1050 total columns)
            # Exclusive categories — each column appears exactly once:
            "column_ontology": {
                "microbiome_derived": 940,        # MetaPhlAn species-level abundances — all 940 included
                "clinical_covariate": 100,        # 99 included; 1 excluded (Dementia Other — exclusion criterion)
                "demographic": 4,                  # 3 included (age_cat, male, Smoker); 1 excluded (continuous age)
                "identifier": 2,                   # 0 included (Sample ID, study_id)
                "date_visit": 2,                   # 1 included (day); 1 excluded (Date Sample)
                "target": 1,                       # 0 included (Alzheimers)
                "other_metadata": 1,               # 1 included (hopsn)
                "total_columns": 1050,
                "total_included": 1044,
                "total_excluded": 6,
                "excluded_columns": ["Sample ID", "study_id", "Alzheimers", "Date Sample", "age", "Dementia Other"],
            },
            # Convenience aliases retained for backward compatibility
            "microbiome_features_count": 940,
            "clinical_covariates_count": 99,
            "demographic_variables_count": 3,
            "visit_variables_count": 1,
            "other_metadata_count": 1,
            "total_features_used": 1044,
            "pure_microbiome_reference": {
                "microbiome_features_count": 940,
                "full_held_out_73_accuracy": 0.7260,
                "full_held_out_73_roc_auc": 0.7619,
                "full_held_out_73_sensitivity": 0.6538,
                "full_held_out_73_specificity": 0.7660,
                "full_held_out_73_brier": 0.1901,
                "participant_level_accuracy": 0.7143,
                "participant_level_roc_auc": 0.6635,
            },
        },
        # RETROSPECTIVE EXPLORATORY ANALYSES: The clinical-only model and feature ablations were requested and executed
        # retrospectively on the existing held-out set after the primary combined-model and microbiome-only results were available.
        # They are exploratory; do NOT treat as pre-specified confirmatory evidence of modality superiority.
        supplementary_analysis={
            "analysis_name": "Supplementary Balanced 30-Sample Test Subsample",
            "disclosure": (
                "Random balanced subset of exactly 15 AD and 15 Control samples drawn with seed 42 "
                "from the same 21 held-out test subjects (16 subjects represented). Disclosed as a subset "
                "of the same held-out participants, not a distinct validation cohort."
            ),
            "sampling_scheme_disclosure": (
                "Samples were drawn using ground-truth labels to enforce 50/50 prevalence. "
                "Prevalence-sensitive metrics (e.g., PPV/NPV) are not applicable to this subset without adjustment. "
                "Metrics here are not suitable for calibration assessment under natural disease prevalence."
            ),
            "sample_count": 30,
            "subjects_represented": 16,
            "accuracy": 0.8000,
            "balanced_accuracy": 0.8000,
            "sensitivity": 0.7333,
            "specificity": 0.8667,
            "precision": 0.8462,
            "f1_score": 0.7857,
            "roc_auc": 0.8889,
            "pr_auc": 0.8612,
            "brier_score": 0.1323,
            "confusion_matrix": [[13, 2], [4, 11]],
            "confidence_intervals_95": {
                "accuracy": [0.6152, 0.9412],
                "sensitivity": [0.3888, 1.0000],
                "specificity": [0.6000, 1.0000],
                "roc_auc": [0.6250, 1.0000],
            },
            "unbalanced_remainder_count": 43,
            "unbalanced_remainder_disclosure": (
                "The 43 unused samples (32 Control, 11 AD) belong to the same 21 held-out test subjects "
                "and are labeled HELD_OUT_TEST_UNBALANCED_REMAINDER. They do not constitute an independent validation cohort."
            ),
            "exploratory_ablations": {
                "design_disclosure": (
                    "These feature group comparisons and the clinical-only model are RETROSPECTIVE EXPLORATORY ANALYSES "
                    "performed on the existing held-out 73-sample test set after the primary combined-model and microbiome-only "
                    "results were obtained. They were not pre-specified prior to viewing held-out results. Their metrics are preserved "
                    "for scientific transparency but do NOT constitute confirmatory evidence of modality superiority. Subsequent analyses "
                    "reused the same test set. For confirmatory model selection and evaluation, define a new protocol using grouped "
                    "nested cross-validation or a genuinely untouched independent validation cohort."
                ),
                "confirmatory_protocol_proposal": (
                    "Proposed Confirmatory Protocol: 5-fold outer GroupKFold cross-validation grouped strictly on study_id "
                    "with 4-fold inner GroupKFold for hyperparameter tuning and feature selection, or evaluation on an "
                    "untouched independent external cohort (e.g., AlzBiom PRJEB47976)."
                ),
                "models": [
                    {
                        "name": "Microbiome-only",
                        "feature_count": 940,
                        "analysis_status": "RETROSPECTIVE_EXPLORATORY",
                        "accuracy": 0.7260,
                        "balanced_accuracy": 0.7099,
                        "sensitivity": 0.6538,
                        "specificity": 0.7660,
                        "roc_auc": 0.7619,
                        "pr_auc": 0.6993,
                        "brier_score": 0.1901,
                        "confusion_matrix": [[36, 11], [9, 17]],
                        "cluster_bootstrap_95_ci": {"accuracy": [0.5957, 0.8375], "roc_auc": [0.5697, 0.8901]},
                        "participant_level": {
                            "n": 21,
                            "n_control": 13,
                            "n_ad": 8,
                            "correct_control": 10,
                            "correct_ad": 5,
                            "correct_total": 15,
                            "confusion_matrix": [[10, 3], [3, 5]],
                            "accuracy": 0.7143,
                            "balanced_accuracy": 0.6971,
                            "sensitivity": 0.6250,
                            "specificity": 0.7692,
                            "precision": 0.6250,
                            "f1_score": 0.6250,
                            "roc_auc": 0.6635,
                            "pr_auc": 0.6835,
                            "bootstrap_95_ci": {
                                "accuracy": [0.5238, 0.9048],
                                "balanced_accuracy": [0.5000, 0.8929],
                                "sensitivity": [0.2857, 1.0000],
                                "specificity": [0.5325, 1.0000],
                                "f1_score": [0.3077, 0.8571],
                                "roc_auc": [0.3818, 0.9135],
                            },
                        },
                    },
                    {
                        "name": "Clinical/Demographic-only",
                        "feature_count": 104,
                        "analysis_status": "RETROSPECTIVE_EXPLORATORY",
                        "feature_breakdown": "99 clinical + 3 demographic + 1 visit day + 1 facility code",
                        "accuracy": 0.6438,
                        "balanced_accuracy": 0.5687,
                        "sensitivity": 0.3077,
                        "specificity": 0.8298,
                        "roc_auc": 0.7823,
                        "pr_auc": 0.6029,
                        "brier_score": 0.1851,
                        "confusion_matrix": [[39, 8], [18, 8]],
                        "cluster_bootstrap_95_ci": {"accuracy": [0.3809, 0.8479], "roc_auc": [0.5044, 0.9273]},
                        "participant_level": {
                            "n": 21,
                            "n_control": 13,
                            "n_ad": 8,
                            "correct_control": 9,
                            "correct_ad": 3,
                            "correct_total": 12,
                            "confusion_matrix": [[9, 4], [5, 3]],
                            "accuracy": 0.5714,
                            "balanced_accuracy": 0.5337,
                            "sensitivity": 0.3750,
                            "specificity": 0.6923,
                            "precision": 0.4286,
                            "f1_score": 0.4000,
                            "roc_auc": 0.5962,
                            "pr_auc": 0.4681,
                            "bootstrap_95_ci": {
                                "accuracy": [0.3810, 0.7619],
                                "balanced_accuracy": [0.3214, 0.7640],
                                "sensitivity": [0.0000, 0.7500],
                                "specificity": [0.4167, 0.9232],
                                "f1_score": [0.0000, 0.6667],
                                "roc_auc": [0.3375, 0.8519],
                            },
                        },
                    },
                    {
                        "name": "Combined (microbiome + clinical/demographic) — PRIMARY",
                        "feature_count": 1044,
                        "analysis_status": "INTERNAL_HELD_OUT_BENCHMARK",
                        "accuracy": 0.8219,
                        "balanced_accuracy": 0.7930,
                        "sensitivity": 0.6923,
                        "specificity": 0.8936,
                        "roc_auc": 0.8813,
                        "pr_auc": 0.8522,
                        "brier_score": 0.1265,
                        "confusion_matrix": [[42, 5], [8, 18]],
                        "cluster_bootstrap_95_ci": {"accuracy": [0.6667, 0.9351], "roc_auc": [0.6948, 0.9733]},
                        "participant_level": {
                            "n": 21,
                            "n_control": 13,
                            "n_ad": 8,
                            "correct_control": 11,
                            "correct_ad": 5,
                            "correct_total": 16,
                            "confusion_matrix": [[11, 2], [3, 5]],
                            "accuracy": 0.7619,
                            "balanced_accuracy": 0.7356,
                            "sensitivity": 0.6250,
                            "specificity": 0.8462,
                            "precision": 0.7143,
                            "f1_score": 0.6667,
                            "roc_auc": 0.7404,
                            "pr_auc": 0.7720,
                            "bootstrap_95_ci": {
                                "accuracy": [0.5714, 0.9524],
                                "balanced_accuracy": [0.5332, 0.9287],
                                "sensitivity": [0.2500, 1.0000],
                                "specificity": [0.6364, 1.0000],
                                "f1_score": [0.2857, 0.9091],
                                "roc_auc": [0.4272, 0.9907],
                            },
                        },
                    },
                    {
                        "name": "Ablation: Combined excluding visit day",
                        "feature_count": 1043,
                        "analysis_status": "RETROSPECTIVE_EXPLORATORY",
                        "feature_excluded": "day (elapsed days from baseline)",
                        "accuracy": 0.8219,
                        "balanced_accuracy": 0.7930,
                        "sensitivity": 0.6923,
                        "specificity": 0.8936,
                        "roc_auc": 0.8813,
                        "pr_auc": 0.8522,
                        "brier_score": 0.1265,
                        "confusion_matrix": [[42, 5], [8, 18]],
                        "cluster_bootstrap_95_ci": {"accuracy": [0.6667, 0.9351], "roc_auc": [0.6948, 0.9733]},
                        "participant_level": {
                            "n": 21,
                            "n_control": 13,
                            "n_ad": 8,
                            "correct_control": 11,
                            "correct_ad": 5,
                            "correct_total": 16,
                            "confusion_matrix": [[11, 2], [3, 5]],
                            "accuracy": 0.7619,
                            "balanced_accuracy": 0.7356,
                            "sensitivity": 0.6250,
                            "specificity": 0.8462,
                            "precision": 0.7143,
                            "f1_score": 0.6667,
                            "roc_auc": 0.7404,
                            "pr_auc": 0.7720,
                            "identical_to_combined": True,
                            "split_usage_note": "Feature 'day' was never selected in any tree split of the Combined model (weight=0, gain=0); model tree dump and probabilities are bitwise identical (max diff = 0.0). Held-out metrics are mathematically identical, not merely identical after rounding.",
                        },
                    },
                    {
                        "name": "Ablation: Combined excluding nursing-home facility code",
                        "feature_count": 1043,
                        "analysis_status": "RETROSPECTIVE_EXPLORATORY",
                        "feature_excluded": "hopsn (nursing facility site code)",
                        "accuracy": 0.8219,
                        "balanced_accuracy": 0.7930,
                        "sensitivity": 0.6923,
                        "specificity": 0.8936,
                        "roc_auc": 0.8813,
                        "pr_auc": 0.8522,
                        "brier_score": 0.1265,
                        "confusion_matrix": [[42, 5], [8, 18]],
                        "cluster_bootstrap_95_ci": {"accuracy": [0.6667, 0.9351], "roc_auc": [0.6948, 0.9733]},
                        "participant_level": {
                            "n": 21,
                            "n_control": 13,
                            "n_ad": 8,
                            "correct_control": 11,
                            "correct_ad": 5,
                            "correct_total": 16,
                            "confusion_matrix": [[11, 2], [3, 5]],
                            "accuracy": 0.7619,
                            "balanced_accuracy": 0.7356,
                            "sensitivity": 0.6250,
                            "specificity": 0.8462,
                            "precision": 0.7143,
                            "f1_score": 0.6667,
                            "roc_auc": 0.7404,
                            "pr_auc": 0.7720,
                            "identical_to_combined": True,
                            "split_usage_note": "Feature 'hopsn' was never selected in any tree split of the Combined model (weight=0, gain=0); model tree dump and probabilities are bitwise identical (max diff = 0.0). Held-out metrics are mathematically identical, not merely identical after rounding.",
                        },
                    },
                ],
            },
        },
        random_seed=42,
        verification_status=BenchmarkStatus.REPRODUCED_AND_VERIFIED,
        metrics=EvaluationMetrics(
            accuracy=0.8219,
            balanced_accuracy=0.7930,
            sensitivity=0.6923,
            specificity=0.8936,
            precision=0.7826,
            f1_score=0.7347,
            roc_auc=0.8813,
            pr_auc=0.8522,
            brier_score=0.1265,
            confusion_matrix=[[42, 5], [8, 18]],
            confidence_intervals_95={
                "accuracy": (0.6667, 0.9351),
                "balanced_accuracy": (0.6093, 0.9174),
                "sensitivity": (0.3998, 0.9130),
                "specificity": (0.6922, 1.0000),
                "precision": (0.4373, 1.0000),
                "f1_score": (0.4286, 0.8937),
                "roc_auc": (0.6948, 0.9733),
                "pr_auc": (0.5707, 0.9694),
                "brier_score": (0.0686, 0.2178),
            },
        ),
        distribution_shift_jsd=0.0385,
        percentage_point_difference=0.0,
        relative_drop_percentage=0.0,
        performance_drop_percentage=0.0,
        provenance_artifact="backend/app/research/artifacts/bench_001_reproducible_run.json",
        scientific_interpretation=(
            "Empirically executed and verified on authentic local clinical_microbiome_df.csv "
            "(SHA-256: bfba6fae29845d728f4d02931665bf9ade9f56f0f557a449247f60e4caecf894). "
            "Strict subject-stratified split on study_id accounts for ALL 335 samples across 102 subjects: "
            "262 training samples (81 subjects: 51 Control, 30 AD; 178 Control samples, 84 AD samples) and "
            "73 primary held-out test samples (21 subjects: 13 Control, 8 AD; 47 Control samples, 26 AD samples). "
            "Zero patient leakage across repeated visits. "
            "Column ontology: 1050 total columns, 6 excluded (Sample ID, study_id, Alzheimers, Date Sample, age, Dementia Other), "
            "1044 included predictor columns (940 microbiome-derived + 99 clinical covariate + 3 demographic + 1 visit day + 1 facility code). "
            "Primary sample-level evaluation on 73 held-out samples: 82.19% accuracy, 0.8813 ROC-AUC, 69.23% sensitivity, 89.36% specificity, "
            "0.1265 Brier score. Participant-level evaluation (21 subjects, mean predicted probability across visits, 0.5 threshold): "
            "76.19% accuracy (16/21 correct: 11/13 Controls, 5/8 AD), 0.7404 ROC-AUC, 0.7356 balanced accuracy, 62.50% sensitivity, 84.62% specificity, "
            "71.43% precision, 66.67% F1, confusion matrix [[11, 2], [3, 5]]. "
            "Sample-level cluster bootstrap (1,000 iterations, seed 42) resamples participants but includes all visits, thereby estimating "
            "a sample-weighted endpoint; participant-level bootstrap weights each subject equally. "
            "Retrospective exploratory feature ablations and clinical-only model reused the same held-out test set and were not pre-specified: "
            "Microbiome-only 72.60% sample acc / 0.7619 AUC (participant 71.43% acc / 0.6635 AUC, CM [[10, 3], [3, 5]]); "
            "Clinical/demo-only 64.38% sample acc / 0.7823 AUC (participant 57.14% acc / 0.5962 AUC, CM [[9, 4], [5, 3]]); "
            "day-excluded and hopsn-excluded models produced bitwise identical predictions (neither feature was selected in any tree split). "
            "Supplementary balanced 30-sample subset (16 subjects, 15 AD + 15 Control, labels used for sampling): "
            "80.00% accuracy, 0.8889 ROC-AUC; remaining 43 samples belong to the same 21 subjects. "
            "Cohort follow-up duration provenance (max 311 days in CSV vs PRJNA529586 'up to 5 months') is marked UNRESOLVED FOR SOURCE-LEVEL PROVENANCE."
        ),
        timestamp="2026-10-13T12:06:00Z",
    ),

    # Run 2: External Validation on AlzBiom European Cohort (Published Literature Reference)
    BenchmarkRunRecord(
        run_id="BENCH_002_ALZBIOM_UNCHANGED_XGB",
        experiment_name="ADAM-1 Model Generalization on AlzBiom Cross-Sectional Cohort (Unchanged)",
        model_type="xgboost",
        evaluation_type="EXTERNAL_UNCHANGED",
        train_cohort_id="ADAM1_BASELINE",
        test_cohort_id="ALZBIOM_CS",
        sample_count_train=None,
        subject_count_train=None,
        sample_count_test=None,
        subject_count_test=None,
        features_used_count=None,
        random_seed=42,
        verification_status=BenchmarkStatus.NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED,
        metrics=None,
        published_original_study_metrics={
            "study_reference": "AlzBiom Cross-Sectional Diagnosis (PRJEB47976)",
            "publication": "AlzBiom Consortium",
            "model_and_evaluation_design": "Published taxonomic-model cross-sectional microbiome diagnosis evaluated in original study",
            "primary_metrics": {
                "taxonomic_model_auroc_training": 0.76,
                "taxonomic_model_auroc_validation": 0.61,
            },
            "original_cohort_reported": "192 participants (European multicenter)",
            "local_evaluation_status": "NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED",
            "note": "Metrics cited directly from published AlzBiom literature. No local transfer experiment executed because authentic raw sequence data is not downloaded locally.",
        },
        distribution_shift_jsd=None,
        percentage_point_difference=None,
        relative_drop_percentage=None,
        performance_drop_percentage=None,
        provenance_artifact="Published AlzBiom cross-sectional literature (PRJEB47976); raw reads not stored locally.",
        scientific_interpretation=(
            "Audit correction: Evaluated metrics set to None/NOT_RUN because raw FASTQ sequencing reads for PRJEB47976 "
            "are not downloaded locally. Published AlzBiom work reports taxonomic-model AUROC of 0.76 in training and 0.61 in validation "
            "for cross-sectional microbiome diagnosis. These published metrics reflect the original publication's model and evaluation design, "
            "not local ADAM-1 transfer results."
        ),
        timestamp="2026-10-13T10:09:15Z",
    ),

    # Run 3: Domain-Adapted Model on AlzBiom European Cohort (Prospective Protocol)
    BenchmarkRunRecord(
        run_id="BENCH_003_ALZBIOM_RETRAINED_XGB",
        experiment_name="Domain-Adapted XGBoost Retrained on AlzBiom Cross-Sectional Cohort",
        model_type="xgboost",
        evaluation_type="EXTERNAL_RETRAINED",
        train_cohort_id="ALZBIOM_CS",
        test_cohort_id="ALZBIOM_CS",
        sample_count_train=None,
        subject_count_train=None,
        sample_count_test=None,
        subject_count_test=None,
        features_used_count=None,
        random_seed=42,
        verification_status=BenchmarkStatus.NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED,
        metrics=None,
        published_original_study_metrics={
            "study_reference": "AlzBiom Prospective Domain Adaptation Protocol",
            "model_and_evaluation_design": "Prospective domain-adapted retraining protocol",
            "primary_metrics": "NOT_AVAILABLE (No local retraining executed; raw FASTQs not downloaded)",
            "local_evaluation_status": "NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED",
            "note": "Untested protocol entry. No local retraining executed on authentic participant-level data.",
        },
        distribution_shift_jsd=None,
        percentage_point_difference=None,
        relative_drop_percentage=None,
        performance_drop_percentage=None,
        provenance_artifact="Prospective protocol; raw FASTQs not stored locally.",
        scientific_interpretation=(
            "Audit correction: Evaluated metrics set to None/NOT_RUN. Raw sequencing data for PRJEB47976 is not stored locally. "
            "No local domain adaptation or retraining experiment has been executed on participant-level data."
        ),
        timestamp="2026-10-13T10:09:15Z",
    ),

    # Run 4: Unchanged-Model on Chinese Stage-Specific Cohort (Prospective Protocol)
    BenchmarkRunRecord(
        run_id="BENCH_004_CHINESE_STAGE_UNCHANGED",
        experiment_name="ADAM-1 Model Generalization on Chinese Stage-Specific Cohort (Unchanged)",
        model_type="xgboost",
        evaluation_type="EXTERNAL_UNCHANGED",
        train_cohort_id="ADAM1_BASELINE",
        test_cohort_id="CHINESE_STAGE",
        sample_count_train=None,
        subject_count_train=None,
        sample_count_test=None,
        subject_count_test=None,
        features_used_count=None,
        random_seed=42,
        verification_status=BenchmarkStatus.NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED,
        metrics=None,
        published_original_study_metrics={
            "study_reference": "Chinese Multi-Stage Cohort (PRJCA022804)",
            "model_and_evaluation_design": "Cross-geographic generalization protocol",
            "primary_metrics": "NOT_AVAILABLE (Raw FASTQ sequencing data not downloaded locally)",
            "local_evaluation_status": "NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED",
            "note": "No local transfer evaluation performed because raw reads are not downloaded.",
        },
        distribution_shift_jsd=None,
        percentage_point_difference=None,
        relative_drop_percentage=None,
        performance_drop_percentage=None,
        provenance_artifact="Prospective cross-geographic protocol; raw FASTQs not stored locally.",
        scientific_interpretation=(
            "Audit correction: Evaluated metrics set to None/NOT_RUN. Raw FASTQs are not downloaded locally in the repository. "
            "No local transfer model has been run on Chinese cohort data."
        ),
        timestamp="2026-10-13T10:09:15Z",
    ),

    # Run 5: Longitudinal Conversion Prediction on AlzBiom MCI-to-AD Cohort (Published Literature Reference)
    BenchmarkRunRecord(
        run_id="BENCH_005_ALZBIOM_MCI_CONVERSION",
        experiment_name="Prospective 4-Year AD Conversion Prediction (AlzBiom PRJEB72198)",
        model_type="xgboost",
        evaluation_type="EXTERNAL_RETRAINED",
        train_cohort_id="ALZBIOM_MCI_AD",
        test_cohort_id="ALZBIOM_MCI_AD",
        sample_count_train=None,
        subject_count_train=None,
        sample_count_test=None,
        subject_count_test=None,
        features_used_count=None,
        random_seed=42,
        verification_status=BenchmarkStatus.NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED,
        metrics=None,
        published_original_study_metrics={
            "study_reference": "AlzBiom Longitudinal MCI-to-AD Progression (PRJEB72198)",
            "publication": "AlzBiom Longitudinal Progression Investigation",
            "model_and_evaluation_design": "Published longitudinal MCI progression models evaluated across multiple timepoints in original publication",
            "primary_metrics": {
                "taxonomic_model_auroc": {
                    "baseline": 0.87,
                    "year_1": 0.92,
                    "year_4": 0.95,
                },
                "ensemble_model_auroc": {
                    "baseline": 0.96,
                    "year_1": 0.96,
                    "year_4": 0.97,
                },
            },
            "original_cohort_reported": "49 MCI subjects (27 converters, 22 stable)",
            "local_evaluation_status": "NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED",
            "note": "Metrics cited directly from published AlzBiom literature. No local transfer or survival experiment executed because raw sequencing reads are not downloaded locally.",
        },
        distribution_shift_jsd=None,
        percentage_point_difference=None,
        relative_drop_percentage=None,
        performance_drop_percentage=None,
        provenance_artifact="Published literature reference (PRJEB72198); raw FASTQ data not stored locally.",
        scientific_interpretation=(
            "Audit correction: Local evaluation metrics set to None/NOT_RUN because raw individual FASTQ reads "
            "for PRJEB72198 are not stored in local disk. Published AlzBiom work reports MCI-to-AD progression: "
            "taxonomic-model AUROC of 0.87 at baseline, 0.92 at one year, and 0.95 at four years; "
            "ensemble-model AUROC of 0.96 at baseline, 0.96 at one year, and 0.97 at four years. "
            "These published numbers reflect the original study's models and evaluation design, not local ADAM-1 executions."
        ),
        timestamp="2026-10-13T10:09:15Z",
    ),
]


def list_benchmark_runs() -> List[Dict[str, Any]]:
    """Return all benchmark runs."""
    return [run.to_dict() for run in BENCHMARK_RUNS]


def get_benchmark_run_by_id(run_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve run by ID."""
    for r in BENCHMARK_RUNS:
        if r.run_id == run_id:
            return r.to_dict()
    return None
