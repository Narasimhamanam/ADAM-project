/**
 * Dashboard Page
 * ==============
 * Main research dashboard — dynamically reflects the active Phase configuration
 * from featurePhases.js, calls real /api/health and /api/system telemetry endpoints,
 * and displays accurate service connectivity and pipeline statuses.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, Database, Server, Brain, Cpu,
  Bot, BookOpen, TrendingUp, Zap, RefreshCw, Clock,
  Dna,
} from 'lucide-react'
import { fetchHealth, fetchSystemInfo, fetchDatasets, fetchMlBenchmark, fetchAiStatus } from '../api/client'
import { useDemoPhase } from '../context/DemoPhaseContext'
import StatusBadge from '../components/ui/StatusBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'

// ── Helpers ──────────────────────────────────────────────────────────────

function resolveHealthStatus(status) {
  if (status === 'healthy' || status === 'connected') return 'connected'
  if (status === 'degraded') return 'degraded'
  if (status === null) return 'loading'
  return 'disconnected'
}

function PipelineCard({ icon: Icon, title, phaseNumber, description, activeDemoPhase }) {
  const isComplete = phaseNumber < activeDemoPhase || (phaseNumber === activeDemoPhase && activeDemoPhase === 4)
  const isActive = phaseNumber === activeDemoPhase && activeDemoPhase < 4
  const isUpcoming = phaseNumber > activeDemoPhase

  return (
    <div
      className={`card p-4 flex gap-4 transition-all duration-200 ${
        isComplete
          ? 'border-success-500/30 bg-gradient-to-br from-success-600/10 to-transparent'
          : isActive
            ? 'border-accent-500/40 bg-gradient-to-br from-accent-600/15 to-transparent'
            : 'border-surface-700/60 bg-surface-900/40 opacity-70 hover:opacity-90'
      }`}
    >
      <div
        className={`rounded-xl p-2.5 shrink-0 ${
          isComplete
            ? 'bg-success-600/20 text-success-400'
            : isActive
              ? 'bg-accent-600/25 text-accent-300'
              : 'bg-surface-800 text-surface-500'
        }`}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-surface-50">{title}</h3>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
              isComplete
                ? 'bg-success-600/20 border-success-500/30 text-success-600 dark:text-success-400'
                : isActive
                  ? 'bg-accent-600/25 border-accent-500/40 text-[#0F9D8A] dark:text-accent-300'
                  : 'bg-surface-800 border-surface-700 text-surface-400'
            }`}
          >
            {isComplete ? '✓ ' : isActive ? '● ' : ''}
            {isComplete
              ? `Phase ${phaseNumber} Complete`
              : isActive
                ? `Phase ${phaseNumber} In Progress`
                : `Phase ${phaseNumber} Upcoming`}
          </span>
        </div>
        <p className="text-xs text-surface-400 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function StatusRow({ icon: Icon, label, status, detail }) {
  const colour = {
    connected:    'text-success-500',
    healthy:      'text-success-500',
    active:       'text-accent-400',
    in_progress:  'text-accent-400',
    degraded:     'text-warning-500',
    disconnected: 'text-danger-500',
    unavailable:  'text-danger-500',
    loading:      'text-surface-400',
    upcoming:     'text-surface-500',
  }[status] || 'text-surface-400'

  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-700/60 last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon size={16} className={colour} />
        <span className="text-sm text-surface-200 font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-surface-400 font-mono font-medium">{detail}</span>}
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { activeDemoPhase, platformStatus } = useDemoPhase()

  const [health, setHealth]         = useState(null)
  const [systemInfo, setSystemInfo] = useState(null)
  const [datasets, setDatasets]     = useState(null)
  const [mlData, setMlData]         = useState(null)
  const [aiData, setAiData]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [lastChecked, setLastChecked] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const promises = [fetchHealth(), fetchSystemInfo()]

      // Only fetch Phase 2+ endpoints if in active demo phase
      if (activeDemoPhase >= 2) {
        promises.push(fetchDatasets())
      } else {
        promises.push(Promise.resolve(null))
      }

      // Only fetch Phase 3+ endpoints if in active demo phase
      if (activeDemoPhase >= 3) {
        promises.push(fetchMlBenchmark())
      } else {
        promises.push(Promise.resolve(null))
      }

      // Only fetch Phase 4 endpoints if in active demo phase
      if (activeDemoPhase >= 4) {
        promises.push(fetchAiStatus())
      } else {
        promises.push(Promise.resolve(null))
      }

      const [h, s, d, m, a] = await Promise.allSettled(promises)

      if (h.status === 'fulfilled' && h.value) setHealth(h.value)
      else setHealth({ status: 'error', database: 'disconnected' })

      if (s.status === 'fulfilled' && s.value) setSystemInfo(s.value)
      if (d.status === 'fulfilled' && d.value) setDatasets(d.value)
      if (m.status === 'fulfilled' && m.value) setMlData(m.value)
      if (a.status === 'fulfilled' && a.value) setAiData(a.value)

      setLastChecked(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [activeDemoPhase])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30_000)
    return () => clearInterval(interval)
  }, [loadData])

  // Real Service Status Resolution
  const backendStatus  = resolveHealthStatus(health?.status)
  const databaseStatus = resolveHealthStatus(health?.database)

  // ML Engine: dynamic based on active phase and actual benchmark data
  let mlStatus = 'upcoming'
  let mlDetail = 'Upcoming in Phase 3'
  if (activeDemoPhase >= 3) {
    if (loading && !mlData) {
      mlStatus = 'loading'
      mlDetail = 'Checking...'
    } else if (mlData?.models?.xgboost) {
      mlStatus = 'connected'
      mlDetail = `XGBoost · Mean AUC ${mlData.models.xgboost.mean_auc.toFixed(2)}`
    } else if (backendStatus === 'connected') {
      mlStatus = 'degraded'
      mlDetail = 'Initializing benchmarks'
    } else {
      mlStatus = 'disconnected'
      mlDetail = 'Engine unavailable'
    }
  }

  // LLM / RAG Layer: dynamic based on active phase and actual AI status
  let aiStatus = 'upcoming'
  let aiDetail = 'Upcoming in Phase 4'
  if (activeDemoPhase >= 4) {
    if (loading && !aiData) {
      aiStatus = 'loading'
      aiDetail = 'Checking...'
    } else if (aiData?.status === 'healthy') {
      aiStatus = 'connected'
      aiDetail = aiData.active_provider || 'Groq & PubMed Live'
    } else if (aiData?.status === 'degraded') {
      aiStatus = 'degraded'
      aiDetail = 'Heuristic fallback'
    } else if (backendStatus === 'connected') {
      aiStatus = 'degraded'
      aiDetail = 'Initializing AI Layer'
    } else {
      aiStatus = 'disconnected'
      aiDetail = 'LLM unavailable'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">
              Research Dashboard
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E8F7F4] text-[#0F9D8A] border border-[#0F9D8A]/30">
              Phase {activeDemoPhase} Active
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            ADAM-1 Enhanced · AI-Powered Alzheimer's Disease &amp; Microbiome Research Platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-xs text-surface-500 flex items-center gap-1 font-medium">
              <Clock size={12} />
              {lastChecked}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-ghost text-xs border border-surface-600/60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadData} />}

      {/* ── System status card ── */}
      <div className="card p-5 bg-surface-900 border border-surface-700 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-accent-500" />
          <h2 className="text-sm font-bold text-surface-50 uppercase tracking-wider">System Status</h2>
          {loading && <LoadingSpinner message="" />}
        </div>
        <div className="space-y-0">
          <StatusRow
            icon={Server}
            label="Backend API"
            status={backendStatus}
            detail={health?.version ? `v${health.version}` : undefined}
          />
          <StatusRow
            icon={Database}
            label="PostgreSQL + pgvector"
            status={databaseStatus}
            detail={health?.uptime_seconds ? `${Math.round(health.uptime_seconds)}s uptime` : undefined}
          />
          <StatusRow
            icon={Cpu}
            label="ML Engine"
            status={mlStatus}
            detail={mlDetail}
          />
          <StatusRow
            icon={Brain}
            label="LLM / RAG Layer"
            status={aiStatus}
            detail={aiDetail}
          />
        </div>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Datasets count */}
        <div className="card p-4 bg-gradient-to-br from-accent-600/15 to-transparent border-accent-500/20">
          <p className="stat-label">Datasets Registered</p>
          <p className="stat-value mt-1">
            {activeDemoPhase >= 2 ? (datasets?.total ?? (loading ? '…' : '5')) : '—'}
          </p>
          <p className="text-xs text-surface-400 mt-1">
            {activeDemoPhase >= 2 ? 'Phase 2 · 5 core research CSVs' : 'Available in Phase 2'}
          </p>
        </div>

        {/* ML Experiments */}
        <div className="card p-4 bg-gradient-to-br from-primary-600/15 to-transparent border-primary-500/20">
          <p className="stat-label">ML Experiments</p>
          <p className="stat-value mt-1">
            {activeDemoPhase >= 3 ? (mlData?.total_experiments ?? 30) : '—'}
          </p>
          <p className="text-xs text-surface-400 mt-1">
            {activeDemoPhase >= 3 ? '30 Experiment Seeds Benchmark' : 'Available in Phase 3'}
          </p>
        </div>

        {/* Backend health */}
        <div className="card p-4 bg-gradient-to-br from-success-600/15 to-transparent border-success-500/20">
          <p className="stat-label">Backend Health</p>
          <p className="stat-value mt-1 text-base">
            {backendStatus === 'connected' ? 'Online' : backendStatus === 'loading' ? '…' : 'Offline'}
          </p>
          <p className="text-xs text-surface-400 mt-1">{health?.environment ?? 'development'}</p>
        </div>

        {/* Platform Status */}
        <div className="card p-4 bg-gradient-to-br from-accent-600/15 to-transparent border-accent-500/30">
          <p className="stat-label">Platform Status</p>
          <p className="stat-value mt-1 text-xl text-accent-300 font-bold">
            {platformStatus.title}
          </p>
          <p className="text-xs text-surface-400 mt-1 truncate">
            {platformStatus.subtitle}
          </p>
        </div>
      </div>

      {/* ── Research pipeline ── */}
      <div>
        <h2 className="section-title mb-1">Research Pipeline</h2>
        <p className="section-subtitle mb-4">
          End-to-end pipeline from raw microbiome data to AI-powered Alzheimer's classification.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PipelineCard
            icon={Database}
            title="Data Foundation"
            phaseNumber={1}
            description="PostgreSQL + pgvector database, dataset registry, API layer, and React dashboard."
            activeDemoPhase={activeDemoPhase}
          />
          <PipelineCard
            icon={Dna}
            title="Data Ingestion & Dataset Explorer"
            phaseNumber={2}
            description="335 samples · 940 species · 5 datasets ingested · Shannon & Bray-Curtis · 5-tab Dataset Explorer UI."
            activeDemoPhase={activeDemoPhase}
          />
          <PipelineCard
            icon={TrendingUp}
            title="ML Prediction Engine"
            phaseNumber={3}
            description="XGBoost training pipeline, Optuna hyperparameter optimisation, 30-experiment cross-validation regime."
            activeDemoPhase={activeDemoPhase}
          />
          <PipelineCard
            icon={Zap}
            title="SHAP Explainability"
            phaseNumber={3}
            description="SHAP feature importance analysis, waterfall plots, and microbiome biomarker ranking."
            activeDemoPhase={activeDemoPhase}
          />
          <PipelineCard
            icon={BookOpen}
            title="Literature RAG"
            phaseNumber={4}
            description="PubMed literature retrieval, semantic search embedding storage, and RAG pipeline for evidence synthesis."
            activeDemoPhase={activeDemoPhase}
          />
          <PipelineCard
            icon={Bot}
            title="AI Agents (AIRA)"
            phaseNumber={4}
            description="Multi-agent system: Computation Agent, Summarization Agent, and Classification Agent with thought trace."
            activeDemoPhase={activeDemoPhase}
          />
        </div>
      </div>

      {/* ── System info footer ── */}
      {systemInfo && (
        <div className="card p-4 flex flex-wrap gap-6 text-xs text-surface-400 font-mono">
          <span><span className="text-surface-500">Python:</span> {systemInfo.python_version?.split(' ')[0]}</span>
          <span><span className="text-surface-500">Platform:</span> {systemInfo.platform_system}</span>
          <span><span className="text-surface-500">pgvector:</span> {systemInfo.pgvector_enabled ? 'enabled' : 'disabled'}</span>
          <span><span className="text-surface-500">Phase:</span> Phase {activeDemoPhase} Active</span>
        </div>
      )}
    </div>
  )
}
