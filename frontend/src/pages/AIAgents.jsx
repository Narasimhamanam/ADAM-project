/**
 * AIRA Multi-Agent Workspace
 * ==========================
 * Interactive multi-agent execution panel with structured vertical agent
 * response hierarchy, pure Markdown rendering, and real-time patient validation.
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
  Search,
  Brain,
  Microscope,
  Calculator,
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import MarkdownContent from '../components/ui/MarkdownContent';

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
];

const QUICK_PATIENTS = ['DC001', 'DC002', 'DC017', 'FB085', 'FB100', 'FB300'];

export default function AIAgents() {
  const [selectedPreset, setSelectedPreset] = useState(AGENT_PRESETS[0]);
  const [query, setQuery] = useState(AGENT_PRESETS[0].defaultQuery);
  const [sampleId, setSampleId] = useState('DC001');
  const [patientValidation, setPatientValidation] = useState({ valid: true, message: '' });
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

  // Real-time Patient ID validation
  useEffect(() => {
    const clean = sampleId.trim().toUpperCase();
    if (!clean) {
      setPatientValidation({ valid: false, message: 'Please enter a Patient ID.' });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/samples/${clean}`);
        if (res.ok) {
          setPatientValidation({ valid: true, message: `✓ Patient ${clean} validated in cohort` });
        } else {
          setPatientValidation({
            valid: false,
            message: `⚠️ Invalid Patient ID: "${clean}". Enter a valid ID (e.g., DC001-DC092, FB085-FB399).`,
          });
        }
      } catch {
        setPatientValidation({ valid: true, message: '' });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [sampleId]);

  function selectPreset(preset) {
    setSelectedPreset(preset);
    setQuery(preset.defaultQuery);
    setResult(null);
    setError(null);
  }

  async function executeAgent() {
    if (!query.trim() || loading) return;
    if (!patientValidation.valid && (selectedPreset.id === 'all' || selectedPreset.id === 'classification')) {
      setError(`Invalid Patient ID: "${sampleId}". Please enter a valid ID from the cohort first.`);
      return;
    }

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
          sample_id: sampleId.trim().toUpperCase(),
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

  const isPatientInputDisabled = selectedPreset.id === 'computation' || selectedPreset.id === 'summarization';

  // Extract individual agent outputs from thought_trace
  const compStep = result?.thought_trace?.find((t) => t.agent?.includes('Computation'));
  const summStep = result?.thought_trace?.find((t) => t.agent?.includes('Summarization'));
  const classStep = result?.thought_trace?.find((t) => t.agent?.includes('Classification'));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">AI Agent Workspace (AIRA)</h1>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E8F7F4] text-[#0F9D8A] border border-[#0F9D8A]/30">
              Phase 4 — Complete
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            Multi-agent research system with structured clinical synthesis, real-time patient validation, and live thought trace.
          </p>
        </div>
        {aiStatus && (
          <div className="card px-3.5 py-2 bg-surface-900 border border-surface-700 text-xs space-y-1 shadow-sm">
            <p className="text-surface-400 font-medium">
              Engine: <span className="text-[#0F9D8A] font-bold">{aiStatus.active_provider}</span>
            </p>
            <p className="text-surface-400 font-medium">
              Corpus: <span className="text-[#16A34A] font-bold">{aiStatus.indexed_articles} PubMed articles</span>
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
                    ? 'bg-[#E8F7F4] border-[#0F9D8A] shadow-sm'
                    : 'bg-surface-900 border-surface-700 hover:border-surface-600'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#0F9D8A] text-white font-bold' : 'bg-surface-800 text-surface-400'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isSelected ? 'text-[#0F9D8A]' : 'text-surface-50'}`}>
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-surface-400 mt-0.5 leading-tight">{preset.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Query Config Panel */}
        <div className="lg:col-span-3 card p-5 bg-surface-900 border border-surface-700 shadow-sm flex flex-col gap-4">
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
                    patientValidation.valid ? 'text-[#16A34A]' : 'text-[#DC2626]'
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
                !patientValidation.valid && !isPatientInputDisabled
                  ? 'border-[#DC2626] focus:ring-[#DC2626] bg-[#FEF2F2]'
                  : ''
              }`}
              placeholder="e.g., DC001"
            />

            {/* Quick patient buttons */}
            {!isPatientInputDisabled && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap text-xs">
                <span className="text-[10px] font-semibold text-surface-400">Quick Samples:</span>
                {QUICK_PATIENTS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSampleId(id)}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-all ${
                      sampleId === id
                        ? 'bg-[#E8F7F4] text-[#0F9D8A] border border-[#0F9D8A]'
                        : 'bg-surface-800 text-surface-400 hover:text-surface-50 border border-surface-700'
                    }`}
                  >
                    {id}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={executeAgent}
            disabled={
              loading ||
              !query.trim() ||
              (!patientValidation.valid && (selectedPreset.id === 'all' || selectedPreset.id === 'classification'))
            }
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="card p-8 flex justify-center bg-surface-900 border border-surface-700">
          <LoadingSpinner message="AIRA Multi-Agent System Processing... (Computation → Summarization → Classification)" />
        </div>
      )}

      {/* ── 3-Agent Vertical Workflow Response Hierarchy ── */}
      {result && !loading && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-surface-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#16A34A]" />
              <h2 className="text-sm font-bold text-surface-50 uppercase tracking-wider">
                AIRA 3-Agent Collaborative Workflow Results
              </h2>
            </div>
            <span className="text-xs text-surface-400 font-mono font-medium">
              Executed at {new Date(result.timestamp).toLocaleTimeString()}
            </span>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              1. 🧮 Computation Agent Response
              ───────────────────────────────────────────────────────────── */}
          {(compStep || result.task_type === 'computation') && (
            <div className="card p-6 bg-surface-900 border border-surface-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-surface-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center font-bold">
                    <Calculator size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-50 flex items-center gap-1.5">
                      🧮 Computation Agent
                    </h3>
                    <p className="text-[11px] text-surface-400 font-medium">
                      Quantitative dataset metrics, model benchmarks, and experiment summaries
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/30">
                  Step 1 · Quantitative
                </span>
              </div>

              {/* Formatted Content */}
              <div className="pt-1">
                <MarkdownContent content={compStep?.result || result.final_synthesis} />
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              2. 🧠 Summarization Agent Response
              ───────────────────────────────────────────────────────────── */}
          {(summStep || result.task_type === 'summarization') && (
            <div className="card p-6 bg-surface-900 border border-surface-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-surface-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#E8F7F4] text-[#0F9D8A] flex items-center justify-center font-bold">
                    <Brain size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-50 flex items-center gap-1.5">
                      🧠 Summarization Agent
                    </h3>
                    <p className="text-[11px] text-surface-400 font-medium">
                      Biomedical literature review, mechanistic pathways, and evidence synthesis
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E8F7F4] text-[#0F9D8A] border border-[#0F9D8A]/30">
                  Step 2 · Literature RAG
                </span>
              </div>

              {/* Formatted Content */}
              <div className="pt-1">
                <MarkdownContent content={summStep?.result || result.literature_synthesis || result.final_synthesis} />
              </div>

              {/* Verified Citations List (if returned) */}
              {result.citations && result.citations.length > 0 && (
                <div className="pt-3 border-t border-surface-700 flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-surface-400 uppercase">Scientific Citations:</span>
                  {result.citations.map((c, i) => (
                    <a
                      key={i}
                      href={`https://pubmed.ncbi.nlm.nih.gov/?term=${c.pmid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] px-2 py-0.5 rounded bg-surface-800 border border-surface-700 text-[#0F9D8A] font-bold hover:border-[#0F9D8A]"
                    >
                      [{c.pmid}] {c.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              3. 🔬 Classification Agent Response
              ───────────────────────────────────────────────────────────── */}
          {(classStep || result.task_type === 'classification') && (
            <div className="card p-6 bg-surface-900 border border-surface-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-surface-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] text-[#D97706] flex items-center justify-center font-bold">
                    <Microscope size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-surface-50 flex items-center gap-1.5">
                      🔬 Classification Agent
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
                        ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#DC2626]/30'
                        : 'bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/30'
                    }`}
                  >
                    {result.actual_diagnosis === 1 ? 'Alzheimer’s (+)' : 'Cognitive Normal (Control)'}
                  </span>
                )}
              </div>

              {/* Formatted Content */}
              <div className="pt-1">
                <MarkdownContent content={classStep?.result || result.diagnostic_assessment || result.final_synthesis} />
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              4. ✨ Final AIRA Prediction / Final Integrated Response
              ───────────────────────────────────────────────────────────── */}
          {result.task_type === 'multi_agent_workflow' && result.final_synthesis && (
            <div className="card p-6 md:p-8 bg-[#E8F7F4] dark:bg-surface-800 border-2 border-[#0F9D8A] shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-[#0F9D8A]/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0F9D8A] text-white flex items-center justify-center font-bold shadow-sm">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-surface-50 uppercase tracking-wide flex items-center gap-2">
                      ✨ Final AIRA Prediction &amp; Integrated Synthesis
                    </h3>
                    <p className="text-xs text-surface-400 font-medium">
                      Multi-agent consensus combining computation benchmarks, literature evidence, and diagnostic reasoning
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#0F9D8A] text-white shadow-sm">
                  Integrated Consensus
                </span>
              </div>

              {/* Formatted Content */}
              <div className="pt-2">
                <MarkdownContent content={result.final_synthesis} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
