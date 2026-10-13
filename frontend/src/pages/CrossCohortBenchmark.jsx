/**
 * CrossCohortBenchmark.jsx — Option 2 & Option 8 Research Engine
 * ==============================================================
 * Comprehensive research platform for:
 * - Dataset Discovery & Access Registry with verified DUA & access statuses
 * - Cross-Cohort Validation Benchmark with subject-level bootstrap 95% CIs
 * - Taxonomic Harmonization (16S genus rollup vs Shotgun metagenomics)
 * - Population Distribution Shift (Jensen-Shannon Divergence)
 */
import React, { useState, useEffect } from 'react'
import {
  Database,
  BarChart3,
  Layers,
  ShieldCheck,
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  GitBranch,
  Dna,
  Lock,
  Unlock,
  Sliders,
  Scale,
} from 'lucide-react'
import clsx from 'clsx'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import StatCard from '../components/ui/StatCard'
import {
  fetchResearchDatasets,
  fetchBenchmarkRuns,
  auditResearchDataset,
} from '../api/client'

const ACCESS_BADGES = {
  DOWNLOADED_AND_AVAILABLE: { label: 'Downloaded & Ready', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  PUBLIC_DOWNLOAD: { label: 'Public Download', bg: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  REGISTRATION_REQUIRED: { label: 'Registration Required', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  CONTROLLED_ACCESS: { label: 'Controlled Access', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  APPLICATION_REQUIRED: { label: 'Application & DUA Required', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  METADATA_ONLY: { label: 'Metadata Only', bg: 'bg-surface-700 text-surface-300 border-surface-600' },
}

export default function CrossCohortBenchmark() {
  const [activeTab, setActiveTab] = useState('registry')
  const [datasets, setDatasets] = useState([])
  const [benchmarkRuns, setBenchmarkRuns] = useState([])
  const [selectedRun, setSelectedRun] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Harmonization audit state
  const [auditTarget, setAuditTarget] = useState('ALZBIOM_CS')
  const [auditResult, setAuditResult] = useState(null)
  const [auditLoading, setAuditLoading] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const [dsData, benchData] = await Promise.all([
          fetchResearchDatasets(),
          fetchBenchmarkRuns(),
        ])
        setDatasets(dsData.datasets || [])
        setBenchmarkRuns(benchData.runs || [])
        if (benchData.runs?.length > 0) {
          setSelectedRun(benchData.runs[0])
        }
      } catch (err) {
        setError(err.message || 'Failed to load cross-cohort benchmark data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleRunAudit = async (datasetId) => {
    try {
      setAuditLoading(true)
      setAuditTarget(datasetId)
      const res = await auditResearchDataset(datasetId)
      setAuditResult(res)
    } catch (err) {
      console.error(err)
    } finally {
      setAuditLoading(false)
    }
  }

  const filteredDatasets = datasets.filter((d) => {
    if (categoryFilter === 'ALL') return true
    return d.category === categoryFilter
  })

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading Research Datasets & Cross-Cohort Benchmarks..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-400 border border-cyan-500/20">
              Option 2 & Option 8
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-surface-50">
              Cross-Cohort Validation &amp; Reproducible Benchmark Engine
            </h1>
          </div>
          <p className="text-sm text-surface-400 mt-1">
            Subject-level stratified evaluation across independent European, Asian, and Preclinical cohorts with bootstrap 95% CIs and distribution shift quantification.
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Tabs */}
      <div className="flex border-b border-surface-700/60 gap-4">
        <button
          onClick={() => setActiveTab('registry')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'registry'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          )}
        >
          <Database size={16} />
          Dataset Registry &amp; Access Status ({datasets.length})
        </button>
        <button
          onClick={() => setActiveTab('benchmarks')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'benchmarks'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          )}
        >
          <BarChart3 size={16} />
          Cross-Cohort Benchmark Runs ({benchmarkRuns.length})
        </button>
        <button
          onClick={() => setActiveTab('harmonization')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'harmonization'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          )}
        >
          <Scale size={16} />
          Taxonomic Harmonization Auditor
        </button>
      </div>

      {/* ── TAB 1: DATASET REGISTRY ── */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-surface-400 font-medium flex items-center gap-1">
              <Filter size={12} /> Category:
            </span>
            {[
              { id: 'ALL', label: 'All Cohorts' },
              { id: 'BASELINE_MICROBIOME', label: 'Baseline Microbiome' },
              { id: 'INDEPENDENT_MICROBIOME', label: 'Independent Microbiome' },
              { id: 'NEUROIMAGING_MRI_PET', label: 'Neuroimaging (MRI/PET)' },
              { id: 'MULTI_OMICS_PORTAL', label: 'Multi-Omics Portal' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={clsx(
                  'rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors border',
                  categoryFilter === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : 'bg-surface-800/80 text-surface-400 border-surface-700/60 hover:bg-surface-700'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Datasets Grid */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredDatasets.map((ds) => {
              const badge = ACCESS_BADGES[ds.access_status] || {
                label: ds.access_status,
                bg: 'bg-surface-800 text-surface-300',
              }
              return (
                <div
                  key={ds.dataset_id}
                  className="rounded-xl border border-surface-700/70 bg-surface-900/80 p-5 shadow-sm space-y-3.5 hover:border-surface-600 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent-400">
                          [{ds.participant_namespace}]
                        </span>
                        <h3 className="text-base font-bold text-surface-100">{ds.name}</h3>
                      </div>
                      <p className="text-xs text-surface-400 mt-0.5">
                        Accession: <span className="font-mono text-surface-200">{ds.accession}</span>
                      </p>
                    </div>
                    <span className={clsx('rounded-full border px-2.5 py-0.5 text-[11px] font-bold shrink-0', badge.bg)}>
                      {badge.label}
                    </span>
                  </div>

                  <p className="text-xs text-surface-300 line-clamp-2 leading-relaxed">
                    {ds.study_population}
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs rounded-lg bg-surface-950/40 p-2.5 border border-surface-800/80">
                    <div>
                      <span className="text-surface-500">Enrolled:</span>{' '}
                      <span className="font-semibold text-surface-200">{ds.enrolled_participants ?? ds.participant_count ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-surface-500">Eligible Outcomes:</span>{' '}
                      <span className="font-semibold text-surface-200">{ds.eligible_outcome_participants ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-surface-500">Downloaded Local:</span>{' '}
                      <span className={clsx('font-bold', ds.downloaded_unique_participants > 0 ? 'text-emerald-400' : 'text-surface-400')}>
                        {ds.downloaded_unique_participants ?? 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-surface-500">Samples/Runs:</span>{' '}
                      <span className="font-semibold text-surface-200">{ds.sample_count ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-surface-500">Multi-Modal:</span>{' '}
                      <span className="font-semibold text-surface-200">{ds.multi_modal_participants ?? 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-surface-500">Longitudinal:</span>{' '}
                      <span className={clsx('font-semibold', ds.longitudinal_visits_available ? 'text-emerald-400' : 'text-surface-400')}>
                        {ds.longitudinal_visits_available ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  {ds.audit_reconciliation_notes && (
                    <div className="rounded bg-surface-950/60 p-2 text-[11px] text-surface-400 border border-surface-800/60">
                      <span className="font-semibold text-cyan-400">Audit Provenance:</span> {ds.audit_reconciliation_notes}
                    </div>
                  )}

                  {/* Modalities Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {ds.modalities.map((mod, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-surface-800/90 border border-surface-700/50 px-2 py-0.5 text-[10px] text-surface-300"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>

                  {/* Footer actions & official URL */}
                  <div className="pt-2 border-t border-surface-800/70 flex items-center justify-between text-xs">
                    <a
                      href={ds.official_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                    >
                      <ExternalLink size={12} />
                      Official Repository
                    </a>
                    {ds.category === 'INDEPENDENT_MICROBIOME' && (
                      <button
                        onClick={() => {
                          setActiveTab('harmonization')
                          handleRunAudit(ds.dataset_id)
                        }}
                        className="text-xs font-semibold text-accent-400 hover:text-accent-300"
                      >
                        Audit Harmonization →
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: BENCHMARK RUNS ── */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-6">
          {/* Top Run Selector Carousel */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {benchmarkRuns.map((run) => {
              const isSelected = selectedRun?.run_id === run.run_id
              return (
                <button
                  key={run.run_id}
                  onClick={() => setSelectedRun(run)}
                  className={clsx(
                    'rounded-xl p-3 text-left border transition-all',
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/20 shadow-md ring-1 ring-cyan-500/40'
                      : 'border-surface-700/70 bg-surface-900/60 hover:bg-surface-800/70'
                  )}
                >
                  <span className="text-[10px] font-mono text-cyan-400 font-bold block truncate">
                    {run.evaluation_type}
                  </span>
                  <p className="text-xs font-bold text-surface-100 line-clamp-2 mt-1">
                    {run.experiment_name}
                  </p>
                  <div className="mt-2 flex items-baseline justify-between text-xs">
                    <span className="text-surface-500">ROC-AUC:</span>
                    <span className="font-mono font-extrabold text-cyan-300">
                      {run.metrics ? run.metrics.roc_auc.toFixed(3) : 'NOT RUN'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected Run Deep Dive */}
          {selectedRun && (
            <div className="rounded-xl border border-surface-700/70 bg-surface-900/90 p-6 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-surface-800 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-accent-500/15 px-2 py-0.5 text-xs font-mono font-bold text-accent-400 border border-accent-500/30">
                      {selectedRun.run_id}
                    </span>
                    <span className="rounded bg-surface-800 px-2 py-0.5 text-xs font-medium text-surface-300">
                      Model: {selectedRun.model_type.toUpperCase()}
                    </span>
                    {selectedRun.verification_status === 'REPRODUCED_AND_VERIFIED' ? (
                      <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Empirically Verified on Local Raw Data
                      </span>
                    ) : (
                      <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                        <AlertTriangle size={12} />
                        NOT RUN (Local Raw Data Not Downloaded)
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-surface-50 mt-1">
                    {selectedRun.experiment_name}
                  </h2>
                  <p className="text-xs text-surface-400 mt-1">
                    Train Cohort: <strong className="text-surface-200">{selectedRun.train_cohort_id}</strong> {selectedRun.subject_count_train != null ? `(${selectedRun.subject_count_train} subjects)` : '(Awaiting Raw FASTQs)'} ➔
                    Test Cohort: <strong className="text-surface-200">{selectedRun.test_cohort_id}</strong> {selectedRun.subject_count_test != null ? `(${selectedRun.subject_count_test} subjects)` : '(Awaiting Raw FASTQs)'}
                  </p>
                  {selectedRun.provenance_artifact && (
                    <p className="text-[11px] text-surface-400 font-mono mt-1">
                      Artifact: <span className="text-cyan-400">{selectedRun.provenance_artifact}</span>
                    </p>
                  )}
                </div>

                {selectedRun.percentage_point_difference !== null && selectedRun.percentage_point_difference > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-rose-400 text-xs shrink-0">
                    <TrendingDown size={16} />
                    <div>
                      <div className="font-bold">Generalization Degradation:</div>
                      <div>
                        -{selectedRun.percentage_point_difference} percentage points (-{selectedRun.relative_drop_percentage ?? selectedRun.performance_drop_percentage}% relative)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Metric Cards Grid or Published Literature Reference Card */}
              {selectedRun.metrics ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Accuracy</span>
                      <div className="text-lg font-bold text-surface-100 font-mono">
                        {(selectedRun.metrics.accuracy * 100).toFixed(1)}%
                      </div>
                      <span className="text-[10px] text-surface-500">
                        95% CI: [{selectedRun.metrics.confidence_intervals_95?.accuracy?.[0]?.toFixed(2)}, {selectedRun.metrics.confidence_intervals_95?.accuracy?.[1]?.toFixed(2)}]
                      </span>
                    </div>

                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">ROC-AUC</span>
                      <div className="text-lg font-bold text-cyan-400 font-mono">
                        {selectedRun.metrics.roc_auc.toFixed(3)}
                      </div>
                      <span className="text-[10px] text-surface-500">
                        95% CI: [{selectedRun.metrics.confidence_intervals_95?.roc_auc?.[0]?.toFixed(2)}, {selectedRun.metrics.confidence_intervals_95?.roc_auc?.[1]?.toFixed(2)}]
                      </span>
                    </div>

                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Balanced Acc</span>
                      <div className="text-lg font-bold text-surface-100 font-mono">
                        {(selectedRun.metrics.balanced_accuracy * 100).toFixed(1)}%
                      </div>
                      <span className="text-[10px] text-surface-500">Unbiased class mean</span>
                    </div>

                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Sensitivity (Recall)</span>
                      <div className="text-lg font-bold text-emerald-400 font-mono">
                        {(selectedRun.metrics.sensitivity * 100).toFixed(1)}%
                      </div>
                      <span className="text-[10px] text-surface-500">True Positive Rate</span>
                    </div>

                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Specificity</span>
                      <div className="text-lg font-bold text-sky-400 font-mono">
                        {(selectedRun.metrics.specificity * 100).toFixed(1)}%
                      </div>
                      <span className="text-[10px] text-surface-500">True Negative Rate</span>
                    </div>

                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Brier Score</span>
                      <div className="text-lg font-bold text-amber-400 font-mono">
                        {selectedRun.metrics.brier_score.toFixed(3)}
                      </div>
                      <span className="text-[10px] text-surface-500">Calibration error</span>
                    </div>
                  </div>

                  {/* Confusion Matrix and Distribution Shift */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-surface-950/50 p-4 border border-surface-800/80">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3 flex items-center gap-1.5">
                        <BarChart3 size={14} className="text-cyan-400" />
                        Subject-Stratified Confusion Matrix
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="rounded bg-surface-900 p-2.5 border border-surface-700/50">
                          <span className="text-[10px] text-surface-500 block">True Negative (Control)</span>
                          <strong className="text-lg text-emerald-400 font-mono">
                            {selectedRun.metrics.confusion_matrix[0][0]}
                          </strong>
                        </div>
                        <div className="rounded bg-surface-900 p-2.5 border border-surface-700/50">
                          <span className="text-[10px] text-surface-500 block">False Positive (Type I)</span>
                          <strong className="text-lg text-rose-400 font-mono">
                            {selectedRun.metrics.confusion_matrix[0][1]}
                          </strong>
                        </div>
                        <div className="rounded bg-surface-900 p-2.5 border border-surface-700/50">
                          <span className="text-[10px] text-surface-500 block">False Negative (Type II)</span>
                          <strong className="text-lg text-rose-400 font-mono">
                            {selectedRun.metrics.confusion_matrix[1][0]}
                          </strong>
                        </div>
                        <div className="rounded bg-surface-900 p-2.5 border border-surface-700/50">
                          <span className="text-[10px] text-surface-500 block">True Positive (AD)</span>
                          <strong className="text-lg text-emerald-400 font-mono">
                            {selectedRun.metrics.confusion_matrix[1][1]}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-surface-950/50 p-4 border border-surface-800/80 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
                        <Scale size={14} className="text-accent-400" />
                        Population Shift &amp; Information Loss
                      </h4>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-surface-400">Jensen-Shannon Divergence (JSD):</span>
                        <span className="font-mono font-bold text-amber-400">
                          {selectedRun.distribution_shift_jsd !== null ? selectedRun.distribution_shift_jsd.toFixed(4) : 'N/A'}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-surface-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
                          style={{ width: `${Math.min(100, (selectedRun.distribution_shift_jsd || 0) * 100 * 2)}%` }}
                        />
                      </div>
                      <p className="text-xs text-surface-300 leading-relaxed pt-1">
                        {selectedRun.scientific_interpretation}
                      </p>
                    </div>
                  </div>

                  {/* Supplementary Analysis and Modality Breakdown */}
                  {selectedRun.supplementary_analysis && (
                    <div className="rounded-xl border border-surface-700 bg-surface-950/60 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-800 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-surface-300 flex items-center gap-1.5">
                          <BarChart3 size={14} className="text-cyan-400" />
                          {selectedRun.supplementary_analysis.analysis_name || 'Supplementary Analysis'}
                        </h4>
                        <span className="text-[11px] text-surface-400 font-mono">
                          N = {selectedRun.supplementary_analysis.sample_count} Samples ({selectedRun.supplementary_analysis.subjects_represented} Participants)
                        </span>
                      </div>
                      <p className="text-xs text-surface-400 italic">
                        {selectedRun.supplementary_analysis.disclosure}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
                        <div className="rounded bg-surface-900/80 p-2 border border-surface-800 text-xs">
                          <span className="text-[10px] text-surface-500 block">Balanced Accuracy</span>
                          <span className="font-mono font-bold text-surface-100">
                            {(selectedRun.supplementary_analysis.balanced_accuracy * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="rounded bg-surface-900/80 p-2 border border-surface-800 text-xs">
                          <span className="text-[10px] text-surface-500 block">ROC-AUC</span>
                          <span className="font-mono font-bold text-cyan-300">
                            {selectedRun.supplementary_analysis.roc_auc?.toFixed(3)}
                          </span>
                        </div>
                        <div className="rounded bg-surface-900/80 p-2 border border-surface-800 text-xs">
                          <span className="text-[10px] text-surface-500 block">Sensitivity</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {(selectedRun.supplementary_analysis.sensitivity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="rounded bg-surface-900/80 p-2 border border-surface-800 text-xs">
                          <span className="text-[10px] text-surface-500 block">Specificity</span>
                          <span className="font-mono font-bold text-sky-400">
                            {(selectedRun.supplementary_analysis.specificity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="rounded bg-surface-900/80 p-2 border border-surface-800 text-xs">
                          <span className="text-[10px] text-surface-500 block">F1-Score</span>
                          <span className="font-mono font-bold text-surface-200">
                            {selectedRun.supplementary_analysis.f1_score?.toFixed(3)}
                          </span>
                        </div>
                        <div className="rounded bg-surface-900/80 p-2 border border-surface-800 text-xs">
                          <span className="text-[10px] text-surface-500 block">Brier Score</span>
                          <span className="font-mono font-bold text-amber-400">
                            {selectedRun.supplementary_analysis.brier_score?.toFixed(3)}
                          </span>
                        </div>
                      </div>
                      {selectedRun.supplementary_analysis.unbalanced_remainder_disclosure && (
                        <p className="text-[11px] text-surface-500 border-t border-surface-800/80 pt-2">
                          <strong className="text-surface-400">Sample Accounting Disclosure:</strong>{' '}
                          {selectedRun.supplementary_analysis.unbalanced_remainder_disclosure}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Modality Breakdown Details */}
                  {selectedRun.modality_breakdown && (
                    <div className="rounded-xl border border-surface-800 bg-surface-950/40 p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-surface-300">Predictor Modality Classification:</span>
                        <span className="font-mono text-cyan-400 font-semibold">
                          {selectedRun.modality_breakdown.model_classification}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-surface-400 text-[11px]">
                        <span className="rounded bg-surface-900 px-2 py-0.5 border border-surface-800">
                          Microbiome Features: <strong className="text-surface-200">{selectedRun.modality_breakdown.microbiome_features_count}</strong> species
                        </span>
                        <span className="rounded bg-surface-900 px-2 py-0.5 border border-surface-800">
                          Clinical Covariates: <strong className="text-surface-200">{selectedRun.modality_breakdown.clinical_covariates_count}</strong>
                        </span>
                        <span className="rounded bg-surface-900 px-2 py-0.5 border border-surface-800">
                          Demographic: <strong className="text-surface-200">{selectedRun.modality_breakdown.demographic_variables_count}</strong>
                        </span>
                        <span className="rounded bg-surface-900 px-2 py-0.5 border border-surface-800">
                          Total Features: <strong className="text-cyan-300">{selectedRun.modality_breakdown.total_features_used}</strong>
                        </span>
                        {selectedRun.modality_breakdown.pure_microbiome_reference && (
                          <span className="rounded bg-surface-900 px-2 py-0.5 border border-surface-800 text-amber-300/90">
                            Pure Microbiome Baseline (940 taxa): Accuracy {(selectedRun.modality_breakdown.pure_microbiome_reference.full_held_out_73_accuracy * 100).toFixed(1)}%, ROC-AUC {selectedRun.modality_breakdown.pure_microbiome_reference.full_held_out_73_roc_auc.toFixed(3)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {/* Notice of unrun local data */}
                  <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="text-amber-300 font-semibold block">
                        Local Cross-Cohort Evaluation Status: NOT_RUN_LOCAL_DATA_NOT_DOWNLOADED
                      </strong>
                      <p className="text-amber-300/80 leading-relaxed">
                        Raw FASTQ sequencing reads for this external cohort are not stored locally in this repository.
                        In strict compliance with research integrity standards, no synthetic or unverified evaluation metrics are displayed.
                      </p>
                    </div>
                  </div>

                  {/* Published Literature Reference Panel */}
                  {selectedRun.published_original_study_metrics && (
                    <div className="rounded-xl border border-surface-700 bg-surface-950/70 p-5 space-y-3">
                      <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                        <Info size={16} className="text-cyan-400" />
                        Published Original Study Metrics &amp; Evaluation Design
                      </h4>
                      <div className="text-xs text-surface-300 space-y-1">
                        <div>
                          <span className="text-surface-500">Source Study:</span>{' '}
                          <strong className="text-surface-100">{selectedRun.published_original_study_metrics.study_reference}</strong>
                        </div>
                        <div>
                          <span className="text-surface-500">Study Design:</span>{' '}
                          <span className="text-surface-200">{selectedRun.published_original_study_metrics.model_and_evaluation_design}</span>
                        </div>
                      </div>

                      {/* Render structured published metrics if available */}
                      {selectedRun.published_original_study_metrics.primary_metrics && typeof selectedRun.published_original_study_metrics.primary_metrics === 'object' && (
                        <div className="mt-3 pt-3 border-t border-surface-800">
                          <span className="text-xs font-semibold text-surface-300 block mb-2">Published Primary Metrics:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {selectedRun.published_original_study_metrics.primary_metrics.taxonomic_model_auroc_training && (
                              <div className="rounded bg-surface-900 p-2.5 border border-surface-800 text-xs">
                                <span className="text-surface-500 block text-[10px]">Taxonomic AUROC (Training)</span>
                                <span className="text-base font-bold font-mono text-cyan-300">
                                  {selectedRun.published_original_study_metrics.primary_metrics.taxonomic_model_auroc_training}
                                </span>
                              </div>
                            )}
                            {selectedRun.published_original_study_metrics.primary_metrics.taxonomic_model_auroc_validation && (
                              <div className="rounded bg-surface-900 p-2.5 border border-surface-800 text-xs">
                                <span className="text-surface-500 block text-[10px]">Taxonomic AUROC (Validation)</span>
                                <span className="text-base font-bold font-mono text-emerald-400">
                                  {selectedRun.published_original_study_metrics.primary_metrics.taxonomic_model_auroc_validation}
                                </span>
                              </div>
                            )}
                            {selectedRun.published_original_study_metrics.primary_metrics.taxonomic_model_auroc?.baseline && (
                              <div className="rounded bg-surface-900 p-2.5 border border-surface-800 text-xs">
                                <span className="text-surface-500 block text-[10px]">Taxonomic AUROC (Baseline ➔ 1Yr ➔ 4Yr)</span>
                                <span className="text-sm font-bold font-mono text-cyan-300 block">
                                  {selectedRun.published_original_study_metrics.primary_metrics.taxonomic_model_auroc.baseline} ➔ {selectedRun.published_original_study_metrics.primary_metrics.taxonomic_model_auroc.year_1} ➔ {selectedRun.published_original_study_metrics.primary_metrics.taxonomic_model_auroc.year_4}
                                </span>
                              </div>
                            )}
                            {selectedRun.published_original_study_metrics.primary_metrics.ensemble_model_auroc?.baseline && (
                              <div className="rounded bg-surface-900 p-2.5 border border-surface-800 text-xs">
                                <span className="text-surface-500 block text-[10px]">Ensemble AUROC (Baseline ➔ 1Yr ➔ 4Yr)</span>
                                <span className="text-sm font-bold font-mono text-emerald-400 block">
                                  {selectedRun.published_original_study_metrics.primary_metrics.ensemble_model_auroc.baseline} ➔ {selectedRun.published_original_study_metrics.primary_metrics.ensemble_model_auroc.year_1} ➔ {selectedRun.published_original_study_metrics.primary_metrics.ensemble_model_auroc.year_4}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-surface-400 italic mt-2">
                            * Note: Above metrics represent the original publication&apos;s evaluation design and model performance. They are not transferred model results from ADAM-1.
                          </p>
                        </div>
                      )}

                      {typeof selectedRun.published_original_study_metrics.primary_metrics === 'string' && (
                        <div className="text-xs text-surface-400">
                          <span className="font-semibold text-surface-300">Metrics:</span> {selectedRun.published_original_study_metrics.primary_metrics}
                        </div>
                      )}

                      <div className="pt-2 text-xs text-surface-300">
                        <span className="font-semibold text-cyan-400">Interpretation:</span> {selectedRun.scientific_interpretation}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: HARMONIZATION AUDITOR ── */}
      {activeTab === 'harmonization' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-surface-700/70 bg-surface-900/80 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                  <Dna size={18} className="text-cyan-400" />
                  Taxonomic Resolution &amp; Feature Harmonization Layer
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  Audits the loss of information when reconciling high-resolution shotgun metagenomics (940 species) with external 16S amplicon profiles.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={auditTarget}
                  onChange={(e) => handleRunAudit(e.target.value)}
                  className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-1.5 text-xs text-surface-200"
                >
                  <option value="ALZBIOM_CS">AlzBiom Cross-Sectional (16S/Shotgun)</option>
                  <option value="CHINESE_STAGE">Chinese Stage-Specific (Shotgun)</option>
                  <option value="JAPANESE_NCGG">Japanese NCGG Outpatient (16S)</option>
                  <option value="AMSTERDAM_ADC">Amsterdam Dementia Cohort (16S/Shotgun)</option>
                </select>
                <button
                  onClick={() => handleRunAudit(auditTarget)}
                  disabled={auditLoading}
                  className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={clsx(auditLoading && 'animate-spin')} />
                  Audit
                </button>
              </div>
            </div>

            {auditResult && (
              <div className="rounded-lg bg-surface-950/70 p-4 border border-surface-800 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-surface-500 block">Baseline Features:</span>
                    <strong className="text-surface-100 font-mono text-sm">
                      {auditResult.harmonization_audit.source_feature_count} species
                    </strong>
                  </div>
                  <div>
                    <span className="text-surface-500 block">Target Features:</span>
                    <strong className="text-surface-100 font-mono text-sm">
                      {auditResult.harmonization_audit.target_feature_count} taxa
                    </strong>
                  </div>
                  <div>
                    <span className="text-surface-500 block">Direct / Genus Matched:</span>
                    <strong className="text-emerald-400 font-mono text-sm">
                      {auditResult.harmonization_audit.direct_matching_features || auditResult.harmonization_audit.genus_aggregated_features}
                    </strong>
                  </div>
                  <div>
                    <span className="text-surface-500 block">Transformation:</span>
                    <strong className="text-cyan-300 font-mono text-xs">
                      {auditResult.harmonization_audit.transformation_applied}
                    </strong>
                  </div>
                </div>

                <div className="rounded bg-surface-900/90 p-3 border border-surface-700/60 text-xs">
                  <span className="font-bold text-amber-400 flex items-center gap-1 mb-1">
                    <AlertTriangle size={14} /> Information Loss Assessment:
                  </span>
                  <p className="text-surface-300 leading-relaxed">
                    {auditResult.harmonization_audit.information_loss_narrative}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
