import React, { useState, useEffect } from 'react'
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  Search,
  Activity,
  RefreshCw,
  Dna,
  UserCheck,
  UserX,
  Layers,
  ArrowRight,
  Filter,
  ShieldAlert,
  Info,
} from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import Skeleton from '../components/ui/Skeleton'

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export default function AlzheimerAnalysis() {
  const [samples, setSamples] = useState([])
  const [selectedSampleId, setSelectedSampleId] = useState('')
  const [predictionData, setPredictionData] = useState(null)
  const [selectedModel, setSelectedModel] = useState('xgboost')
  const [searchQuery, setSearchQuery] = useState('')
  const [diagnosisFilter, setDiagnosisFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  // Load sample cohort list
  async function loadCohort() {
    setLoading(true)
    setError(null)
    try {
      let res = await fetch(`${API_BASE}/samples?page=1&page_size=335`)
      if (!res.ok) {
        // Fallback to ML samples endpoint
        res = await fetch(`${API_BASE}/ml/samples?limit=335`)
      }
      if (!res.ok) throw new Error('Failed to load patient samples from cohort database')
      const data = await res.json()
      const sampleList = data.samples || (Array.isArray(data) ? data : [])
      setSamples(sampleList)
      if (sampleList.length > 0 && !selectedSampleId) {
        setSelectedSampleId(sampleList[0].sample_id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCohort()
  }, [])

  // Single Source of Truth: Fetch record-specific prediction and ground truth whenever sample or model changes
  useEffect(() => {
    let ignore = false

    async function fetchRecordPrediction() {
      if (!selectedSampleId) return
      setAnalyzing(true)
      setError(null)

      try {
        const res = await fetch(
          `${API_BASE}/samples/${selectedSampleId}/prediction?model=${selectedModel}`
        )
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.detail || `Prediction failed for sample ${selectedSampleId}`)
        }
        const data = await res.json()
        if (!ignore) {
          setPredictionData(data)
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message)
          setPredictionData(null)
        }
      } finally {
        if (!ignore) {
          setAnalyzing(false)
        }
      }
    }

    fetchRecordPrediction()

    return () => {
      ignore = true
    }
  }, [selectedSampleId, selectedModel])

  const filteredSamples = samples.filter((s) => {
    const isAD = s.alzheimers === 1 || s.alzheimers === 1.0 || s.alzheimers_diagnosis === 1
    const matchesDiagnosis =
      diagnosisFilter === 'all' ||
      (diagnosisFilter === 'ad' && isAD) ||
      (diagnosisFilter === 'control' && !isAD)

    const matchesSearch =
      s.sample_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.study_id && s.study_id.toLowerCase().includes(searchQuery.toLowerCase()))

    return matchesDiagnosis && matchesSearch
  })

  // Derived atomic variables from the single-source-of-truth predictionData
  const actualLabel = predictionData?.ground_truth?.label ?? null
  const actualDiagnosis = predictionData?.ground_truth?.diagnosis ?? 'Unavailable'
  const predictedLabel = predictionData?.prediction?.label ?? null
  const predictedDisplay = predictionData?.prediction?.display_label ?? 'Unavailable'
  const riskPercent = predictionData?.prediction?.risk_percent?.toFixed(1) ?? '0.0'
  const isMatch = predictionData?.evaluation?.correct ?? false
  const statusDetail = predictionData?.evaluation?.status_detail ?? 'Evaluating...'
  const evaluationStatus = predictionData?.evaluation?.status ?? 'Unknown'
  const patient = predictionData?.patient
  const explainability = predictionData?.explainability

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">Alzheimer's Disease Patient Analysis</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-300 border border-accent-500/30">
              Cohort Intelligence
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            Multi-omic profiling comparing Alzheimer's patients vs. cognitively normal control participants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDiagnostics((prev) => !prev)}
            className="btn-ghost text-xs border border-surface-600/60 flex items-center gap-1.5"
          >
            <Info size={14} className="text-accent-500" />
            {showDiagnostics ? 'Hide Diagnostics' : 'Data Integrity Panel'}
          </button>
          <button
            onClick={loadCohort}
            disabled={loading}
            className="btn-ghost text-xs border border-surface-600/60 flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Cohort
          </button>
        </div>
      </div>

      {/* ── Diagnostics / Data Integrity Panel (Section 22) ── */}
      {showDiagnostics && predictionData && (
        <div className="p-4 rounded-xl bg-surface-900 border border-accent-500/30 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-surface-700/60 pb-2">
            <span className="font-bold text-accent-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldAlert size={14} /> Research Data Integrity Diagnostic Bar
            </span>
            <span className="text-[10px] font-mono text-surface-400">Strict Real Data Binding</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded bg-surface-800/80">
              <span className="text-surface-400 block text-[9px] uppercase">Sample ID</span>
              <span className="text-accent-300 font-bold">{predictionData.sample_id}</span>
            </div>
            <div className="p-2 rounded bg-surface-800/80">
              <span className="text-surface-400 block text-[9px] uppercase">Subject ID</span>
              <span className="text-surface-100">{predictionData.subject_id}</span>
            </div>
            <div className="p-2 rounded bg-surface-800/80">
              <span className="text-surface-400 block text-[9px] uppercase">Model</span>
              <span className="text-surface-100 font-bold">{predictionData.prediction.model}</span>
            </div>
            <div className="p-2 rounded bg-surface-800/80">
              <span className="text-surface-400 block text-[9px] uppercase">P(AD) Raw</span>
              <span className="text-accent-300 font-bold">{predictionData.prediction.probability_ad.toFixed(4)}</span>
            </div>
            <div className="p-2 rounded bg-surface-800/80">
              <span className="text-surface-400 block text-[9px] uppercase">Ground Truth</span>
              <span className={predictionData.ground_truth.label === 1 ? 'text-danger-400 font-bold' : 'text-success-400 font-bold'}>
                {predictionData.ground_truth.label} ({predictionData.ground_truth.display_label})
              </span>
            </div>
            <div className="p-2 rounded bg-surface-800/80">
              <span className="text-surface-400 block text-[9px] uppercase">Evaluation</span>
              <span className={isMatch ? 'text-success-400 font-bold' : 'text-warning-400 font-bold'}>
                {predictionData.evaluation.status}
              </span>
            </div>
            <div className="p-2 rounded bg-surface-800/80">
              <span className="text-surface-400 block text-[9px] uppercase">Features</span>
              <span className="text-surface-100">{predictionData.features?.evaluated_features_count ?? 1044}</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <ErrorAlert
          message={error}
          onRetry={() => {
            if (selectedSampleId) {
              setAnalyzing(true)
              fetch(`${API_BASE}/samples/${selectedSampleId}/prediction?model=${selectedModel}`)
                .then((r) => r.json())
                .then((d) => {
                  setPredictionData(d)
                  setError(null)
                })
                .catch((e) => setError(e.message))
                .finally(() => setAnalyzing(false))
            }
          }}
        />
      )}

      {/* ── 2-Column Layout: Patient Selector + Detailed Actual vs Predicted Analysis ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient Cohort Selector */}
        <div className="card-raised p-4 bg-surface-900/70 border border-surface-700/60 flex flex-col h-[750px]">
          <div className="mb-3 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Select Cohort Record ({filteredSamples.length} Samples)
            </h2>

            {/* Filter buttons */}
            <div className="flex gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'ad', label: 'AD Only' },
                { id: 'control', label: 'Controls' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDiagnosisFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    diagnosisFilter === f.id
                      ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border border-accent-500/30'
                      : 'text-surface-400 hover:bg-surface-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Search sample or study..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-8 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Patient Scroll List */}
          {loading ? (
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/40 animate-pulse space-y-1.5">
                  <div className="h-3.5 bg-surface-700/60 rounded w-1/3" />
                  <div className="h-2.5 bg-surface-700/40 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1 divide-y divide-surface-800/40">
              {filteredSamples.map((s) => {
                const isAD = s.alzheimers === 1 || s.alzheimers === 1.0 || s.alzheimers_diagnosis === 1
                const isSelected = s.sample_id === selectedSampleId
                return (
                  <button
                    key={s.sample_id}
                    onClick={() => setSelectedSampleId(s.sample_id)}
                    className={`w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-accent-500/15 border border-accent-500/40 shadow-sm'
                        : 'hover:bg-surface-800/60 border border-transparent'
                    }`}
                  >
                    <div>
                      <p className="font-mono font-bold text-xs text-surface-50">{s.sample_id}</p>
                      <p className="text-[10px] text-surface-400 font-mono">Study: {s.study_id}</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                        isAD
                          ? 'bg-danger-500/15 text-danger-500 dark:text-danger-400 border border-danger-500/30'
                          : 'bg-success-500/15 text-success-600 dark:text-success-400 border border-success-500/30'
                      }`}
                    >
                      {isAD ? 'AD Pos' : 'Control'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Column: Comparative Analysis & Patient Dossier */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Actual Outcome vs Model Predicted Outcome Card ── */}
          <div className="card-raised p-6 bg-gradient-to-br from-surface-900 via-surface-900 to-surface-800 border border-surface-700/70">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-surface-50 flex items-center gap-2">
                <Brain size={18} className="text-accent-500 dark:text-accent-400" />
                Actual Ground Truth vs Model Prediction
              </h2>

              {/* Model Switcher */}
              <div className="flex items-center gap-1 bg-surface-800/80 p-1 rounded-lg border border-surface-700/60">
                {[
                  { id: 'xgboost', label: 'XGBoost' },
                  { id: 'randomforest', label: 'Random Forest' },
                  { id: 'logisticregression', label: 'Logistic Reg' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase transition-all ${
                      selectedModel === m.id
                        ? 'bg-accent-500 text-white shadow-sm'
                        : 'text-surface-400 hover:text-surface-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {analyzing ? (
              <div className="space-y-4 py-2 animate-pulse">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-surface-800/40 border border-surface-700/40 h-36" />
                  <div className="p-5 rounded-xl bg-surface-800/40 border border-surface-700/40 h-36" />
                </div>
                <div className="h-10 bg-surface-800/40 rounded-lg w-full" />
                <div className="grid grid-cols-4 gap-3">
                  <div className="h-16 bg-surface-800/40 rounded-lg" />
                  <div className="h-16 bg-surface-800/40 rounded-lg" />
                  <div className="h-16 bg-surface-800/40 rounded-lg" />
                  <div className="h-16 bg-surface-800/40 rounded-lg" />
                </div>
              </div>
            ) : predictionData ? (
              <div className="space-y-5">
                {/* Visual Comparative Matrix Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Actual Cohort Record Card */}
                  <div className="p-4 rounded-xl bg-surface-900/90 border border-surface-700/60 flex flex-col justify-between shadow-sm">
                    <div>
                      <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                        Ground Truth Record
                      </p>
                      <p className="text-xs text-surface-400 mt-0.5">Clinical Cohort Dataset Entry</p>
                    </div>

                    <div className="my-3 flex items-center gap-3">
                      <div
                        className={`p-3 rounded-xl shrink-0 ${
                          actualLabel === 1
                            ? 'bg-danger-500/15 text-danger-500 dark:text-danger-400'
                            : 'bg-success-500/15 text-success-600 dark:text-success-400'
                        }`}
                      >
                        {actualLabel === 1 ? <UserX size={24} /> : <UserCheck size={24} />}
                      </div>
                      <div>
                        <p className="text-base font-extrabold text-surface-50">
                          {actualLabel === 1 ? 'Alzheimer’s Disease (Positive)' : 'Cognitive Normal (Control)'}
                        </p>
                        <p className="text-xs text-surface-400 font-mono">
                          Diagnosis Flag: {actualLabel} ({actualDiagnosis})
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-surface-400 pt-2 border-t border-surface-800 font-mono">
                      Sample ID: <code className="text-accent-500 dark:text-accent-400 font-bold">{predictionData.sample_id}</code> (Subject: {predictionData.subject_id})
                    </div>
                  </div>

                  {/* Model Prediction Card */}
                  <div className="p-4 rounded-xl bg-surface-900/90 border border-surface-700/60 flex flex-col justify-between shadow-sm">
                    <div>
                      <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                        Model Predicted Outcome
                      </p>
                      <p className="text-xs text-surface-400 mt-0.5">
                        Inference by {predictionData.prediction.model.toUpperCase()}
                      </p>
                    </div>

                    <div className="my-3 flex items-center gap-3">
                      <div
                        className={`p-3 rounded-xl shrink-0 ${
                          predictedLabel === 1
                            ? 'bg-danger-500/15 text-danger-500 dark:text-danger-400'
                            : 'bg-success-500/15 text-success-600 dark:text-success-400'
                        }`}
                      >
                        <Activity size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-extrabold text-surface-50">
                            {predictedDisplay}
                          </p>
                          <span className="text-xs font-data font-bold text-accent-500 dark:text-accent-400 bg-accent-500/15 px-2 py-0.5 rounded border border-accent-500/30">
                            {riskPercent}% Risk
                          </span>
                        </div>
                        <p className="text-xs text-surface-400 font-mono">
                          Classification: {predictionData.prediction.classification}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-surface-400 pt-2 border-t border-surface-800 font-mono">
                      Status:{' '}
                      <span
                        className={`font-semibold ${
                          isMatch
                            ? 'text-success-500 dark:text-success-400'
                            : evaluationStatus === 'False Negative' || evaluationStatus === 'False Positive'
                            ? 'text-warning-500 dark:text-warning-400'
                            : 'text-surface-300'
                        }`}
                      >
                        {statusDetail}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match Verdict Pill */}
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                    isMatch
                      ? 'bg-success-500/10 border-success-500/30 text-success-600 dark:text-success-400'
                      : 'bg-warning-500/10 border-warning-500/30 text-warning-600 dark:text-warning-400'
                  }`}
                >
                  {isMatch ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                  <span>
                    <strong>Model Verdict:</strong>{' '}
                    {isMatch
                      ? 'Model prediction exactly matches clinical ground truth.'
                      : evaluationStatus === 'False Negative'
                      ? 'False Negative: Model under-predicted Alzheimer’s risk (< 50%) for clinical AD positive subject.'
                      : 'False Positive: Model over-predicted Alzheimer’s risk (≥ 50%) for cognitively normal control participant.'}
                  </span>
                </div>

                {/* Clinical Metadata Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 text-center">
                    <p className="text-[10px] text-surface-400 uppercase font-semibold">Age</p>
                    <p className="font-data text-sm font-bold text-surface-50 mt-0.5">{patient?.age ?? '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 text-center">
                    <p className="text-[10px] text-surface-400 uppercase font-semibold">Frailty Scale</p>
                    <p className="font-data text-sm font-bold text-surface-50 mt-0.5">{patient?.frailty_scale ?? '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 text-center">
                    <p className="text-[10px] text-surface-400 uppercase font-semibold">Malnutrition Score</p>
                    <p className="font-data text-sm font-bold text-surface-50 mt-0.5">{patient?.malnutrition_score ?? '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 text-center">
                    <p className="text-[10px] text-surface-400 uppercase font-semibold">PPI Medication</p>
                    <p className="font-mono text-sm font-bold text-surface-50 mt-0.5">
                      {patient?.ppi_medication ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>

                {/* Top Driving Biomarkers for This Specific Record */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
                      <Dna size={14} className="text-accent-500" />
                      Top Microbiome &amp; Clinical Biomarkers Influencing This Patient
                    </h3>
                    <span className="text-[10px] font-mono text-surface-500">
                      Method: {explainability?.method ?? 'TreeSHAP'}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {explainability?.shap_features?.slice(0, 8).map((c, i) => {
                      const increases = c.impact === 'increases_risk'
                      return (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-surface-900/60 border border-surface-700/40 flex items-center justify-between text-xs hover:border-surface-600 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-medium text-surface-100">{c.feature}</span>
                            <span className="text-[10px] text-surface-400 font-mono ml-2">
                              (Val: {c.feature_value.toFixed(3)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`font-data text-xs font-bold ${
                                increases ? 'text-danger-500 dark:text-danger-400' : 'text-accent-600 dark:text-accent-400'
                              }`}
                            >
                              {increases ? '+' : ''}
                              {c.shap_value.toFixed(4)}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold font-mono ${
                                increases
                                  ? 'bg-danger-500/15 text-danger-500 dark:text-danger-400 border border-danger-500/25'
                                  : 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border border-accent-500/25'
                              }`}
                            >
                              {increases ? 'Pushes AD' : 'Protective'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
