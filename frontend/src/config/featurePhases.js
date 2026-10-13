/**
 * featurePhases.js
 * ============================================================================
 * Central Feature & Phase Control Configuration for ADAM-1 Enhanced.
 *
 * Change `ACTIVE_DEMO_PHASE` below manually to control the active phase
 * before presenting or demonstrating the application:
 *
 *   1 -> Phase 1 only (Full-Stack Foundation & System Health)
 *   2 -> Phase 1 + Phase 2 (Dataset Ingestion & Metagenomic Explorer)
 *   3 -> Phase 1 + Phase 2 + Phase 3 (ML Benchmarks, TreeSHAP & Reports)
 *   4 -> Phase 1 + Phase 2 + Phase 3 + Phase 4 (Complete Application with AI & RAG)
 * ============================================================================
 */

export const ACTIVE_DEMO_PHASE = 5;

export const PHASES = {
  1: {
    number: 1,
    name: 'Full-Stack Foundation & System Health',
    badge: 'Phase 1',
    status: 'COMPLETE & VERIFIED',
    summary: 'FastAPI async backend, PostgreSQL 16 + pgvector database, Docker Compose containerization, React + Tailwind dashboard shell, and system telemetry endpoints.',
    color: '#3B82F6',
  },
  2: {
    number: 2,
    name: 'Dataset Audit, Ingestion Pipeline & Metagenomic Explorer',
    badge: 'Phase 2',
    status: 'COMPLETE & VERIFIED',
    summary: 'Ingestion of 335 metagenomic cohort samples across 102 subjects, 940 microbiome species, Shannon alpha diversity index, schema validation, and 5-tab Dataset Explorer.',
    color: '#0F9D8A',
  },
  3: {
    number: 3,
    name: 'ML Benchmarks, Predictive Inference & SHAP Explainability',
    badge: 'Phase 3',
    status: 'COMPLETE & VERIFIED',
    summary: 'Subject-level stratified cross-validation across 30 experiment seeds (XGBoost, Random Forest, Logistic Regression), interactive prediction studio, global/local TreeSHAP attributions, and clinical PDF dossiers.',
    color: '#8B5CF6',
  },
  4: {
    number: 4,
    name: 'Literature RAG, AI Assistant & Multi-Agent Intelligence',
    badge: 'Phase 4',
    status: 'COMPLETE & VERIFIED',
    summary: 'PubMed semantic RAG vector store, live Groq LLM integration (groq/compound-mini), AIRA Research Assistant, and 3-tier Multi-Agent orchestration (Computation, Summarization, and Classification agents).',
    color: '#EC4899',
  },
  5: {
    number: 5,
    name: 'Cross-Cohort AI, Multimodal Brain Imaging & Research Digital Twin',
    badge: 'Phase 5',
    status: 'COMPLETE & VERIFIED',
    summary: 'Independent dataset benchmark registry, cross-cohort validation with bootstrap CIs, volumetric structural MRI and PET neuroimaging explorer, strict ID crosswalk gates, and longitudinal personalized AD digital twins.',
    color: '#06B6D4',
  },
};

/**
 * Feature mapping: Every route is assigned to its exact phase.
 */
