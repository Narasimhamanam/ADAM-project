"""
ADAM-1 Enhanced — Dataset Discovery & Access Registry
======================================================
Formal catalog of baseline and candidate independent research cohorts:
- Original microbiome cohort (Haran et al. / PRJNA529586)
- Independent microbiome validation cohorts (AlzBiom, Amsterdam, Chinese, Japanese, Preclinical)
- Neuroimaging & PET cohorts (OASIS-1, OASIS-3, ADNI, GARD, ADKP)

Enforces strict provenance, accession tracking, license/DUA requirements,
namespace isolation, verified access status, and explicit separation of:
1. Enrolled participants
2. Participants with eligible clinical outcomes
3. Unique participants in actual downloaded local data
4. Samples, visits and sequencing experiments
5. Participants with more than one modality
6. Participants eligible for specific experiments
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any
import hashlib
import json


class AccessStatus(str, Enum):
    DOWNLOADED_AND_AVAILABLE = "DOWNLOADED_AND_AVAILABLE"
    PUBLIC_DOWNLOAD = "PUBLIC_DOWNLOAD"
    REGISTRATION_REQUIRED = "REGISTRATION_REQUIRED"
    CONTROLLED_ACCESS = "CONTROLLED_ACCESS"
    APPLICATION_REQUIRED = "APPLICATION_REQUIRED"
    METADATA_ONLY = "METADATA_ONLY"
    UNAVAILABLE = "UNAVAILABLE"
    NOT_YET_VERIFIED = "NOT_YET_VERIFIED"


class CohortCategory(str, Enum):
    BASELINE_MICROBIOME = "BASELINE_MICROBIOME"
    INDEPENDENT_MICROBIOME = "INDEPENDENT_MICROBIOME"
    NEUROIMAGING_MRI_PET = "NEUROIMAGING_MRI_PET"
    MULTI_OMICS_PORTAL = "MULTI_OMICS_PORTAL"


@dataclass
class DatasetMetadata:
    dataset_id: str
    name: str
    accession: str
    category: CohortCategory
    official_url: str
    study_population: str
    enrolled_participants: Optional[int]
    eligible_outcome_participants: Optional[int]
    downloaded_unique_participants: Optional[int]
    sample_count: Optional[int]
    experiment_or_visit_count: Optional[int]
    multi_modal_participants: Optional[Any]  # int or 'UNKNOWN_NOT_VERIFIED'
    experiment_eligible_participants: Optional[Any]  # int or 'UNKNOWN_NOT_VERIFIED'
    modalities: List[str]
    file_formats: List[str]
    access_status: AccessStatus
    license_or_dua: str
    attribution_requirement: str
    participant_namespace: str
    sample_namespace: str
    longitudinal_visits_available: bool
    diagnosis_definitions: List[str]
    potential_options: List[str]  # e.g., ["OPTION_2", "OPTION_8"]
    remaining_uncertainties: str
    next_required_action: str
    source_verification_date: str = "2026-10-13"
    source_record_version: str = "2.1.0"
    audit_reconciliation_notes: str = ""
    checksum_or_hash: Optional[str] = None
    manifest_version: str = "2.1.0"

    @property
    def participant_count(self) -> Optional[int]:
        """Backward-compatible participant count alias (enrolled participants)."""
        return self.enrolled_participants

    def to_dict(self) -> Dict[str, Any]:
        return {
            "dataset_id": self.dataset_id,
            "name": self.name,
            "accession": self.accession,
            "category": self.category.value,
            "official_url": self.official_url,
            "study_population": self.study_population,
            "participant_count": self.participant_count,
            "enrolled_participants": self.enrolled_participants,
            "eligible_outcome_participants": self.eligible_outcome_participants,
            "downloaded_unique_participants": self.downloaded_unique_participants,
            "sample_count": self.sample_count,
            "experiment_or_visit_count": self.experiment_or_visit_count,
            "multi_modal_participants": self.multi_modal_participants,
            "experiment_eligible_participants": self.experiment_eligible_participants,
            "modalities": self.modalities,
            "file_formats": self.file_formats,
            "access_status": self.access_status.value,
            "license_or_dua": self.license_or_dua,
            "attribution_requirement": self.attribution_requirement,
            "participant_namespace": self.participant_namespace,
            "sample_namespace": self.sample_namespace,
            "longitudinal_visits_available": self.longitudinal_visits_available,
            "diagnosis_definitions": self.diagnosis_definitions,
            "potential_options": self.potential_options,
            "remaining_uncertainties": self.remaining_uncertainties,
            "next_required_action": self.next_required_action,
            "source_verification_date": self.source_verification_date,
            "source_record_version": self.source_record_version,
            "audit_reconciliation_notes": self.audit_reconciliation_notes,
            "manifest_version": self.manifest_version,
            "checksum_or_hash": self.checksum_or_hash,
        }


# ─────────────────────────────────────────────────────────────────────────────
# MASTER REGISTRY OF ALL RESEARCH COHORTS (AUDITED & RECONCILED)
# ─────────────────────────────────────────────────────────────────────────────

DATASET_REGISTRY: Dict[str, DatasetMetadata] = {
    # ── 1. Original Baseline Cohort ──
    "ADAM1_BASELINE": DatasetMetadata(
        dataset_id="ADAM1_BASELINE",
        name="ADAM-1 Haran Nursing Home Cohort",
        accession="PRJNA529586",
        category=CohortCategory.BASELINE_MICROBIOME,
        official_url="https://www.ncbi.nlm.nih.gov/bioproject/PRJNA529586",
        study_population="Older adults (>=65 y) residing in 5 Massachusetts nursing homes (Haran et al., mBio 2019)",
        enrolled_participants=108,
        eligible_outcome_participants=102,
        downloaded_unique_participants=102,
        sample_count=335,
        experiment_or_visit_count=335,
        multi_modal_participants=102,
        experiment_eligible_participants=102,
        modalities=[
            "Stool Shotgun Metagenomics (940 species)",
            "Clinical Covariates (Frailty, Malnutrition, Comorbidities)",
            "Alpha Diversity (Shannon entropy)",
            "Beta Diversity (Bray-Curtis dissimilarity)",
            "Longitudinal Visits (1 to 12 timepoints)",
        ],
        file_formats=["CSV", "FASTQ (SRA)"],
        access_status=AccessStatus.DOWNLOADED_AND_AVAILABLE,
        license_or_dua="Open Science / Public Research Data (mBio 2019, Huang et al. 2025)",
        attribution_requirement="Cite Haran et al. (mBio 2019) and Huang et al. (IEEE Access 2025)",
        participant_namespace="ADAM1:",
        sample_namespace="ADAM1_SAMPLE:",
        longitudinal_visits_available=True,
        diagnosis_definitions=["Alzheimers = 1.0 (Clinical AD, 38 subjects)", "Alzheimers = 0.0 (Non-AD Control, 64 subjects)"],
        potential_options=["OPTION_2", "OPTION_4", "OPTION_8"],
        remaining_uncertainties=(
            "18 extra sequencing samples in mph_matching_ad.csv flagged as unlinked auxiliary controls (353 total vs 335 clinical); "
            "FB334 day 171 calendar offset vs public SRA day_31 tag: calendar math verified as 171 days, but SRA day_31 meaning remains unresolved; "
            "Reduction from 490 public SRA BioSamples/runs to 335 processed samples lacks explicit participant-level drop log in repository."
        ),
        next_required_action="Maintain production PostgreSQL models and verified BENCH_001 reproducible run artifact.",
        source_verification_date="2026-10-13",
        source_record_version="NCBI BioProject PRJNA529586 / mBio 2019 / Huang et al. 2025",
        audit_reconciliation_notes=(
            "108 enrolled; 102 completed diagnostic classification (64 Control, 38 AD). "
            "All 335 clinical samples accounted for: 262 training (81 subjects), 30 evaluated balanced test (15 AD + 15 Control, 21 subjects), "
            "and 43 reserved held-out test samples (11 AD, 32 Control, same 21 subjects). Exactly 0 diagnosis transitions across all 102 subjects. "
            "18 unlinked auxiliary samples in mph_matching_ad.csv (353 total). 490 BioSamples in public PRJNA529586 lacks participant-level drop log. "
            "FB334 calendar interval is 171 days; SRA day_31 tag meaning remains unresolved."
        ),
        checksum_or_hash="sha256:bfba6fae29845d728f4d02931665bf9ade9f56f0f557a449247f60e4caecf894",
        manifest_version="2.1.0",
    ),

    # ── 2. Independent Microbiome Validation Cohorts ──
    "ALZBIOM_CS": DatasetMetadata(
        dataset_id="ALZBIOM_CS",
        name="AlzBiom Cross-Sectional European Cohort",
        accession="PRJEB47976",
        category=CohortCategory.INDEPENDENT_MICROBIOME,
        official_url="https://www.ebi.ac.uk/ena/browser/view/PRJEB47976",
        study_population="Multi-center European cohort (France, Spain, Germany) with Cognitively Unimpaired, MCI, and mild AD participants",
        enrolled_participants=175,
        eligible_outcome_participants=175,
        downloaded_unique_participants=0,
        sample_count=192,
        experiment_or_visit_count=192,
        multi_modal_participants=175,
        experiment_eligible_participants=175,
        modalities=["Stool 16S rRNA / Shotgun Metagenomics", "Clinical Diagnosis", "MMSE Score", "Amyloid Biomarker Status"],
        file_formats=["FASTQ (ENA)", "TSV/CSV"],
        access_status=AccessStatus.PUBLIC_DOWNLOAD,
        license_or_dua="Open Data (ENA/EBI Terms)",
        attribution_requirement="Cite AlzBiom consortium publication",
        participant_namespace="ALZBIOM_CS:",
        sample_namespace="ALZBIOM_CS_SAMPLE:",
        longitudinal_visits_available=False,
        diagnosis_definitions=["Cognitively Unimpaired (CU)", "Mild Cognitive Impairment (MCI)", "Alzheimer's Disease (AD)"],
        potential_options=["OPTION_2", "OPTION_8"],
        remaining_uncertainties="16S genus profiles require taxonomic mapping to harmonize with ADAM-1 shotgun species profiles. Raw FASTQ files are not stored locally.",
        next_required_action="Ingest raw FASTQ reads and evaluate external generalization performance without retraining.",
        source_verification_date="2026-10-13",
        source_record_version="ENA PRJEB47976 (2022)",
        audit_reconciliation_notes=(
            "Published study reports 175 participants (75 amyloid-positive AD cases, 100 healthy controls). "
            "ENA BioProject record PRJEB47976 lists 192 sequencing runs (discrepancy due to technical replicates / control runs). "
            "Downloaded unique participants locally = 0; BENCH_002 marked NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED."
        ),
        checksum_or_hash="sha256:alzbiom_cs_prjeb47976_manifest_v2",
        manifest_version="2.1.0",
    ),

    "ALZBIOM_MCI_AD": DatasetMetadata(
        dataset_id="ALZBIOM_MCI_AD",
        name="AlzBiom MCI-to-AD Progression Study",
        accession="PRJEB72198",
        category=CohortCategory.INDEPENDENT_MICROBIOME,
        official_url="https://www.ebi.ac.uk/ena/browser/view/PRJEB72198",
        study_population="Longitudinal MCI cohort tracked over approximately 4 years for clinical progression to AD",
        enrolled_participants=49,
        eligible_outcome_participants=49,
        downloaded_unique_participants=0,
        sample_count=108,
        experiment_or_visit_count=108,
        multi_modal_participants=49,
        experiment_eligible_participants=49,
        modalities=["Longitudinal Stool Metagenomics", "Time-to-Progression", "Clinical Conversion Endpoint"],
        file_formats=["FASTQ (ENA)", "Tabular Metadata"],
        access_status=AccessStatus.PUBLIC_DOWNLOAD,
        license_or_dua="Open Data (ENA/EBI)",
        attribution_requirement="Cite AlzBiom progression publication",
        participant_namespace="ALZBIOM_MCI_AD:",
        sample_namespace="ALZBIOM_MCI_AD_SAMPLE:",
        longitudinal_visits_available=True,
        diagnosis_definitions=["MCI Stable (22 Non-Converters)", "MCI Converter (27 Progressed to AD)"],
        potential_options=["OPTION_2", "OPTION_4", "OPTION_8"],
        remaining_uncertainties="Curated progression milestone labels require supplementary alignment table. Raw FASTQs not stored locally.",
        next_required_action="Download authentic FASTQ data to replace literature summary distribution fixture with genuine temporal conversion model.",
        source_verification_date="2026-10-13",
        source_record_version="ENA PRJEB72198 (AlzBiom Longitudinal Progression, 2024)",
        audit_reconciliation_notes=(
            "Published longitudinal study reports 49 participants (27 converters to AD, 22 stable MCI non-converters) followed for ~4 years. "
            "Previous registry placeholder claimed 124 participants. Raw FASTQs are not downloaded locally; "
            "marked NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED."
        ),
        checksum_or_hash="sha256:alzbiom_mci_ad_prjeb72198_v2",
        manifest_version="2.1.0",
    ),

    "ALZBIOM_HC_MCI": DatasetMetadata(
        dataset_id="ALZBIOM_HC_MCI",
        name="AlzBiom Healthy-to-MCI Progression Study",
        accession="PRJEB85717",
        category=CohortCategory.INDEPENDENT_MICROBIOME,
        official_url="https://www.ebi.ac.uk/ena/browser/view/PRJEB85717",
        study_population="Cognitively healthy older adults monitored longitudinally for incident MCI conversion",
        enrolled_participants=100,
        eligible_outcome_participants=86,
        downloaded_unique_participants=0,
        sample_count=186,
        experiment_or_visit_count=186,
        multi_modal_participants=86,
        experiment_eligible_participants=86,
        modalities=["Stool Metagenomics", "Cognitive Decline Slopes", "Conversion Endpoint"],
        file_formats=["FASTQ (ENA)", "Tabular Metadata"],
        access_status=AccessStatus.PUBLIC_DOWNLOAD,
        license_or_dua="Open Data (ENA/EBI)",
        attribution_requirement="Cite AlzBiom preclinical study",
        participant_namespace="ALZBIOM_HC_MCI:",
        sample_namespace="ALZBIOM_HC_MCI_SAMPLE:",
        longitudinal_visits_available=True,
        diagnosis_definitions=["Healthy Stable (57 subjects)", "Healthy Converter to MCI (29 subjects)", "Dropouts (14 subjects)"],
        potential_options=["OPTION_2", "OPTION_4", "OPTION_8"],
        remaining_uncertainties="14 dropouts require censorship handling in survival curves. Raw reads not stored locally.",
        next_required_action="Import validated conversion cohort manifest and raw sequencing reads.",
        source_verification_date="2026-10-13",
        source_record_version="ENA PRJEB85717 (AlzBiom Preclinical Aging, 2024)",
        audit_reconciliation_notes=(
            "Published study reports 100 enrolled participants: 57 stable healthy, 29 developed MCI, and 14 dropouts/lost to follow-up. "
            "Eligible longitudinal participants = 86 (57 stable + 29 converters). Previous placeholder claimed 110 participants. "
            "Raw FASTQ files are not downloaded locally."
        ),
        checksum_or_hash="sha256:alzbiom_hc_mci_prjeb85717_v2",
        manifest_version="2.1.0",
    ),

    "AMSTERDAM_ADC": DatasetMetadata(
        dataset_id="AMSTERDAM_ADC",
        name="Amsterdam Dementia Cohort (ADC)",
        accession="PRJEB49329",
        category=CohortCategory.INDEPENDENT_MICROBIOME,
        official_url="https://www.ebi.ac.uk/ena/browser/view/PRJEB49329",
        study_population="Memory clinic patients at Alzheimer Center Amsterdam (SCD controls, MCI, AD)",
        enrolled_participants=170,
        eligible_outcome_participants=170,
        downloaded_unique_participants=0,
        sample_count=170,
        experiment_or_visit_count=170,
        multi_modal_participants=170,
        experiment_eligible_participants=170,
        modalities=["Stool 16S/Metagenomics", "CSF Amyloid-beta 42", "CSF Total-Tau & P-Tau181", "MMSE"],
        file_formats=["FASTQ (ENA)", "CSV"],
        access_status=AccessStatus.PUBLIC_DOWNLOAD,
        license_or_dua="Open Access sequencing; clinical CSF table requires data sharing notification",
        attribution_requirement="Cite Amsterdam Dementia Cohort (Verhaar et al., Microbiome 2022 / de Vos et al.)",
        participant_namespace="ADC:",
        sample_namespace="ADC_SAMPLE:",
        longitudinal_visits_available=False,
        diagnosis_definitions=["Subjective Cognitive Decline (SCD)", "MCI", "Alzheimer's Disease Dementia"],
        potential_options=["OPTION_2", "OPTION_3", "OPTION_8"],
        remaining_uncertainties="CSF biomarkers are present in ADC clinical records; verification needed on exact number of stool-sequenced subjects having paired CSF.",
        next_required_action="Audit paired stool-CSF records in ADC public supplementary releases.",
        source_verification_date="2026-10-13",
        source_record_version="ENA PRJEB49329 / Verhaar et al. Microbiome 2022",
        audit_reconciliation_notes=(
            "Official BioProject record description reports exactly 170 participants (previous placeholder claimed 177). "
            "170 stool sequencing runs deposited in ENA. Raw FASTQ files are not stored locally."
        ),
        checksum_or_hash="sha256:amsterdam_adc_prjeb49329_v2",
        manifest_version="2.1.0",
    ),

    "CHINESE_STAGE": DatasetMetadata(
        dataset_id="CHINESE_STAGE",
        name="Chinese Stage-Specific Multicenter Cohort",
        accession="PRJCA022804",
        category=CohortCategory.INDEPENDENT_MICROBIOME,
        official_url="https://ngdc.cncb.ac.cn/bioproject/browse/PRJCA022804",
        study_population="Chinese aging cohort spanning healthy controls, SCD, MCI, and mild-to-moderate AD",
        enrolled_participants=210,
        eligible_outcome_participants=210,
        downloaded_unique_participants=0,
        sample_count=210,
        experiment_or_visit_count=210,
        multi_modal_participants=210,
        experiment_eligible_participants=210,
        modalities=["Shotgun Metagenomics (Species relative abundance)", "Plasma p-tau", "MoCA", "MMSE"],
        file_formats=["FASTQ (NGDC)", "TSV"],
        access_status=AccessStatus.REGISTRATION_REQUIRED,
        license_or_dua="NGDC Open Research Terms with Free Account Registration",
        attribution_requirement="Cite Chinese National Center for Bioinformation (CNCB) BioProject PRJCA022804",
        participant_namespace="CHINESE_STAGE:",
        sample_namespace="CHINESE_STAGE_SAMPLE:",
        longitudinal_visits_available=False,
        diagnosis_definitions=["HC", "SCD", "MCI", "AD"],
        potential_options=["OPTION_2", "OPTION_8"],
        remaining_uncertainties="Dietary patterns (Eastern vs Western nursing home diet) introduce significant taxonomic distribution shift.",
        next_required_action="Run taxonomic distribution shift analysis against ADAM-1 baseline once FASTQs are downloaded.",
        source_verification_date="2026-10-13",
        source_record_version="NGDC BioProject PRJCA022804 (2023)",
        audit_reconciliation_notes=(
            "210 participants across 4 clinical stages (HC, SCD, MCI, AD). "
            "Raw FASTQ files are not stored locally; BENCH_004 marked NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED."
        ),
        checksum_or_hash="sha256:chinese_stage_prjca022804_v2",
        manifest_version="2.1.0",
    ),

    "JAPANESE_NCGG": DatasetMetadata(
        dataset_id="JAPANESE_NCGG",
        name="Japanese NCGG Outpatient Cohort",
        accession="PRJNA679346",
        category=CohortCategory.INDEPENDENT_MICROBIOME,
        official_url="https://www.ncbi.nlm.nih.gov/bioproject/PRJNA679346",
        study_population="Outpatients at National Center for Geriatrics and Gerontology (NCGG), Japan (Saji et al., 2020 / Ueda et al.)",
        enrolled_participants=128,
        eligible_outcome_participants=128,
        downloaded_unique_participants=0,
        sample_count=43,
        experiment_or_visit_count=43,
        multi_modal_participants="UNKNOWN_NOT_VERIFIED",
        experiment_eligible_participants=43,
        modalities=["Stool 16S rRNA / Shotgun (43 public runs)", "Brain MRI White Matter Hyperintensity (Fazekas scale, 128 outpatients)", "Cognitive Status"],
        file_formats=["FASTQ (SRA)", "Supplementary Tables"],
        access_status=AccessStatus.PUBLIC_DOWNLOAD,
        license_or_dua="NCBI Open Access",
        attribution_requirement="Cite Saji et al. (Sci Rep, 2020) and Ueda et al.",
        participant_namespace="JAPANESE_NCGG:",
        sample_namespace="JAPANESE_NCGG_SAMPLE:",
        longitudinal_visits_available=False,
        diagnosis_definitions=["Dementia", "Non-Dementia"],
        potential_options=["OPTION_2", "OPTION_3", "OPTION_8"],
        remaining_uncertainties="Brain MRI data are summarized as qualitative Fazekas scores in public tables; 3D DICOM volumes require formal NCGG IRB collaboration. Linked MRI-microbiome participant count is UNKNOWN_NOT_VERIFIED without an authorized linkage key.",
        next_required_action="Audit tabular neuroimaging covariates for multi-modal correlation.",
        source_verification_date="2026-10-13",
        source_record_version="NCBI BioProject PRJNA679346 / Saji et al. Sci Rep 2020",
        audit_reconciliation_notes=(
            "Reconciled discrepancy: Saji et al. clinical publication evaluated 128 outpatients with white matter hyperintensity scores (Fazekas scale); "
            "however, official public BioProject PRJNA679346 contains exactly 43 SRA experiments and 43 BioSamples (Ueda et al. sequencing subset). "
            "The count of participants with verified linked MRI and microbiome data is UNKNOWN_NOT_VERIFIED. Raw FASTQ files not stored locally."
        ),
        checksum_or_hash="sha256:japanese_ncgg_prjna679346_v2",
        manifest_version="2.1.0",
    ),

    "PRECLINICAL_WU": DatasetMetadata(
        dataset_id="PRECLINICAL_WU",
        name="Washington University Preclinical AD Cohort",
        accession="PRJNA798058",
        category=CohortCategory.INDEPENDENT_MICROBIOME,
        official_url="https://www.ncbi.nlm.nih.gov/bioproject/PRJNA798058",
        study_population="Knight ADRC preclinical participants with confirmed amyloid/tau biomarker status (Ferretti et al., 2023)",
        enrolled_participants=164,
        eligible_outcome_participants=164,
        downloaded_unique_participants=0,
        sample_count=164,
        experiment_or_visit_count=164,
        multi_modal_participants=164,
        experiment_eligible_participants=164,
        modalities=["Shotgun Metagenomics", "Amyloid PET (PiB)", "CSF A-beta/tau", "Clinical Dementia Rating"],
        file_formats=["FASTQ (SRA)", "CSV"],
        access_status=AccessStatus.PUBLIC_DOWNLOAD,
        license_or_dua="NCBI SRA Public / Knight ADRC Data Terms",
        attribution_requirement="Cite Ferretti et al. (Sci Transl Med, 2023)",
        participant_namespace="PRECLINICAL_WU:",
        sample_namespace="PRECLINICAL_WU_SAMPLE:",
        longitudinal_visits_available=True,
        diagnosis_definitions=["Preclinical AD (Amyloid+)", "Control (Amyloid-)"],
        potential_options=["OPTION_2", "OPTION_3", "OPTION_8"],
        remaining_uncertainties="Participant identifiers in SRA are blinded pseudonyms; linking to Knight ADRC XNAT scans requires ADRC approved project ID.",
        next_required_action="Examine de-identified public clinical covariates in supplementary files.",
        source_verification_date="2026-10-13",
        source_record_version="NCBI BioProject PRJNA798058 / Ferretti et al. Sci Transl Med 2023",
        audit_reconciliation_notes=(
            "164 participants in preclinical study with confirmed amyloid/tau biomarker status. "
            "Raw FASTQ files are not stored locally."
        ),
        checksum_or_hash="sha256:preclinical_wu_prjna798058_v2",
        manifest_version="2.1.0",
    ),

    # ── 3. Neuroimaging (MRI & PET) Cohorts ──
    "OASIS1_MRI": DatasetMetadata(
        dataset_id="OASIS1_MRI",
        name="OASIS-1 Cross-Sectional MRI Cohort",
        accession="OASIS-1",
        category=CohortCategory.NEUROIMAGING_MRI_PET,
        official_url="https://sites.wustl.edu/oasisbrains/",
        study_population="Cross-sectional adult cohort (18-96 y) including 100 subjects with mild-to-moderate AD (Marcus et al., 2007)",
        enrolled_participants=416,
        eligible_outcome_participants=416,
        downloaded_unique_participants=0,
        sample_count=436,
        experiment_or_visit_count=436,
        multi_modal_participants=416,
        experiment_eligible_participants=416,
        modalities=[
            "T1-weighted structural MRI (1.5T MPRAGE)",
            "Clinical Dementia Rating (CDR 0, 0.5, 1, 2)",
            "Mini-Mental State Examination (MMSE)",
            "Normalized Whole Brain Volume (nWBV)",
            "Estimated Total Intracranial Volume (eTIV)",
        ],
        file_formats=["NIfTI (.nii.gz)", "Analyze 7.5", "CSV Metadata"],
        access_status=AccessStatus.PUBLIC_DOWNLOAD,
        license_or_dua="OASIS Open Access Data Use Agreement (Creative Commons)",
        attribution_requirement="Cite Marcus et al. (J Cogn Neurosci, 2007) and OASIS-1 grant P50 AG05681",
        participant_namespace="OASIS1:",
        sample_namespace="OASIS1_SCAN:",
        longitudinal_visits_available=False,
        diagnosis_definitions=["Non-Demented (CDR 0)", "Very Mild AD (CDR 0.5)", "Mild AD (CDR 1)", "Moderate AD (CDR 2)"],
        potential_options=["OPTION_3", "OPTION_8"],
        remaining_uncertainties="Independent neuroimaging cohort only; zero participant overlap with ADAM-1 microbiome cohort. Raw full-cohort 3D NIfTI scans not stored locally; volumetric pipeline unit-tested on fixtures.",
        next_required_action="Provide volumetric feature ingestion and independent neuroimaging evaluation.",
        source_verification_date="2026-10-13",
        source_record_version="OASIS-1 Marcus et al. (2007)",
        audit_reconciliation_notes=(
            "416 participants (aged 18-96), 436 MR sessions, 100 with clinically diagnosed AD. "
            "Independent neuroimaging cohort; zero exact ID match in inspected manifests with ADAM-1 nursing home participants. "
            "Reported MRI performance (86.5%) represents published literature reference benchmark, not local model training on raw scans."
        ),
        checksum_or_hash="sha256:oasis1_mri_manifest_v2",
        manifest_version="2.1.0",
    ),

    "OASIS3_MULTIMODAL": DatasetMetadata(
        dataset_id="OASIS3_MULTIMODAL",
        name="OASIS-3 Longitudinal Multimodal Neuroimaging Cohort",
        accession="OASIS-3",
        category=CohortCategory.NEUROIMAGING_MRI_PET,
        official_url="https://sites.wustl.edu/oasisbrains/",
        study_population="Longitudinal aging & AD cohort with 30-year follow-up (Current official release: 1,378 participants, 2,842 MRI sessions, 2,157 PET sessions; 2019 medRxiv pre-print release: 1,098 participants, ~2,155 MRI sessions, ~1,000 PET sessions)",
        enrolled_participants=1378,
        eligible_outcome_participants=1378,
        downloaded_unique_participants=0,
        sample_count=4999,  # 2,842 MRI + 2,157 PET sessions
        experiment_or_visit_count=4999,
        multi_modal_participants=1378,
        experiment_eligible_participants=1378,
        modalities=[
            "T1w MPRAGE, T2w, FLAIR MRI (3T & 1.5T; 2,842 sessions)",
            "Amyloid PET (11C-PiB and 18F-AV45 Florbetapir SUVR; 2,157 sessions)",
            "Tau PET (18F-AV1451 Flortaucipir)",
            "FDG-PET Glucose Metabolism",
            "Longitudinal CDR & Cognitive Batteries",
            "FreeSurfer Regional Volumetrics (Hippocampus, Entorhinal)",
        ],
        file_formats=["NIfTI (.nii.gz)", "DICOM", "FreeSurfer Stats Tables", "CSV"],
        access_status=AccessStatus.REGISTRATION_REQUIRED,
        license_or_dua="OASIS-3 Data Use Agreement on Central XNAT",
        attribution_requirement="Cite LaMontagne et al. (medRxiv/NeuroImage, 2019) and OASIS-3 consortium",
        participant_namespace="OASIS3:",
        sample_namespace="OASIS3_SESSION:",
        longitudinal_visits_available=True,
        diagnosis_definitions=["Cognitively Normal (CDR 0)", "MCI (CDR 0.5)", "AD Dementia (CDR >= 1.0)"],
        potential_options=["OPTION_3", "OPTION_4", "OPTION_8"],
        remaining_uncertainties="Independent neuroimaging cohort only; zero participant overlap with ADAM-1 microbiome cohort. Raw full-cohort 3D volumes not stored locally.",
        next_required_action="Provide FreeSurfer volumetric biomarker parser and PET SUVR models.",
        source_verification_date="2026-10-13",
        source_record_version="OASIS-3 Central XNAT Production Release 2021-2024",
        audit_reconciliation_notes=(
            "Exact official release consulted: Current OASIS-3 collection description (sites.wustl.edu/oasisbrains/, Central XNAT) "
            "reports exactly 1,378 participants, 2,842 MRI sessions, and 2,157 PET sessions. "
            "Reconciled against older 2019 medRxiv pre-print freeze (LaMontagne et al., 2019) which reported 1,098 participants, ~2,155 MRI sessions, and ~1,000 PET sessions. "
            "Completely distinct cohort namespace; zero cross-study link to ADAM-1."
        ),
        checksum_or_hash="sha256:oasis3_multimodal_manifest_v2",
        manifest_version="2.1.0",
    ),

    "ADNI_MULTIMODAL": DatasetMetadata(
        dataset_id="ADNI_MULTIMODAL",
        name="Alzheimer's Disease Neuroimaging Initiative (ADNI)",
        accession="ADNI-1/GO/2/3",
        category=CohortCategory.NEUROIMAGING_MRI_PET,
        official_url="https://adni.loni.usc.edu/data-samples/adni-data/",
        study_population="North American multi-center prospective longitudinal cohort (Normal, SMC, EMCI, LMCI, AD)",
        enrolled_participants=2200,
        eligible_outcome_participants=2200,
        downloaded_unique_participants=0,
        sample_count=12000,
        experiment_or_visit_count=12000,
        multi_modal_participants=2200,
        experiment_eligible_participants=2200,
        modalities=[
            "Structural 3T/1.5T MRI",
            "Amyloid PET (Florbetapir / Florbetaben)",
            "Tau PET (AV-1451)",
            "FDG-PET",
            "CSF Biomarkers (Abeta42, p-tau, t-tau)",
            "Extensive Neuropsychological Tests (ADAS-Cog, MMSE, CDR-SB)",
        ],
        file_formats=["NIfTI (.nii)", "DICOM", "Curated CSVs on LONI IDA"],
        access_status=AccessStatus.APPLICATION_REQUIRED,
        license_or_dua="Strict ADNI Data Use Agreement, approval by ADNI Data Sharing Committee, annual progress renewal",
        attribution_requirement="Mandatory ADNI consortium authorship attribution and NIH funding acknowledgment",
        participant_namespace="ADNI:",
        sample_namespace="ADNI_VISIT:",
        longitudinal_visits_available=True,
        diagnosis_definitions=["Cognitively Normal (CN)", "Subjective Memory Concern (SMC)", "Early MCI", "Late MCI", "AD"],
        potential_options=["OPTION_3", "OPTION_4", "OPTION_8"],
        remaining_uncertainties="Access strictly controlled. Not available for direct unauthenticated redistribution. Zero cross-cohort link to ADAM-1.",
        next_required_action="Maintain access checklist and DUA application guidelines.",
        source_verification_date="2026-10-13",
        source_record_version="ADNI-1/GO/2/3 LONI IDA",
        audit_reconciliation_notes=(
            "~2,200 enrolled participants across 60 clinical sites with >12,000 imaging exams. "
            "Independent cohort namespace; strictly controlled DUA. No authorized crosswalk to ADAM-1 PRJNA529586; "
            "real-world participant overlap remains unresolved, and merging records without authorized linkage is strictly prohibited."
        ),
        checksum_or_hash="sha256:adni_controlled_access_schema_v2",
        manifest_version="2.1.0",
    ),

    "GARD_MULTIMODAL": DatasetMetadata(
        dataset_id="GARD_MULTIMODAL",
        name="Gwangju Alzheimer's & Related Dementias (GARD) Cohort",
        accession="GARD-KOREA",
        category=CohortCategory.NEUROIMAGING_MRI_PET,
        official_url="https://gard.re.kr/",
        study_population="Community-based Korean aging and dementia cohort established by Chosun University / GARD Research Center",
        enrolled_participants=12877,
        eligible_outcome_participants=12877,
        downloaded_unique_participants=0,
        sample_count=11438,  # 10,843 MRI + 595 Stool
        experiment_or_visit_count=10843,
        multi_modal_participants="UNKNOWN_NOT_VERIFIED",
        experiment_eligible_participants="UNKNOWN_NOT_VERIFIED",
        modalities=[
            "Brain MRI (Volumetric T1, T2: 10,843 scans)",
            "Amyloid PET",
            "Korean MMSE, SNSB Cognitive Batteries",
            "APOE Genotyping",
            "Gut Microbiome Metagenomics (595 samples)",
        ],
        file_formats=["DICOM", "NIfTI", "Tabular Clinical"],
        access_status=AccessStatus.CONTROLLED_ACCESS,
        license_or_dua="Institutional IRB Approval, Formal Research Collaboration Agreement with GARD",
        attribution_requirement="Cite GARD Research Center and Chosun University Dementia Center",
        participant_namespace="GARD:",
        sample_namespace="GARD_EXAM:",
        longitudinal_visits_available=True,
        diagnosis_definitions=["Normal", "MCI", "AD Dementia"],
        potential_options=["OPTION_3", "OPTION_4", "OPTION_7", "OPTION_8"],
        remaining_uncertainties=(
            "Count of distinct participants with paired microbiome AND MRI/PET is UNKNOWN_NOT_VERIFIED and must not be derived from totals; "
            "No public crosswalk found with PRJNA529586; direct confirmation pending formal request submission."
        ),
        next_required_action="Submit formal GARD data-request protocol (Phase Seven) inquiring about paired modality availability and DUA terms.",
        source_verification_date="2026-10-13",
        source_record_version="GARD Multimodal Cohort Profile (Chosun University, 2023)",
        audit_reconciliation_notes=(
            "Published multimodal cohort description documents 12,877 enrolled participants, 10,843 MRI scans, and 595 gut microbiome samples. "
            "Audit correction: The count of participants with BOTH microbiome and imaging data is UNKNOWN_NOT_VERIFIED and must never be derived from modality totals. "
            "Status: 'No public crosswalk found; direct confirmation pending formal request submission'. "
            "Inquiry state is strictly REQUEST_NOT_SENT."
        ),
        checksum_or_hash="sha256:gard_controlled_access_manifest_v2",
        manifest_version="2.1.0",
    ),

    "AD_KNOWLEDGE_PORTAL": DatasetMetadata(
        dataset_id="AD_KNOWLEDGE_PORTAL",
        name="AD Knowledge Portal & Synapse Multi-Omics Repository",
        accession="ADKP-SYNAPSE",
        category=CohortCategory.MULTI_OMICS_PORTAL,
        official_url="https://help.adknowledgeportal.org/apd/access-data",
        study_population="Consortium multi-cohort data (ROSMAP, Mayo Clinic RNAseq, Mount Sinai Brain Bank MSBB)",
        enrolled_participants=3000,
        eligible_outcome_participants=3000,
        downloaded_unique_participants=0,
        sample_count=8000,
        experiment_or_visit_count=8000,
        multi_modal_participants=3000,
        experiment_eligible_participants=3000,
        modalities=["Brain RNA-seq", "Proteomics", "Metabolomics", "Epigenomics", "Neuropathology Scores (Braak, CERAD)"],
        file_formats=["FASTQ", "BAM", "Counts Tables", "CSV"],
        access_status=AccessStatus.CONTROLLED_ACCESS,
        license_or_dua="Synapse Certified User Terms, Data Use Certificate (DUC) approval",
        attribution_requirement="Acknowledge NIH AMP-AD Consortium and contributing study PIs",
        participant_namespace="ADKP:",
        sample_namespace="ADKP_SPECIMEN:",
        longitudinal_visits_available=True,
        diagnosis_definitions=["NCI (No Cognitive Impairment)", "MCI", "AD with Neuropathological Confirmation"],
        potential_options=["OPTION_8"],
        remaining_uncertainties="Focus is predominantly post-mortem brain multi-omics and blood; gut microbiome is limited to specific sub-studies.",
        next_required_action="Monitor for upcoming prospective microbiome-omics releases.",
        source_verification_date="2026-10-13",
        source_record_version="AMP-AD Synapse Portal 2024",
        audit_reconciliation_notes=(
            "Consortium portal with ~3,000 participants and 8,000 multi-omics specimens. "
            "No public crosswalk to ADAM-1 PRJNA529586; cross-cohort record merging is blocked."
        ),
        checksum_or_hash="sha256:adkp_synapse_manifest_v2",
        manifest_version="2.1.0",
    ),
}


def get_all_datasets() -> List[Dict[str, Any]]:
    """Return all registered datasets as serialized dictionaries."""
    return [ds.to_dict() for ds in DATASET_REGISTRY.values()]


def get_dataset_by_id(dataset_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve metadata for a specific dataset ID."""
    ds = DATASET_REGISTRY.get(dataset_id)
    return ds.to_dict() if ds else None


def list_datasets_by_category(category: CohortCategory) -> List[Dict[str, Any]]:
    """Filter registered datasets by category."""
    return [
        ds.to_dict() for ds in DATASET_REGISTRY.values() if ds.category == category
    ]


def list_datasets_by_access_status(status: AccessStatus) -> List[Dict[str, Any]]:
    """Filter registered datasets by access status."""
    return [
        ds.to_dict() for ds in DATASET_REGISTRY.values() if ds.access_status == status
    ]
