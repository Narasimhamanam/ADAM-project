"""
Tests for ADAM-1 Enhanced — Research Extensions & Reproducibility Gates
========================================================================
Verifies:
1. Candidate dataset registry and access status integrity.
2. Strict crosswalk audit & multimodal linkage gate enforcement.
3. Benchmark engine participant-level stratification and bootstrap 95% CIs.
4. Neuroimaging volumetric biomarker validation.
5. Longitudinal Research Digital Twin zero-transition governance.
6. GARD request inquiry state machine.
"""
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.research.dataset_registry import (
    DATASET_REGISTRY,
    AccessStatus,
    get_all_datasets,
    get_dataset_by_id,
)
from app.research.crosswalk_gate import (
    CROSSWALK_AUDIT_CATALOG,
    CrosswalkStatus,
    LinkageGateVerdict,
    evaluate_multimodal_linkage_gate,
    check_exact_identifier_intersection,
)
from app.research.harmonization import audit_taxonomic_harmonization, extract_genus_from_species
from app.research.benchmark_engine import compute_binary_metrics_with_ci, list_benchmark_runs
from app.research.neuroimaging import list_neuroimaging_subjects, get_subject_neuroimaging
from app.research.digital_twin import build_participant_digital_twin, list_digital_twin_participants
from app.research.gard_request import get_gard_request_state, update_gard_request_state, GardRequestStatus
import numpy as np


@pytest.fixture
def anyio_backend():
    return "asyncio"


# ── 1. DATASET REGISTRY TESTS ───────────────────────────────────────────────

def test_dataset_registry_contains_all_core_cohorts():
    """Verify registry has baseline, candidate microbiome, neuroimaging, and portal cohorts."""
    datasets = get_all_datasets()
    assert len(datasets) >= 11

    dataset_ids = [d["dataset_id"] for d in datasets]
    assert "ADAM1_BASELINE" in dataset_ids
    assert "ALZBIOM_CS" in dataset_ids
    assert "ALZBIOM_MCI_AD" in dataset_ids
    assert "ALZBIOM_HC_MCI" in dataset_ids
    assert "AMSTERDAM_ADC" in dataset_ids
    assert "CHINESE_STAGE" in dataset_ids
    assert "JAPANESE_NCGG" in dataset_ids
    assert "PRECLINICAL_WU" in dataset_ids
    assert "OASIS1_MRI" in dataset_ids
    assert "OASIS3_MULTIMODAL" in dataset_ids
    assert "ADNI_MULTIMODAL" in dataset_ids
    assert "GARD_MULTIMODAL" in dataset_ids


def test_access_statuses_truthfully_assigned():
    """Verify controlled-access datasets are not marked as public download."""
    adni = get_dataset_by_id("ADNI_MULTIMODAL")
    assert adni["access_status"] == AccessStatus.APPLICATION_REQUIRED.value

    gard = get_dataset_by_id("GARD_MULTIMODAL")
    assert gard["access_status"] == AccessStatus.CONTROLLED_ACCESS.value

    oasis3 = get_dataset_by_id("OASIS3_MULTIMODAL")
    assert oasis3["access_status"] == AccessStatus.REGISTRATION_REQUIRED.value

    adam1 = get_dataset_by_id("ADAM1_BASELINE")
    assert adam1["access_status"] == AccessStatus.DOWNLOADED_AND_AVAILABLE.value


# ── 2. PARTICIPANT-ID & CROSSWALK GATE TESTS ────────────────────────────────

def test_crosswalk_audit_forbids_oasis_and_adni_merges():
    """Verify OASIS and ADNI are flagged strictly with verified disjoint statuses."""
    oasis1_audit = CROSSWALK_AUDIT_CATALOG["OASIS1_MRI"]
    assert oasis1_audit.status == CrosswalkStatus.NO_EXACT_ID_INTERSECTION_IN_INSPECTED_MANIFESTS
    assert oasis1_audit.authorized_crosswalk_exists is False
    assert oasis1_audit.exact_intersection_count == 0

    adni_audit = CROSSWALK_AUDIT_CATALOG["ADNI_MULTIMODAL"]
    assert adni_audit.status == CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND
    assert adni_audit.authorized_crosswalk_exists is False


