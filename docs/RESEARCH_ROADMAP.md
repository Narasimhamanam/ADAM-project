# Research status and verified sources

The supplied Rigor Suite patch was applied on PR #2. Its precomputed artifact was
replaced by a local execution. Its conformal routine previously split subjects but
pooled visit scores: it now calibrates subject maxima and reports all-visit coverage.
Do not reuse the patch's original numerical table or its projected venue dates.

## Evidence and reproduction

- `python -m app.research.rigor` runs the leakage, feature-group, Platt, corrected
  subject-conformal and SHAP-stability analyses on the bundled data.
- `python -m app.research.repeated` runs 30 seeds, five subject folds, paired full,
  compact and CLR models, forced/subject/Mondrian ablations, trivial baselines,
  1,000 subject-bootstrap draws, 199 subject-label permutations, nested Optuna
  sensitivity (one outer seed, five trials per outer fold), and proxy ablations.
- `manuscript/generate.py` generates tables and figures from the executed JSON.
- See [executed repeated results](REPEATED_RESULTS.md) and `manuscript/main.tex`.

The valid contribution is an evaluated ADAM-specific reproducibility artifact.
Leakage auditing, conformal prediction, Mondrian calibration, CLR and nested CV
are established methods. No first-ever, clinical-utility or acceptance claim is made.
The full+subject and compact+subject comparison is paired; coverage improvement
must not be attributed to compression merely because a compact model is calibrated.
Subject coverage, class coverage, singleton acceptance and singleton error must be
read together. Always-both labels achieves perfect coverage with no decisions.

## Verified related work (checked 2026-11-16)

| Work | Verified identifier | Relevance |
|---|---|---|
| Huang et al., ADAM-1, 2025 | https://pubmed.ncbi.nlm.nih.gov/41036149/ | Original framework; original LLM experiments not rerun |
| Dudek et al., 2024 | https://arxiv.org/abs/2402.17621 ; DOI 10.1016/j.mlwa.2024.100607 | Microbiome evaluation/reporting pitfalls |
| Zhang et al., CRC-TrustBench, 2026 | https://pubmed.ncbi.nlm.nih.gov/42857378/ ; DOI 10.3389/fmicb.2026.1971707 | Prior leakage-aware, cross-study reliability benchmark |
| Du et al., HMP2 subject-stratified RF, 2026 | https://pubmed.ncbi.nlm.nih.gov/42792947/ ; DOI 10.3390/genes17091053 | Prior longitudinal subject-grouped evaluation |
| Angelopoulos and Bates | https://arxiv.org/abs/2107.07511 | Established conformal methodology |
| Jia et al., 2025 | https://pubmed.ncbi.nlm.nih.gov/40164697/ ; DOI 10.1038/s41380-025-02973-7 | External AD cohort accessions |

## Official CFP checks (2026-11-16)

| Venue | Verified deadline | Source |
|---|---|---|
| ACM-BCB 2027 research | Abstract March 19; paper March 26, 2027, 23:59 AoE | https://www.acm-bcb.org/research.php |
| ACM-BCB 2027 UGHS symposium | June 4, 2027 | https://www.acm-bcb.org/ |
| PSB 2027 papers | August 3, 2026: passed | https://psb.stanford.edu/keydates/ |
| PSB 2027 posters | December 1, 2026, 23:59 PT | https://psb.stanford.edu/keydates/ |

Dates may change; recheck before submission. No 2028 dates are inferred.
The ACM manuscript uses `acmart` review format; a final venue-specific format
and author/affiliation check are still necessary.

## Remaining scientific work

External frozen-model evaluation is unperformed; see EXTERNAL_VALIDATION.md.
Increase nested tuning budget and repeated outer seeds, investigate home-level
dependence and missingness, add conditional confounding analysis, and validate
prospectively. Bootstrap intervals hold fitted models fixed and underestimate
some sources of training uncertainty. Repeated seeds do not increase cohort size.
