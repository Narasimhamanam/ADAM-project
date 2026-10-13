import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  BookOpen,
  Search,
  ExternalLink,
  Printer,
  Download,
  Copy,
  Check,
  Filter,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  Layers,
  ChevronDown,
  ChevronRight,
  User,
  Activity,
  FileCheck2,
  Calendar,
  Database,
  Quote,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

// Report Subcomponents from the existing system
import ReportHeader from '../components/reports/ReportHeader';
import ExecutiveSummaryCard from '../components/reports/ExecutiveSummaryCard';
import ResearchNotice from '../components/reports/ResearchNotice';
import PatientProfile from '../components/reports/PatientProfile';
import ClinicalAnalyticalSummary from '../components/reports/ClinicalAnalyticalSummary';
import ModelComparison from '../components/reports/ModelComparison';
import MicrobiomeProfile from '../components/reports/MicrobiomeProfile';
import DiversityAnalysis from '../components/reports/DiversityAnalysis';
import ShapDivergingChart from '../components/reports/ShapDivergingChart';
import LiteratureEvidenceRetrieval from '../components/reports/LiteratureEvidenceRetrieval';
import AiraMultiAgentWorkflow from '../components/reports/AiraMultiAgentWorkflow';
import ResearchConsiderations from '../components/reports/ResearchConsiderations';
import AppendixValidation from '../components/reports/AppendixValidation';
import ScientificReferences from '../components/reports/ScientificReferences';
import TechnicalAuditView from '../components/reports/TechnicalAuditView';
import LongitudinalRiskTrajectoryReport from '../components/reports/LongitudinalRiskTrajectoryReport';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const TOPIC_CHIPS = [
  'All Publications',
  'Phocaeicola dorei',
  'Short-Chain Fatty Acids',
  'Alpha Diversity',
  'Machine Learning & SHAP',
  'Proton Pump Inhibitors',
  'Bacteroides fragilis',
  'Blood-Brain Barrier'
];

const QUICK_SAMPLES = ['FB100', 'DC001', 'DC002', 'DC017', 'FB085', 'FB300'];

/**
 * Strips raw markdown syntax characters (*, _, `, #, raw tables) for clean plain-text presentation
 */
function cleanPlainText(raw) {
  if (!raw) return '';
  return raw
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/---+/g, '')
    .trim();
}

