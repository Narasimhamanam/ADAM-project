/**
 * AIRA Multi-Agent Workspace
 * ==========================
 * Interactive multi-agent execution panel with structured vertical agent
 * response hierarchy, pure Markdown rendering, and real-time patient validation.
 * Elevated with AgentPipeline stepper and card-raised elevation.
 */
import React, { useState, useEffect } from 'react'
import {
  Bot,
  Play,
  CheckCircle2,
  Clock,
  Cpu,
  MessageSquare,
  BarChart3,
  FlaskConical,
  Sparkles,
  ChevronRight,
  BookOpen,
  Loader2,
  RefreshCw,
  AlertTriangle,
  FileText,
  User,
  ShieldCheck,
  Search,
  Brain,
  Microscope,
  Calculator,
} from 'lucide-react'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import MarkdownContent from '../components/ui/MarkdownContent'
import AgentPipeline from '../components/ui/AgentPipeline'

const AGENT_PRESETS = [
  {
    id: 'all',
    label: 'Full AIRA Workflow',
    icon: Sparkles,
    description: 'Runs all 3 agents: Computation → Summarization → Classification',
    color: 'accent',
    defaultQuery: 'Analyze the gut microbiome biomarker profile and clinical risk significance for Alzheimer\'s Disease.',
  },
  {
    id: 'computation',
    label: 'Computation Agent',
    icon: Calculator,
    description: 'Quantitative dataset metrics, model benchmarks, and experiment summaries.',
    color: 'primary',
    defaultQuery: 'Summarize model performance metrics across 30 experiment seeds.',
  },
  {
    id: 'summarization',
    label: 'Summarization Agent',
    icon: Brain,
    description: 'PubMed literature synthesis and biomedical evidence extraction.',
    color: 'success',
    defaultQuery: 'What is the mechanistic link between Phocaeicola dorei and Alzheimer\'s neuroinflammation?',
  },
  {
    id: 'classification',
    label: 'Classification Agent',
    icon: Microscope,
    description: 'Multi-modal patient clinical reasoning and diagnostic interpretation.',
    color: 'warning',
    defaultQuery: 'Provide diagnostic interpretation for this patient\'s risk profile.',
  },
]

const QUICK_PATIENTS = ['DC001', 'DC002', 'DC017', 'FB085', 'FB100', 'FB300']
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

