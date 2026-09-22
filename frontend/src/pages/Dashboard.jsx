/**
 * Dashboard Page
 * ==============
 * Main research dashboard — dynamically reflects the active Phase configuration
 * from featurePhases.js, calls real /api/health and /api/system telemetry endpoints,
 * displays multi-agent pipeline overview, and presents clinical telemetry cards.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Activity, Database, Server, Brain, Cpu,
  Bot, BookOpen, TrendingUp, Zap, RefreshCw, Clock,
  Dna, Award, ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchHealth, fetchSystemInfo, fetchDatasets, fetchMlBenchmark, fetchAiStatus } from '../api/client'
import { useDemoPhase } from '../context/DemoPhaseContext'
import StatusBadge from '../components/ui/StatusBadge'
import StatCard from '../components/ui/StatCard'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import AgentPipeline from '../components/ui/AgentPipeline'

// ── Helpers ──────────────────────────────────────────────────────────────

function resolveHealthStatus(status) {
  if (status === 'healthy' || status === 'connected' || status === 'operational' || status === 'ready') return 'connected'
  if (status === 'degraded' || status === 'timeout') return 'degraded'
  if (status === null || status === 'loading' || status === 'connecting' || status === 'initializing') return 'loading'
  return 'disconnected'
}

function PipelineCard({ icon: Icon, title, phaseNumber, description, activeDemoPhase }) {
  const isComplete = phaseNumber < activeDemoPhase || (phaseNumber === activeDemoPhase && activeDemoPhase === 4)
  const isActive = phaseNumber === activeDemoPhase && activeDemoPhase < 4

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
            ? 'bg-success-600/20 text-success-500 dark:text-success-400'
            : isActive
              ? 'bg-accent-600/25 text-accent-600 dark:text-accent-300'
              : 'bg-surface-800 text-surface-500'
        }`}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-surface-50">{title}</h3>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
              isComplete
                ? 'bg-success-600/20 border-success-500/30 text-success-600 dark:text-success-400'
                : isActive
                  ? 'bg-accent-600/25 border-accent-500/40 text-accent-600 dark:text-accent-300'
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

      if (activeDemoPhase >= 2) {
        promises.push(fetchDatasets())
      } else {
        promises.push(Promise.resolve(null))
      }

      if (activeDemoPhase >= 3) {
        promises.push(fetchMlBenchmark())
      } else {
        promises.push(Promise.resolve(null))
      }

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
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400 border border-accent-500/30">
              Phase {activeDemoPhase} Active
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            ADAM-1 Enhanced · AI-Powered Alzheimer's Disease &amp; Microbiome Research Platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-xs text-surface-400 flex items-center gap-1 font-mono font-medium">
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

      {/* ── Multi-Agent Diagnostic Pipeline Preview ── */}
      <div className="card-raised p-5 border border-surface-700/70 bg-gradient-to-br from-surface-900 via-surface-900 to-surface-800">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-surface-50 uppercase tracking-wider flex items-center gap-2">
              <Cpu size={16} className="text-accent-500" />
              ADAM Multi-Agent Diagnostic Sequence
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Live automated agent workflow tracing Computation &rarr; Summarization &rarr; Classification &rarr; Consensus
            </p>
          </div>
          <Link
            to="/workflow"
            className="btn-teal text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold"
          >
            Open Live Workflow
            <ArrowRight size={13} />
          </Link>
        </div>
        <AgentPipeline
          currentStage="computational"
          stageStatuses={{
            computational: 'complete',
            summarization: 'complete',
            classification: 'complete',
            consensus: 'complete',
          }}
        />
      </div>

      {/* ── Quick Stats Grid (Upgraded with StatCard & font-data) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          label="Datasets Registered"
          value={activeDemoPhase >= 2 ? (datasets?.total ?? (loading ? '…' : '5')) : '—'}
          sub={activeDemoPhase >= 2 ? 'Phase 2 · 5 core research CSVs' : 'Available in Phase 2'}
          accent="accent"
        />
        <StatCard
          icon={TrendingUp}
          label="ML Experiments"
          value={activeDemoPhase >= 3 ? (mlData?.total_experiments ?? 30) : '—'}
          sub={activeDemoPhase >= 3 ? '30 Experiment Seeds Benchmark' : 'Available in Phase 3'}
          accent="primary"
        />
        <StatCard
          icon={Activity}
          label="Backend Health"
          value={backendStatus === 'connected' ? 'Online' : backendStatus === 'loading' ? '…' : 'Offline'}
          sub={health?.environment ? `Env: ${health.environment}` : 'Development'}
          accent="success"
        />
        <StatCard
          icon={Award}
          label="Platform Status"
          value={platformStatus.title}
          sub={platformStatus.subtitle}
          accent="warning"
        />
      </div>

      {/* ── System status card ── */}
      <div className="card-raised p-5 bg-surface-900 border border-surface-700/70">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-accent-500" />
          <h2 className="text-sm font-bold text-surface-50 uppercase tracking-wider">Service Telemetry &amp; Health</h2>
          {loading && <LoadingSpinner message="" />}
        </div>
        <div className="space-y-0">
          <StatusRow
            icon={Server}
            label="Backend API Service"
            status={backendStatus}
            detail={health?.version ? `v${health.version}` : undefined}
          />
          <StatusRow
            icon={Database}
            label="PostgreSQL + pgvector Vector Store"
            status={databaseStatus}
            detail={health?.uptime_seconds ? `${Math.round(health.uptime_seconds)}s uptime` : undefined}
          />
          <StatusRow
            icon={Cpu}
            label="ML Prediction Engine (XGBoost)"
            status={mlStatus}
            detail={mlDetail}
          />
          <StatusRow
            icon={Brain}
            label="LLM / Literature RAG Agent (AIRA)"
            status={aiStatus}
            detail={aiDetail}
          />
        </div>
      </div>

      {/* ── Research pipeline cards ── */}
      <div>
        <h2 className="section-title mb-1">Research Pipeline Implementation</h2>
        <p className="section-subtitle mb-4">
          End-to-end pipeline from raw microbiome sequencing data to AI-powered multi-agent Alzheimer's classification.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <PipelineCard
            icon={Database}
            title="Data Foundation"
            phaseNumber={1}
            description="PostgreSQL + pgvector database, dataset registry, API layer, and React dashboard shell."
            activeDemoPhase={activeDemoPhase}
          />
          <PipelineCard
            icon={Dna}
            title="Data Ingestion & Dataset Explorer"
            phaseNumber={2}
            description="335 patient samples · 940 species abundances · 5 datasets ingested · Shannon & Bray-Curtis diversity."
            activeDemoPhase={activeDemoPhase}
          />
          <PipelineCard
            icon={TrendingUp}
            title="ML Prediction Engine"
            phaseNumber={3}
            description="XGBoost training pipeline, Optuna hyperparameter tuning, 30-seed benchmark cross-validation regime."
            activeDemoPhase={activeDemoPhase}
          />
          <PipelineCard
            icon={Zap}
            title="SHAP Explainability"
            phaseNumber={3}
            description="TreeSHAP feature importance analysis, waterfall plots, and gut microbiome biomarker ranking."
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
            title="AI Agents (AIRA & ADAM)"
            phaseNumber={4}
            description="Multi-agent system: Computation Agent, Summarization Agent, and Classification Agent with 10 checkpoints."
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
