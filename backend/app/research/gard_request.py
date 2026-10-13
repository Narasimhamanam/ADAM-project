"""
ADAM-1 Enhanced — GARD Linked-Data Request Workflow (Phase Seven)
==================================================================
Manages the formal research inquiry to the Gwangju Alzheimer's &
Related Dementias (GARD) Research Center (Chosun University, Korea)
regarding paired individual-level microbiome and neuroimaging data.

Enforces honest state management and generates professional, scientifically
rigorous data-request inquiries covering all 8 specific audit requirements:
1. Unique participants with microbiome data (published total: 595).
2. Participants with MRI and/or PET data (published total: 10,843).
3. Participants with both microbiome and imaging data.
4. Participants with clinical/cognitive outcomes linked to those same participants.
5. Participants with compatible visit dates or time offsets.
6. The internal participant, sample and visit keys.
7. Whether any authorized cross-study crosswalk with PRJNA529586 exists.
8. The applicable data-use agreement and access restrictions.

Current state: REQUEST_NOT_SENT. No emails sent or answered.
"""
from __future__ import annotations

from enum import Enum
from typing import Dict, Any, List
from datetime import datetime, timezone


class GardRequestStatus(str, Enum):
    REQUEST_NOT_SENT = "REQUEST_NOT_SENT"
    REQUEST_SENT = "REQUEST_SENT"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    DENIED = "DENIED"
    NOT_NEEDED = "NOT_NEEDED"


GARD_FEASIBILITY_CHECKLIST: List[Dict[str, Any]] = [
    {
        "id": "Q1_MICROBIOME_PARTICIPANT_COUNT",
        "question": "What is the exact count of unique participants with gut microbiome data (published total: 595 metagenomic samples)?",
        "status": "UNRESOLVED / PENDING INQUIRY",
        "published_figure": "595 gut microbiome metagenomic samples across enrolled cohort",
        "scientific_importance": "Establishes microbiome study population denominator.",
    },
    {
        "id": "Q2_NEUROIMAGING_PARTICIPANT_COUNT",
        "question": "What is the exact count of unique participants with brain MRI and/or PET scans (published total: 10,843 MRI scans)?",
        "status": "UNRESOLVED / PENDING INQUIRY",
        "published_figure": "10,843 brain MRI scans across 12,877 enrolled participants",
        "scientific_importance": "Establishes neuroimaging cohort denominator and modality coverage.",
    },
    {
        "id": "Q3_PAIRED_MICROBIOME_IMAGING_COUNT",
        "question": "How many distinct participants have BOTH gut microbiome profiles and brain MRI and/or PET data?",
        "status": "UNKNOWN_NOT_VERIFIED",
        "published_figure": "Unknown / not verified in public metadata; must never be derived from modality totals",
        "scientific_importance": "Critical: Paired participant count is UNKNOWN_NOT_VERIFIED until authentic linkage keys are disclosed.",
    },
    {
        "id": "Q4_CLINICAL_COGNITIVE_OUTCOMES_LINKED",
        "question": "How many of the paired participants have confirmed clinical diagnoses and cognitive batteries (K-MMSE, SNSB, CDR) linked to those exact same participants?",
        "status": "LIKELY AVAILABLE IN CORE REGISTRY / PENDING CONFIRMATION",
        "published_figure": "Standard clinical diagnosis protocol applied across GARD cohort",
        "scientific_importance": "Required for supervised learning ground truth and cognitive trajectory validation.",
    },
    {
        "id": "Q5_VISIT_DATE_COMPATIBILITY",
        "question": "How many paired participants have compatible visit dates or time offsets between stool sampling and neuroimaging (e.g., within 30, 90, or 180 days)?",
        "status": "UNRESOLVED / PENDING INQUIRY",
        "published_figure": "Unreported in public summaries",
        "scientific_importance": "Microbiome composition fluctuates dynamically; scans collected >6-12 months apart cannot represent concurrent biological states.",
    },
    {
        "id": "Q6_INTERNAL_KEYS",
        "question": "What internal participant, sample, and visit keys link microbiome files to neuroimaging DICOM/NIfTI series?",
        "status": "REQUIRES INTERNAL DATA DICTIONARY",
        "published_figure": "Governed by institutional data dictionary",
        "scientific_importance": "Guarantees deterministic, leakage-safe joins without heuristic or fuzzy matching.",
    },
    {
        "id": "Q7_CROSS_STUDY_CROSSWALK_PRJNA529586",
        "question": "Does any authorized cross-study crosswalk exist between GARD participants and the ADAM-1 cohort (NCBI PRJNA529586 / Haran et al.)?",
        "status": "NO PUBLIC CROSSWALK FOUND; DIRECT CONFIRMATION PENDING",
        "published_figure": "GARD is a South Korean aging registry; Haran et al. is a US nursing home study; no public crosswalk documented",
        "scientific_importance": "Confirms that without an authorized crosswalk, cross-cohort participant linkage cannot be established, and any real-world participant overlap remains unresolved; records cannot be merged, and GARD must be analyzed strictly as an independent within-cohort paired dataset.",
    },
    {
        "id": "Q8_DUA_AND_ACCESS_RESTRICTIONS",
        "question": "What applicable Data Use Agreement (DUA), institutional IRB approvals, and data export constraints apply?",
        "status": "FORMAL DUA & INSTITUTIONAL REVIEW REQUIRED",
        "published_figure": "Requires formal institutional research agreement with Chosun University / GARD Research Center",
        "scientific_importance": "Legal and ethical compliance for biomedical research data access.",
    },
]


