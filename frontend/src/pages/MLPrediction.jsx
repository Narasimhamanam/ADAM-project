import React, { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  RefreshCw,
  Search,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Filter,
  Layers,
} from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import Skeleton from '../components/ui/Skeleton'

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export default function MLPrediction() {
  const [samples, setSamples] = useState([])
  const [selectedSampleId, setSelectedSampleId] = useState('')
  const [selectedModel, setSelectedModel] = useState('xgboost')
  const [diagnosisFilter, setDiagnosisFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [cohortLoading, setCohortLoading] = useState(true)
  const [prediction, setPrediction] = useState(null)
  const [error, setError] = useState(null)

  // Load complete cohort samples on mount (all 335 samples)
  const loadSamples = useCallback(async () => {
    setCohortLoading(true)
    try {
      const res = await fetch(`${API_BASE}/samples?page=1&page_size=335`)
      if (res.ok) {
        const data = await res.json()
        const sampleList = data.samples || []
        setSamples(sampleList)
        if (sampleList.length > 0 && !selectedSampleId) {
          setSelectedSampleId(sampleList[0].sample_id)
        }
      }
    } catch (err) {
      console.error('Failed to load samples for prediction selector:', err)
    } finally {
      setCohortLoading(false)
    }
  }, [selectedSampleId])

  useEffect(() => {
    loadSamples()
  }, [loadSamples])

  // Execute real ML prediction for sample and model
  const runPrediction = useCallback(async (sampleId, modelName) => {
    if (!sampleId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/ml/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: modelName,
          sample_id: sampleId,
        }),
      })
      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Prediction failed')
      }
      const data = await res.json()
      setPrediction(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Recalculate whenever sample ID or model changes
  useEffect(() => {
    if (selectedSampleId) {
      runPrediction(selectedSampleId, selectedModel)
    }
  }, [selectedSampleId, selectedModel, runPrediction])

  // Filtered samples for selection
  const filteredSamples = samples.filter((s) => {
    const isAD = s.alzheimers === 1 || s.alzheimers === 1.0 || s.alzheimers_diagnosis === 1
    const matchesDiagnosis =
      diagnosisFilter === 'all' ||
      (diagnosisFilter === 'positive' && isAD) ||
      (diagnosisFilter === 'control' && !isAD)
    const matchesSearch =
      !searchQuery ||
      s.sample_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.study_id && s.study_id.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesDiagnosis && matchesSearch
  })

  const riskProb = prediction ? prediction.alzheimers_risk_probability : 0
  const riskPercentStr = prediction ? (riskProb * 100).toFixed(1) : '0.0'
  const confidencePercentStr = prediction ? (prediction.confidence * 100).toFixed(1) : '0.0'
  const isHighRisk = prediction?.predicted_label === 1 || riskProb >= 0.5

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">ML Risk Prediction Studio</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-300 border border-accent-500/30">
              Real-Time Inference
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            Live multi-omic predictive inference evaluating Alzheimer's probability on real cohort metagenomic profiles.
          </p>
        </div>
        <button
          onClick={() => runPrediction(selectedSampleId, selectedModel)}
          disabled={loading}
          className="btn-ghost text-xs border border-surface-600/60 flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Re-evaluate Model
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={() => runPrediction(selectedSampleId, selectedModel)} />}

      {/* ── Control Bar ── */}
      <div className="card-raised p-5 bg-gradient-to-r from-surface-900 via-surface-900 to-surface-800 border border-surface-700/60 space-y-4">
        {/* Top filter row */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-surface-700/60">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-surface-400 font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Filter size={12} className="text-accent-500" /> Filter Cohort:
            </span>
            <div className="flex gap-1.5">
              {[
                { id: 'all', label: `All (${samples.length})` },
                { id: 'positive', label: `AD Positive (${samples.filter(s => s.alzheimers === 1).length})` },
                { id: 'control', label: `Control (${samples.filter(s => s.alzheimers === 0).length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDiagnosisFilter(f.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    diagnosisFilter === f.id
                      ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border border-accent-500/30'
                      : 'bg-surface-800 text-surface-400 hover:text-surface-100 border border-surface-700/60'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Search sample or study ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-8 py-1 text-xs"
            />
          </div>
        </div>

        {/* Selection Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Sample selector */}
          <div>
            <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-2">
              Select Patient Cohort Sample ({filteredSamples.length} available)
            </label>
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              disabled={cohortLoading || filteredSamples.length === 0}
              className="input font-mono text-xs"
            >
              {filteredSamples.map((s) => {
                const isAD = s.alzheimers === 1 || s.alzheimers === 1.0
                return (
                  <option key={s.sample_id} value={s.sample_id}>
                    {s.sample_id} ({s.study_id}) — Ground Truth: {isAD ? 'Alzheimer’s (+)' : 'Cognitive Normal (0)'}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Model selector */}
          <div>
            <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-2">
              Inference Architecture
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'xgboost', label: 'XGBoost' },
                { id: 'randomforest', label: 'Random Forest' },
                { id: 'logisticregression', label: 'Logistic Reg' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-all ${
                    selectedModel === m.id
                      ? 'bg-accent-500/15 border-accent-500 text-accent-600 dark:text-accent-300 shadow-sm'
                      : 'bg-surface-900/60 border-surface-700 text-surface-400 hover:text-surface-100'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div>
            <button
              onClick={() => runPrediction(selectedSampleId, selectedModel)}
              disabled={loading || !selectedSampleId}
              className="w-full btn-teal py-2.5 flex items-center justify-center gap-2 text-xs font-semibold"
            >
              {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{loading ? 'Evaluating Model Inference...' : 'Calculate Diagnostic Probability'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Prediction Result Dashboard ── */}
      {prediction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Gauge Card */}
          <div className="card-raised p-6 bg-surface-900 border border-surface-700/60 flex flex-col items-center justify-center text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-2">
              Alzheimer's Risk Probability
            </h2>

            {/* Circular Gauge visual */}
            <div className="relative w-40 h-40 flex items-center justify-center my-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-surface-700"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`transition-all duration-1000 ${
                    isHighRisk ? 'stroke-danger-500' : riskProb >= 0.35 ? 'stroke-warning-500' : 'stroke-accent-500'
                  }`}
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * riskProb)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-data text-3xl font-extrabold text-surface-50 tracking-tight">{riskPercentStr}%</span>
                <span className="text-[10px] text-surface-400 font-bold uppercase tracking-wider mt-0.5">Risk Score</span>
              </div>
            </div>

            {/* Key Output Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-2 w-full mt-2 pt-3 border-t border-surface-700/60 text-xs">
              <div className="p-2.5 bg-surface-800/80 rounded-lg border border-surface-700/40">
                <p className="text-[10px] text-surface-400 uppercase font-semibold">Predicted Class</p>
                <p className={`font-mono font-bold text-xs mt-0.5 ${prediction.predicted_label === 1 ? 'text-danger-500 dark:text-danger-400' : 'text-accent-600 dark:text-accent-400'}`}>
                  {prediction.predicted_label === 1 ? 'Alzheimer’s (1)' : 'Control (0)'}
                </p>
              </div>
              <div className="p-2.5 bg-surface-800/80 rounded-lg border border-surface-700/40">
                <p className="text-[10px] text-surface-400 uppercase font-semibold">Confidence</p>
                <p className="font-data font-bold text-xs mt-0.5 text-accent-600 dark:text-accent-400">
                  {confidencePercentStr}%
                </p>
              </div>
            </div>

            {/* Classification Badge */}
            <div className="mt-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                  isHighRisk
                    ? 'bg-danger-500/15 text-danger-500 dark:text-danger-400 border-danger-500/30'
                    : riskProb >= 0.35
                    ? 'bg-warning-500/15 text-warning-600 dark:text-warning-400 border-warning-500/30'
                    : 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border-accent-500/30'
                }`}
              >
                {isHighRisk ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />}
                {prediction.risk_level}
              </span>
            </div>

            <p className="text-xs text-surface-400 mt-3 leading-relaxed">
              Inference by <span className="font-semibold text-surface-200 uppercase">{prediction.model_name}</span> on sample{' '}
              <code className="text-accent-500 dark:text-accent-400 font-mono font-bold">{prediction.sample_id}</code>.
            </p>
          </div>

          {/* Biomarker Contributors (SHAP Waterfall) */}
          <div className="lg:col-span-2 card-raised p-6 bg-surface-900 border border-surface-700/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-surface-50 flex items-center gap-2">
                    <Activity size={16} className="text-accent-500" />
                    Key Feature &amp; Biomarker Drivers (TreeSHAP)
                  </h2>
                  <p className="text-xs text-surface-400 mt-0.5">
                    Individual microbiome abundances and clinical covariates driving this specific prediction.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {prediction.feature_contributions?.map((c, i) => {
                  const increasesRisk = c.impact === 'increases_risk'
                  const barWidth = Math.min(100, Math.abs(c.shap_value) * 120)

                  return (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-surface-800/60 border border-surface-700/40 flex items-center justify-between text-xs gap-3 hover:border-surface-600 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-surface-100 truncate">{c.feature}</span>
                          <span
                            className={`font-data font-bold ${
                              increasesRisk ? 'text-danger-500 dark:text-danger-400' : 'text-accent-600 dark:text-accent-400'
                            }`}
                          >
                            {increasesRisk ? '+' : ''}
                            {c.shap_value.toFixed(4)}
                          </span>
                        </div>

                        {/* Visual contribution bar with diverging styling */}
                        <div className="w-full bg-surface-700/50 h-1.5 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full rounded-full transition-all ${
                              increasesRisk ? 'bg-danger-500' : 'bg-accent-500'
                            }`}
                            style={{ width: `${Math.max(6, barWidth)}%` }}
                          />
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono shrink-0 ${
                          increasesRisk
                            ? 'bg-danger-500/15 text-danger-500 dark:text-danger-400 border border-danger-500/25'
                            : 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border border-accent-500/25'
                        }`}
                      >
                        {increasesRisk ? 'Increases AD Risk' : 'Protective / Decreases'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