export const FEATURE_CONFIG = {
  '/overview': {
    id: 'overview',
    name: 'Overview Dashboard',
    path: '/overview',
    phase: 1,
    plannedPhaseName: 'Phase 1 – Full-Stack Foundation & System Health',
    description: 'Executive research command center displaying verified clinical sample counts, live pipeline status, and primary research actions.',
    capabilities: [
      'Live backend health and database telemetry',
      'Verified cohort counts (335 clinical samples, 102 subjects)',
      'Direct navigation to Analyze, Patient Explorer, and Research Validation',
      'Three-tier research governance status summary',
    ],
    enabled: true,
  },
  '/analyze': {
    id: 'analyze',
    name: 'Analyze — Model & Workflow Studio',
    path: '/analyze',
    phase: 1,
    plannedPhaseName: 'Core Research Workflow',
    description: 'Unified analysis workspace combining cohort sample selection, multi-algorithmic inference (XGBoost, ADAM Workflow, Random Forest, Logistic Regression), 5-stage progress tracking, and local TreeSHAP explanations.',
    capabilities: [
      'Authentic cohort sample selection (e.g. FB100, DC001)',
      'Multi-model inference with real hyperparameter-tuned weights',
      '5-stage workflow tracking (Computation -> Evidence -> Summarization -> Classification -> Result)',
      'Local TreeSHAP waterfall and diverging bar attributions',
      'Traceable PubMed citations and research disclaimers',
    ],
    enabled: true,
  },
  '/patients': {
    id: 'patients',
    name: 'Patient Explorer & Longitudinal Timeline',
    path: '/patients',
    phase: 1,
    plannedPhaseName: 'Subject & Cohort Exploration',
    description: 'Consolidated participant explorer across 102 subjects and 335 samples, featuring longitudinal visit timelines, host biomarkers, and zero-transition research governance notices.',
    capabilities: [
      'Participant list with real cohort filters and search',
      'Longitudinal timeline with study-relative days and calibrated risk',
      'Microbiome taxon abundance and alpha diversity tracking',
      'Independent neuroimaging lookup without fabricated linkage',
    ],
    enabled: true,
  },
  '/research': {
    id: 'research',
    name: 'Research & Validation Portal',
    path: '/research',
    phase: 1,
    plannedPhaseName: 'Scientific Evidence & Infrastructure',
    description: 'Centralized research infrastructure consolidating Datasets registry, Benchmarks ledger, Neuroimaging resources, and Data Linkage & Integrity audits.',
    capabilities: [
      'Searchable dataset registry distinguishing local from cataloged cohorts',
      'Reproducible benchmark ledger separating local, exploratory, external, and literature results',
      'Independent neuroimaging resources (OASIS-1, OASIS-3, ADNI, GARD)',
      'Participant ID crosswalk integrity catalog and GARD REQUEST_NOT_SENT gate',
    ],
    enabled: true,
  },
  '/reports': {
    id: 'reports',
    name: 'Reports & Scientific Evidence',
    path: '/reports',
    phase: 1,
    plannedPhaseName: 'Clinical & Scientific Dissemination',
    description: 'Comprehensive research dossier generator, peer-reviewed PubMed RAG evidence explorer, and publication-ready plain-text summaries.',
    capabilities: [
      'Multi-modal clinical research dossier generator with Print & Markdown export',
      'Semantic literature search over peer-reviewed PubMed publications',
      'Publication-grade plain-text narrative without raw markdown syntax artifacts',
      'Full scientific limitations and provenance disclaimers',
    ],
    enabled: true,
  },

  '/dashboard': {
    id: 'dashboard',
    name: 'System Dashboard & Telemetry',
    path: '/dashboard',
    phase: 1,
    plannedPhaseName: 'Phase 1 – Full-Stack Foundation & System Health',
    description: 'Central operational monitoring center displaying real-time PostgreSQL + pgvector health, backend API response latency, registered dataset metrics, and research pipeline status.',
    capabilities: [
      'Live database health check (SELECT 1 ping to pgvector)',
      'System uptime, API version, and environment telemetry',
      'Phase-by-phase pipeline overview and status indicators',
      'Dynamic quick-stat counters for cohort data and experiments',
    ],
    enabled: true,
  },
  '/settings': {
    id: 'settings',
    name: 'Platform Settings & Environment',
    path: '/settings',
    phase: 1,
    plannedPhaseName: 'Phase 1 – Full-Stack Foundation & System Health',
    description: 'Configuration management for database connections, Groq API provider tokens, logging verbosity, and system parameters.',
    capabilities: [
      'Database connection string and pool inspection',
      'LLM provider configuration (Groq / Local Heuristic / OpenAI)',
      'Environment variable inspection and runtime checks',
    ],
    enabled: true,
  },
  '/datasets': {
    id: 'datasets',
    name: 'Dataset Explorer & Ingestion Pipeline',
    path: '/datasets',
    phase: 2,
    plannedPhaseName: 'Phase 2 – Dataset Audit, Ingestion Pipeline & Metagenomic Explorer',
    description: 'Deep multi-tab research explorer for the 335 metagenomic cohort samples, 940 bacterial taxa, data dictionary with column datatypes, and ingestion validation logs.',
    capabilities: [
      'Data Dictionary: Column classifications, datatypes, and null counts',
      'Sample Explorer: Filter 335 longitudinal patient samples by study_id and diagnosis',
      'Species Explorer: Search taxonomy across 940 validated microbiome species',
      'Shannon Alpha Diversity calculation and pairwise distance metrics',
      'Database Ingestion Pipeline with schema validation and duplicate protection',
    ],
    enabled: true,
  },
  '/alzheimer': {
    id: 'alzheimer',
    name: 'Alzheimer’s Patient Comparative Analysis',
    path: '/alzheimer',
    phase: 3,
    plannedPhaseName: 'Phase 3 – ML Benchmarks & Predictive Inference',
    description: 'Side-by-side comparative evaluation of cohort patient samples, correlating ground-truth clinical diagnosis with machine learning predictions and host biomarkers.',
    capabilities: [
      'Cohort participant drill-down across 102 subjects and 335 sample records',
      'Correlation between Clinical Frailty Scale (CFS), Malnutrition score, and AD status',
      'Species abundance profiles for key pro-inflammatory vs neuroprotective taxa',
      'Comparative risk scoring powered by multi-modal XGBoost models',
    ],
    enabled: true,
  },
  '/ml': {
    id: 'ml',
    name: 'ML Risk Prediction Studio',
    path: '/ml',
    phase: 3,
    plannedPhaseName: 'Phase 3 – ML Benchmarks & Predictive Inference',
    description: 'Interactive inference studio for computing Alzheimer’s disease probability on 1,044 multi-omic features using trained XGBoost models with subject-level cross validation.',
    capabilities: [
      'Real-time Alzheimer’s disease risk probability calculation',
      'Multi-model selection (XGBoost, Random Forest, Logistic Regression)',
      '1,044 feature vector evaluation without longitudinal subject leakage',
      'Instant local TreeSHAP feature contribution breakdown per sample',
    ],
    enabled: true,
  },
  '/models': {
    id: 'models',
    name: 'Model Comparison & Benchmarks',
    path: '/models',
    phase: 3,
    plannedPhaseName: 'Phase 3 – ML Benchmarks & Predictive Inference',
    description: 'Rigorous benchmark comparison across 30 experiment seeds comparing XGBoost (Mean AUC 0.812), Random Forest (AUC 0.804), and Logistic Regression (AUC 0.772).',
    capabilities: [
      '30-Seed Stratified cross-validation benchmark summary tables',
      'Individual experiment run inspection (Seeds 1 to 30)',
      'Metrics tracking: ROC-AUC, F1-Score, Accuracy, and Confusion Matrices',
      'Interactive custom model retraining runner with custom seeds',
    ],
    enabled: true,
  },
  '/shap': {
    id: 'shap',
    name: 'SHAP Explainability Center',
    path: '/shap',
    phase: 3,
    plannedPhaseName: 'Phase 3 – ML Benchmarks & Predictive Inference',
    description: 'Explainable AI center providing global Mean Absolute SHAP biomarker rankings across 297 features and sample-level local TreeSHAP attribution force values.',
    capabilities: [
      'Global Top-50 ranked biomarker bar charts (P. dorei, CFS, Malnutrition, N. timonensis)',
      'Category filtering: Microbiome Species vs Clinical Frailty Indicators',
      'Local sample force breakdown explaining positive and negative risk drivers',
      'Ground-truth feature attribution derived directly from 30 experimental seed runs',
    ],
    enabled: true,
  },
  '/reports': {
    id: 'reports',
    name: 'Clinical & Research Reports',
    path: '/reports',
    phase: 3,
    plannedPhaseName: 'Phase 3 – ML Benchmarks & Predictive Inference',
    description: 'Searchable individual patient clinical evaluation dossiers, one-click PDF/printable medical reports, and comprehensive research summaries.',
    capabilities: [
      'Real-time Patient ID search bar with instant cohort validation',
      'One-click Printable Medical Dossier / PDF export formatted for clinical review',
      'Authentic multi-omic biomarker profiles and live XGBoost risk scores',
      'Markdown research report download with electronic verification block',
    ],
    enabled: true,
  },
  '/trajectory': {
    id: 'trajectory',
    name: 'Longitudinal AD Risk Trajectory',
    path: '/trajectory',
    phase: 3,
    plannedPhaseName: 'Phase 3 – ML Benchmarks & Longitudinal Risk Trajectory',
    description: 'Patient-level longitudinal AD-associated risk trajectory tracking across observed study days, multi-signal biomarker visualization, temporal slopes, and SHAP progression.',
    capabilities: [
      'Chronological patient timelines grouped by study_id (335 samples, 102 subjects)',
      'Model-estimated AD probability tracking with baseline and latest change metrics',
      'Multi-signal trajectory tabs (AD Probability, Shannon/Simpson Diversity, Key Taxa, Clinical, SHAP Factors)',
      'Trajectory exploration and horizon boundaries (preventing unsupported future extrapolation)',
      'Patient side-by-side longitudinal trajectory comparison',
      'Observation-level SHAP explanation and evidence-grounded literature retrieval',
      'Extensible RiskModel architecture and time-to-event capability status',
    ],
    enabled: true,
  },
  '/assistant': {
    id: 'assistant',
    name: 'AIRA Research Assistant (Chat)',
    path: '/assistant',
    phase: 4,
    plannedPhaseName: 'Phase 4 – Literature RAG & AI Multi-Agent Intelligence',
    description: 'Conversational biomedical research assistant powered by Groq LLM with live semantic retrieval over indexed PubMed scientific literature.',
    capabilities: [
      'Interactive chat on the gut-brain axis, microbial dysbiosis, and amyloid pathology',
      'Retrieval-Augmented Generation (RAG) providing peer-reviewed PubMed citations (PMCID/PMID)',
      'Multi-provider LLM support with Groq (groq/compound-mini) and local heuristic fallback',
      'Real-time streaming and markdown rendering with interactive citation badges',
    ],
    enabled: true,
  },
  '/literature': {
    id: 'literature',
    name: 'Literature & RAG Vector Store',
    path: '/literature',
    phase: 4,
    plannedPhaseName: 'Phase 4 – Literature RAG & AI Multi-Agent Intelligence',
    description: 'Semantic vector explorer over indexed PubMed publications on Alzheimer’s disease, short-chain fatty acids (SCFAs), and metagenomic biomarkers.',
    capabilities: [
      'Semantic TF-IDF vector search with cosine similarity scoring',
      'Curated scientific corpus of peer-reviewed gut-brain axis research',
      'Topic filtering (P. dorei, SCFA Butyrate, Alpha Diversity, Machine Learning)',
      'Direct PubMed Central (PMC) and DOI research paper cross-linking',
    ],
    enabled: true,
  },
  '/agents': {
    id: 'agents',
    name: 'AIRA Multi-Agent Intelligence',
    path: '/agents',
    phase: 4,
    plannedPhaseName: 'Phase 4 – Literature RAG & AI Multi-Agent Intelligence',
    description: 'Sequential 3-agent orchestration system combining quantitative ML data synthesis, PubMed literature grounding, and individual clinical patient classification.',
    capabilities: [
      'Computation Agent: Synthesizes cohort dimensions, XGBoost AUC/F1 benchmarks, and SHAP rankings',
      'Summarization Agent: Queries PubMed vector store and extracts biological mechanisms via Groq LLM',
      'Classification Agent: Analyzes specific patient sample rows to generate diagnostic risk interpretations',
      'Final AIRA Prediction: Integrated multi-agent consensus report with professional hierarchy',
    ],
    enabled: true,
  },
  '/workflow': {
    id: 'workflow',
    name: 'ADAM Framework Workflow',
    path: '/workflow',
    phase: 4,
    plannedPhaseName: 'Phase 4 – Multi-Agent Diagnostic Workflow',
    description: 'Complete 8-stage interactive visual timeline: Record Selection -> Computational Agent -> ML Prediction -> TreeSHAP -> Diversity -> Summarization (10 Checkpoints) -> Classification (10 Checkpoints) -> Consensus Decision -> PDF Report.',
    capabilities: [
      'Interactive record selection across 335 longitudinal patient samples',
      'Live Computational Agent calculating Shannon, Simpson, Berger-Parker, Bray-Curtis, Jaccard, and Canberra',
      'TreeSHAP polynomial-time feature attributions with non-causal medical disclaimers',
      '10-Checkpoint Summarization Agent (ADAM-1 Enhanced reasoning workflow)',
      '10-Checkpoint Classification Agent (Enhanced implementation)',
      'Auditable diagnostic consensus decisioning with downloadable clinical PDF report',
    ],
    enabled: true,
  },
  '/performance': {
    id: 'performance',
    name: 'ADAM Framework Performance',
    path: '/performance',
    phase: 4,
    plannedPhaseName: 'Phase 4 – Framework Performance & Evaluation',
    description: 'Separate dedicated comparative evaluation benchmarking the ADAM Framework against XGBoost, Random Forest, and Logistic Regression with absolute and relative improvement calculations.',
    capabilities: [
      'Dynamic calculation of Accuracy, Precision, Recall, F1 Score, and ROC-AUC',
      'Strict separation of Published Paper Benchmark (30 seeds) vs Current Enhanced Results',
      'Dynamic Absolute Improvement: ADAM - XGBoost',
      'Dynamic Relative Improvement %: ((ADAM - XGBoost) / XGBoost) * 100',
      'Transparent display of Not evaluated for unrecorded historical metrics without fabrication',
    ],
    enabled: true,
  },
  '/cross-cohort': {
    id: 'cross-cohort',
    name: 'Cross-Cohort & Benchmark Engine',
    path: '/cross-cohort',
    phase: 5,
    plannedPhaseName: 'Phase 5 – Cross-Cohort AI, Multimodal Brain Imaging & Digital Twin',
    description: 'Reproducible benchmark registry across independent European, Asian, and preclinical cohorts with subject-level bootstrap 95% confidence intervals and distribution shift quantification.',
    capabilities: [
      'Multi-cohort discovery registry with verified access statuses and DUAs',
      'Subject-level stratified cross-cohort evaluation without test leakage',
      'Taxonomic feature harmonization between 16S genus and shotgun species',
      'Distribution shift quantification via Jensen-Shannon Divergence (JSD)',
    ],
    enabled: true,
  },
  '/neuroimaging': {
    id: 'neuroimaging',
    name: 'Neuroimaging & Multimodal Explorer',
    path: '/neuroimaging',
    phase: 5,
    plannedPhaseName: 'Phase 5 – Cross-Cohort AI, Multimodal Brain Imaging & Digital Twin',
    description: 'Volumetric brain MRI and PET imaging biomarker explorer covering OASIS-1, OASIS-3, and ADNI with NIfTI/DICOM acquisition parameter validation and independent modality benchmarks.',
    capabilities: [
      'Structural T1w MRI FreeSurfer morphometry (hippocampus, entorhinal, ventricles)',
      'Molecular PET SUVR biomarkers (Florbetapir Amyloid, Flortaucipir Tau, FDG)',
      'Volumetric scan header validation (matrix dimensions, voxel spacing, TR/TE)',
      'Independent modality ablation comparisons (Microbiome vs MRI vs PET)',
    ],
    enabled: true,
  },
  '/multimodal-gate': {
    id: 'multimodal-gate',
    name: 'ID Matching & Linkage Gate',
    path: '/multimodal-gate',
    phase: 5,
    plannedPhaseName: 'Phase 5 – Cross-Cohort AI, Multimodal Brain Imaging & Digital Twin',
    description: 'Strict patient identity verification engine and multimodal linkage gate preventing unauthorized patient merges between external neuroimaging cohorts and baseline microbiome records.',
    capabilities: [
      'Audit matrix across 10 candidate cohorts with namespace isolation',
      'Multimodal Linkage Gate simulator blocking unauthorized cross-cohort merges',
      'GARD Research Center linked-data feasibility checklist (9 criteria)',
      'Formal data-request inquiry email generator and request tracking state machine',
    ],
    enabled: true,
  },
  '/digital-twin': {
    id: 'digital-twin',
    name: 'Research Digital Twin',
    path: '/digital-twin',
    phase: 5,
    plannedPhaseName: 'Phase 5 – Cross-Cohort AI, Multimodal Brain Imaging & Digital Twin',
    description: 'De-identified longitudinal research profile tracking observed clinical, microbial, and model risk trajectories over time under static diagnostic ground truth with uncertainty intervals.',
    capabilities: [
      'Observed-history chronological visit timeline across all 102 cohort subjects',
      'Multi-omic microbial dysbiosis index and clinical frailty tracking',
      'Calibrated risk estimates with 95% bootstrap prediction intervals',
      'Strict research governance banner prohibiting unvalidated future conversion claims',
    ],
    enabled: true,
  },
};