def generate_gard_formal_inquiry_email(
    investigator_name: str = "ADAM-1 Enhanced Scientific Research Team",
    institution: str = "Biomedical AI Research Consortium",
    target_email: str = "gard_data_access@gard.re.kr",
) -> str:
    """Generate formal scientific data-request inquiry email to GARD Research Center covering all 8 requirements."""
    return f"""Subject: Formal Research Inquiry: Paired Microbiome and Neuroimaging Data Availability (GARD Cohort)

To: Data Access Committee & Leadership Team
Gwangju Alzheimer's & Related Dementias (GARD) Research Center
Chosun University, Gwangju, Republic of Korea
Email: {target_email}

From:
{investigator_name}
{institution}

Dear Members of the GARD Data Access and Scientific Committee,

We are conducting an independent reproducibility and multimodal computational study on Alzheimer's disease (AD) biomarkers, focusing on the interplay between the gut microbiome, neuroimaging (structural MRI / Amyloid PET), and clinical progression ("ADAM-1 Enhanced Platform").

In reviewing the published cohort profile of the GARD Research Center (documenting 12,877 enrolled participants, 10,843 brain MRI scans, and 595 gut microbiome samples), we are writing to inquire about the feasibility of accessing de-identified, individual-level multimodal data under an authorized Data Use Agreement (DUA).

Specifically, we seek clarification on the following eight scientific and governance requirements:

1. Microbiome Cohort Denominator:
   What is the exact count of unique participants with gut microbiome sequencing data (among the published 595 gut microbiome samples)?
2. Neuroimaging Cohort Denominator:
   What is the exact count of unique participants with brain MRI and/or PET data (among the published 10,843 MRI scans)?
3. Paired Multimodal Participant Count:
   How many distinct participants have BOTH gut microbiome profiles and brain MRI and/or PET scans?
4. Linked Clinical & Cognitive Outcomes:
   How many of these paired participants have clinical diagnostic classifications (CN, MCI, AD) and cognitive battery scores (e.g., K-MMSE, SNSB, CDR) linked to those exact same individuals?
5. Acquisition Timing Compatibility:
   How many paired participants have compatible visit dates or time offsets between stool specimen collection and neuroimaging (e.g., within 30, 90, or 180 days)?
6. Data Linkage Keys:
   What internal participant, sample, and visit keys link stool metagenomic profiles to neuroimaging DICOM/NIfTI series in the GARD data schema?
7. Cross-Study Crosswalk Confirmation:
   We note that no public crosswalk exists between GARD participants and the US nursing home cohort (NCBI PRJNA529586 / Haran et al.). Please confirm whether any authorized cross-study crosswalk or patient overlap exists.
8. Data Use Agreement & Access Restrictions:
   What specific Data Use Agreement (DUA), institutional IRB approvals, and access restrictions (e.g., secure research enclave vs exportable tabular features) apply to international research collaborators?

Current Inquiry Status:
This inquiry is documented in our platform registry as a draft proposal. No formal submission has been transmitted, and direct confirmation remains pending until official correspondence is initiated.

We would be grateful for guidance on your formal application protocol.

Sincerely,

{investigator_name}
{institution}
"""


# Mutable runtime state for GARD inquiry (persisted in DB/memory)
_GARD_REQUEST_STATE: Dict[str, Any] = {
    "current_status": GardRequestStatus.REQUEST_NOT_SENT.value,
    "inquiry_sent_timestamp": None,
    "last_updated": datetime.now(timezone.utc).isoformat(),
    "notes": "Formal inquiry template drafted covering all 8 audit requirements. Status: No public crosswalk found; direct confirmation pending formal request submission. Request not yet transmitted.",
    "lead_investigator": "ADAM-1 Enhanced Research Team",
    "target_organization": "GARD Research Center, Chosun University, Gwangju, Korea",
    "checklist": GARD_FEASIBILITY_CHECKLIST,
    "sample_email": generate_gard_formal_inquiry_email(),
}


def get_gard_request_state() -> Dict[str, Any]:
    """Retrieve the current GARD inquiry state."""
    return _GARD_REQUEST_STATE


def update_gard_request_state(
    new_status: GardRequestStatus,
    notes: Optional[str] = None,
    user: str = "System",
) -> Dict[str, Any]:
    """Update GARD inquiry status with timestamp."""
    _GARD_REQUEST_STATE["current_status"] = new_status.value
    _GARD_REQUEST_STATE["last_updated"] = datetime.now(timezone.utc).isoformat()
    if notes:
        _GARD_REQUEST_STATE["notes"] = f"[{user}] {notes}"
    if new_status == GardRequestStatus.REQUEST_SENT and not _GARD_REQUEST_STATE.get("inquiry_sent_timestamp"):
        _GARD_REQUEST_STATE["inquiry_sent_timestamp"] = datetime.now(timezone.utc).isoformat()
    return _GARD_REQUEST_STATE
