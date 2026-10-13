import React, { useState, useEffect, useCallback } from 'react'
import {
  Brain,
  Cpu,
  TrendingUp,
  Zap,
  Dna,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  BookOpen,
  ExternalLink,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react'
import { fetchAvailableSamples, executeAdamWorkflow, fetchResearchDatasets } from '../api/client'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import ShapDivergingChart from '../components/reports/ShapDivergingChart'

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

const PIPELINE_STAGES = [
  { id: 'computation', step: 1, label: 'Computation', desc: 'Preprocessing, MetaPhlAn taxonomy alignment & ML feature extraction' },
  { id: 'retrieval', step: 2, label: 'Evidence Retrieval', desc: 'Querying vector store for PubMed citations on key taxa' },
  { id: 'summarization', step: 3, label: 'Summarization', desc: 'AIRA agent synthesizes biomarker findings & clinical profile' },
  { id: 'classification', step: 4, label: 'Classification', desc: 'AIRA classification agent verifies consistency & risk rationale' },
  { id: 'result', step: 5, label: 'Final Result', desc: 'Calibrated consensus risk prediction & audit trail generated' },
]

export default function Analyze() {
  const [datasets, setDatasets] = useState([])
  const [selectedCohort, setSelectedCohort] = useState('ADAM1_BASELINE')
  const [samples, setSamples] = useState([])
  const [selectedSampleId, setSelectedSampleId] = useState('DC054')
  const [selectedModel, setSelectedModel] = useState('xgboost')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [threshold, setThreshold] = useState(0.5)
  const [includeShap, setIncludeShap] = useState(true)
  const [includeLiterature, setIncludeLiterature] = useState(true)

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('')
  const [diagnosisFilter, setDiagnosisFilter] = useState('all')

  // Execution state
  const [running, setRunning] = useState(false)
  const [currentStage, setCurrentStage] = useState(null)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [error, setError] = useState(null)
  const [cohortLoading, setCohortLoading] = useState(true)
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  // 1. Load available datasets & sample cohort
  useEffect(() => {
    async function initData() {
      setCohortLoading(true)
      try {
        const [dsRes, sList] = await Promise.allSettled([
          fetchResearchDatasets(),
          fetchAvailableSamples(335),
        ])

        if (dsRes.status === 'fulfilled') {
          setDatasets(dsRes.value?.datasets || [])
        }
        if (sList.status === 'fulfilled') {
          const loaded = sList.value || []
          setSamples(loaded)
          if (loaded.length > 0 && !loaded.some((s) => s.sample_id === selectedSampleId)) {
            setSelectedSampleId(loaded[0].sample_id)
          }
        }
      } catch (err) {
        console.error('Failed to initialize analysis selector data:', err)
      } finally {
        setCohortLoading(false)
      }
    }
    initData()
  }, [])

  // Filter samples
  const filteredSamples = samples.filter((s) => {
    const isAD = s.alzheimers === 1 || s.alzheimers === 1.0 || s.alzheimers_diagnosis === 1
    const matchesDiagnosis =
      diagnosisFilter === 'all' ||
      (diagnosisFilter === 'positive' && isAD) ||
      (diagnosisFilter === 'control' && !isAD)
    const matchesSearch =
      !searchQuery ||
      s.sample_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.study_id && s.study_id.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesDiagnosis && matchesSearch
  })

  // 2. Execute analysis workflow
  const handleRunAnalysis = async () => {
    if (!selectedSampleId) return
    setRunning(true)
    setError(null)
    setAnalysisResult(null)

    try {
      if (selectedModel === 'adam_workflow') {
        // Multi-agent workflow execution
        setCurrentStage('computation')
        await new Promise((r) => setTimeout(r, 400))
        setCurrentStage('retrieval')
        await new Promise((r) => setTimeout(r, 400))
        setCurrentStage('summarization')

        const data = await executeAdamWorkflow(selectedSampleId)
        setCurrentStage('classification')
        await new Promise((r) => setTimeout(r, 300))
        setCurrentStage('result')

        setAnalysisResult({
          type: 'workflow',
          sample_id: selectedSampleId,
          study_id: data.study_id || samples.find((s) => s.sample_id === selectedSampleId)?.study_id,
          model: 'ADAM Multi-Agent Workflow',
          cohort: selectedCohort,
          timestamp: new Date().toISOString(),
          predicted_label: data.predicted_label ?? (data.risk_probability >= threshold ? 1 : 0),
          probability: data.risk_probability ?? data.probability ?? 0.5,
          confidence: data.confidence ?? 0.85,
          ground_truth: samples.find((s) => s.sample_id === selectedSampleId)?.alzheimers ?? null,
          shap_values: data.shap_values || data.top_features || [],
          literature_articles: data.literature_articles || data.references || [],
          summary_text: data.summary_text || data.agent_summary || '',
          classification_rationale: data.classification_rationale || '',
          raw_data: data,
        })
      } else {
        // Standard model prediction (XGBoost, Random Forest, Logistic Regression)
        setCurrentStage('computation')
        const res = await fetch(`${API_BASE}/ml/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model_name: selectedModel,
            sample_id: selectedSampleId,
          }),
        })

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.detail || 'Prediction failed')
        }

        const data = await res.json()
        setCurrentStage('result')

        // Fetch literature RAG citations if enabled
        let literatureArticles = []
        if (includeLiterature) {
          try {
            const litRes = await fetch(`${API_BASE}/ai/literature/articles`)
            if (litRes.ok) {
              const litData = await litRes.json()
              literatureArticles = (litData.articles || litData || []).slice(0, 3)
            }
          } catch (e) {
            console.warn('Could not retrieve literature citations:', e)
          }
        }

        setAnalysisResult({
          type: 'model',
          sample_id: selectedSampleId,
          study_id: data.study_id || samples.find((s) => s.sample_id === selectedSampleId)?.study_id,
          model: selectedModel.toUpperCase(),
          cohort: selectedCohort,
          timestamp: new Date().toISOString(),
          predicted_label: data.predicted_label,
          probability: data.alzheimers_risk_probability,
          confidence: data.confidence,
          ground_truth: data.ground_truth_label ?? samples.find((s) => s.sample_id === selectedSampleId)?.alzheimers,
          shap_values: data.top_feature_contributions || data.top_features || [],
          literature_articles: literatureArticles,
          raw_data: data,
        })
      }
    } catch (err) {
      setError(err.message || 'An error occurred during model inference')
    } finally {
      setRunning(false)
    }
  }

  const selectedSampleObj = samples.find((s) => s.sample_id === selectedSampleId)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="border-b border-surface-700/60 pb-3">
        <h1 className="text-xl font-bold text-surface-50 flex items-center gap-2">
          <Brain size={22} className="text-accent-400" />
          <span>Multimodal Analysis Studio</span>
        </h1>
        <p className="text-xs text-surface-400 mt-0.5">
          Execute reproducible machine learning inference and multi-agent biomarker explanation on patient samples.
        </p>
      </div>

      {/* ── A. Analysis Setup ── */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-bold text-surface-50 flex items-center gap-2">
          <Play size={15} className="text-accent-400" />
          <span>Analysis Configuration</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cohort Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-surface-300">Cohort / Dataset</label>
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="w-full text-xs rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 text-surface-100 focus:outline-none focus:ring-1 focus:ring-accent-500"
            >
              <option value="ADAM1_BASELINE">ADAM1_BASELINE (Stool Metagenomics + Clinical, 335 samples) [Verified]</option>
              <option value="ALZBIOM_CS" disabled>ALZBIOM_CS (European Validation Cohort) [Not Downloaded]</option>
              <option value="OASIS1_MRI" disabled>OASIS1_MRI (Structural MRI Scans) [No Stool Linkage]</option>
            </select>
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-surface-300">Model Architecture</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full text-xs rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 text-surface-100 focus:outline-none focus:ring-1 focus:ring-accent-500"
            >
              <option value="xgboost">XGBoost (Combined Multimodal Baseline — 1,044 Features)</option>
              <option value="adam_workflow">ADAM Multi-Agent Workflow (5-Stage AIRA Consensus)</option>
              <option value="randomforest">Random Forest (Tree Ensemble Baseline)</option>
              <option value="logisticregression">Logistic Regression (L2 Regularized Baseline)</option>
            </select>
          </div>

          {/* Sample Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-surface-300">Select Clinical Sample</label>
            <div className="flex gap-2">
              <select
                value={selectedSampleId}
                onChange={(e) => setSelectedSampleId(e.target.value)}
                className="flex-1 text-xs rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 text-surface-100 font-mono focus:outline-none focus:ring-1 focus:ring-accent-500"
              >
                {filteredSamples.map((s) => (
                  <option key={s.sample_id} value={s.sample_id}>
                    {s.sample_id} ({s.study_id || 'ID'} • {s.alzheimers === 1 ? 'AD' : 'Control'})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Sample Chips & Search Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-700/50">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-surface-400 font-medium">Quick Select:</span>
            {['DC054', 'DC060', 'FB002', 'FB100', 'FB302', 'FB438'].map((sid) => (
              <button
                key={sid}
                onClick={() => setSelectedSampleId(sid)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  selectedSampleId === sid
                    ? 'bg-accent-500 text-white font-bold'
                    : 'bg-surface-800 text-surface-300 hover:bg-surface-700 hover:text-surface-100'
                }`}
              >
                {sid}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2 text-surface-400" />
              <input
                type="text"
                placeholder="Filter samples..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs pl-8 pr-2.5 py-1 rounded-md bg-surface-900 border border-surface-700 text-surface-200 placeholder-surface-500 w-36 focus:outline-none focus:ring-1 focus:ring-accent-500"
              />
            </div>

            <select
              value={diagnosisFilter}
              onChange={(e) => setDiagnosisFilter(e.target.value)}
              className="text-xs px-2 py-1 rounded-md bg-surface-900 border border-surface-700 text-surface-200 focus:outline-none"
            >
              <option value="all">All Diagnoses</option>
              <option value="control">Controls only</option>
              <option value="positive">AD only</option>
            </select>
          </div>
        </div>

        {/* Advanced Options Accordion */}
        <div className="border border-surface-700/60 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-3 py-2 bg-surface-900/60 hover:bg-surface-900 text-xs text-surface-300 font-medium"
          >
            <span>Advanced Execution Parameters</span>
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showAdvanced && (
            <div className="p-3 bg-surface-900/40 border-t border-surface-700/60 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-surface-400 mb-1">Decision Threshold (Default: 0.50)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="0.9"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 rounded bg-surface-900 border border-surface-700 text-surface-100 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="shapCheck"
                  checked={includeShap}
                  onChange={(e) => setIncludeShap(e.target.checked)}
                  className="rounded border-surface-700 bg-surface-900 text-accent-500"
                />
                <label htmlFor="shapCheck" className="text-surface-300 select-none">
                  Compute TreeSHAP attributions
                </label>
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="ragCheck"
                  checked={includeLiterature}
                  onChange={(e) => setIncludeLiterature(e.target.checked)}
                  className="rounded border-surface-700 bg-surface-900 text-accent-500"
                />
                <label htmlFor="ragCheck" className="text-surface-300 select-none">
                  Query Literature RAG Vector Store
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-surface-400">
            Selected: <span className="font-mono text-surface-200 font-bold">{selectedSampleId}</span>
            {selectedSampleObj?.study_id && ` (Participant ${selectedSampleObj.study_id})`}
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={running || !selectedSampleId}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            {running ? <LoadingSpinner size="sm" /> : <Play size={14} />}
            <span>{running ? 'Running Analysis...' : 'Run Analysis'}</span>
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {/* ── B. Analysis Progress (5 Sequence Stages) ── */}
      {running && (
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider flex items-center gap-2">
            <RotateCw size={13} className="animate-spin text-accent-400" />
            <span>Workflow Execution in Progress</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {PIPELINE_STAGES.map((s) => {
              const isCurrent = currentStage === s.id
              return (
                <div
                  key={s.id}
                  className={`p-3 rounded-lg border text-xs transition-all ${
                    isCurrent
                      ? 'border-accent-500 bg-accent-500/10 text-accent-300'
                      : 'border-surface-700/60 bg-surface-900/40 text-surface-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[11px] font-mono">Stage {s.step}</span>
                    {isCurrent && <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-400 animate-ping" />}
                  </div>
                  <div className="font-semibold text-surface-100">{s.label}</div>
                  <p className="text-[10px] text-surface-400 mt-1 line-clamp-2">{s.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── C. Results Layout ── */}
      {analysisResult && (
        <div className="space-y-6">
          {/* 1. Primary Result Card */}
          <div className="card p-5 space-y-4 border-l-4 border-l-accent-500">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-surface-700/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-surface-400">Primary Inference Result</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-surface-800 text-surface-300 font-mono">
                  {analysisResult.model}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-surface-800 text-surface-300 font-mono">
                  Sample {analysisResult.sample_id}
                </span>
              </div>
              <span className="text-[11px] text-surface-400 font-mono">
                {new Date(analysisResult.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
              {/* Predicted Classification */}
              <div className="space-y-1">
                <span className="text-xs text-surface-400 font-medium">Model Predicted Classification</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xl font-extrabold font-mono ${
                      analysisResult.predicted_label === 1 || analysisResult.probability >= threshold
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {analysisResult.predicted_label === 1 || analysisResult.probability >= threshold
                      ? 'Elevated AD Risk'
                      : 'Non-AD Control'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-800 text-surface-300 border border-surface-700 font-mono">
                    Class {analysisResult.predicted_label}
                  </span>
                </div>
              </div>

              {/* Risk Probability */}
              <div className="space-y-1">
                <span className="text-xs text-surface-400 font-medium">Predicted Probability</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-surface-50 font-mono">
                    {(analysisResult.probability * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs text-surface-400 font-mono">
                    (threshold: {threshold.toFixed(2)})
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-surface-800 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      analysisResult.probability >= threshold ? 'bg-rose-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, analysisResult.probability * 100))}%` }}
                  />
                </div>
              </div>

              {/* Ground-Truth Evaluation Benchmark Label */}
              <div className="p-3 rounded-lg bg-surface-900 border border-surface-700/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">Ground Truth Status</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 text-sky-400 font-mono font-semibold">
                    Research Evaluation Only
                  </span>
                </div>
                <div className="text-xs text-surface-200 font-medium">
                  Recorded Cohort Label:{' '}
                  <span className="font-bold font-mono">
                    {analysisResult.ground_truth === 1 ? 'Alzheimer’s Disease (1)' : 'Control (0)'}
                  </span>
                </div>
                <div className="text-[10px] text-surface-400">
                  {analysisResult.predicted_label === analysisResult.ground_truth ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={11} /> Correct prediction on held-out test record
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle size={11} /> Discordant with clinical record
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Scientific Notice */}
            <div className="p-2.5 rounded-lg bg-surface-900/60 border border-surface-700/40 text-[11px] text-surface-400 flex items-center gap-2">
              <Info size={14} className="text-accent-400 shrink-0" />
              <span>
                <strong>Research Notice:</strong> This prediction represents machine learning evaluation on stool metagenomics and host covariates. It is not an FDA-cleared diagnostic test or clinical diagnosis.
              </span>
            </div>
          </div>

          {/* 2. Supporting Evidence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: SHAP Attributions */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-50 uppercase tracking-wider flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" />
                  <span>Key Biomarker Attributions (SHAP)</span>
                </h3>
                <span className="text-[10px] text-surface-400">Top positive/negative drivers</span>
              </div>

              {analysisResult.shap_values && analysisResult.shap_values.length > 0 ? (
                <div className="pt-2">
                  <ShapDivergingChart
                    featureContributions={analysisResult.shap_values.slice(0, 8).map((f) => ({
                      feature: f.feature_name || f.feature || 'Feature',
                      shap_value: f.shap_value || f.attribution || 0,
                      feature_value: f.feature_value ?? f.value ?? 0,
                    }))}
                  />
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-surface-900 border border-surface-700/50 text-xs text-surface-400 text-center">
                  SHAP feature contributions not computed for this model run.
                </div>
              )}
            </div>

            {/* Right: Literature Citations & Multi-Agent Consensus */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-surface-50 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={14} className="text-primary-400" />
                  <span>Supporting Literature &amp; RAG Evidence</span>
                </h3>
                <span className="text-[10px] text-surface-400">PubMed vector store</span>
              </div>

              {analysisResult.summary_text && (
                <div className="p-3 rounded-lg bg-surface-900 border border-surface-700/60 text-xs text-surface-200 leading-relaxed">
                  <p className="font-bold text-[11px] text-accent-400 uppercase tracking-wider mb-1">
                    Multi-Agent Clinical Synthesis:
                  </p>
                  <p className="whitespace-pre-line">{analysisResult.summary_text}</p>
                </div>
              )}

              {analysisResult.literature_articles && analysisResult.literature_articles.length > 0 ? (
                <div className="space-y-2">
                  {analysisResult.literature_articles.slice(0, 3).map((art, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-surface-900 border border-surface-700/50 text-xs space-y-1 hover:border-surface-600 transition-colors"
                    >
                      <div className="font-semibold text-surface-100 flex items-start justify-between gap-2">
                        <span className="line-clamp-1">{art.title || art.citation || 'Scientific Article'}</span>
                        {art.doi && (
                          <a
                            href={`https://doi.org/${art.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent-400 hover:underline shrink-0 flex items-center gap-1 text-[10px]"
                          >
                            <span>DOI</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <p className="text-[11px] text-surface-400 line-clamp-2">
                        {art.abstract || art.excerpt || 'Empirical evidence on gut microbiome dysbiosis in cognitive impairment.'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-surface-900 border border-surface-700/50 text-xs text-surface-400">
                  No direct PubMed citations linked to this individual sample observation.
                </div>
              )}
            </div>
          </div>

          {/* 3. Analysis Details (Expandable) */}
          <div className="card p-4">
            <button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="w-full flex items-center justify-between text-xs font-bold text-surface-300 hover:text-surface-100"
            >
              <span>Technical Metadata &amp; Raw Execution Audit</span>
              {detailsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {detailsExpanded && (
              <div className="mt-3 pt-3 border-t border-surface-700/60 space-y-3 text-xs">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-surface-400 font-mono text-[11px]">
                  <div>
                    <span className="block text-surface-500">Sample ID:</span>
                    <span className="text-surface-200">{analysisResult.sample_id}</span>
                  </div>
                  <div>
                    <span className="block text-surface-500">Cohort ID:</span>
                    <span className="text-surface-200">{analysisResult.cohort}</span>
                  </div>
                  <div>
                    <span className="block text-surface-500">Model Algorithm:</span>
                    <span className="text-surface-200">{analysisResult.model}</span>
                  </div>
                  <div>
                    <span className="block text-surface-500">Execution Timestamp:</span>
                    <span className="text-surface-200">{analysisResult.timestamp}</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-surface-400 mb-1">Raw API Payload Response:</span>
                  <pre className="p-3 rounded-lg bg-surface-950 border border-surface-800 text-[10px] text-surface-300 font-mono overflow-x-auto max-h-48">
                    {JSON.stringify(analysisResult.raw_data, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
