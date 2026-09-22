/**
 * AdamWorkflow.jsx
 * ============================================================================
 * Interactive Visual Timeline of the Complete ADAM Multi-Agent Workflow
 * Elevated clinical aesthetic with AgentPipeline stepper, 3-tier card elevation,
 * 10-checkpoint reasoning panels, and exact mathematical diversity dials.
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
import AgentPipeline from '../components/ui/AgentPipeline'
import Skeleton from '../components/ui/Skeleton'

const PIPELINE_STAGES = [
  { id: 'record', label: '1. Select Record', icon: User },
  { id: 'computational', label: '2. Computational Agent', icon: Cpu },
  { id: 'ml', label: '3. ML Prediction', icon: TrendingUp },
  { id: 'shap', label: '4. SHAP Explainability', icon: Zap },
  { id: 'diversity', label: '5. Diversity Dials', icon: Dna },
  { id: 'summarization', label: '6. Summarization Agent', icon: FileText },
  { id: 'classification', label: '7. Classification Agent', icon: ShieldCheck },
  { id: 'consensus', label: '8. Final Consensus', icon: Sparkles },
  { id: 'report', label: '9. Clinical Report', icon: Download },
]

export default function AdamWorkflow() {
  const [samples, setSamples] = useState([])
  const [selectedSampleId, setSelectedSampleId] = useState('DC001')
  const [workflowData, setWorkflowData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
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

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-surface-700/60 pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-accent-500 font-semibold text-xs tracking-wider uppercase">
            <GitMerge size={14} />
            <span>Multi-Agent Diagnostic Pipeline</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-surface-50 tracking-tight mt-1">
            Complete ADAM Framework Workflow
          </h1>
          <p className="text-sm text-surface-400 mt-1 max-w-3xl font-medium">
            Live interactive progression through the complete ADAM reasoning sequence: from raw multi-omic metagenomic abundances
            through the Computational, Summarization, and Classification agents to final calibrated diagnostic consensus.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => runPipeline(selectedSampleId)}
            disabled={loading}
            className="btn-teal text-xs py-2 px-4 flex items-center gap-2 font-semibold disabled:opacity-50"
          >
            <RotateCw size={14} className={clsx(loading && 'animate-spin')} />
            <span>{loading ? 'Executing Pipeline...' : 'Re-Run Pipeline'}</span>
          </button>
          <button
            onClick={handlePrint}
            disabled={!workflowData || loading}
            className="btn-ghost text-xs py-2 px-3.5 flex items-center gap-2 font-semibold disabled:opacity-50"
          >
            <Printer size={14} />
            <span>Print Dossier</span>
          </button>
        </div>
      </div>

      {/* Multi-Agent Diagnostic Pipeline Stepper */}
      <div className="card-raised p-5 border border-surface-700/70 bg-gradient-to-br from-surface-900 via-surface-900 to-surface-800 print:hidden">
        <AgentPipeline
          currentStage={
            loading
              ? 'computational'
              : workflowData?.final_result
              ? 'consensus'
              : 'computational'
          }
          stageStatuses={{
            computational: loading ? 'running' : workflowData ? 'complete' : 'idle',
            summarization: loading ? 'idle' : workflowData ? 'complete' : 'idle',
            classification: loading ? 'idle' : workflowData ? 'complete' : 'idle',
            consensus: loading ? 'idle' : workflowData ? 'complete' : 'idle',
          }}
        />
      </div>

      {/* STAGE 1: Record Selector Card */}
      <div id="stage-record" className="card-raised p-5 border border-surface-700/60 bg-surface-900 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-surface-700/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">1</span>
            <h2 className="font-bold text-surface-50 text-base">Stage 1: Select Cohort Record</h2>
          </div>
          <span className="text-xs text-surface-400 font-mono">
            {samples.length} Validated Samples in Longitudinal Metagenomic Cohort
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-surface-300">Choose Patient Sample ID</label>
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              className="input font-mono text-xs"
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
            <span className="text-xs text-surface-400 font-medium">Quick Preset Patient Cases:</span>
            <div className="flex flex-wrap items-center gap-2">
              {['DC001', 'DC071', 'DC013', 'DC019', 'DC020'].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setSelectedSampleId(preset)}
                  className={clsx(
                    'px-2.5 py-1 text-xs rounded-md font-mono transition border',
                    selectedSampleId === preset
                      ? 'bg-accent-500 text-white border-accent-500 font-bold shadow-sm'
                      : 'bg-surface-800 text-surface-300 border-surface-700/60 hover:bg-surface-700'
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
          <div className="p-3.5 rounded-xl bg-surface-800/80 border border-surface-700/60 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <span className="text-surface-400 block text-[10px] uppercase font-semibold">Sample ID</span>
              <span className="font-mono font-bold text-surface-50">{workflowData.sample_id}</span>
            </div>
            <div>
              <span className="text-surface-400 block text-[10px] uppercase font-semibold">Study Subject</span>
              <span className="font-mono font-semibold text-surface-200">{workflowData.study_id}</span>
            </div>
            <div>
              <span className="text-surface-400 block text-[10px] uppercase font-semibold">Demographics</span>
              <span className="font-medium text-surface-200">
                {workflowData.record_summary?.age}y / {workflowData.record_summary?.sex}
              </span>
            </div>
            <div>
              <span className="text-surface-400 block text-[10px] uppercase font-semibold">Clinical Frailty (CFS)</span>
              <span className="font-data font-bold text-accent-500 dark:text-accent-400">
                {workflowData.record_summary?.clinical_frailty_scale} / 9
              </span>
            </div>
            <div>
              <span className="text-surface-400 block text-[10px] uppercase font-semibold">Ground Truth Cohort Label</span>
              <span
                className={clsx(
                  'inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 uppercase font-mono',
                  workflowData.actual_diagnosis === 1
                    ? 'bg-danger-500/15 text-danger-500 dark:text-danger-400 border border-danger-500/30'
                    : 'bg-success-500/15 text-success-600 dark:text-success-400 border border-success-500/30'
                )}
              >
                {workflowData.actual_diagnosis_label}
              </span>
            </div>
            <div>
              <span className="text-surface-400 block text-[10px] uppercase font-semibold">PPI / Antibiotics</span>
              <span className="text-surface-300 font-mono text-[11px]">
                PPI: {workflowData.record_summary?.ppi_use ? 'Yes' : 'No'} | Abx: {workflowData.record_summary?.antibiotics_6mo ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-danger-500/30 bg-danger-500/10 text-danger-500 text-xs font-mono">
          {error}
        </div>
      )}

      {loading && !workflowData && (
        <div className="space-y-4">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      )}

      {workflowData && (
        <div className="space-y-6">
          {/* STAGE 2 & 3: Computational Agent & ML Prediction */}
          <div id="stage-computational" className="card-raised p-5 border border-surface-700/60 bg-surface-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                <h2 className="font-bold text-surface-50 text-base">Stage 2 &amp; 3: Computational Agent &amp; ML Baseline</h2>
              </div>
              <button onClick={() => toggleSection('computational')} className="text-surface-400 hover:text-surface-100">
                {expandedSections.computational ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {expandedSections.computational && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ML Prediction Output */}
                <div className="p-4 rounded-xl border border-surface-700/60 bg-surface-800/60 space-y-3">
                  <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">Base XGBoost Prediction</span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold font-data text-surface-50">
                      {(workflowData.computational_agent?.ml_prediction?.probability * 100).toFixed(1)}%
                    </span>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded text-xs font-bold font-mono uppercase',
                        workflowData.computational_agent?.ml_prediction?.label === 1
                          ? 'bg-danger-500/15 text-danger-500 dark:text-danger-400 border border-danger-500/30'
                          : 'bg-success-500/15 text-success-600 dark:text-success-400 border border-success-500/30'
                      )}
                    >
                      {workflowData.computational_agent?.ml_prediction?.label === 1 ? 'Positive AD' : 'Control'}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-surface-700/60 rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          'h-full rounded-full transition-all duration-500',
                          workflowData.computational_agent?.ml_prediction?.probability >= 0.5 ? 'bg-danger-500' : 'bg-accent-500'
                        )}
                        style={{ width: `${Math.min(workflowData.computational_agent?.ml_prediction?.probability * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-surface-400 font-mono">
                      <span>0.0 (Control)</span>
                      <span>Threshold 0.50</span>
                      <span>1.0 (AD)</span>
                    </div>
                  </div>

                  <p className="text-xs text-surface-400">
                    Risk Assessment: <strong className="text-surface-200">{workflowData.computational_agent?.ml_prediction?.risk_level}</strong> with{' '}
                    <strong className="text-surface-200">{(workflowData.computational_agent?.ml_prediction?.confidence * 100).toFixed(1)}%</strong> model certainty.
                  </p>
                </div>

                {/* Microbiome Species Profiling */}
                <div className="md:col-span-2 p-4 rounded-xl border border-surface-700/60 bg-surface-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">Microbiome Profile Overview</span>
                    <span className="text-xs text-accent-500 dark:text-accent-400 font-mono font-bold">
                      {workflowData.computational_agent?.microbiome_overview?.species_present_count} / {workflowData.computational_agent?.microbiome_overview?.total_species_profiled} Species Detected
                    </span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-surface-300">Top Abundant Taxa in Sample:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {workflowData.computational_agent?.microbiome_overview?.top_abundant_taxa?.slice(0, 4).map((taxa) => (
                        <div key={taxa.species} className="p-2.5 rounded-lg bg-surface-900 border border-surface-700/60 text-xs flex justify-between items-center">
                          <span className="font-mono text-surface-200 truncate pr-2 italic">{taxa.species}</span>
                          <span className="font-data font-bold text-accent-500 dark:text-accent-400 shrink-0">{(taxa.abundance * 100).toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STAGE 4: SHAP Explainability Card */}
          <div id="stage-shap" className="card-raised p-5 border border-surface-700/60 bg-surface-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">4</span>
                <h2 className="font-bold text-surface-50 text-base">Stage 4: TreeSHAP Feature Attribution</h2>
              </div>
              <button onClick={() => toggleSection('shap')} className="text-surface-400 hover:text-surface-100">
                {expandedSections.shap ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {expandedSections.shap && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                  <strong>Scientific Methodology Note:</strong> SHAP values explain mathematical feature contribution to the gradient boosting model's log-odds output. 
                  SHAP does <em>not</em> establish direct biological or clinical causality.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Positive Risk Drivers */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-danger-500 dark:text-danger-400 uppercase tracking-wider">
                      Top Features Increasing AD Probability (+SHAP)
                    </span>
                    <div className="space-y-2">
                      {workflowData.computational_agent?.shap_explanation?.positive_drivers?.slice(0, 4).map((f) => (
                        <div key={f.feature} className="p-2.5 rounded-lg border border-danger-500/30 bg-danger-500/10 flex items-center justify-between text-xs">
                          <div className="truncate pr-2">
                            <span className="font-semibold block text-surface-50">{f.feature}</span>
                            <span className="text-[10px] text-surface-400 font-mono">Value: {f.feature_value.toFixed(4)}</span>
                          </div>
                          <span className="font-data font-bold text-danger-500 dark:text-danger-400 shrink-0">
                            +{f.shap_value.toFixed(4)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Protective Drivers */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-accent-500 dark:text-accent-400 uppercase tracking-wider">
                      Top Features Decreasing Risk (-SHAP)
                    </span>
                    <div className="space-y-2">
                      {workflowData.computational_agent?.shap_explanation?.protective_drivers?.slice(0, 4).map((f) => (
                        <div key={f.feature} className="p-2.5 rounded-lg border border-accent-500/30 bg-accent-500/10 flex items-center justify-between text-xs">
                          <div className="truncate pr-2">
                            <span className="font-semibold block text-surface-50">{f.feature}</span>
                            <span className="text-[10px] text-surface-400 font-mono">Value: {f.feature_value.toFixed(4)}</span>
                          </div>
                          <span className="font-data font-bold text-accent-500 dark:text-accent-400 shrink-0">
                            {f.shap_value.toFixed(4)}
                          </span>
                        </div>
                      ))}
                      {(!workflowData.computational_agent?.shap_explanation?.protective_drivers ||
                        workflowData.computational_agent?.shap_explanation?.protective_drivers.length === 0) && (
                        <div className="p-3 text-xs text-surface-400 italic">No protective features detected for this sample profile.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STAGE 5: Alpha + Beta Diversity Card */}
          <div id="stage-diversity" className="card-raised p-5 border border-surface-700/60 bg-surface-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">5</span>
                <h2 className="font-bold text-surface-50 text-base">Stage 5: Alpha &amp; Beta Diversity Metrics</h2>
              </div>
              <button onClick={() => toggleSection('diversity')} className="text-surface-400 hover:text-surface-100">
                {expandedSections.diversity ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {expandedSections.diversity && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Alpha Diversity */}
                <div className="p-4 rounded-xl border border-surface-700/60 bg-surface-800/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-surface-200 uppercase tracking-wider">
                    <Activity size={15} className="text-accent-500" />
                    <span>Alpha Diversity (Within-Sample Complexity)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-surface-900 border border-surface-700/60 text-center">
                      <span className="text-[10px] text-surface-400 uppercase block font-semibold">Shannon ($H'$)</span>
                      <span className="font-data text-base font-extrabold text-accent-500 dark:text-accent-400">
                        {workflowData.computational_agent?.alpha_diversity?.shannon_index.toFixed(3)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-900 border border-surface-700/60 text-center">
                      <span className="text-[10px] text-surface-400 uppercase block font-semibold">Simpson ($D$)</span>
                      <span className="font-data text-base font-extrabold text-accent-500 dark:text-accent-400">
                        {workflowData.computational_agent?.alpha_diversity?.simpson_index.toFixed(4)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-900 border border-surface-700/60 text-center">
                      <span className="text-[10px] text-surface-400 uppercase block font-semibold">Berger-Parker</span>
                      <span className="font-data text-base font-extrabold text-accent-500 dark:text-accent-400">
                        {workflowData.computational_agent?.alpha_diversity?.berger_parker_dominance.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-surface-400">
                    Formula: $H' = -\sum p_i \ln p_i$ (calculated exactly across 940 species). Reflects ecosystem richness and equitability.
                  </p>
                </div>

                {/* Beta Diversity */}
                <div className="p-4 rounded-xl border border-surface-700/60 bg-surface-800/60 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-surface-200 uppercase tracking-wider">
                    <Dna size={15} className="text-primary-500" />
                    <span>Beta Diversity (Distance to Healthy Centroid)</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-surface-900 border border-surface-700/60 text-center">
                      <span className="text-[10px] text-surface-400 uppercase block font-semibold">Bray-Curtis</span>
                      <span className="font-data text-base font-extrabold text-primary-500 dark:text-primary-400">
                        {workflowData.computational_agent?.beta_diversity?.bray_curtis_distance.toFixed(4)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-900 border border-surface-700/60 text-center">
                      <span className="text-[10px] text-surface-400 uppercase block font-semibold">Jaccard</span>
                      <span className="font-data text-base font-extrabold text-primary-500 dark:text-primary-400">
                        {workflowData.computational_agent?.beta_diversity?.jaccard_distance.toFixed(4)}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-900 border border-surface-700/60 text-center">
                      <span className="text-[10px] text-surface-400 uppercase block font-semibold">Canberra</span>
                      <span className="font-data text-base font-extrabold text-primary-500 dark:text-primary-400">
                        {workflowData.computational_agent?.beta_diversity?.canberra_distance.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-surface-400">
                    Calculated using SciPy spatial distance against the cohort's healthy normal control centroid.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* STAGE 6: Summarization Agent Checkpoints */}
          <div id="stage-summarization" className="card-raised p-5 border border-surface-700/60 bg-surface-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">6</span>
                  <h2 className="font-bold text-surface-50 text-base">Stage 6: Summarization Agent</h2>
                </div>
                <span className="text-xs text-accent-500 dark:text-accent-400 font-mono mt-0.5 block font-semibold">
                  ADAM-1 Enhanced Reasoning Workflow (10 User-Facing Reasoning Checkpoints)
                </span>
              </div>
              <button onClick={() => toggleSection('summarization')} className="text-surface-400 hover:text-surface-100">
                {expandedSections.summarization ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {expandedSections.summarization && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workflowData.summarization_agent?.checkpoints?.map((cp) => (
                    <div key={cp.step} className="p-3.5 rounded-lg border border-surface-700/50 bg-surface-800/50 space-y-1 hover:border-surface-600 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-500 flex items-center justify-center text-[10px] font-mono font-bold">
                          {cp.step}
                        </span>
                        <h4 className="font-bold text-xs text-surface-100">{cp.title}</h4>
                      </div>
                      <p className="text-xs text-surface-300 pl-7 leading-relaxed">{cp.content}</p>
                    </div>
                  ))}
                </div>

                {/* Retrieved Literature Citations */}
                {workflowData.summarization_agent?.citations?.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-accent-500/10 border border-accent-500/30 space-y-1.5">
                    <span className="text-xs font-bold text-accent-600 dark:text-accent-300 flex items-center gap-1.5">
                      <BookOpen size={14} /> Retrieved Peer-Reviewed Citations
                    </span>
                    <ul className="text-xs text-surface-300 space-y-1 pl-4 list-disc">
                      {workflowData.summarization_agent.citations.map((c) => (
                        <li key={c.pmid}>
                          <strong className="text-surface-100">[{c.pmid}]</strong> {c.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STAGE 7: Classification Agent Checkpoints */}
          <div id="stage-classification" className="card-raised p-5 border border-surface-700/60 bg-surface-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">7</span>
                  <h2 className="font-bold text-surface-50 text-base">Stage 7: Classification Agent</h2>
                </div>
                <span className="text-xs text-accent-500 dark:text-accent-400 font-mono mt-0.5 block font-semibold">
                  ADAM-1 Enhanced Classification Implementation (10 Evidence Decision Checkpoints)
                </span>
              </div>
              <button onClick={() => toggleSection('classification')} className="text-surface-400 hover:text-surface-100">
                {expandedSections.classification ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {expandedSections.classification && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workflowData.classification_agent?.checkpoints?.map((cp) => (
                    <div key={cp.step} className="p-3.5 rounded-lg border border-surface-700/50 bg-surface-800/50 space-y-1 hover:border-surface-600 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-accent-500/20 text-accent-500 flex items-center justify-center text-[10px] font-mono font-bold">
                          {cp.step}
                        </span>
                        <h4 className="font-bold text-xs text-surface-100">{cp.title}</h4>
                      </div>
                      <p className="text-xs text-surface-300 pl-7 leading-relaxed">{cp.content}</p>
                    </div>
                  ))}
                </div>

                {workflowData.classification_agent?.adaptive_threshold_applied && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <Info size={16} className="shrink-0 mt-0.5 text-amber-500" />
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
          <div id="stage-consensus" className="card-raised p-6 border-2 border-accent-500 bg-gradient-to-br from-surface-900 via-surface-900 to-accent-500/10 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-surface-700/60 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-full bg-accent-500 text-white flex items-center justify-center text-sm font-bold shadow-sm">8</span>
                <div>
                  <h2 className="font-extrabold text-surface-50 text-lg">Stage 8: Final ADAM Diagnostic Consensus</h2>
                  <span className="text-xs text-accent-500 dark:text-accent-400 font-mono">
                    Version: {workflowData.final_result?.methodology_version}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wide uppercase',
                    workflowData.final_result?.adam_binary_label === 1
                      ? 'bg-danger-500/15 text-danger-500 dark:text-danger-400 border border-danger-500/30'
                      : 'bg-success-500/15 text-success-600 dark:text-success-400 border border-success-500/30'
                  )}
                >
                  {workflowData.final_result?.adam_prediction}
                </span>
                <span className="text-xs font-data font-bold text-surface-200 px-2.5 py-1 bg-surface-800 rounded-lg border border-surface-700">
                  Confidence: {(workflowData.final_result?.adam_confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Comparison of ML baseline vs Final ADAM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-surface-800/80 rounded-xl border border-surface-700/60">
                <span className="text-surface-400 block text-[10px] uppercase font-semibold">XGBoost Baseline</span>
                <span className="font-bold text-surface-50 text-sm mt-0.5 block">
                  {workflowData.final_result?.ml_model_label} ({(workflowData.final_result?.ml_model_probability * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="p-3 bg-surface-800/80 rounded-xl border border-surface-700/60">
                <span className="text-surface-400 block text-[10px] uppercase font-semibold">ADAM Consensus</span>
                <span className="font-bold text-accent-500 dark:text-accent-400 text-sm mt-0.5 block">
                  {workflowData.final_result?.adam_prediction}
                </span>
              </div>
              <div className="p-3 bg-surface-800/80 rounded-xl border border-surface-700/60">
                <span className="text-surface-400 block text-[10px] uppercase font-semibold">Model Concordance</span>
                <span className="font-semibold text-surface-200 text-sm mt-0.5 block">
                  {workflowData.final_result?.is_discordant ? '⚠️ Discordant (Agent Refinement)' : '✓ Concordant (Agreement)'}
                </span>
              </div>
              <div className="p-3 bg-surface-800/80 rounded-xl border border-surface-700/60">
                <span className="text-surface-400 block text-[10px] uppercase font-semibold">Cohort Ground Truth Match</span>
                <span className="font-semibold text-surface-200 text-sm mt-0.5 block">
                  {workflowData.final_result?.matches_ground_truth ? '✓ Correct Diagnosis' : 'Misclassified'}
                </span>
              </div>
            </div>

            {/* Final Diagnostic Explanation */}
            <div className="space-y-2 bg-surface-800/60 p-4 rounded-xl border border-surface-700/60">
              <span className="text-xs font-bold text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-accent-500" />
                <span>Auditable Decision Rationale</span>
              </span>
              <p className="text-xs text-surface-200 leading-relaxed">
                {workflowData.final_result?.explanation}
              </p>
            </div>
          </div>

          {/* STAGE 9: Download / Print Dossier Action Card */}
          <div id="stage-report" className="card-raised p-6 border border-surface-700/60 bg-surface-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-500 text-white flex items-center justify-center text-xs font-bold">9</span>
                <h3 className="font-bold text-surface-50 text-base">Download ADAM Analysis Report</h3>
              </div>
              <p className="text-xs text-surface-400 mt-1">
                Generates a multi-page audit report for Patient <strong className="text-surface-200 font-mono">{workflowData.sample_id}</strong> containing all 10 summarization and 10 classification checkpoints, exact diversity metrics, and TreeSHAP attributions.
              </p>
            </div>

            <button
              onClick={handlePrint}
              className="btn-teal text-xs py-2.5 px-5 flex items-center gap-2 font-semibold shadow shrink-0"
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
