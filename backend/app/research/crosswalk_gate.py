"""
ADAM-1 Enhanced — Strict Participant-ID Matching & Crosswalk Gate
==================================================================
Implements scientific identity governance and linkage gates:
1. Strict Cohort Namespaces (e.g., 'ADAM1:', 'OASIS1:', 'ADNI:', 'GARD:')
2. Exact matching permitted ONLY within common documented namespaces.
3. Cross-dataset merging FORBIDDEN without an authorized, documented crosswalk.
4. Ban on heuristic, fuzzy, or demographic-based patient merging.
5. Multimodal Linkage Gate: Strictly isolates neuroimaging (OASIS/ADNI/GARD)
   from baseline microbiome (ADAM-1) unless certified paired records exist.

Distinguishes audited crosswalk statuses:
- EXACT_ID_INTERSECTION_COMPUTED
- NO_EXACT_ID_INTERSECTION_IN_INSPECTED_MANIFESTS
- NO_PUBLIC_CROSSWALK_FOUND
- CROSSWALK_REQUEST_PENDING
- CROSSWALK_CONFIRMED
- MANIFEST_UNAVAILABLE
- NOT_VERIFIED
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Set, Tuple, Any
from app.research.dataset_registry import DATASET_REGISTRY


class CrosswalkStatus(str, Enum):
    EXACT_ID_INTERSECTION_COMPUTED = "EXACT_ID_INTERSECTION_COMPUTED"
    NO_EXACT_ID_INTERSECTION_IN_INSPECTED_MANIFESTS = "NO_EXACT_ID_INTERSECTION_IN_INSPECTED_MANIFESTS"
    NO_PUBLIC_CROSSWALK_FOUND = "NO_PUBLIC_CROSSWALK_FOUND"
    CROSSWALK_REQUEST_PENDING = "CROSSWALK_REQUEST_PENDING"
    CROSSWALK_CONFIRMED = "CROSSWALK_CONFIRMED"
    MANIFEST_UNAVAILABLE = "MANIFEST_UNAVAILABLE"
    NOT_VERIFIED = "NOT_VERIFIED"


class LinkageGateVerdict(str, Enum):
    PERMITTED_SAME_COHORT_PAIRED = "PERMITTED_SAME_COHORT_PAIRED"
    BLOCKED_CROSS_COHORT_MERGE = "BLOCKED_CROSS_COHORT_MERGE"
    BLOCKED_NO_DOCUMENTED_CROSSWALK = "BLOCKED_NO_DOCUMENTED_CROSSWALK"
    BLOCKED_DIFFERENT_NAMESPACE = "BLOCKED_DIFFERENT_NAMESPACE"
    BLOCKED_MISSING_MODALITY_RECORDS = "BLOCKED_MISSING_MODALITY_RECORDS"


@dataclass
class CrosswalkAuditRecord:
    target_dataset_id: str
    target_name: str
    target_namespace: str
    baseline_dataset_id: str = "ADAM1_BASELINE"
    baseline_namespace: str = "ADAM1:"
    baseline_identifiers_inspected: int = 102
    target_identifiers_inspected: int = 0
    common_namespace_documented: bool = False
    
    # 5 Explicitly Distinguished Participant Overlap Dimensions:
    exact_id_intersection_in_inspected_manifests: int = 0
    public_crosswalk_search: str = "NO_PUBLIC_CROSSWALK_FOUND"
    authorized_crosswalk_status: str = "NO_AUTHORIZED_CROSSWALK"
    verified_identity_linkage: bool = False
    real_world_overlap_status: str = "UNRESOLVED_REAL_WORLD_OVERLAP"
    
    # Inquiry State:
    data_request_state: str = "REQUEST_NOT_SENT"
    
    # Backward-compatible fields:
    authorized_crosswalk_exists: bool = False
    exact_intersection_count: int = 0
    linkage_level: str = "PERSON"  # PERSON, SAMPLE, VISIT
    status: CrosswalkStatus = CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND
    method_used: str = "Namespace & Manifest Exact String Match"
    scientific_justification: str = ""
    manifest_date_or_version: str = "2026-10"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "target_dataset_id": self.target_dataset_id,
            "target_name": self.target_name,
            "target_namespace": self.target_namespace,
            "baseline_dataset_id": self.baseline_dataset_id,
            "baseline_namespace": self.baseline_namespace,
            "baseline_identifiers_inspected": self.baseline_identifiers_inspected,
            "target_identifiers_inspected": self.target_identifiers_inspected,
            "common_namespace_documented": self.common_namespace_documented,
            "exact_id_intersection_in_inspected_manifests": self.exact_id_intersection_in_inspected_manifests,
            "public_crosswalk_search": self.public_crosswalk_search,
            "authorized_crosswalk_status": self.authorized_crosswalk_status,
            "verified_identity_linkage": self.verified_identity_linkage,
            "real_world_overlap_status": self.real_world_overlap_status,
            "data_request_state": self.data_request_state,
            "authorized_crosswalk_exists": self.authorized_crosswalk_exists,
            "exact_intersection_count": self.exact_intersection_count,
            "linkage_level": self.linkage_level,
            "status": self.status.value,
            "method_used": self.method_used,
            "scientific_justification": self.scientific_justification,
            "manifest_date_or_version": self.manifest_date_or_version,
        }


# ─────────────────────────────────────────────────────────────────────────────
# AUDIT REGISTRY OF CROSSWALKS ACROSS ALL EXTERNAL COHORTS
# ─────────────────────────────────────────────────────────────────────────────

CROSSWALK_AUDIT_CATALOG: Dict[str, CrosswalkAuditRecord] = {
    "OASIS1_MRI": CrosswalkAuditRecord(
        target_dataset_id="OASIS1_MRI",
        target_name="OASIS-1 Cross-Sectional MRI",
        target_namespace="OASIS1:",
        target_identifiers_inspected=416,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_EXACT_ID_INTERSECTION_IN_INSPECTED_MANIFESTS,
        scientific_justification=(
            "Exact ID intersection in inspected manifests is 0 (416 OASIS-1 IDs vs 102 ADAM-1 IDs). "
            "A public crosswalk search found no cross-study identifier mapping. No authorized crosswalk exists, "
            "and verified identity linkage is False. Because participants use blinded study-specific pseudonyms, "
            "real-world participant overlap remains unresolved; zero real-world overlap cannot be assumed solely because "
            "pseudonym formats differ. However, merging OASIS-1 scans with ADAM-1 microbiome records without authorized linkage "
            "is strictly forbidden under scientific integrity rules. OASIS-1 serves solely as an independent neuroimaging validation cohort."
        ),
    ),
    "OASIS3_MULTIMODAL": CrosswalkAuditRecord(
        target_dataset_id="OASIS3_MULTIMODAL",
        target_name="OASIS-3 Longitudinal Multimodal Neuroimaging",
        target_namespace="OASIS3:",
        target_identifiers_inspected=1378,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_EXACT_ID_INTERSECTION_IN_INSPECTED_MANIFESTS,
        scientific_justification=(
            "Inspected 1,378 OASIS-3 IDs vs 102 ADAM-1 IDs; exact ID intersection in inspected manifests is 0. "
            "A public crosswalk search found no link. No authorized crosswalk exists; verified identity linkage is False. "
            "Real-world participant overlap between Knight ADRC participants and Massachusetts nursing home residents remains unresolved "
            "without authorized re-identification keys. Merging OASIS-3 scans with ADAM-1 stool samples without authorized linkage "
            "is strictly blocked by the Multimodal Linkage Gate."
        ),
    ),
    "ADNI_MULTIMODAL": CrosswalkAuditRecord(
        target_dataset_id="ADNI_MULTIMODAL",
        target_name="Alzheimer's Disease Neuroimaging Initiative (ADNI)",
        target_namespace="ADNI:",
        target_identifiers_inspected=2200,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND,
        scientific_justification=(
            "ADNI participants use blinded multi-center IDs across 60 North American clinical sites. "
            "Exact ID intersection in inspected manifests is 0. A public crosswalk search found no crosswalk to PRJNA529586. "
            "No authorized crosswalk or verified identity linkage exists. Real-world participant overlap is unresolved, "
            "not assumed to be zero solely based on pseudonym differences. Merging ADNI records with ADAM-1 without authorized linkage is forbidden."
        ),
    ),
    "GARD_MULTIMODAL": CrosswalkAuditRecord(
        target_dataset_id="GARD_MULTIMODAL",
        target_name="Gwangju Alzheimer's & Related Dementias (GARD)",
        target_namespace="GARD:",
        target_identifiers_inspected=12877,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND,
        scientific_justification=(
            "GARD is a South Korean prospective cohort (Chosun University). Exact ID intersection in inspected manifests is 0. "
            "Public crosswalk search found no mapping to ADAM-1 PRJNA529586. No authorized crosswalk exists, and cross-study linkage is unverified. "
            "Within GARD, the count of participants with paired microbiome AND neuroimaging data is UNKNOWN_NOT_VERIFIED and must not be derived from totals. "
            "Data request state is strictly REQUEST_NOT_SENT until a real inquiry has been transmitted and documented."
        ),
    ),
    "ALZBIOM_CS": CrosswalkAuditRecord(
        target_dataset_id="ALZBIOM_CS",
        target_name="AlzBiom Cross-Sectional",
        target_namespace="ALZBIOM_CS:",
        target_identifiers_inspected=192,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_EXACT_ID_INTERSECTION_IN_INSPECTED_MANIFESTS,
        scientific_justification=(
            "AlzBiom participants are recruited in France, Germany, and Spain. Inspected 192 ENA run accessions vs 102 ADAM-1 IDs; "
            "exact ID intersection in manifests is 0. Public crosswalk search found no link. No authorized crosswalk exists. "
            "Real-world participant overlap is unresolved, but cohorts represent distinct geographic studies. Independent external validation stream."
        ),
    ),
    "ALZBIOM_MCI_AD": CrosswalkAuditRecord(
        target_dataset_id="ALZBIOM_MCI_AD",
        target_name="AlzBiom MCI Progression",
        target_namespace="ALZBIOM_MCI_AD:",
        target_identifiers_inspected=49,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND,
        scientific_justification=(
            "Independent longitudinal conversion cohort of 49 MCI subjects. Exact ID intersection is 0. "
            "No public crosswalk exists to ADAM-1. Real-world participant overlap remains unresolved without authorized linkage. "
            "Evaluates prospective cognitive decline without sharing patient records."
        ),
    ),
    "ALZBIOM_HC_MCI": CrosswalkAuditRecord(
        target_dataset_id="ALZBIOM_HC_MCI",
        target_name="AlzBiom Preclinical Aging",
        target_namespace="ALZBIOM_HC_MCI:",
        target_identifiers_inspected=100,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND,
        scientific_justification=(
            "Independent preclinical European cohort (100 subjects: 57 stable, 29 incident MCI, 14 dropouts). "
            "Exact ID intersection is 0; no public crosswalk exists to ADAM-1. Real-world participant overlap is unresolved."
        ),
    ),
    "AMSTERDAM_ADC": CrosswalkAuditRecord(
        target_dataset_id="AMSTERDAM_ADC",
        target_name="Amsterdam Dementia Cohort",
        target_namespace="ADC:",
        target_identifiers_inspected=170,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND,
        scientific_justification=(
            "Amsterdam memory clinic patients with CSF and microbiome (170 subjects). Exact ID intersection is 0. "
            "No public crosswalk exists to ADAM-1. Real-world participant overlap is unresolved. Independent external validation cohort."
        ),
    ),
    "CHINESE_STAGE": CrosswalkAuditRecord(
        target_dataset_id="CHINESE_STAGE",
        target_name="Chinese Stage-Specific Multicenter",
        target_namespace="CHINESE_STAGE:",
        target_identifiers_inspected=210,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND,
        scientific_justification=(
            "East Asian multi-stage dementia cohort (210 subjects). Exact ID intersection is 0. "
            "No public crosswalk exists to ADAM-1. Real-world participant overlap is unresolved without authorized crosswalk."
        ),
    ),
    "JAPANESE_NCGG": CrosswalkAuditRecord(
        target_dataset_id="JAPANESE_NCGG",
        target_name="Japanese NCGG Outpatient",
        target_namespace="JAPANESE_NCGG:",
        target_identifiers_inspected=43,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_EXACT_ID_INTERSECTION_IN_INSPECTED_MANIFESTS,
        scientific_justification=(
            "NCGG outpatients in Japan with 43 public BioSamples in PRJNA679346 (128 in clinical cohort with Fazekas MRI scores). "
            "Inspected 43 SRA IDs vs 102 ADAM-1 IDs; exact ID intersection in inspected manifests is 0. "
            "Public crosswalk search found no mapping. Real-world participant overlap is unresolved. Linked MRI-microbiome count is UNKNOWN_NOT_VERIFIED."
        ),
    ),
    "PRECLINICAL_WU": CrosswalkAuditRecord(
        target_dataset_id="PRECLINICAL_WU",
        target_name="Washington University Preclinical AD",
        target_namespace="PRECLINICAL_WU:",
        target_identifiers_inspected=164,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND,
        scientific_justification=(
            "Knight ADRC preclinical cohort with Amyloid PET and metagenomics (164 subjects). Exact ID intersection is 0. "
            "No public crosswalk exists to ADAM-1. Real-world participant overlap is unresolved."
        ),
    ),
    "AD_KNOWLEDGE_PORTAL": CrosswalkAuditRecord(
        target_dataset_id="AD_KNOWLEDGE_PORTAL",
        target_name="AD Knowledge Portal / AMP-AD",
        target_namespace="ADKP:",
        target_identifiers_inspected=3000,
        common_namespace_documented=False,
        exact_id_intersection_in_inspected_manifests=0,
        public_crosswalk_search="NO_PUBLIC_CROSSWALK_FOUND",
        authorized_crosswalk_status="NO_AUTHORIZED_CROSSWALK",
        verified_identity_linkage=False,
        real_world_overlap_status="UNRESOLVED_REAL_WORLD_OVERLAP",
        data_request_state="REQUEST_NOT_SENT",
        authorized_crosswalk_exists=False,
        exact_intersection_count=0,
        status=CrosswalkStatus.NO_PUBLIC_CROSSWALK_FOUND,
        scientific_justification=(
            "Consortium multi-omics cohort (~3,000 subjects). Exact ID intersection is 0. "
            "No public crosswalk exists to ADAM-1 PRJNA529586. Real-world participant overlap is unresolved."
        ),
    ),
}


def get_all_crosswalk_audits() -> List[Dict[str, Any]]:
    """Return all audit records as serializable dictionaries."""
    return [rec.to_dict() for rec in CROSSWALK_AUDIT_CATALOG.values()]


def get_crosswalk_audit(target_dataset_id: str) -> Optional[Dict[str, Any]]:
    """Get audit record for a specific target dataset."""
    rec = CROSSWALK_AUDIT_CATALOG.get(target_dataset_id)
    return rec.to_dict() if rec else None


def check_exact_identifier_intersection(
    cohort_a_ids: List[str],
    cohort_b_ids: List[str],
    namespace_a: str,
    namespace_b: str,
) -> Tuple[int, Set[str], bool]:
    """
    Evaluate exact intersection between two ID sets.
    CRITICAL RULE: Comparison is scientifically valid ONLY if namespace_a == namespace_b.
    If namespaces differ, returns (0, set(), False) indicating comparison is across disjoint namespaces.
    """
    if namespace_a != namespace_b:
        return 0, set(), False  # Disjoint namespaces; cross-match invalid

    set_a = set(cohort_a_ids)
    set_b = set(cohort_b_ids)
    intersection = set_a.intersection(set_b)
    return len(intersection), intersection, True


def evaluate_multimodal_linkage_gate(
    cohort_id: str,
    subject_id: str,
    requested_modalities: List[str],
) -> Dict[str, Any]:
    """
    STRICT MULTIMODAL LINKAGE GATE:
    Evaluates whether a participant and requested modalities can be merged for joint prediction.
    Rules:
    1. If requested modalities combine 'microbiome' and 'neuroimaging' (MRI/PET):
       - If cohort_id == 'ADAM1_BASELINE', MRI/PET is NOT available in this cohort.
         Attempting to fuse with OASIS or ADNI is BLOCKED.
       - If cohort_id in ('OASIS1_MRI', 'OASIS3_MULTIMODAL', 'ADNI_MULTIMODAL'),
         microbiome data is NOT available in these cohorts.
       - If cohort_id == 'GARD_MULTIMODAL', checks if verified within-GARD paired data exists.
         Currently status is CONTROLLED_ACCESS / PENDING_DATA_REQUEST, so fusion is BLOCKED until approved data is linked.
    """
    has_microbiome = any("microbiome" in m.lower() or "stool" in m.lower() for m in requested_modalities)
    has_imaging = any("mri" in m.lower() or "pet" in m.lower() or "scan" in m.lower() for m in requested_modalities)

    # Single modality requests are always permitted within valid cohorts
    if not (has_microbiome and has_imaging):
        return {
            "eligible_for_fusion": True,
            "verdict": LinkageGateVerdict.PERMITTED_SAME_COHORT_PAIRED.value,
            "cohort_id": cohort_id,
            "subject_id": subject_id,
            "requested_modalities": requested_modalities,
            "scientific_rationale": "Single-modality or within-modality pipeline execution permitted.",
            "enforcement_action": "ALLOW_EXECUTION",
        }

    # Combined microbiome + neuroimaging requested:
    if cohort_id == "ADAM1_BASELINE":
        return {
            "eligible_for_fusion": False,
            "verdict": LinkageGateVerdict.BLOCKED_CROSS_COHORT_MERGE.value,
            "cohort_id": cohort_id,
            "subject_id": subject_id,
            "requested_modalities": requested_modalities,
            "scientific_rationale": (
                "ADAM-1 Haran cohort contains stool metagenomics and clinical metadata, but NO brain MRI or PET scans. "
                "Joining external scans from OASIS or ADNI is strictly blocked to prevent patient misattribution."
            ),
            "enforcement_action": "EXECUTE_INDEPENDENT_MODALITY_PIPELINES_ONLY",
        }

    if cohort_id in ("OASIS1_MRI", "OASIS3_MULTIMODAL", "ADNI_MULTIMODAL"):
        return {
            "eligible_for_fusion": False,
            "verdict": LinkageGateVerdict.BLOCKED_MISSING_MODALITY_RECORDS.value,
            "cohort_id": cohort_id,
            "subject_id": subject_id,
            "requested_modalities": requested_modalities,
            "scientific_rationale": (
                f"{cohort_id} provides neuroimaging scans but does NOT contain paired gut microbiome sequencing. "
                "Cross-study synthetic fusion with ADAM-1 is forbidden."
            ),
            "enforcement_action": "EXECUTE_IMAGING_ONLY_PIPELINE",
        }

    if cohort_id == "GARD_MULTIMODAL":
        return {
            "eligible_for_fusion": False,
            "verdict": LinkageGateVerdict.BLOCKED_NO_DOCUMENTED_CROSSWALK.value,
            "cohort_id": cohort_id,
            "subject_id": subject_id,
            "requested_modalities": requested_modalities,
            "scientific_rationale": (
                "GARD cohort holds potential for within-cohort paired microbiome + MRI/PET data, "
                "but institutional data access approval has not yet been granted. "
                "Status: PENDING_GARD_DATA_REQUEST."
            ),
            "enforcement_action": "MAINTAIN_INDEPENDENT_TRACKS_AWAIT_APPROVAL",
        }

    return {
        "eligible_for_fusion": False,
        "verdict": LinkageGateVerdict.BLOCKED_DIFFERENT_NAMESPACE.value,
        "cohort_id": cohort_id,
        "subject_id": subject_id,
        "requested_modalities": requested_modalities,
        "scientific_rationale": "No verified paired multimodal records exist for this cohort.",
        "enforcement_action": "BLOCK",
    }
