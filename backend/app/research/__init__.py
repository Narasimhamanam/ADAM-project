"""
ADAM-1 Enhanced — Research Extensions Package
=============================================
Modules:
- dataset_registry: Catalog of candidate cohorts & access status
- crosswalk_gate: Strict participant ID matching & multimodal linkage gate
- harmonization: Taxonomic alignment & information loss tracking
- benchmark_engine: Reproducible benchmarks & cross-cohort validation
- neuroimaging: Structural MRI & PET volumetric biomarkers
- digital_twin: Longitudinal Personalized AD Research Digital Twin
- gard_request: GARD linked data request workflow & checklist
"""
from app.research.dataset_registry import (
    DATASET_REGISTRY,
    AccessStatus,
    CohortCategory,
    DatasetMetadata,
    get_all_datasets,
    get_dataset_by_id,
)
from app.research.crosswalk_gate import (
    CROSSWALK_AUDIT_CATALOG,
    CrosswalkStatus,
    LinkageGateVerdict,
    get_all_crosswalk_audits,
    get_crosswalk_audit,
    evaluate_multimodal_linkage_gate,
    check_exact_identifier_intersection,
)
from app.research.harmonization import (
    HarmonizationSummary,
    audit_taxonomic_harmonization,
    aggregate_species_to_genus,
)
from app.research.benchmark_engine import (
    BENCHMARK_RUNS,
    BenchmarkRunRecord,
    EvaluationMetrics,
    list_benchmark_runs,
    get_benchmark_run_by_id,
    compute_binary_metrics_with_ci,
)
from app.research.neuroimaging import (
    ScanVolumeMetadata,
    NeuroimagingBiomarkers,
    list_neuroimaging_subjects,
    get_subject_neuroimaging,
    run_modality_comparison_benchmark,
)
from app.research.digital_twin import (
    DigitalTwinVisitObservation,
    LongitudinalDigitalTwinProfile,
    build_participant_digital_twin,
    list_digital_twin_participants,
)
from app.research.gard_request import (
    GardRequestStatus,
    GARD_FEASIBILITY_CHECKLIST,
    get_gard_request_state,
    update_gard_request_state,
    generate_gard_formal_inquiry_email,
)

__all__ = [
    "DATASET_REGISTRY",
    "AccessStatus",
    "CohortCategory",
    "DatasetMetadata",
    "get_all_datasets",
    "get_dataset_by_id",
    "CROSSWALK_AUDIT_CATALOG",
    "CrosswalkStatus",
    "LinkageGateVerdict",
    "get_all_crosswalk_audits",
    "get_crosswalk_audit",
    "evaluate_multimodal_linkage_gate",
    "check_exact_identifier_intersection",
    "HarmonizationSummary",
    "audit_taxonomic_harmonization",
    "aggregate_species_to_genus",
    "BENCHMARK_RUNS",
    "BenchmarkRunRecord",
    "EvaluationMetrics",
    "list_benchmark_runs",
    "get_benchmark_run_by_id",
    "compute_binary_metrics_with_ci",
    "ScanVolumeMetadata",
    "NeuroimagingBiomarkers",
    "list_neuroimaging_subjects",
    "get_subject_neuroimaging",
    "run_modality_comparison_benchmark",
    "DigitalTwinVisitObservation",
    "LongitudinalDigitalTwinProfile",
    "build_participant_digital_twin",
    "list_digital_twin_participants",
    "GardRequestStatus",
    "GARD_FEASIBILITY_CHECKLIST",
    "get_gard_request_state",
    "update_gard_request_state",
    "generate_gard_formal_inquiry_email",
]