/**
 * Dynamic calculation of a phase's progress status based on ACTIVE_DEMO_PHASE.
 */
export function getPhaseStatus(phaseNumber, activeDemoPhase = ACTIVE_DEMO_PHASE) {
  if (phaseNumber < activeDemoPhase) {
    return {
      status: 'complete',
      label: 'Complete & Verified',
      badge: `✓ Phase ${phaseNumber} Complete`,
      isUnlocked: true,
    };
  } else if (phaseNumber === activeDemoPhase) {
    if (activeDemoPhase === 4) {
      return {
        status: 'complete',
        label: 'Complete & Verified',
        badge: 'Phase 4 Complete & Verified',
        isUnlocked: true,
      };
    }
    return {
      status: 'active',
      label: 'In Progress (Active Demo)',
      badge: `● Phase ${phaseNumber} In Progress`,
      isUnlocked: true,
    };
  } else {
    return {
      status: 'upcoming',
      label: `Upcoming in Phase ${phaseNumber}`,
      badge: `Phase ${phaseNumber} Upcoming`,
      isUnlocked: false,
    };
  }
}

/**
 * Dynamic platform status descriptor based on active demonstration phase.
 */
export function getPlatformStatus(activeDemoPhase = ACTIVE_DEMO_PHASE) {
  const current = PHASES[activeDemoPhase] || PHASES[1];
  if (activeDemoPhase >= 5) {
    return {
      title: 'Phase 5 Complete & Verified',
      subtitle: 'Cross-Cohort AI, Neuroimaging & Digital Twin Active',
      color: '#06B6D4',
      activePhase: 5,
    };
  }
  if (activeDemoPhase === 4) {
    return {
      title: 'Phase 4 Complete',
      subtitle: 'All Systems Active & Verified',
      color: '#10B981',
      activePhase: 4,
    };
  }
  return {
    title: `Phase ${activeDemoPhase} Active`,
    subtitle: current.name,
    color: current.color || '#0F9D8A',
    activePhase: activeDemoPhase,
  };
}

/**
 * Check if a specific route path is enabled under the active demo phase.
 */
export function isFeatureEnabled(path, demoPhase) {
  const activePhase = demoPhase !== undefined ? demoPhase : ACTIVE_DEMO_PHASE;
  const config = FEATURE_CONFIG[path];
  if (!config) return true;
  return config.enabled !== false && config.phase <= activePhase;
}

/**
 * Lookup feature configuration by route path.
 */
export function getFeatureByPath(path) {
  return FEATURE_CONFIG[path] || null;
}