def test_gard_crosswalk_shows_no_crosswalk_found():
    """Verify GARD has no public crosswalk to ADAM-1 PRJNA529586."""
    gard_audit = CROSSWALK_AUDIT_CATALOG["GARD_MULTIMODAL"]
    assert gard_audit.status == CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND
    assert gard_audit.authorized_crosswalk_exists is False


def test_multimodal_gate_blocks_unauthorized_cross_cohort_fusion():
    """Verify multimodal linkage gate blocks fusing ADAM-1 stool with external MRI."""
    verdict = evaluate_multimodal_linkage_gate(
        cohort_id="ADAM1_BASELINE",
        subject_id="CH1-002",
        requested_modalities=["microbiome", "mri"],
    )
    assert verdict["eligible_for_fusion"] is False
    assert verdict["verdict"] == LinkageGateVerdict.BLOCKED_CROSS_COHORT_MERGE.value
    assert "EXECUTE_INDEPENDENT_MODALITY_PIPELINES_ONLY" in verdict["enforcement_action"]


def test_multimodal_gate_allows_single_modality():
    """Verify single modality requests pass the gate."""
    verdict = evaluate_multimodal_linkage_gate(
        cohort_id="ADAM1_BASELINE",
        subject_id="CH1-002",
        requested_modalities=["microbiome"],
    )
    assert verdict["eligible_for_fusion"] is True
    assert verdict["verdict"] == LinkageGateVerdict.PERMITTED_SAME_COHORT_PAIRED.value


def test_identifier_intersection_checks_namespace():
    """Verify comparing IDs across different namespaces returns zero intersection and invalid."""
    count, matches, is_valid = check_exact_identifier_intersection(
        cohort_a_ids=["CH1-002", "CH1-003"],
        cohort_b_ids=["OAS1_0001", "OAS1_0002"],
        namespace_a="ADAM1:",
        namespace_b="OASIS1:",
    )
    assert count == 0
    assert is_valid is False


# ── 3. HARMONIZATION & BENCHMARK TESTS ───────────────────────────────────────

def test_taxonomic_harmonization_genus_rollup():
    """Test genus extraction and information loss documentation."""
    genus = extract_genus_from_species("Faecalibacterium_prausnitzii")
    assert genus == "Faecalibacterium"

    report = audit_taxonomic_harmonization(
        baseline_species=["Faecalibacterium_prausnitzii", "Bacteroides_fragilis"],
        external_features=["Faecalibacterium", "Bacteroides"],
        external_cohort_id="ALZBIOM_CS",
        external_is_16s=True,
    )
    assert report.genus_aggregated_features == 2
    assert "16S vs Shotgun mapping" in report.information_loss_narrative


def test_bootstrap_subject_level_confidence_intervals():
    """Verify that bootstrap confidence intervals are computed at subject level."""
    # Synthetic test data for unit test
    np.random.seed(42)
    subject_ids = np.array(["S1", "S1", "S2", "S3", "S3", "S4", "S5", "S6"])
    y_true = np.array([1, 1, 0, 1, 1, 0, 0, 0])
    y_proba = np.array([0.9, 0.85, 0.1, 0.75, 0.8, 0.2, 0.15, 0.3])

    metrics = compute_binary_metrics_with_ci(
        y_true=y_true,
        y_pred_proba=y_proba,
        subject_ids=subject_ids,
        n_bootstrap=100,
        random_state=42,
    )
    assert 0.0 <= metrics.accuracy <= 1.0
    assert 0.0 <= metrics.roc_auc <= 1.0
    assert "accuracy" in metrics.confidence_intervals_95
    assert len(metrics.confidence_intervals_95["accuracy"]) == 2
    ci_low, ci_high = metrics.confidence_intervals_95["accuracy"]
    assert ci_low <= ci_high


# ── 4. NEUROIMAGING BIOMARKER TESTS ─────────────────────────────────────────

def test_neuroimaging_subject_retrieval():
    """Test retrieving neuroimaging volumetric biomarkers."""
    subjects = list_neuroimaging_subjects()
    assert len(subjects) >= 4

    subj = get_subject_neuroimaging("OAS1_0001")
    assert subj is not None
    assert subj["hippocampus_volume_cm3"] > 0
    assert subj["lateral_ventricles_volume_cm3"] > 0
    assert len(subj["scans"]) >= 1
    assert subj["scans"][0]["field_strength_tesla"] in (1.5, 3.0)