export default function AIAgents() {
  const [selectedPreset, setSelectedPreset] = useState(AGENT_PRESETS[0])
  const [query, setQuery] = useState(AGENT_PRESETS[0].defaultQuery)
  const [sampleId, setSampleId] = useState('DC001')
  const [patientValidation, setPatientValidation] = useState({ valid: true, message: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [aiStatus, setAiStatus] = useState(null)

  useEffect(() => {
    fetch(`${API_BASE}/ai/status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAiStatus(data))
      .catch(() => {})
  }, [])

  // Real-time Patient ID validation
  useEffect(() => {
    const clean = sampleId.trim().toUpperCase()
    if (!clean) {
      setPatientValidation({ valid: false, message: 'Please enter a Patient ID.' })
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/samples/${clean}`)
        if (res.ok) {
          setPatientValidation({ valid: true, message: `✓ Patient ${clean} validated in cohort` })
        } else {
          setPatientValidation({
            valid: false,
            message: `⚠️ Invalid Patient ID: "${clean}". Enter a valid ID (e.g., DC001-DC092, FB085-FB399).`,
          })
        }
      } catch {
        setPatientValidation({ valid: true, message: '' })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [sampleId])

  function selectPreset(preset) {
    setSelectedPreset(preset)
    setQuery(preset.defaultQuery)
    setResult(null)
    setError(null)
  }

  async function executeAgent() {
    if (!query.trim() || loading) return
    if (!patientValidation.valid && (selectedPreset.id === 'all' || selectedPreset.id === 'classification')) {
      setError(`Invalid Patient ID: "${sampleId}". Please enter a valid ID from the cohort first.`)
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`${API_BASE}/ai/agent/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: selectedPreset.id,
          query: query.trim(),
          sample_id: selectedPreset.id === 'all' || selectedPreset.id === 'classification' ? sampleId.trim().toUpperCase() : undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.detail || 'Agent execution failed')
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isPatientInputDisabled = selectedPreset.id === 'computation' || selectedPreset.id === 'summarization'

  // Extract individual steps if returned by multi-agent workflow
  const steps = result?.steps || []
  const compStep = steps.find((s) => s.step_type === 'computation' || s.step_name?.toLowerCase().includes('computation'))
  const summStep = steps.find((s) => s.step_type === 'summarization' || s.step_name?.toLowerCase().includes('summarization'))
  const classStep = steps.find((s) => s.step_type === 'classification' || s.step_name?.toLowerCase().includes('classification'))

  const currentStageMap = {
    all: result ? 'consensus' : loading ? 'computational' : 'computational',
    computation: 'computational',
    summarization: 'summarization',
    classification: 'classification',
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">AIRA Multi-Agent Workspace</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-300 border border-accent-500/30">
              Autonomous Intelligence
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            Execute dedicated agents independently or orchestrate the complete multi-agent consensus pipeline.
          </p>
        </div>

        {/* LLM Status Badge */}
        {aiStatus && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-900 border border-surface-700/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                aiStatus.status === 'healthy' ? 'bg-[#16A34A] animate-pulse' : 'bg-[#D97706]'
              }`}
            />
            <span className="text-surface-400 font-medium">Provider:</span>
            <span className="font-bold text-surface-50 uppercase">{aiStatus.active_provider || 'Groq'}</span>
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={executeAgent} />}

      {/* ── Agent Pipeline Stepper ── */}
      <div className="card-raised p-5 border border-surface-700/70 bg-gradient-to-br from-surface-900 via-surface-900 to-surface-800">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-surface-50 flex items-center gap-2">
              <Bot size={16} className="text-accent-500" />
              AIRA Multi-Agent Diagnostic Pipeline
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Auditable Pipeline: Data &rarr; Computation &rarr; Retrieval &rarr; Summarization &rarr; Classification &rarr; Consensus
            </p>
          </div>
          <span className="text-[11px] font-mono text-accent-500 dark:text-accent-400 bg-accent-500/10 px-2.5 py-0.5 rounded-full border border-accent-500/30 font-bold">
            Phase 4 Active
          </span>
        </div>
        <AgentPipeline
          currentStage={currentStageMap[selectedPreset.id] || 'computational'}
          stageStatuses={{
            computational: loading && selectedPreset.id === 'computation' ? 'running' : result ? 'complete' : 'idle',
            summarization: loading && selectedPreset.id === 'summarization' ? 'running' : result ? 'complete' : 'idle',
            classification: loading && selectedPreset.id === 'classification' ? 'running' : result ? 'complete' : 'idle',
            consensus: result && selectedPreset.id === 'all' ? 'complete' : 'idle',
          }}
        />
      </div>

      {/* ── Agent Selector & Config ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Agent Type Cards */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Select Agent Workflow</p>
          {AGENT_PRESETS.map((preset) => {
            const Icon = preset.icon
            const isSelected = selectedPreset.id === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => selectPreset(preset)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-accent-500/15 border-accent-500 shadow-sm'
                    : 'bg-surface-900 border-surface-700/60 hover:border-surface-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-accent-500 text-white font-bold' : 'bg-surface-800 text-surface-400'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isSelected ? 'text-accent-500 dark:text-accent-300' : 'text-surface-50'}`}>
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-surface-400 mt-0.5 leading-tight">{preset.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Query Config Panel */}
        <div className="lg:col-span-3 card-raised p-5 bg-surface-900 border border-surface-700/60 shadow-sm flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-surface-50 uppercase tracking-wider mb-2">
              Research Query / Clinical Goal
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              className="w-full input text-xs resize-none font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-surface-50 uppercase tracking-wider">
                Patient Sample ID (for Classification)
              </label>
              {!isPatientInputDisabled && patientValidation.message && (
                <span
                  className={`text-[11px] font-bold ${
                    patientValidation.valid ? 'text-[#16A34A]' : 'text-danger-500'
                  }`}
                >
                  {patientValidation.message}
                </span>
              )}
            </div>
            <input
              type="text"
              value={sampleId}
              disabled={isPatientInputDisabled}
              onChange={(e) => setSampleId(e.target.value)}
              className={`w-full input text-xs font-mono font-bold ${
                isPatientInputDisabled
                  ? 'opacity-40 cursor-not-allowed bg-surface-800'
                  : patientValidation.valid
                  ? 'border-surface-700 focus:border-accent-500'
                  : 'border-danger-500'
              }`}
              placeholder={isPatientInputDisabled ? 'Not required for this agent' : 'e.g. DC001'}
            />

            {/* Quick Patient Selectors */}
            {!isPatientInputDisabled && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-surface-400 font-semibold uppercase">Presets:</span>
                {QUICK_PATIENTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSampleId(p)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                      sampleId === p
                        ? 'bg-accent-500 text-white'
                        : 'bg-surface-800 text-surface-400 hover:text-surface-100 hover:bg-surface-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={executeAgent}
            disabled={loading || !query.trim()}
            className="w-full btn-teal py-2.5 flex items-center justify-center gap-2 font-semibold text-xs shadow disabled:opacity-50 mt-auto"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            <span>{loading ? 'Executing Multi-Agent Sequence...' : `Run ${selectedPreset.label}`}</span>
          </button>
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="card-raised p-8 text-center bg-surface-900 border border-surface-700/60 shadow-sm space-y-3">
          <LoadingSpinner size="lg" message={`Executing ${selectedPreset.label}...`} />
          <p className="text-xs text-surface-400 max-w-md mx-auto">
            AIRA is querying quantitative computation models, performing semantic PubMed search, and generating structured clinical reasoning.
          </p>
        </div>
      )}

      {/* ── Results Display ── */}
      {result && !loading && (
        <div className="space-y-6 animate-fade-in">
          {/* Execution Metadata Bar */}
          <div className="p-3.5 rounded-xl bg-surface-900 border border-surface-700/60 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
              <span className="font-bold text-surface-50 uppercase">{result.task_type || selectedPreset.id} Completed</span>
              {result.sample_id && (
                <span className="font-mono text-accent-500 dark:text-accent-400 font-bold ml-1">
                  (Patient: {result.sample_id})
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-surface-400 font-mono text-[11px]">
              {result.execution_time_seconds && (
                <span>Duration: {result.execution_time_seconds.toFixed(2)}s</span>
              )}
              {result.agent_model && <span>Model: {result.agent_model}</span>}
            </div>
          </div>

          {/* 1. Computational Agent Response */}
          {(compStep || result.task_type === 'computation') && (
            <div className="card-raised p-6 bg-surface-900 border border-surface-700/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/15 text-primary-500 flex items-center justify-center font-bold">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-50 flex items-center gap-1.5">
                      Computational Agent
                    </h3>
                    <p className="text-[11px] text-surface-400 font-medium">
                      Empirical cohort benchmarks, cross-validation metrics, and feature rankings
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-300 border border-primary-500/30">
                  Step 1 · Quantitative
                </span>
              </div>

              <div className="pt-1">
                <MarkdownContent content={compStep?.result || result.final_synthesis} />
              </div>
            </div>
          )}

          {/* 2. Summarization Agent Response */}
          {(summStep || result.task_type === 'summarization') && (
            <div className="card-raised p-6 bg-surface-900 border border-surface-700/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent-500/15 text-accent-500 flex items-center justify-center font-bold">
                    <Brain size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-50 flex items-center gap-1.5">
                      Summarization Agent
                    </h3>
                    <p className="text-[11px] text-surface-400 font-medium">
                      Biomedical literature review, mechanistic pathways, and evidence synthesis
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-300 border border-accent-500/30">
                  Step 2 · Literature RAG
                </span>
              </div>

              <div className="pt-1">
                <MarkdownContent content={summStep?.result || result.literature_synthesis || result.final_synthesis} />
              </div>

              {result.citations && result.citations.length > 0 && (
                <div className="pt-3 border-t border-surface-700/60 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-surface-400 uppercase">Scientific Citations:</span>
                  {result.citations.map((c, i) => (
                    <a
                      key={i}
                      href={`https://pubmed.ncbi.nlm.nih.gov/?term=${c.pmid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] px-2 py-0.5 rounded bg-surface-800 border border-surface-700/60 text-accent-500 dark:text-accent-400 font-bold hover:border-accent-500"
                    >
                      [{c.pmid}] {c.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Classification Agent Response */}
          {(classStep || result.task_type === 'classification') && (
            <div className="card-raised p-6 bg-surface-900 border border-surface-700/60 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold">
                    <Microscope size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-50 flex items-center gap-1.5">
                      Classification Agent
                    </h3>
                    <p className="text-[11px] text-surface-400 font-medium">
                      Multi-modal patient clinical reasoning and diagnostic risk interpretation
                    </p>
                  </div>
                </div>
                {result.actual_diagnosis !== null && result.actual_diagnosis !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      result.actual_diagnosis === 1
                        ? 'bg-danger-500/15 text-danger-500 border border-danger-500/30'
                        : 'bg-success-500/15 text-success-600 border border-success-500/30'
                    }`}
                  >
                    {result.actual_diagnosis === 1 ? 'Alzheimer’s (+)' : 'Cognitive Normal (Control)'}
                  </span>
                )}
              </div>

              <div className="pt-1">
                <MarkdownContent content={classStep?.result || result.diagnostic_assessment || result.final_synthesis} />
              </div>
            </div>
          )}

          {/* 4. Final AIRA Prediction */}
          {result.task_type === 'multi_agent_workflow' && result.final_synthesis && (
            <div className="card-raised p-6 md:p-8 bg-gradient-to-br from-surface-900 via-surface-900 to-accent-500/10 border-2 border-accent-500 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-surface-700/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent-500 text-white flex items-center justify-center font-bold shadow-sm">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-surface-50 uppercase tracking-wide flex items-center gap-2">
                      Final AIRA Consensus &amp; Synthesis
                    </h3>
                    <p className="text-xs text-surface-400 font-medium">
                      Multi-agent consensus combining computation benchmarks, literature evidence, and diagnostic reasoning
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent-500 text-white shadow-sm">
                  Integrated Consensus
                </span>
              </div>

              <div className="pt-2">
                <MarkdownContent content={result.final_synthesis} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
