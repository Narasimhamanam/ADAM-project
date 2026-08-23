/**
 * Dashboard Page
 * ==============
 * Main research dashboard — calls real /api/health endpoint
 * and displays live system status, dataset overview, and
 * pipeline cards for future phases.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, Database, Server, Brain, Cpu, FlaskConical,
  Bot, BookOpen, TrendingUp, Zap, RefreshCw, Clock,
  CheckCircle2, AlertTriangle, XCircle, Dna,
} from 'lucide-react'
import { fetchHealth, fetchSystemInfo, fetchDatasets } from '../api/client'
import StatusBadge from '../components/ui/StatusBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'

// ── Helpers ──────────────────────────────────────────────────────────────

function resolveStatus(status) {
  if (status === 'healthy' || status === 'connected') return 'connected'
  if (status === 'degraded') return 'degraded'
  if (status === null) return 'loading'
  return 'disconnected'
}

function PipelineCard({ icon: Icon, title, phase, description, active = false, status }) {
  const isComplete = status === 'complete'
  const isActive   = active && !isComplete

  return (
    <div className={`card p-4 flex gap-4 transition-all duration-200 ${
      isComplete
        ? 'border-success-500/30 bg-gradient-to-br from-success-600/10 to-transparent'
        : isActive
          ? 'border-accent-500/30 bg-gradient-to-br from-accent-600/10 to-transparent'
          : 'hover:border-surface-600 opacity-80 hover:opacity-100'
    }`}>
      <div className={`rounded-xl p-2.5 shrink-0 ${
        isComplete ? 'bg-success-600/20 text-success-400'
        : isActive  ? 'bg-accent-600/20 text-accent-400'
        : 'bg-surface-700/60 text-surface-400'
      }`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
            isComplete
              ? 'bg-success-600/20 border-success-500/30 text-success-400'
              : isActive
                ? 'bg-accent-600/20 border-accent-500/30 text-accent-400'
                : 'bg-surface-700/60 border-surface-600/40 text-surface-400'
          }`}>
            {isComplete ? '✓ ' : ''}{phase}
          </span>
        </div>
        <p className="text-xs text-surface-400 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function StatusRow({ icon: Icon, label, status, detail }) {
  const colour = {
    connected:    'text-success-400',
    degraded:     'text-warning-400',
    disconnected: 'text-danger-400',
    loading:      'text-surface-400',
  }[status] || 'text-surface-400'

  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-700/40 last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon size={16} className={colour} />
        <span className="text-sm text-surface-200">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {detail && <span className="text-xs text-surface-400 font-mono">{detail}</span>}
        <StatusBadge status={status} />
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [health, setHealth]         = useState(null)
  const [systemInfo, setSystemInfo] = useState(null)
  const [datasets, setDatasets]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [lastChecked, setLastChecked] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [h, s, d] = await Promise.allSettled([
        fetchHealth(),
        fetchSystemInfo(),
        fetchDatasets(),
      ])
      if (h.status === 'fulfilled') setHealth(h.value)
      else setHealth({ status: 'error', database: 'disconnected' })
      if (s.status === 'fulfilled') setSystemInfo(s.value)
      if (d.status === 'fulfilled') setDatasets(d.value)
      setLastChecked(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30_000)
    return () => clearInterval(interval)
  }, [loadData])

  const backendStatus  = resolveStatus(health?.status)
  const databaseStatus = resolveStatus(health?.database)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Research Dashboard
          </h1>
          <p className="text-surface-300 mt-1 text-sm">
            ADAM-1 Enhanced · AI-Powered Alzheimer's Disease &amp; Microbiome Research Platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-xs text-surface-500 flex items-center gap-1">
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
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-accent-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">System Status</h2>
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
            status="disconnected"
            detail="Phase 3"
          />
          <StatusRow
            icon={Brain}
            label="LLM / RAG Layer"
            status="disconnected"
            detail="Phase 4"
          />
        </div>
      </div>

      {/* ── Quick stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 bg-gradient-to-br from-accent-600/15 to-transparent border-accent-500/20">
          <p className="stat-label">Datasets Registered</p>
          <p className="stat-value mt-1">{datasets?.total ?? (loading ? '…' : '—')}</p>
          <p className="text-xs text-surface-400 mt-1">Phase 2 · 5 core research CSVs</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-primary-600/15 to-transparent border-primary-500/20">
          <p className="stat-label">ML Experiments</p>
          <p className="stat-value mt-1">30</p>
          <p className="text-xs text-surface-400 mt-1">Original ADAM-1 paper baseline</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-success-600/15 to-transparent border-success-500/20">
          <p className="stat-label">Backend Status</p>
          <p className="stat-value mt-1 text-base">
            {backendStatus === 'connected' ? 'Online' : backendStatus === 'loading' ? '…' : 'Offline'}
          </p>
          <p className="text-xs text-surface-400 mt-1">{health?.environment ?? 'development'}</p>
        </div>
        <div className="card p-4 bg-gradient-to-br from-warning-600/15 to-transparent border-warning-500/20">
          <p className="stat-label">Active Phase</p>
          <p className="stat-value mt-1 text-xl">Phase 3</p>
          <p className="text-xs text-surface-400 mt-1">ML Pipeline · Starting Now</p>
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
            phase="Phase 1 — Complete"
            description="PostgreSQL + pgvector database, dataset registry, API layer, and React dashboard."
            status="complete"
          />
          <PipelineCard
            icon={Dna}
            title="Data Ingestion & Dataset Explorer"
            phase="Phase 2 — Complete"
            description="335 samples · 940 species · 5 datasets ingested · Shannon & Bray-Curtis · 5-tab Dataset Explorer UI."
            status="complete"
          />
          <PipelineCard
            icon={TrendingUp}
            title="ML Prediction Engine"
            phase="Phase 3 — Active"
            description="XGBoost training pipeline, Optuna hyperparameter optimisation, 30-experiment cross-validation regime."
            active
          />
          <PipelineCard
            icon={Zap}
            title="SHAP Explainability"
            phase="Phase 3"
            description="SHAP feature importance analysis, waterfall plots, and microbiome biomarker ranking."
          />
          <PipelineCard
            icon={BookOpen}
            title="Literature RAG"
            phase="Phase 4"
            description="PubMed literature retrieval, pgvector embedding storage, and RAG pipeline for evidence synthesis."
          />
          <PipelineCard
            icon={Bot}
            title="AI Agents (AIRA)"
            phase="Phase 4"
            description="Multi-agent system: Computation Agent, Summarization Agent, and Classification Agent using LangChain."
          />
        </div>
      </div>

      {/* ── System info footer ── */}
      {systemInfo && (
        <div className="card p-4 flex flex-wrap gap-6 text-xs text-surface-400 font-mono">
          <span><span className="text-surface-500">Python:</span> {systemInfo.python_version?.split(' ')[0]}</span>
          <span><span className="text-surface-500">Platform:</span> {systemInfo.platform_system}</span>
          <span><span className="text-surface-500">pgvector:</span> {systemInfo.pgvector_enabled ? 'enabled' : 'disabled'}</span>
          <span><span className="text-surface-500">Phase:</span> {systemInfo.phase}</span>
        </div>
      )}
    </div>
  )
}
