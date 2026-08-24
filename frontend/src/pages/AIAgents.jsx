/**
 * AIRA Multi-Agent Workspace
 * ==========================
 * Interactive multi-agent execution panel with structured visual synthesis.
 */
import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';

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
    icon: BarChart3,
    description: 'Quantitative dataset metrics, model benchmarks, and experiment summaries.',
    color: 'primary',
    defaultQuery: 'Summarize model performance metrics across 30 experiment seeds.',
  },
  {
    id: 'summarization',
    label: 'Summarization Agent',
    icon: BookOpen,
    description: 'PubMed literature synthesis and biomedical evidence extraction.',
    color: 'success',
    defaultQuery: 'What is the mechanistic link between Phocaeicola dorei and Alzheimer\'s neuroinflammation?',
  },
  {
    id: 'classification',
    label: 'Classification Agent',
    icon: FlaskConical,
    description: 'Multi-modal patient clinical reasoning and diagnostic interpretation.',
    color: 'warning',
    defaultQuery: 'Provide diagnostic interpretation for this patient\'s risk profile.',
  },
];

const STEP_COLORS = {
  'Computation Agent': 'primary',
  'Summarization Agent': 'success',
  'Classification Agent': 'warning',
};

function StepCard({ step, index }) {
  const isComplete = step.status === 'completed';
  const colorKey = STEP_COLORS[step.agent] || 'accent';

  return (
    <div
      className={`card p-4 transition-all ${
        isComplete
          ? 'border-accent-500/30 bg-surface-900 shadow-sm'
          : 'border-surface-700/60 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
            isComplete
              ? 'bg-accent-600/20 text-accent-600 dark:text-accent-300 border border-accent-500/30'
              : 'bg-surface-800 text-surface-400 border border-surface-700'
          }`}
        >
          {isComplete ? <CheckCircle2 size={15} /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-surface-50">{step.agent}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                isComplete
                  ? 'bg-success-600/15 text-success-600 dark:text-success-400 border border-success-500/30'
                  : 'bg-surface-800 text-surface-400 border border-surface-700'
              }`}
            >
              {step.status}
            </span>
          </div>
          <p className="text-[11px] text-surface-400 mt-0.5">{step.action}</p>
        </div>
      </div>
    </div>
  );
}

export default function AIAgents() {
  const [selectedPreset, setSelectedPreset] = useState(AGENT_PRESETS[0]);
  const [query, setQuery] = useState(AGENT_PRESETS[0].defaultQuery);
  const [sampleId, setSampleId] = useState('DC001');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    fetch('/api/ai/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAiStatus(data))
      .catch(() => {});
  }, []);

  function selectPreset(preset) {
    setSelectedPreset(preset);
    setQuery(preset.defaultQuery);
    setResult(null);
    setError(null);
  }

  async function executeAgent() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_type: selectedPreset.id,
          query: query.trim(),
          sample_id: sampleId,
        }),
      });

      if (!res.ok) throw new Error('Agent execution failed. Please try again.');
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">AI Agent Workspace (AIRA)</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success-600/20 text-success-600 dark:text-success-400 border border-success-500/30">
              Phase 4 — Complete
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            Multi-agent research system with structured clinical synthesis and live thought trace execution.
          </p>
        </div>
        {aiStatus && (
          <div className="card px-3 py-2 bg-surface-900 border border-surface-700 text-xs space-y-1">
            <p className="text-surface-400">
              Engine: <span className="text-accent-600 dark:text-accent-300 font-bold">{aiStatus.active_provider}</span>
            </p>
            <p className="text-surface-400">
              Corpus: <span className="text-success-600 dark:text-success-400 font-bold">{aiStatus.indexed_articles} PubMed articles</span>
            </p>
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={executeAgent} />}

      {/* ── Agent Selector & Config ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Agent Type Cards */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3">Select Agent Workflow</p>
          {AGENT_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => selectPreset(preset)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-accent-600/15 border-accent-500 shadow-sm'
                    : 'bg-surface-900 border-surface-700 hover:border-surface-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-accent-600 text-white' : 'bg-surface-800 text-surface-400'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-surface-50">{preset.label}</p>
                    <p className="text-[10px] text-surface-400 mt-0.5 leading-tight">{preset.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Query Config Panel */}
        <div className="lg:col-span-3 card p-5 bg-surface-900 border border-surface-700 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
              Research Query / Clinical Goal
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              className="w-full input text-xs resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
              Patient Sample ID (for Classification Agent)
            </label>
            <input
              type="text"
              value={sampleId}
              onChange={(e) => setSampleId(e.target.value)}
              className="w-full input text-xs font-mono"
              placeholder="e.g., DC001"
            />
          </div>

          <button
            onClick={executeAgent}
            disabled={loading || !query.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                AIRA Running Multi-Agent Reasoning Chain...
              </>
            ) : (
              <>
                <Play size={15} />
                Run {selectedPreset.id === 'all' ? '3-Agent Workflow' : selectedPreset.label}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Loading Spinner ── */}
      {loading && (
        <div className="card p-8 flex justify-center">
          <LoadingSpinner message="AIRA Multi-Agent System Processing... (Computation → Summarization → Classification)" />
        </div>
      )}

      {/* ── Structured Results & Thought Trace ── */}
      {result && !loading && (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-surface-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={15} className="text-success-500" />
              AIRA Multi-Agent Execution Results
            </h2>
            <span className="text-[10px] text-surface-400 font-mono font-medium">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* 1. Quantitative Computation Metric Cards */}
          {result.computation && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="card p-3.5 bg-surface-900 border border-surface-700">
                <p className="text-[10px] uppercase font-bold text-surface-400">Metagenomic Samples</p>
                <p className="text-lg font-extrabold text-surface-50 mt-0.5">335 Samples</p>
                <p className="text-[10px] text-surface-400">102 Cohort Subjects</p>
              </div>
              <div className="card p-3.5 bg-accent-600/10 border border-accent-500/30">
                <p className="text-[10px] uppercase font-bold text-accent-600 dark:text-accent-400">XGBoost ROC-AUC</p>
                <p className="text-lg font-extrabold text-accent-600 dark:text-accent-300 mt-0.5">0.8211</p>
                <p className="text-[10px] text-accent-600 dark:text-accent-400">Mean F1: 0.6509 (30 Seeds)</p>
              </div>
              <div className="card p-3.5 bg-surface-900 border border-surface-700">
                <p className="text-[10px] uppercase font-bold text-surface-400">Baseline Random Forest</p>
                <p className="text-lg font-extrabold text-surface-50 mt-0.5">AUC 0.8036</p>
                <p className="text-[10px] text-surface-400">Logistic Reg: 0.7715</p>
              </div>
              <div className="card p-3.5 bg-surface-900 border border-surface-700">
                <p className="text-[10px] uppercase font-bold text-surface-400">Top Pro-Inflammatory</p>
                <p className="text-sm font-bold text-danger-500 mt-1 truncate">P. dorei, Neglecta</p>
                <p className="text-[10px] text-surface-400">LPS Biosynthesis Driver</p>
              </div>
            </div>
          )}

          {/* 2. Structured Literature Synthesis Card */}
          <div className="card p-5 bg-surface-900 border border-surface-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-surface-700 pb-3">
              <BookOpen size={16} className="text-accent-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-50">
                Biomedical Literature &amp; Mechanistic Synthesis (Summarization Agent)
              </h3>
            </div>
            <div className="text-xs text-surface-300 leading-relaxed whitespace-pre-wrap">
              {result.literature_synthesis || result.final_synthesis}
            </div>

            {result.citations && result.citations.length > 0 && (
              <div className="pt-3 border-t border-surface-700/60 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-surface-400 uppercase">Verified Citations:</span>
                {result.citations.map((c, i) => (
                  <a
                    key={i}
                    href={`https://pubmed.ncbi.nlm.nih.gov/?term=${c.pmid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] px-2 py-0.5 rounded bg-surface-800 border border-surface-700 text-accent-600 dark:text-accent-300 font-semibold hover:border-accent-500"
                  >
                    [{c.pmid}] {c.title}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* 3. Patient Clinical Diagnostic Interpretation Card */}
          {result.diagnostic_assessment && (
            <div className="card p-5 bg-surface-900 border border-surface-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-surface-700 pb-3">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-accent-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-50">
                    Patient Diagnostic Reasoning (Classification Agent)
                  </h3>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  result.actual_diagnosis === 1
                    ? 'bg-danger-600/15 text-danger-600 dark:text-danger-400 border border-danger-500/30'
                    : 'bg-success-600/15 text-success-600 dark:text-success-400 border border-success-500/30'
                }`}>
                  {result.actual_diagnosis === 1 ? 'Alzheimer’s (+)' : 'Cognitive Normal (Control)'}
                </span>
              </div>
              <div className="text-xs text-surface-300 leading-relaxed whitespace-pre-wrap">
                {result.diagnostic_assessment}
              </div>
            </div>
          )}

          {/* 4. Thought Trace Steps */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
              Agent Execution Thought Trace ({result.thought_trace.length} Steps)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {result.thought_trace.map((step, i) => (
                <StepCard key={i} step={step} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