# ── 5. DIGITAL TWIN & ZERO-TRANSITION GOVERNANCE TESTS ──────────────────────

def test_digital_twin_zero_transition_governance():
    """Verify digital twin profile reflects static clinical diagnosis with zero transitions."""
    participants = list_digital_twin_participants("ADAM1_BASELINE")
    assert len(participants) == 102

    # Test subject CH1-017 (has 12 visits!)
    profile = build_participant_digital_twin("ADAM1_BASELINE", "CH1-017")
    assert profile is not None
    assert profile["total_observed_visits"] == 12
    assert profile["progression_conversion_observed"] is False
    assert "RESEARCH DIGITAL TWIN DISCLAIMER" in profile["governance_disclaimer"]
    assert len(profile["observed_visits"]) == 12
    for v in profile["observed_visits"]:
        assert 0.0 <= v["calibrated_probability"] <= 1.0
        assert len(v["prediction_interval_95"]) == 2


# ── 6. GARD REQUEST WORKFLOW TESTS ──────────────────────────────────────────

def test_gard_request_state_and_update():
    """Test GARD request state inspection and updates."""
    state = get_gard_request_state()
    assert "checklist" in state
    assert len(state["checklist"]) == 8
    assert "sample_email" in state
    assert "PRJNA529586" in state["sample_email"]

    # Test updating state
    updated = update_gard_request_state(
        new_status=GardRequestStatus.UNDER_REVIEW,
        notes="Audit submitted to institutional ethics committee.",
        user="Auditor",
    )
    assert updated["current_status"] == GardRequestStatus.UNDER_REVIEW.value
    assert "Audit submitted" in updated["notes"]

    # Revert to REQUEST_NOT_SENT for clean state
    update_gard_request_state(
        new_status=GardRequestStatus.REQUEST_NOT_SENT,
        notes="Reset after automated test.",
        user="Auditor",
    )


# ── 7. FASTAPI API INTEGRATION TESTS ────────────────────────────────────────

@pytest.mark.anyio
async def test_api_research_datasets_endpoint():
    """Verify GET /api/research/datasets returns 200 and dataset list."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/research/datasets")
        assert res.status_code == 200
        data = res.json()
        assert "datasets" in data
        assert data["total_datasets"] >= 11


@pytest.mark.anyio
async def test_api_research_crosswalk_audit_endpoint():
    """Verify GET /api/research/id-matching/audit returns 200."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/research/id-matching/audit")
        assert res.status_code == 200
        data = res.json()
        assert "audits" in data
        assert len(data["audits"]) >= 10


@pytest.mark.anyio
async def test_api_multimodal_eligibility_endpoint_blocking():
    """Verify POST /api/research/multimodal/eligibility blocks unauthorized merges."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        payload = {
            "cohort_id": "ADAM1_BASELINE",
            "subject_id": "CH1-002",
            "requested_modalities": ["microbiome", "mri"],
        }
        res = await ac.post("/api/research/multimodal/eligibility", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["eligible_for_fusion"] is False
        assert "BLOCKED" in data["verdict"]


@pytest.mark.anyio
async def test_api_benchmark_runs_endpoint():
    """Verify GET /api/research/benchmark/runs returns runs with CIs."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/research/benchmark/runs")
        assert res.status_code == 200
        data = res.json()
        assert "runs" in data
        assert len(data["runs"]) >= 5
        run1 = data["runs"][0]
        assert "confidence_intervals_95" in run1["metrics"]


