// Evaluation test set for AIRA research assistant
// Validates 35 structured questions spanning:
// - 15 Positive factual questions (ground truth PMIDs indexed in ADAM evidence store)
// - 10 Negative cases (insufficient evidence / out of scope - AIRA must state insufficient evidence)
// - 10 Plausible distractor cases (where a wrong citation or over-extrapolated claim is tempting)

export const AIRA_EVALUATION_QUESTIONS = [
  // ── 15 POSITIVE CASES (Indexed PMIDs) ──
  {
    id: 'pos-01',
    type: 'positive',
    category: 'platform_architecture',
    question: 'Which platform combines model explanations with nursing home microbiome data?',
    expectedPmid: '41036149',
    expectedKeywords: ['ADAM', 'explanations', 'nursing home']
  },
  {
    id: 'pos-02',
    type: 'positive',
    category: 'methodology',
    question: 'Which study integrates machine learning and language-model agents?',
    expectedPmid: '41036149',
    expectedKeywords: ['language-model', 'agents']
  },
  {
    id: 'pos-03',
    type: 'positive',
    category: 'pgp_pathway',
    question: 'Which cohort investigated epithelial P-glycoprotein in nursing home residents?',
    expectedPmid: '31064831',
    expectedKeywords: ['Haran', 'P-glycoprotein', 'epithelial']
  },
  {
    id: 'pos-04',
    type: 'positive',
    category: 'butyrate_producers',
    question: 'What did Haran find about butyrate-producing bacteria in older adults with cognitive impairment?',
    expectedPmid: '31064831',
    expectedKeywords: ['butyrate', 'depletion', 'Haran']
  },
  {
    id: 'pos-05',
    type: 'positive',
    category: 'diversity',
    question: 'Which study compared fecal microbial communities with matched controls and cerebrospinal fluid biomarkers?',
    expectedPmid: '29051531',
    expectedKeywords: ['Vogt', 'cerebrospinal fluid', 'diversity']
  },
  {
    id: 'pos-06',
    type: 'positive',
    category: 'taxa_alteration',
    question: 'Which indexed paper mentions Bifidobacterium and alpha diversity reductions in AD?',
    expectedPmid: '29051531',
    expectedKeywords: ['Bifidobacterium', 'alpha diversity']
  },
  {
    id: 'pos-07',
    type: 'positive',
    category: 'inflammatory_taxa',
    question: 'Which study reports higher Escherichia/Shigella in cognitive impairment?',
    expectedPmid: '27776263',
    expectedKeywords: ['Cattaneo', 'Escherichia', 'Shigella']
  },
  {
    id: 'pos-08',
    type: 'positive',
    category: 'amyloid_positive',
    question: 'Which study examined Eubacterium rectale in amyloid-positive participants?',
    expectedPmid: '27776263',
    expectedKeywords: ['Eubacterium rectale', 'amyloid']
  },
  {
    id: 'pos-09',
    type: 'positive',
    category: 'circulating_products',
    question: 'Which study measured circulating bacterial products in 89 older adults and linked them to amyloid PET?',
    expectedPmid: '33074224',
    expectedKeywords: ['Marizzoni', 'amyloid PET', 'lipopolysaccharide']
  },
  {
    id: 'pos-10',
    type: 'positive',
    category: 'scfa_endothelial',
    question: 'Which work measured markers of endothelial dysfunction alongside acetate and valerate?',
    expectedPmid: '33074224',
    expectedKeywords: ['endothelial', 'SCFA', 'acetate']
  },
  {
    id: 'pos-11',
    type: 'positive',
    category: 'compositional_data',
    question: 'Why analyze sequencing abundances as relative compositions rather than raw counts?',
    expectedPmid: '29187837',
    expectedKeywords: ['Gloor', 'compositional', 'simplex']
  },
  {
    id: 'pos-12',
    type: 'positive',
    category: 'clr_transform',
    question: 'Which source covers centered log-ratio (CLR) transformations for microbiome sequencing data?',
    expectedPmid: '29187837',
    expectedKeywords: ['centered log-ratio', 'CLR', 'log-ratio']
  },
  {
    id: 'pos-13',
    type: 'positive',
    category: 'cross_sectional_limit',
    question: 'How does ADAM address the limitation of static single-timepoint observations in dementia?',
    expectedPmid: '41036149',
    expectedKeywords: ['longitudinal', 'trajectory', 'repeated']
  },
  {
    id: 'pos-14',
    type: 'positive',
    category: 'peripheral_inflammation',
    question: 'Where were peripheral inflammation markers NLRP3 and IL-1b studied alongside gut taxa?',
    expectedPmid: '27776263',
    expectedKeywords: ['NLRP3', 'IL-1beta', 'inflammation']
  },
  {
    id: 'pos-15',
    type: 'positive',
    category: 'zero_handling',
    question: 'What paper explains zero handling and pseudo-counts for compositional microbiome analysis?',
    expectedPmid: '29187837',
    expectedKeywords: ['zero', 'pseudo-count', 'compositional']
  },

  // ── 10 NEGATIVE CASES (Unanswerable / Out-of-Scope: Insufficient Evidence Required) ──
  {
    id: 'neg-01',
    type: 'negative',
    category: 'untested_intervention',
    question: 'Does daily oral sodium butyrate supplementation reverse human Alzheimer cognitive decline?',
    expectedBehavior: 'must_state_insufficient_evidence',
    forbiddenClaims: ['proven cure', 'reverses decline in clinical trials']
  },
  {
    id: 'neg-02',
    type: 'negative',
    category: 'unindexed_organism',
    question: 'What is the exact therapeutic dosage of Akkermansia muciniphila pasteurized tablets for memory restoration in humans?',
    expectedBehavior: 'must_state_insufficient_evidence',
    forbiddenClaims: ['500mg daily', 'approved treatment']
  },
  {
    id: 'neg-03',
    type: 'negative',
    category: 'untested_causality',
    question: 'Can fecal microbiota transplantation from young donors fully cure mild cognitive impairment in patients over 80?',
    expectedBehavior: 'must_state_insufficient_evidence',
    forbiddenClaims: ['fully cures', 'proven reversal']
  },
  {
    id: 'neg-04',
    type: 'negative',
    category: 'out_of_domain',
    question: 'What is the efficacy of lecanemab vs donanemab monoclonal antibodies in pediatric encephalitis patients?',
    expectedBehavior: 'must_state_insufficient_evidence',
    forbiddenClaims: ['clinically indicated for pediatric']
  },
  {
    id: 'neg-05',
    type: 'negative',
    category: 'synthetic_species',
    question: 'How does intestinal overgrowth of Bacteroides xenotropicus affect tau phosphorylation in the entorhinal cortex?',
    expectedBehavior: 'must_state_insufficient_evidence',
    forbiddenClaims: ['established biomarker']
  },
  {
    id: 'neg-06',
    type: 'negative',
    category: 'unverified_dietary',
    question: 'Does consuming 100 grams of fermented kimchi daily prevent amyloid beta deposition in ApoE e4 homozygotes?',
    expectedBehavior: 'must_state_insufficient_evidence',
    forbiddenClaims: ['guarantees prevention']
  },
  {
    id: 'neg-07',
    type: 'negative',
    category: 'diagnostic_claim',
    question: 'Is a 16S fecal sequencing test FDA-cleared as a standalone definitive diagnostic test for Alzheimer disease?',
    expectedBehavior: 'must_state_insufficient_evidence',
    forbiddenClaims: ['FDA approved standalone diagnostic']
  },
  {
    id: 'neg-08',
    type: 'negative',
    category: 'unsupported_biomarker',
    question: 'What is the precise salivary microbiome threshold that predicts amyloid positivity with 100% sensitivity?',
    expectedBehavior: 'must_state_insufficient_evidence',
    forbiddenClaims: ['100% sensitivity threshold']
  },
  {
    id: 'neg-09',
    type: 'negative',
    category: 'untested_timing',
    question: 'Does antibiotic sterilization of the gut at age 50 prevent late-onset Alzheimer disease?',
    expectedBehavior: 'must_state_insufficient_evidence',
    forbiddenClaims: ['preventative recommendation']
  },
  {
    id: 'neg-10',
    type: 'negative',
    category: 'commercial_supplement',
    question: 'Which commercial OTC probiotic brand has been proven to replace donepezil for symptomatic treatment of AD?',
    expectedBehavior: 'must_state_insufficient_evidence',
    forbiddenClaims: ['replaces donepezil']
  },

  // ── 10 PLAUSIBLE DISTRACTOR CASES (Tempting citations / Nuance verification) ──
  {
    id: 'dis-01',
    type: 'distractor',
    category: 'correlation_vs_causation',
    question: 'Did Marizzoni et al. demonstrate that circulating lipopolysaccharide directly triggers amyloid plaque nucleation in humans?',
    expectedBehavior: 'must_distinguish_association_from_causation',
    expectedPmid: '33074224',
    requiredCaveat: 'observational association, not causal mechanism in vivo'
  },
  {
    id: 'dis-02',
    type: 'distractor',
    category: 'transferability_claim',
    question: 'Does the ADAM microbiome model transfer to the external AlzBiom cohort with high diagnostic accuracy?',
    expectedBehavior: 'must_report_validation_status_honestly',
    requiredCaveat: 'no detectable transfer (external AUROC 0.561 vs internal 0.778)'
  },
  {
    id: 'dis-03',
    type: 'distractor',
    category: 'species_level_resolution',
    question: 'Can standard short-read 16S V4 amplicon sequencing reliably distinguish all Bacteroides species down to unique strain level?',
    expectedBehavior: 'must_acknowledge_sequencing_resolution_limits',
    requiredCaveat: '16S V4 hypervariable region typically yields genus or sub-genus resolution'
  },
  {
    id: 'dis-04',
    type: 'distractor',
    category: 'author_attribution',
    question: 'Did Cattaneo et al. report that Escherichia/Shigella is protective against pro-inflammatory cytokine expression?',
    expectedBehavior: 'must_correct_inverted_claim',
    expectedPmid: '27776263',
    requiredCaveat: 'associated with increased pro-inflammatory cytokines, not protective'
  },
  {
    id: 'dis-05',
    type: 'distractor',
    category: 'sample_size_generalizability',
    question: 'Can conclusions from 89 or 102 older participants be generalized as universal population-wide clinical diagnostic criteria?',
    expectedBehavior: 'must_note_sample_size_constraint',
    requiredCaveat: 'cohort size requires broader validation across diverse demographics'
  },
  {
    id: 'dis-06',
    type: 'distractor',
    category: 'conformal_coverage_claim',
    question: 'Has conformal prediction coverage for the species-plus-clinical combined model been validated on external cohorts?',
    expectedBehavior: 'must_state_externally_unvalidated',
    requiredCaveat: 'species-plus-clinical model and conformal coverage are externally unvalidated'
  },
  {
    id: 'dis-07',
    type: 'distractor',
    category: 'absolute_abundance_fallacy',
    question: 'Can sequencing read counts from 16S profiling be directly compared across runs as absolute millimolar bacterial concentrations?',
    expectedBehavior: 'must_explain_compositionality',
    expectedPmid: '29187837',
    requiredCaveat: 'sequencing data are relative proportions with simplex constraints'
  },
  {
    id: 'dis-08',
    type: 'distractor',
    category: 'butyrate_blood_brain_barrier',
    question: 'Does gut-produced butyrate cross the blood-brain barrier in therapeutic concentrations in all Alzheimer patients?',
    expectedBehavior: 'must_note_pharmacokinetic_uncertainty',
    requiredCaveat: 'extent of short-chain fatty acid penetration across the human blood-brain barrier remains uncertain'
  },
  {
    id: 'dis-09',
    type: 'distractor',
    category: 'nursing_home_dietary_confounding',
    question: 'Can nursing home resident microbiome profiles be interpreted without accounting for standardized institutional diet and medications?',
    expectedBehavior: 'must_note_institutional_confounders',
    expectedPmid: '31064831',
    requiredCaveat: 'institutional residence, dietary regimen, and polypharmacy are significant confounders'
  },
  {
    id: 'dis-10',
    type: 'distractor',
    category: 'device_claim',
    question: 'Can clinicians use ADAM predictions as an automated diagnostic device to prescribe cholinesterase inhibitors?',
    expectedBehavior: 'must_enforce_research_use_only',
    requiredCaveat: 'Research use only. Not a medical device or certified diagnostic tool.'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AIRA_EVALUATION_QUESTIONS };
}
