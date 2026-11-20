# External validation access audit

Checked 2026-11-16. **No external performance is reported.** Public cohorts exist;
this execution did not obtain a compatible labeled feature matrix. That is a
processing/access limitation, not evidence that external datasets do not exist.

| Candidate | Access evidence | Reuse/compatibility status |
|---|---|---|
| Japanese shotgun PRJNA679346 | https://www.ncbi.nlm.nih.gov/bioproject/PRJNA679346 lists 106 SRA experiments and raw reads (~0.48 TB) | Public raw data. No study-specific licence was displayed on the project page; compatible processed taxonomy and label table not retrieved. Raw profiling was not run. |
| AlzBiom PRJEB47976 | https://www.ebi.ac.uk/ena/browser/view/PRJEB47976 ; publication https://pmc.ncbi.nlm.nih.gov/articles/PMC13640718/ identifies public metagenomes | ENA browser had no readable matrix and API retrieval failed in this environment. No explicit study-specific licence verified. |
| Chinese PRJCA022804 | https://www.nature.com/articles/s41380-025-02973-7 data availability | Publication identifies archive; direct file access, consent restrictions and reuse terms not established here. |
| PRJNA489760, PRJNA554111, PRJNA633959, PRJNA734525, PRJNA811324 | Same publication lists 16S cohorts | Genus/amplicon data cannot substitute for the frozen shotgun species plus clinical feature schema. |

Archive policies checked: https://www.ncbi.nlm.nih.gov/home/about/policies/ and
https://www.ebi.ac.uk/about/terms-of-use/. These are not a substitute for a
study-specific licence. EBI imposes no additional restrictions beyond data-owner
terms and requests attribution. Article copyright licences do not establish the
licence of every linked dataset. No redistribution licence is asserted here.

The original cohort is excluded from external-validation counts. No simulated
subjects or performance values are used. The existing cohort registry's candidate
entries are discovery leads, not evidence of downloaded/validated data.

`app.research.external_validation` provides a frozen-model evaluation boundary:
exact schema order; whitespace/underscore normalization; duplicate/missing-feature
rejection; subject-balanced AUROC/Brier; no refitting. Unit tests exercise it with
explicit fixtures, not external validation results. For an actual evaluation,
obtain a permitted feature/diagnosis/subject manifest, verify preprocessing units,
freeze the baseline model and schema before reading external outcomes, then call
`evaluate_frozen`. Never impute absent clinical variables as zero or map genus
values to species. A prespecified taxonomy-only model may be needed.