@pytest.mark.anyio
async def test_api_digital_twin_endpoints():
    """Verify Digital Twin participant list and individual profile endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res_list = await ac.get("/api/research/digital-twin/participants?cohort_id=ADAM1_BASELINE")
        assert res_list.status_code == 200
        data_list = res_list.json()
        assert data_list["total_participants"] == 102

        res_prof = await ac.get("/api/research/digital-twin/ADAM1_BASELINE/CH1-002")
        assert res_prof.status_code == 200
        profile = res_prof.json()
        assert profile["participant_id"] == "CH1-002"
        assert profile["progression_conversion_observed"] is False


# ── 8. FINAL BENCHMARK INTEGRITY & ACCOUNTING TESTS ─────────────────────────

def test_bench_001_exact_accounting():
    """Verify BENCH_001 accounts for 262 training and 73 primary held-out test samples from 81 and 21 subjects, with 30-sample supplementary analysis."""
    runs = list_benchmark_runs()
    b1 = next(r for r in runs if r["run_id"] == "BENCH_001_ADAM1_INTERNAL_XGB")
    assert b1["sample_count_train"] == 262
    assert b1["subject_count_train"] == 81
    assert b1["sample_count_test"] == 73
    assert b1["subject_count_test"] == 21
    assert b1["features_used_count"] == 1044
    assert b1["modality_breakdown"]["microbiome_features_count"] == 940
    assert b1["modality_breakdown"]["clinical_covariates_count"] == 99
    assert b1["metrics"] is not None
    assert b1["metrics"]["accuracy"] == 0.8219
    assert b1["metrics"]["balanced_accuracy"] == 0.7930
    assert b1["metrics"]["roc_auc"] == 0.8813
    assert b1["metrics"]["sensitivity"] == 0.6923
    assert b1["metrics"]["specificity"] == 0.8936
    assert b1["metrics"]["f1_score"] == 0.7347
    assert b1["metrics"]["brier_score"] == 0.1265
    assert b1["metrics"]["confidence_intervals_95"]["accuracy"] == [0.6667, 0.9351]

    # Verify column ontology (exclusive categories, summing to 1050)
    ontology = b1["modality_breakdown"]["column_ontology"]
    assert ontology["total_columns"] == 1050
    assert ontology["total_included"] == 1044
    assert ontology["total_excluded"] == 6
    assert ontology["microbiome_derived"] == 940
    assert ontology["clinical_covariate"] == 100   # 99 included + 1 excluded (Dementia Other)
    assert ontology["demographic"] == 4             # 3 included + 1 excluded (age)
    assert ontology["identifier"] == 2              # 0 included
    assert ontology["date_visit"] == 2              # 1 included (day) + 1 excluded (Date Sample)
    assert ontology["target"] == 1                  # 0 included (Alzheimers)
    assert ontology["other_metadata"] == 1          # 1 included (hopsn)
    # Verify category sum = 1050
    assert (ontology["microbiome_derived"] + ontology["clinical_covariate"] +
            ontology["demographic"] + ontology["identifier"] + ontology["date_visit"] +
            ontology["target"] + ontology["other_metadata"]) == 1050
    assert len(ontology["excluded_columns"]) == 6

    # Verify supplementary analysis (30-sample balanced subsample + 43 remainder)
    assert b1["supplementary_analysis"] is not None
    assert b1["supplementary_analysis"]["sample_count"] == 30
    assert b1["supplementary_analysis"]["accuracy"] == 0.8000
    assert b1["supplementary_analysis"]["roc_auc"] == 0.8889
    assert b1["supplementary_analysis"]["unbalanced_remainder_count"] == 43
    # Verify sampling scheme disclosure is present
    assert "sampling_scheme_disclosure" in b1["supplementary_analysis"]
    # Verify exploratory ablations are present (5 models)
    ablations = b1["supplementary_analysis"]["exploratory_ablations"]
    assert "design_disclosure" in ablations
    assert len(ablations["models"]) == 5
    model_names = [m["name"] for m in ablations["models"]]
    assert any("Microbiome-only" in n for n in model_names)
    assert any("Clinical/Demographic-only" in n for n in model_names)
    assert any("PRIMARY" in n for n in model_names)
    assert any("visit day" in n for n in model_names)
    assert any("facility" in n for n in model_names)


def test_external_benchmark_metrics_are_not_run_and_cite_published():
    """Verify BENCH_002 through BENCH_005 have metrics=None and cite authentic published literature."""
    runs = list_benchmark_runs()
    for run_id in ["BENCH_002_ALZBIOM_UNCHANGED_XGB", "BENCH_003_ALZBIOM_RETRAINED_XGB", 
                   "BENCH_004_CHINESE_STAGE_UNCHANGED", "BENCH_005_ALZBIOM_MCI_CONVERSION"]:
        r = next(item for item in runs if item["run_id"] == run_id)
        assert r["verification_status"] == "NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED"
        assert r["metrics"] is None
        assert r["sample_count_train"] is None
        assert r["sample_count_test"] is None
        assert r["distribution_shift_jsd"] is None
        assert r["published_original_study_metrics"] is not None

    # Check exact cited published metrics for BENCH_002 & BENCH_005
    b2 = next(item for item in runs if item["run_id"] == "BENCH_002_ALZBIOM_UNCHANGED_XGB")
    assert b2["published_original_study_metrics"]["primary_metrics"]["taxonomic_model_auroc_training"] == 0.76
    assert b2["published_original_study_metrics"]["primary_metrics"]["taxonomic_model_auroc_validation"] == 0.61

    b5 = next(item for item in runs if item["run_id"] == "BENCH_005_ALZBIOM_MCI_CONVERSION")
    tax_auc = b5["published_original_study_metrics"]["primary_metrics"]["taxonomic_model_auroc"]
    ens_auc = b5["published_original_study_metrics"]["primary_metrics"]["ensemble_model_auroc"]
    assert tax_auc["baseline"] == 0.87 and tax_auc["year_1"] == 0.92 and tax_auc["year_4"] == 0.95
    assert ens_auc["baseline"] == 0.96 and ens_auc["year_1"] == 0.96 and ens_auc["year_4"] == 0.97


def test_oasis3_gard_and_japanese_registry_provenance():
    """Verify registry counts: OASIS-3 official release, GARD UNKNOWN_NOT_VERIFIED, and Japanese split."""
    oasis3 = get_dataset_by_id("OASIS3_MULTIMODAL")
    assert oasis3["enrolled_participants"] == 1378
    assert "2,842" in oasis3["audit_reconciliation_notes"] or "2842" in str(oasis3["modalities"])
    assert "2,157" in oasis3["audit_reconciliation_notes"] or "2157" in str(oasis3["modalities"])

    gard = get_dataset_by_id("GARD_MULTIMODAL")
    assert gard["multi_modal_participants"] == "UNKNOWN_NOT_VERIFIED"
    assert gard["experiment_eligible_participants"] == "UNKNOWN_NOT_VERIFIED"

    jp = get_dataset_by_id("JAPANESE_NCGG")
    assert jp["enrolled_participants"] == 128
    assert jp["sample_count"] == 43
    assert jp["multi_modal_participants"] == "UNKNOWN_NOT_VERIFIED"


def test_patient_overlap_dimensions_explicitly_distinguished():
    """Verify 5 patient overlap dimensions are explicitly present in all crosswalk records."""
    for record in CROSSWALK_AUDIT_CATALOG.values():
        d = record.to_dict()
        assert d["exact_id_intersection_in_inspected_manifests"] == 0
        assert d["public_crosswalk_search"] == "NO_PUBLIC_CROSSWALK_FOUND"
        assert d["authorized_crosswalk_status"] == "NO_AUTHORIZED_CROSSWALK"
        assert d["verified_identity_linkage"] is False
        assert d["real_world_overlap_status"] == "UNRESOLVED_REAL_WORLD_OVERLAP"
        assert d["data_request_state"] == "REQUEST_NOT_SENT"
        assert "disjoint" not in d["scientific_justification"].lower() or "pseudonym" in d["scientific_justification"].lower()


def test_neuroimaging_modality_comparison_separates_literature_reference():
    """Verify neuroimaging modality comparison separates local measured results from literature references."""
    from app.research.neuroimaging import run_modality_comparison_benchmark
    comparisons = run_modality_comparison_benchmark()
    
    # Microbiome is empirically verified (primary 73 held-out test evaluation)
    microbiome = next(c for c in comparisons if "Microbiome" in c["model_name"])
    assert microbiome["accuracy"] == 0.8219
    assert microbiome["roc_auc"] == 0.8813
    assert microbiome["status"] == "REPRODUCED_AND_VERIFIED_ON_LOCAL_DATA"

    # Structural MRI and PET have local accuracy/roc_auc as None
    mri = next(c for c in comparisons if "Structural MRI" in c["model_name"])
    assert mri["accuracy"] is None
    assert mri["roc_auc"] is None
    assert mri["published_literature_reference"]["reported_accuracy"] == 0.8654
    assert mri["published_literature_reference"]["reported_roc_auc"] == 0.9120

    pet = next(c for c in comparisons if "PET" in c["model_name"])
    assert pet["accuracy"] is None
    assert pet["roc_auc"] is None
    assert pet["published_literature_reference"]["reported_accuracy"] == 0.9143

    gard = next(c for c in comparisons if "GARD" in c["cohort"])
    assert "UNKNOWN_NOT_VERIFIED" in gard["sample_size"]


def test_bench_001_participant_level_metrics_and_retrospective_exploratory_status():
    """Verify participant-level performance completeness and retrospective exploratory disclosures."""
    runs = list_benchmark_runs()
    b1 = next(r for r in runs if r["run_id"] == "BENCH_001_ADAM1_INTERNAL_XGB")
    ablations = b1["supplementary_analysis"]["exploratory_ablations"]

    # Disclosure must state retrospective exploratory analysis
    assert "RETROSPECTIVE EXPLORATORY ANALYSES" in ablations["design_disclosure"]
    assert "nested cross-validation" in ablations["design_disclosure"].lower()

    # Find combined model
    comb = next(m for m in ablations["models"] if "PRIMARY" in m["name"])
    p_comb = comb["participant_level"]
    assert p_comb["n"] == 21
    assert p_comb["n_control"] == 13
    assert p_comb["n_ad"] == 8
    assert p_comb["correct_control"] == 11
    assert p_comb["correct_ad"] == 5
    assert p_comb["correct_total"] == 16
    assert p_comb["confusion_matrix"] == [[11, 2], [3, 5]]
    assert p_comb["accuracy"] == 0.7619
    assert p_comb["balanced_accuracy"] == 0.7356
    assert p_comb["sensitivity"] == 0.6250
    assert p_comb["specificity"] == 0.8462
    assert p_comb["precision"] == 0.7143
    assert p_comb["f1_score"] == 0.6667
    assert p_comb["roc_auc"] == 0.7404
    assert p_comb["pr_auc"] == 0.7720
    assert "bootstrap_95_ci" in p_comb

    # Microbiome-only
    mb = next(m for m in ablations["models"] if "Microbiome-only" in m["name"])
    p_mb = mb["participant_level"]
    assert p_mb["confusion_matrix"] == [[10, 3], [3, 5]]
    assert p_mb["accuracy"] == 0.7143
    assert p_mb["balanced_accuracy"] == 0.6971
    assert p_mb["sensitivity"] == 0.6250
    assert p_mb["specificity"] == 0.7692

    # Clinical/Demographic-only
    cl = next(m for m in ablations["models"] if "Clinical/Demographic-only" in m["name"])
    p_cl = cl["participant_level"]
    assert p_cl["confusion_matrix"] == [[9, 4], [5, 3]]
    assert p_cl["accuracy"] == 0.5714
    assert p_cl["balanced_accuracy"] == 0.5337
    assert p_cl["sensitivity"] == 0.3750
    assert p_cl["specificity"] == 0.6923


def test_bench_001_ablation_split_usage_and_provenance_status():
    """Verify day/hopsn split usage documentation and unresolved follow-up duration provenance."""
    runs = list_benchmark_runs()
    b1 = next(r for r in runs if r["run_id"] == "BENCH_001_ADAM1_INTERNAL_XGB")
    ablations = b1["supplementary_analysis"]["exploratory_ablations"]

    day_m = next(m for m in ablations["models"] if "visit day" in m["name"])
    assert day_m["participant_level"]["identical_to_combined"] is True
    assert "was never selected" in day_m["participant_level"]["split_usage_note"]

    hopsn_m = next(m for m in ablations["models"] if "facility" in m["name"])
    assert hopsn_m["participant_level"]["identical_to_combined"] is True
    assert "was never selected" in hopsn_m["participant_level"]["split_usage_note"]

    assert "UNRESOLVED FOR SOURCE-LEVEL PROVENANCE" in b1["scientific_interpretation"]