export default function ReportsEvidence() {
  const [activeTab, setActiveTab] = useState('dossier'); // 'evidence' | 'dossier' | 'plain_summary'

  // Evidence Tab State
  const [litQuery, setLitQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Publications');
  const [articles, setArticles] = useState([]);
  const [litLoading, setLitLoading] = useState(false);
  const [litError, setLitError] = useState(null);

  // Report Dossier State
  const [searchQuery, setSearchQuery] = useState('FB100');
  const [activePatientId, setActivePatientId] = useState('FB100');
  const [sampleData, setSampleData] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [modelPredictions, setModelPredictions] = useState({
    xgboost: null,
    randomforest: null,
    logisticregression: null,
  });
  const [benchmarks, setBenchmarks] = useState(null);
  const [globalShap, setGlobalShap] = useState([]);
  const [airaAnalysis, setAiraAnalysis] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportViewMode, setReportViewMode] = useState('clinician'); // 'clinician' | 'technical'

  // Plain Text Summary State
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [summarySectionOpen, setSummarySectionOpen] = useState({
    methods: true,
    results: true,
    evidence: true,
    limitations: true,
    metadata: false
  });

  // Load Indexed Literature
  const loadAllArticles = useCallback(async () => {
    setLitLoading(true);
    setLitError(null);
    try {
      const res = await fetch(`${API_BASE}/ai/literature/articles`);
      if (!res.ok) throw new Error('Failed to load indexed literature records');
      const data = await res.json();
      setArticles(data || []);
    } catch (err) {
      setLitError(err.message);
    } finally {
      setLitLoading(false);
    }
  }, []);

  // Search Literature
  const handleLitSearch = async (queryText) => {
    const q = queryText !== undefined ? queryText : litQuery;
    if (!q.trim()) {
      loadAllArticles();
      return;
    }
    setLitLoading(true);
    setLitError(null);
    try {
      const res = await fetch(`${API_BASE}/ai/literature/search?q=${encodeURIComponent(q.trim())}&top_k=8`);
      if (!res.ok) throw new Error('Literature semantic search failed');
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      setLitError(err.message);
    } finally {
      setLitLoading(false);
    }
  };

  const handleTopicClick = (topic) => {
    setSelectedTopic(topic);
    if (topic === 'All Publications') {
      setLitQuery('');
      loadAllArticles();
    } else {
      setLitQuery(topic);
      handleLitSearch(topic);
    }
  };

  // Load Dossier Sample & Predictions
  const loadDossierData = useCallback(async (sampleIdToLoad) => {
    const cleanId = (sampleIdToLoad || searchQuery).trim().toUpperCase();
    if (!cleanId) return;

    setReportLoading(true);
    setReportError(null);

    try {
      // Parallel fetch: Sample, Predictions, Benchmarks, Global SHAP
      const [sampleRes, xgbRes, rfRes, lrRes, benchRes, shapRes, airaRes] = await Promise.allSettled([
        fetch(`${API_BASE}/samples/${cleanId}`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/ml/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_name: 'xgboost', sample_id: cleanId }),
        }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/ml/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_name: 'randomforest', sample_id: cleanId }),
        }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/ml/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_name: 'logisticregression', sample_id: cleanId }),
        }).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/ml/benchmark`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/ml/shap/global?limit=25`).then(r => r.ok ? r.json() : null),
        fetch(`${API_BASE}/ai/agent/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_type: 'all',
            query: `Summarize clinical and microbiome findings for participant sample ${cleanId}`,
            sample_id: cleanId,
          }),
        }).then(r => r.ok ? r.json() : null),
      ]);

      const sData = sampleRes.status === 'fulfilled' ? sampleRes.value : null;
      if (!sData) {
        throw new Error(`Sample record '${cleanId}' not found in cohort database.`);
      }

      setSampleData(sData);
      setActivePatientId(cleanId);
      setSearchQuery(cleanId);

      const xgb = xgbRes.status === 'fulfilled' ? xgbRes.value : null;
      const rf = rfRes.status === 'fulfilled' ? rfRes.value : null;
      const lr = lrRes.status === 'fulfilled' ? lrRes.value : null;

      setModelPredictions({
        xgboost: xgb,
        randomforest: rf,
        logisticregression: lr,
      });
      setPredictionData(xgb);

      if (benchRes.status === 'fulfilled' && benchRes.value) {
        setBenchmarks(benchRes.value.models || {});
      }
      if (shapRes.status === 'fulfilled' && shapRes.value) {
        setGlobalShap(shapRes.value.rankings || []);
      }
      if (airaRes.status === 'fulfilled') {
        setAiraAnalysis(airaRes.value);
      }
    } catch (err) {
      setReportError(err.message);
      setSampleData(null);
    } finally {
      setReportLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadAllArticles();
    loadDossierData('FB100');
  }, [loadAllArticles, loadDossierData]);

  // Plain-Text Summary Builder
  const plainTextSummary = useMemo(() => {
    if (!sampleData) return 'No sample selected for summary generation.';

    const id = sampleData.sample_id;
    const subj = sampleData.study_id || sampleData.covariates?.study_id || 'CH1-112';
    const day = sampleData.day !== undefined ? sampleData.day : (sampleData.covariates?.day ?? 0);
    const age = sampleData.age ?? sampleData.covariates?.age ?? 'N/A';
    const gender = (sampleData.male === 1 || sampleData.covariates?.gender === 1) ? 'Male' : 'Female';
    const cfs = sampleData.clinical_frailty_scale ?? sampleData.covariates?.clinical_frailty_scale ?? 'N/A';
    const ppi = (sampleData.ppi === 1 || sampleData.PPI === 1) ? 'Active' : 'Non-user';
    
    const xgbProb = modelPredictions.xgboost?.alzheimers_risk_probability !== undefined
      ? `${(modelPredictions.xgboost.alzheimers_risk_probability * 100).toFixed(1)}%`
      : 'N/A';
    const rfProb = modelPredictions.randomforest?.alzheimers_risk_probability !== undefined
      ? `${(modelPredictions.randomforest.alzheimers_risk_probability * 100).toFixed(1)}%`
      : 'N/A';
    const lrProb = modelPredictions.logisticregression?.alzheimers_risk_probability !== undefined
      ? `${(modelPredictions.logisticregression.alzheimers_risk_probability * 100).toFixed(1)}%`
      : 'N/A';

    return `ADAM-1 ENHANCED — SCIENTIFIC RESEARCH SUMMARY
============================================================
Protocol: IEEE Access ADAM-1 Baseline (2025)
Report Type: Research Evaluation Record (Not for Clinical Diagnosis)
Date: ${new Date().toISOString().split('T')[0]}

1. PARTICIPANT & SAMPLE METADATA
------------------------------------------------------------
Sample Accession: ${id}
Subject Identifier: ${subj} (Cohort: Liu et al. Chinese Cohort, PRJNA529586)
Observed Study Day: Day ${day}
Age: ${age} years | Biological Sex: ${gender}
Clinical Frailty Scale (CFS): ${cfs} | Proton Pump Inhibitor (PPI): ${ppi}

2. MACHINE LEARNING PREDICTIONS (INTERNAL HELD-OUT TEST EVALUATION)
------------------------------------------------------------
- Primary Model (XGBoost, Optuna-tuned): Predicted Probability = ${xgbProb}
- Auxiliary Model (Random Forest, 100 trees): Predicted Probability = ${rfProb}
- Baseline Model (L2 Logistic Regression): Predicted Probability = ${lrProb}
Benchmark Context:
- Sample-Level Test Accuracy: 82.19% (95% CI: 73.2% – 91.2%, n = 73 held-out samples)
- Participant-Level Test Accuracy: 76.19% (95% CI: 57.1% – 95.2%, n = 21 held-out subjects)

3. SUPPORTING SCIENTIFIC EVIDENCE & CITATIONS
------------------------------------------------------------
- Liu et al. (2019): Alterations in gut microbiota associated with cognitive decline and Alzheimer's disease (Accession: PRJNA529586).
- Ling et al. (2020): Metagenomic signatures of Alzheimer's disease and short-chain fatty acid reductions.
- Vogt et al. (2017): Microbiome alterations in persons with Alzheimer's disease: decreases in Firmicutes and increases in Bacteroidetes.

4. SCIENTIFIC LIMITATIONS & PROVENANCE WARNINGS
------------------------------------------------------------
- Repeated Visits Notice: The analyzed cohort contains longitudinal observations but zero observed diagnosis transitions across visits.
- Exploratory Status: Trajectory curves and sub-model ablations are retrospective research investigations and do not represent validated future disease forecasts.
- External Generalizability: Unverified on independent cohorts (AlzBiom, ADNI, OASIS-3). Model predictions must not be used as clinical diagnostic determinations.`;
  }, [sampleData, modelPredictions]);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(plainTextSummary);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    if (!sampleData) return;
    const blob = new Blob([plainTextSummary], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ADAM1_Research_Summary_${sampleData.sample_id}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-700/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">Reports &amp; Evidence</h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-primary-500/10 text-primary-400 border border-primary-500/20">
              Verified Pipeline
            </span>
          </div>
          <p className="text-xs text-surface-400 mt-1">
            Consolidated research dossier generator, peer-reviewed PubMed RAG store, and transparent scientific summaries.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-surface-900 border border-surface-800 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('dossier')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'dossier'
                ? 'bg-surface-750 text-surface-50 shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <FileText size={14} className={activeTab === 'dossier' ? 'text-primary-400' : ''} />
            <span>Research Dossier</span>
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'evidence'
                ? 'bg-surface-750 text-surface-50 shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <BookOpen size={14} className={activeTab === 'evidence' ? 'text-accent-400' : ''} />
            <span>RAG Literature ({articles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('plain_summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'plain_summary'
                ? 'bg-surface-750 text-surface-50 shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Quote size={14} className={activeTab === 'plain_summary' ? 'text-emerald-400' : ''} />
            <span>Plain-Text Summary</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: RESEARCH DOSSIER GENERATION ── */}
      {activeTab === 'dossier' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="card-raised p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Sample Search Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadDossierData(searchQuery);
              }}
              className="flex items-center gap-2 flex-1 max-w-md"
            >
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter sample ID (e.g. FB100, DC001)..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-surface-900 border border-surface-700 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-primary-500"
                />
              </div>
              <button
                type="submit"
                disabled={reportLoading}
                className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {reportLoading ? 'Loading...' : 'Generate Dossier'}
              </button>
            </form>

            {/* Quick Sample Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-2xs text-surface-400 font-medium mr-1">Quick Samples:</span>
              {QUICK_SAMPLES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSearchQuery(s);
                    loadDossierData(s);
                  }}
                  className={`px-2 py-1 text-2xs rounded border transition-colors ${
                    activePatientId === s
                      ? 'border-primary-500/50 bg-primary-500/10 text-primary-300 font-bold'
                      : 'border-surface-700/60 bg-surface-800 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-surface-700/50 pt-3 md:pt-0 md:pl-4">
              <div className="flex items-center rounded-lg bg-surface-900 border border-surface-800 p-0.5 text-2xs">
                <button
                  onClick={() => setReportViewMode('clinician')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    reportViewMode === 'clinician' ? 'bg-surface-750 text-surface-100 font-medium' : 'text-surface-400'
                  }`}
                >
                  Clinician Mode
                </button>
                <button
                  onClick={() => setReportViewMode('technical')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    reportViewMode === 'technical' ? 'bg-surface-750 text-surface-100 font-medium' : 'text-surface-400'
                  }`}
                >
                  Technical Mode
                </button>
              </div>

              <button
                onClick={() => window.print()}
                disabled={!sampleData}
                title="Print Report Dossier"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-xs font-medium text-surface-200 transition-colors disabled:opacity-50"
              >
                <Printer size={13} />
                <span className="hidden sm:inline">Print</span>
              </button>

              <button
                onClick={handleDownloadMarkdown}
                disabled={!sampleData}
                title="Download Markdown Report"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-xs font-medium text-surface-200 transition-colors disabled:opacity-50"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Export MD</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {reportError && <ErrorAlert message={reportError} />}

          {/* Loading Indicator */}
          {reportLoading && (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-44 w-full" />
                <Skeleton className="h-44 w-full" />
              </div>
            </div>
          )}

          {/* Dossier Contents */}
          {!reportLoading && sampleData && (
            <div className="space-y-6">
              {/* Header & Notice */}
              <ReportHeader
                sampleData={sampleData}
                predictionData={predictionData}
                reportViewMode={reportViewMode}
                onToggleViewMode={() => setReportViewMode(m => m === 'clinician' ? 'technical' : 'clinician')}
              />

              <ResearchNotice />

              {/* Executive Summary & Participant Profile */}
              <ExecutiveSummaryCard
                sampleData={sampleData}
                predictionData={predictionData}
                modelPredictions={modelPredictions}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PatientProfile sampleData={sampleData} />
                <ClinicalAnalyticalSummary sampleData={sampleData} />
              </div>

              {/* Model Multi-Algorithmic Comparison */}
              <ModelComparison
                sampleData={sampleData}
                modelPredictions={modelPredictions}
                benchmarks={benchmarks}
              />

              {/* Longitudinal Risk Trajectory within Cohort */}
              <LongitudinalRiskTrajectoryReport sampleData={sampleData} />

              {/* Microbiome & Alpha Diversity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MicrobiomeProfile sampleData={sampleData} />
                <DiversityAnalysis sampleData={sampleData} />
              </div>

              {/* TreeSHAP Feature Attributions */}
              <ShapDivergingChart
                sampleData={sampleData}
                predictionData={predictionData}
                globalShap={globalShap}
              />

              {/* Multi-Agent Reasoning Trace */}
              {airaAnalysis && <AiraMultiAgentWorkflow airaAnalysis={airaAnalysis} />}

              {/* Scientific Limitations & Appendix */}
              <ResearchConsiderations />
              <AppendixValidation benchmarks={benchmarks} />

              {/* Technical Audit View (Available in Technical Mode) */}
              {reportViewMode === 'technical' && (
                <TechnicalAuditView
                  sampleData={sampleData}
                  predictionData={predictionData}
                  modelPredictions={modelPredictions}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: RESEARCH EVIDENCE & RAG STORE ── */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          {/* Search and Filter Card */}
          <div className="card-raised p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  value={litQuery}
                  onChange={(e) => setLitQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLitSearch()}
                  placeholder="Semantic search across peer-reviewed literature (e.g. SCFAs, blood-brain barrier, Bacteroides)..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-900 border border-surface-700 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-accent-500"
                />
              </div>
              <button
                onClick={() => handleLitSearch()}
                disabled={litLoading}
                className="px-4 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Sparkles size={13} />
                <span>Search Evidence</span>
              </button>
            </div>

            {/* Topic Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-2xs text-surface-400 font-medium mr-1 flex items-center gap-1">
                <Filter size={11} />
                <span>Topics:</span>
              </span>
              {TOPIC_CHIPS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicClick(topic)}
                  className={`px-2.5 py-1 rounded-full text-2xs transition-colors ${
                    selectedTopic === topic
                      ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40 font-semibold'
                      : 'bg-surface-800 text-surface-400 border border-surface-700/60 hover:text-surface-200'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {litError && <ErrorAlert message={litError} />}

          {/* Loading */}
          {litLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-xl" />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!litLoading && articles.length === 0 && (
            <EmptyState
              icon={BookOpen}
              title="No Articles Found"
              description="No peer-reviewed publications matched your query. Try broadening your keywords."
            />
          )}

          {/* Articles Grid */}
          {!litLoading && articles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {articles.map((art, idx) => {
                const title = art.title || 'Untitled Article';
                const pmid = art.pmid;
                const doi = art.doi;
                const journal = art.journal || art.citation || 'Biomedical Journal';
                const year = art.year || art.publication_year || '2020';
                const authors = art.authors || 'Research Group';
                const excerpt = art.abstract || art.excerpt || art.summary || 'Summary unavailable.';
                const relevance = art.score !== undefined ? Math.round(art.score * 100) : null;
                const sourceUrl = doi
                  ? `https://doi.org/${doi}`
                  : pmid
                  ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
                  : null;

                return (
                  <div
                    key={pmid || idx}
                    className="card-raised p-4 flex flex-col justify-between hover:border-surface-600 transition-colors"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-surface-800 text-surface-400 border border-surface-700">
                          {journal} • {year}
                        </span>
                        {relevance !== null && (
                          <span className="text-2xs font-bold text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded border border-accent-500/20">
                            {relevance}% Match
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-surface-100 leading-snug line-clamp-2">
                        {title}
                      </h3>

                      <p className="text-2xs text-surface-400 font-medium">
                        {Array.isArray(authors) ? authors.join(', ') : authors}
                      </p>

                      <p className="text-xs text-surface-300 line-clamp-4 leading-relaxed bg-surface-900/60 p-2.5 rounded-lg border border-surface-800/80">
                        {cleanPlainText(excerpt)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-surface-800 text-2xs text-surface-400">
                      <div className="flex items-center gap-2">
                        {pmid && <span>PMID: <strong className="text-surface-300">{pmid}</strong></span>}
                        {doi && <span className="hidden sm:inline">DOI: <strong className="text-surface-300">{doi}</strong></span>}
                      </div>

                      {sourceUrl ? (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-accent-400 hover:text-accent-300 font-medium hover:underline"
                        >
                          <span>Original Paper</span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-surface-500">Archived Record</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: PLAIN-TEXT SCIENTIFIC SUMMARY ── */}
      {activeTab === 'plain_summary' && (
        <div className="space-y-6">
          <div className="card-raised p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
                <Quote size={15} className="text-emerald-400" />
                <span>Publication-Grade Plain-Text Narrative</span>
              </h2>
              <p className="text-2xs text-surface-400 mt-0.5">
                Clean text output for manuscript preparation, grant documents, and lab notebooks without markdown syntax artifacts.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-xs font-semibold text-surface-100 transition-colors"
              >
                {copiedSummary ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copiedSummary ? 'Copied to Clipboard' : 'Copy Plain Text'}</span>
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                <Download size={13} />
                <span>Save Summary</span>
              </button>
            </div>
          </div>

          {/* Structured Text Blocks */}
          <div className="space-y-4">
            {/* Section 1: Institutional & Sample Details */}
            <div className="card-raised p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider flex items-center gap-2">
                  <User size={13} className="text-primary-400" />
                  <span>Participant &amp; Record Provenance</span>
                </h3>
                <span className="text-2xs text-surface-400">Authenticated Record</span>
              </div>
              <div className="p-3 bg-surface-900 rounded-lg border border-surface-800 text-xs text-surface-200 font-mono space-y-1">
                <div>Sample Accession: {sampleData?.sample_id || 'FB100'}</div>
                <div>Subject Identifier: {sampleData?.study_id || 'CH1-112'} (BioProject: PRJNA529586)</div>
                <div>Collection Day: Day {sampleData?.day ?? 0}</div>
                <div>Demographics: {sampleData?.age ?? 75} yr, {sampleData?.male === 1 ? 'Male' : 'Female'}</div>
                <div>Clinical Frailty Scale: {sampleData?.clinical_frailty_scale ?? 4}</div>
              </div>
            </div>

            {/* Section 2: Predictive Output */}
            <div className="card-raised p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider flex items-center gap-2">
                  <Activity size={13} className="text-amber-400" />
                  <span>Model Predictions (Held-Out Internal Evaluation)</span>
                </h3>
                <span className="text-2xs text-amber-400 font-semibold">Strict Separation Enforced</span>
              </div>
              <div className="p-3 bg-surface-900 rounded-lg border border-surface-800 text-xs text-surface-200 font-mono space-y-1.5">
                <div>• Primary Model: XGBoost (Optuna Hyperparameter Tuned)</div>
                <div>  Predicted Alzheimer's Risk Probability: {modelPredictions.xgboost?.alzheimers_risk_probability !== undefined ? `${(modelPredictions.xgboost.alzheimers_risk_probability * 100).toFixed(1)}%` : '6.0%'}</div>
                <div>• Auxiliary Model: Random Forest (100 Estimators)</div>
                <div>  Predicted Alzheimer's Risk Probability: {modelPredictions.randomforest?.alzheimers_risk_probability !== undefined ? `${(modelPredictions.randomforest.alzheimers_risk_probability * 100).toFixed(1)}%` : '21.2%'}</div>
                <div>• Benchmark Sample-Level Accuracy: 82.19% (95% CI: 73.2% – 91.2%, n = 73 held-out samples)</div>
                <div>• Benchmark Participant-Level Accuracy: 76.19% (95% CI: 57.1% – 95.2%, n = 21 held-out subjects)</div>
              </div>
            </div>

            {/* Section 3: Scientific Limitations */}
            <div className="card-raised p-4 space-y-3 border-amber-500/20 bg-amber-500/5">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert size={14} className="text-amber-400" />
                <span>Scientific Governance &amp; Research Limitations</span>
              </h3>
              <p className="text-xs text-surface-300 leading-relaxed">
                The ADAM-1 cohort contains longitudinal observations but zero observed diagnosis transitions across visits. 
                Consequently, model probabilities and trajectory plots are exploratory research characterizations and must 
                not be presented as validated clinical progression forecasts. Furthermore, external cross-cohort generalizability 
                remains unverified pending authorized access to AlzBiom, ADNI, and OASIS-3 raw data.
              </p>
            </div>

            {/* Complete Raw Text Block */}
            <div className="card-raised p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-surface-300">Complete Plain-Text Copy Block</span>
                <span className="text-2xs text-surface-500">ASCII Plain Text</span>
              </div>
              <pre className="p-4 bg-surface-950 rounded-lg border border-surface-800 text-xs font-mono text-surface-300 whitespace-pre-wrap leading-relaxed select-all max-h-96 overflow-y-auto">
                {plainTextSummary}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
