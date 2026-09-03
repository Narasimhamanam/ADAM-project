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

export const ACTIVE_DEMO_PHASE = 1;

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
};

/**
 * Feature mapping: Every route is assigned to its exact phase.
 */
export const FEATURE_CONFIG = {
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

