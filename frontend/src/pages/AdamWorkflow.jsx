/**
 * AdamWorkflow.jsx
 * ============================================================================
 * Interactive Visual Timeline of the Complete ADAM Multi-Agent Workflow
 * 
 * Pipeline Stages:
 * Stage 1: Select New Record (Real cohort sample selector with clinical covariates)
 * Stage 2: Computational Agent (ML inference, TreeSHAP, Alpha & Beta Diversity)
 * Stage 3: ML Prediction (Probability, Risk Level, Baseline Decision)
 * Stage 4: SHAP Explainability (Positive & Protective feature attributions)
 * Stage 5: Alpha + Beta Diversity (Shannon, Simpson, Berger-Parker, Bray-Curtis, Jaccard, Canberra)
 * Stage 6: Summarization Agent (10 Visible Reasoning Checkpoints)
 * Stage 7: Classification Agent (10 Visible Classification Checkpoints)
 * Stage 8: Final ADAM Prediction & Consensus Rationale
 * Stage 9: Download / Print Comprehensive Clinical Audit PDF Report
 * ============================================================================
 */
import React, { useState, useEffect } from 'react'
import {
  GitMerge,
  Play,
  RotateCw,
  Cpu,
  TrendingUp,
  Zap,
  Dna,
  FileText,
  ShieldCheck,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  BookOpen,
  User,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'
import { executeAdamWorkflow, fetchAvailableSamples } from '../api/client'

const PIPELINE_STAGES = [
  { id: 'record', label: '1. Select Record', icon: User },
  { id: 'computational', label: '2. Computational Agent', icon: Cpu },
  { id: 'ml', label: '3. ML Prediction', icon: TrendingUp },
  { id: 'shap', label: '4. SHAP Explainability', icon: Zap },
  { id: 'diversity', label: '5. Alpha + Beta Diversity', icon: Dna },
  { id: 'summarization', label: '6. Summarization Agent', icon: FileText },
  { id: 'classification', label: '7. Classification Agent', icon: ShieldCheck },
  { id: 'consensus', label: '8. Final Consensus', icon: Sparkles },
  { id: 'report', label: '9. Clinical PDF Report', icon: Download },
]

export default function AdamWorkflow() {
  const [samples, setSamples] = useState([])
  const [selectedSampleId, setSelectedSampleId] = useState('DC001')
  const [workflowData, setWorkflowData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeStage, setActiveStage] = useState('record')
  const [expandedSections, setExpandedSections] = useState({
    computational: true,
    ml: true,
    shap: true,
    diversity: true,
    summarization: true,
    classification: true,
    consensus: true,
  })

  // Load sample cohort list
  useEffect(() => {
    const loadSamples = async () => {
      try {
        const sList = await fetchAvailableSamples(100)
        setSamples(sList)
        if (sList.length > 0 && !sList.some((s) => s.sample_id === selectedSampleId)) {
          setSelectedSampleId(sList[0].sample_id)
        }
      } catch (err) {
        console.error('Failed to load sample list:', err)
      }
    }
    loadSamples()
  }, [])

  // Execute workflow when sample changes
  const runPipeline = async (sampleIdToRun) => {
    const targetId = sampleIdToRun || selectedSampleId
    if (!targetId) return
    setLoading(true)
    setError(null)

    try {
      const data = await executeAdamWorkflow(targetId)
      setWorkflowData(data)
    } catch (err) {
      console.error('Workflow execution failed:', err)
      setError(err.message || 'Workflow execution failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runPipeline(selectedSampleId)
  }, [selectedSampleId])

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handlePrint = () => {
    window.print()
  }

  const sampleObj = samples.find((s) => s.sample_id === selectedSampleId)

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-semibold text-xs tracking-wider uppercase">
            <GitMerge size={14} />
            <span>Multi-Agent Diagnostic Pipeline</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mt-1">
            Complete ADAM Framework Workflow
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Live interactive progression through the complete ADAM reasoning sequence: from raw multi-omic metagenomic abundances
            through the Computational, Summarization, and Classification agents to final calibrated diagnostic consensus.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => runPipeline(selectedSampleId)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-sm transition disabled:opacity-50"
          >
            <RotateCw size={15} className={clsx(loading && 'animate-spin')} />
            <span>{loading ? 'Executing Pipeline...' : 'Re-Run Pipeline'}</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={!workflowData || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition"
          >
            <Printer size={15} />
            <span>Print Dossier</span>
          </button>
        </div>
      </div>

      {/* Visual Pipeline Stage Navigator */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm overflow-x-auto print:hidden">
        <div className="flex items-center justify-between min-w-[850px] gap-2">
          {PIPELINE_STAGES.map((st, idx) => {
            const Icon = st.icon
            const isCompleted = workflowData && !loading
            return (
              <div key={st.id} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const el = document.getElementById(`stage-${st.id}`)
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                    isCompleted
                      ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 hover:bg-teal-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  )}
                >
                  <Icon size={14} className={isCompleted ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'} />
                  <span>{st.label}</span>
                </button>
                {idx < PIPELINE_STAGES.length - 1 && (
                  <span className="text-slate-300 dark:text-slate-700 font-bold text-xs">→</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* STAGE 1: Record Selector Card */}
      <div id="stage-record" className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">1</span>
            <h2 className="font-bold text-slate-900 dark:text-white text-base">Stage 1: Select Cohort Record</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {samples.length} Validated Samples in Longitudinal Metagenomic Cohort
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Choose Patient Sample ID</label>
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {samples.map((s) => (
                <option key={s.sample_id} value={s.sample_id}>
                  {s.sample_id} — (Study: {s.study_id} | {s.alzheimers === 1 ? 'Positive AD' : 'Control'} | CFS: {s.clinical_frailty_scale})
                </option>
              ))}
            </select>
          </div>

          {/* Quick preset buttons */}
          <div className="md:col-span-2 flex flex-col justify-end space-y-1.5">
            <span className="text-xs text-slate-500 font-medium">Quick Preset Patient Cases:</span>
            <div className="flex flex-wrap items-center gap-2">
              {['DC001', 'DC071', 'DC013', 'DC019', 'DC020'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSelectedSampleId(preset)}
                  className={clsx(
                    'px-2.5 py-1 text-xs rounded-md font-mono transition border',
                    selectedSampleId === preset
                      ? 'bg-teal-600 text-white border-teal-600 font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Sample Information Strip */}
        {workflowData && (
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sample ID</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{workflowData.sample_id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Study Subject</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{workflowData.study_id}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Demographics</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {workflowData.record_summary?.age}y / {workflowData.record_summary?.sex}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Clinical Frailty (CFS)</span>
              <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                {workflowData.record_summary?.clinical_frailty_scale} / 9
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ground Truth Cohort Label</span>
              <span
                className={clsx(
                  'inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold mt-0.5',
                  workflowData.actual_diagnosis === 1
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                )}
              >
                {workflowData.actual_diagnosis_label}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">PPI / Antibiotics</span>
              <span className="text-slate-700 dark:text-slate-300">
                PPI: {workflowData.record_summary?.ppi_use ? 'Yes' : 'No'} | Abx: {workflowData.record_summary?.antibiotics_6mo ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {loading && !workflowData && (
        <div className="p-12 text-center space-y-3">
          <RotateCw size={32} className="animate-spin text-teal-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Running Computational Agent & Multi-Agent Consensus Pipeline...
          </p>
        </div>
      )}

      {workflowData && (
        <div className="space-y-6">
          {/* STAGE 2 & 3: Computational Agent & ML Prediction */}
          <div id="stage-computational" className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                <h2 className="font-bold text-slate-900 dark:text-white text-base">Stage 2 & 3: Computational Agent & ML Baseline</h2>
              </div>
              <button onClick={() => toggleSection('computational')} className="text-slate-400 hover:text-slate-600">
                {expandedSections.computational ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {expandedSections.computational && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ML Prediction Output */}
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Base XGBoost Prediction</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                      {(workflowData.computational_agent?.ml_prediction?.probability * 100).toFixed(1)}%
                    </span>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded text-xs font-bold font-mono',
                        workflowData.computational_agent?.ml_prediction?.label === 1
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                      )}
                    >
                      {workflowData.computational_agent?.ml_prediction?.label === 1 ? 'Positive AD' : 'Control'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          workflowData.computational_agent?.ml_prediction?.probability >= 0.5 ? 'bg-rose-500' : 'bg-emerald-500'
                        )}
                        style={{ width: `${Math.min(workflowData.computational_agent?.ml_prediction?.probability * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>0.0 (Control)</span>
                      <span>Threshold 0.50</span>
                      <span>1.0 (AD)</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Risk Assessment: <strong>{workflowData.computational_agent?.ml_prediction?.risk_level}</strong> with{' '}
                    <strong>{(workflowData.computational_agent?.ml_prediction?.confidence * 100).toFixed(1)}%</strong> model certainty.
                  </p>
                </div>

                {/* Microbiome Species Profiling */}
                <div className="md:col-span-2 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Microbiome Profile Overview</span>
                    <span className="text-xs text-teal-600 dark:text-teal-400 font-mono">
                      {workflowData.computational_agent?.microbiome_overview?.species_present_count} / {workflowData.computational_agent?.microbiome_overview?.total_species_profiled} Species Detected
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Top Abundant Taxa in Sample:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {workflowData.computational_agent?.microbiome_overview?.top_abundant_taxa?.slice(0, 4).map((taxa) => (
                        <div key={taxa.species} className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 text-xs flex justify-between">
                          <span className="font-mono text-slate-800 dark:text-slate-200 truncate pr-2">{taxa.species}</span>
                          <span className="font-mono font-semibold text-teal-600 shrink-0">{(taxa.abundance * 100).toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STAGE 4: SHAP Explainability Card */}
          <div id="stage-shap" className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">4</span>
                <h2 className="font-bold text-slate-900 dark:text-white text-base">Stage 4: TreeSHAP Feature Attribution</h2>
              </div>
              <button onClick={() => toggleSection('shap')} className="text-slate-400 hover:text-slate-600">
                {expandedSections.shap ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {expandedSections.shap && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  <strong>Scientific Methodology Note:</strong> SHAP values explain mathematical feature contribution to the gradient boosting model's log-odds output. 
                  SHAP does <em>not</em> establish direct biological or clinical causality.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Positive Risk Drivers */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">
                      Top Features Increasing AD Probability (+SHAP)
                    </span>
                    <div className="space-y-2">
                      {workflowData.computational_agent?.shap_explanation?.positive_drivers?.slice(0, 4).map((f) => (
                        <div key={f.feature} className="p-2.5 rounded-lg border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between text-xs">
                          <div className="truncate pr-2">
                            <span className="font-semibold block text-slate-900 dark:text-white">{f.feature}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Value: {f.feature_value.toFixed(4)}</span>
                          </div>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 shrink-0">
                            +{f.shap_value.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Protective Drivers */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                      Top Features Decreasing Risk (-SHAP)
                    </span>
                    <div className="space-y-2">
                      {workflowData.computational_agent?.shap_explanation?.protective_drivers?.slice(0, 4).map((f) => (
                        <div key={f.feature} className="p-2.5 rounded-lg border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between text-xs">
                          <div className="truncate pr-2">
                            <span className="font-semibold block text-slate-900 dark:text-white">{f.feature}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Value: {f.feature_value.toFixed(4)}</span>
                          </div>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {f.shap_value.toFixed(4)}
                          </span>
                        </div>
                      ))}
                      {(!workflowData.computational_agent?.shap_explanation?.protective_drivers ||
                        workflowData.computational_agent?.shap_explanation?.protective_drivers.length === 0) && (
                        <div className="p-3 text-xs text-slate-400 italic">No protective features detected for this sample profile.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STAGE 5: Alpha + Beta Diversity Card */}
          <div id="stage-diversity" className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">5</span>
                <h2 className="font-bold text-slate-900 dark:text-white text-base">Stage 5: Alpha & Beta Diversity Metrics</h2>
              </div>
              <button onClick={() => toggleSection('diversity')} className="text-slate-400 hover:text-slate-600">
                {expandedSections.diversity ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {expandedSections.diversity && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Alpha Diversity */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    <Activity size={15} className="text-teal-600" />
                    <span>Alpha Diversity (Within-Sample Complexity)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Shannon ($H'$)</span>
                      <span className="text-lg font-bold font-mono text-teal-600">
                        {workflowData.computational_agent?.alpha_diversity?.shannon_index.toFixed(3)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Simpson ($D$)</span>
                      <span className="text-lg font-bold font-mono text-teal-600">
                        {workflowData.computational_agent?.alpha_diversity?.simpson_index.toFixed(4)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Berger-Parker</span>
                      <span className="text-lg font-bold font-mono text-teal-600">
                        {workflowData.computational_agent?.alpha_diversity?.berger_parker_dominance.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Formula: $H' = -\sum p_i \ln p_i$ (calculated exactly across 940 species). Reflects ecosystem richness and equitability.
                  </p>
                </div>

                {/* Beta Diversity */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                    <Dna size={15} className="text-blue-600" />
                    <span>Beta Diversity (Distance to Healthy Control Centroid)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Bray-Curtis</span>
                      <span className="text-lg font-bold font-mono text-blue-600">
                        {workflowData.computational_agent?.beta_diversity?.bray_curtis_distance.toFixed(4)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Jaccard</span>
                      <span className="text-lg font-bold font-mono text-blue-600">
                        {workflowData.computational_agent?.beta_diversity?.jaccard_distance.toFixed(4)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-center">
                      <span className="text-[10px] text-slate-400 uppercase block font-semibold">Canberra</span>
                      <span className="text-lg font-bold font-mono text-blue-600">
                        {workflowData.computational_agent?.beta_diversity?.canberra_distance.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Calculated using SciPy spatial distance against the cohort's healthy normal control centroid.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* STAGE 6: Summarization Agent Checkpoints */}
          <div id="stage-summarization" className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">6</span>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">Stage 6: Summarization Agent</h2>
                </div>
                <span className="text-xs text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
                  ADAM-1 Enhanced Reasoning Workflow (10 User-Facing Reasoning Checkpoints)
                </span>
              </div>
              <button onClick={() => toggleSection('summarization')} className="text-slate-400 hover:text-slate-600">
                {expandedSections.summarization ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {expandedSections.summarization && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workflowData.summarization_agent?.checkpoints?.map((cp) => (
                    <div key={cp.step} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-mono font-bold">
                          {cp.step}
                        </span>
                        <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{cp.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 pl-7 leading-relaxed">{cp.content}</p>
                    </div>
                  ))}
                </div>

                {/* Retrieved Literature Citations */}
                {workflowData.summarization_agent?.citations?.length > 0 && (
                  <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 space-y-1.5">
                    <span className="text-xs font-semibold text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                      <BookOpen size={14} /> Retrieved Peer-Reviewed Citations
                    </span>
                    <ul className="text-xs text-teal-800 dark:text-teal-300 space-y-1 pl-4 list-disc">
                      {workflowData.summarization_agent.citations.map((c) => (
                        <li key={c.pmid}>
                          <strong>[{c.pmid}]</strong> {c.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STAGE 7: Classification Agent Checkpoints */}
          <div id="stage-classification" className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">7</span>
                  <h2 className="font-bold text-slate-900 dark:text-white text-base">Stage 7: Classification Agent</h2>
                </div>
                <span className="text-xs text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
                  ADAM-1 Enhanced Classification Implementation (10 Evidence Decision Checkpoints)
                </span>
              </div>
              <button onClick={() => toggleSection('classification')} className="text-slate-400 hover:text-slate-600">
                {expandedSections.classification ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {expandedSections.classification && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workflowData.classification_agent?.checkpoints?.map((cp) => (
                    <div key={cp.step} className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-mono font-bold">
                          {cp.step}
                        </span>
                        <h4 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{cp.title}</h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 pl-7 leading-relaxed">{cp.content}</p>
                    </div>
                  ))}
                </div>

                {workflowData.classification_agent?.adaptive_threshold_applied && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                    <span>
                      <strong>Adaptive Decision Boundary Rule Activated:</strong>{' '}
                      {workflowData.classification_agent?.reasoning_rule}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STAGE 8: Final ADAM Result Card */}
          <div id="stage-consensus" className="p-6 rounded-xl border-2 border-teal-500/80 bg-gradient-to-br from-teal-50/60 via-white to-emerald-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40 shadow-md space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-teal-200/60 dark:border-teal-900/60 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">8</span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white text-lg">Stage 8: Final ADAM Diagnostic Consensus</h2>
                  <span className="text-xs text-teal-700 dark:text-teal-400 font-mono">
                    Version: {workflowData.final_result?.methodology_version}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide',
                    workflowData.final_result?.adam_binary_label === 1
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  )}
                >
                  {workflowData.final_result?.adam_prediction}
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-2 py-1 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                  Confidence: {(workflowData.final_result?.adam_confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Comparison of ML baseline vs Final ADAM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">XGBoost Baseline Prediction</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {workflowData.final_result?.ml_model_label} ({(workflowData.final_result?.ml_model_probability * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">ADAM Consensus Prediction</span>
                <span className="font-bold text-teal-700 dark:text-teal-400 text-sm">
                  {workflowData.final_result?.adam_prediction}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Model Concordance</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {workflowData.final_result?.is_discordant ? '⚠️ Discordant (Agent Refinement)' : '✓ Concordant (Agreement)'}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cohort Ground Truth Match</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {workflowData.final_result?.matches_ground_truth ? '✓ Correct Diagnosis' : 'Misclassified'}
                </span>
              </div>
            </div>

            {/* Final Diagnostic Explanation */}
            <div className="space-y-2 bg-white/80 dark:bg-slate-800/80 p-4 rounded-xl border border-teal-200/60 dark:border-teal-900/60">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                <FileText size={14} className="text-teal-600" />
                <span>Auditable Decision Rationale</span>
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {workflowData.final_result?.explanation}
              </p>
            </div>
          </div>

          {/* STAGE 9: Download / Print Dossier Action Card */}
          <div id="stage-report" className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold">9</span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Download ADAM Analysis Report</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Generates a multi-page audit report for Patient <strong>{workflowData.sample_id}</strong> containing all 10 summarization and 10 classification checkpoints, exact diversity metrics, and TreeSHAP attributions.
              </p>
            </div>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow transition shrink-0"
            >
              <Download size={16} />
              <span>Download PDF Report</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
