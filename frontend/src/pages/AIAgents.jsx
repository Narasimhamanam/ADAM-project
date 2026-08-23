/**
 * AIRA Multi-Agent Workspace
 * ==========================
 * Interactive multi-agent execution panel with live thought trace visualization.
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
      className={`card p-4 border transition-all ${
        isComplete
          ? `border-${colorKey}-500/30 bg-${colorKey}-600/5`
          : 'border-surface-700/60 opacity-60'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold ${
            isComplete
              ? `bg-${colorKey}-600/25 text-${colorKey}-300 border border-${colorKey}-500/30`
              : 'bg-surface-800 text-surface-400 border border-surface-700'
          }`}
        >
          {isComplete ? <CheckCircle2 size={16} /> : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-white">{step.agent}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                isComplete
                  ? `bg-${colorKey}-600/20 text-${colorKey}-300 border border-${colorKey}-500/30`
                  : 'bg-surface-800 text-surface-400 border border-surface-700'
              }`}
            >
              {step.status}
            </span>
          </div>
          <p className="text-[11px] text-surface-400 mt-0.5">{step.action}</p>
          {step.result && (
            <div className="mt-2 p-3 bg-surface-900/80 rounded-lg border border-surface-700/60 text-xs text-surface-200 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {step.result}
            </div>
          )}
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
            <h1 className="text-2xl font-bold text-white">AI Agent Workspace (AIRA)</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30">
              Phase 4 — Active
            </span>
          </div>
          <p className="text-surface-300 mt-1 text-sm">
            Multi-agent research system with live thought trace visualization. Runs{' '}
            <strong>Computation</strong>, <strong>Summarization</strong>, and{' '}
            <strong>Classification</strong> agent pipelines.
          </p>
        </div>
        {aiStatus && (
          <div className="card px-3 py-2 bg-surface-800/80 border border-surface-700/60 text-xs space-y-1">
            <p className="text-surface-400">
              Engine: <span className="text-accent-300 font-semibold">{aiStatus.active_provider}</span>
            </p>
            <p className="text-surface-400">
              Literature: <span className="text-success-300 font-semibold">{aiStatus.indexed_articles} articles</span>
            </p>
          </div>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={executeAgent} />}

      {/* ── Agent Selector & Config ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Agent Type Cards */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-semibold text-surface-300 uppercase tracking-wider mb-3">Select Agent Workflow</p>
          {AGENT_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isSelected = selectedPreset.id === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => selectPreset(preset)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-accent-600/15 border-accent-500/50 shadow-md shadow-accent-950/30'
                    : 'bg-surface-800/50 border-surface-700/40 hover:border-surface-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-accent-600/30 text-accent-300' : 'bg-surface-700 text-surface-400'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{preset.label}</p>
                    <p className="text-[10px] text-surface-400 mt-0.5 leading-tight">{preset.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Query Config Panel */}
        <div className="lg:col-span-3 card p-5 bg-surface-800/60 border border-surface-700/60 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-2">
              Research Query / Task
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              className="w-full bg-surface-900 border border-surface-600 rounded-xl px-4 py-2.5 text-xs text-white placeholder-surface-400 focus:outline-none focus:border-accent-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-2">
              Patient Sample ID (for Classification Agent)
            </label>
            <input
              type="text"
              value={sampleId}
              onChange={(e) => setSampleId(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-accent-500"
              placeholder="e.g., DC001"
            />
          </div>

          <button
            onClick={executeAgent}
            disabled={loading || !query.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 shadow-md shadow-accent-950/40"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                AIRA Running Multi-Agent Workflow...
              </>
            ) : (
              <>
                <Play size={15} />
                Execute{' '}
                {selectedPreset.id === 'all' ? 'Full 3-Agent Workflow' : selectedPreset.label}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Live Thought Trace ── */}
      {loading && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-surface-300 uppercase tracking-wider flex items-center gap-2">
            <Loader2 size={13} className="animate-spin text-accent-400" />
            AIRA — Agent Execution in Progress
          </p>
          <div className="card p-8 flex justify-center">
            <LoadingSpinner message="Multi-agent system processing... Computation → Summarization → Classification" />
          </div>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-surface-300 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={14} className="text-success-400" />
              Agent Thought Trace &amp; Results
            </p>
            <span className="text-[10px] text-surface-400 font-mono">
              {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* Thought Steps */}
          <div className="space-y-3">
            {result.thought_trace.map((step, i) => (
              <StepCard key={i} step={step} index={i} />
            ))}
          </div>

          {/* Final Synthesis */}
          <div className="card p-5 bg-gradient-to-br from-accent-900/30 to-surface-900/60 border border-accent-500/30 shadow-md shadow-accent-950/30">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={15} className="text-accent-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                AIRA Final Research Synthesis
              </h3>
            </div>
            <div className="text-xs text-surface-200 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
              {result.final_synthesis}
            </div>

            {result.citations && result.citations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-surface-700/40 space-y-1">
                <p className="text-[10px] font-semibold text-surface-400 uppercase">Literature Citations</p>
                <div className="flex flex-wrap gap-2">
                  {result.citations.map((c, i) => (
                    <div
                      key={i}
                      className="text-[10px] px-2 py-1 rounded bg-surface-900 border border-surface-700 text-accent-300 flex items-center gap-1.5"
                    >
                      <BookOpen size={10} />
                      <span className="font-semibold">[{c.pmid}]</span>
                      <span className="text-surface-400 truncate max-w-[200px]">{c.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
