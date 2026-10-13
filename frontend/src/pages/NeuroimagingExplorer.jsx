/**
 * NeuroimagingExplorer.jsx — Option 3 Multimodal Neuroimaging Explorer
 * =====================================================================
 * Structural MRI and Molecular PET neuroimaging subsystem:
 * - 3D Volumetric morphometry (Hippocampus, Entorhinal cortex, Ventricles, nWBV)
 * - PET SUVR molecular biomarkers (Amyloid Florbetapir, Tau Flortaucipir, FDG)
 * - Acquisition parameter validation (NIfTI/DICOM headers, 256x256x176 matrix, TR/TE)
 * - Modality ablation comparison (Microbiome vs MRI vs PET vs Multimodal gate)
 */
import React, { useState, useEffect } from 'react'
import {
  Brain,
  Activity,
  Layers,
  ShieldCheck,
  Eye,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Info,
  BarChart2,
  Lock,
  Cpu,
  FileText,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import {
  fetchNeuroimagingSubjects,
  fetchSubjectNeuroimaging,
  fetchModalityComparison,
} from '../api/client'

export default function NeuroimagingExplorer() {
  const [activeTab, setActiveTab] = useState('explorer')
  const [subjects, setSubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)
  const [subjectDetails, setSubjectDetails] = useState(null)
  const [modalityComparisons, setModalityComparisons] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const [subjsRes, modRes] = await Promise.all([
          fetchNeuroimagingSubjects(),
          fetchModalityComparison(),
        ])
        setSubjects(subjsRes.subjects || [])
        setModalityComparisons(modRes.models || [])
        if (subjsRes.subjects?.length > 0) {
          const firstId = subjsRes.subjects[0].subject_id
          setSelectedSubjectId(firstId)
          loadSubjectDetail(firstId)
        }
      } catch (err) {
        setError(err.message || 'Failed to load neuroimaging records')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const loadSubjectDetail = async (subjectId) => {
    try {
      setDetailsLoading(true)
      setSelectedSubjectId(subjectId)
      const details = await fetchSubjectNeuroimaging(subjectId)
      setSubjectDetails(details)
    } catch (err) {
      console.error(err)
    } finally {
      setDetailsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading Neuroimaging & PET Volumetric Repositories..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/20">
              Option 3
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-surface-50">
              Neuroimaging Explorer &amp; Multimodal Brain Intelligence
            </h1>
          </div>
          <p className="text-sm text-surface-400 mt-1">
            Structural T1-weighted MRI morphometry, Amyloid/Tau PET molecular SUVRs, and independent modality ablation benchmarks.
          </p>
        </div>
      </div>

      {/* Critical Scientific Disclaimer */}
      <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 text-xs text-purple-200 flex items-start gap-3">
        <Info size={18} className="text-purple-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-purple-300 font-semibold block">
            Independent Neuroimaging Stream Notice:
          </strong>
          <p className="text-purple-300/80 leading-relaxed">
            OASIS-1, OASIS-3, and ADNI neuroimaging scans are independent validation cohorts. Scans are NOT merged with ADAM-1 nursing home stool samples as they belong to entirely disjoint participant populations. True multimodal fusion is restricted to certified paired cohorts (governed by the Multimodal Linkage Gate).
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Tabs */}
      <div className="flex border-b border-surface-700/60 gap-4">
        <button
          onClick={() => setActiveTab('explorer')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'explorer'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          )}
        >
          <Brain size={16} />
          Volumetric Scan &amp; Biomarker Explorer
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'comparison'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          )}
        >
          <Activity size={16} />
          Modality Ablation &amp; Performance Benchmark
        </button>
      </div>

      {/* ── TAB 1: SCAN EXPLORER ── */}
      {activeTab === 'explorer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Subject List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Examined Participants ({subjects.length})
            </h3>
            <div className="space-y-2">
              {subjects.map((subj) => {
                const isSelected = selectedSubjectId === subj.subject_id
                const isAD = subj.clinical_ad_status === 1
                return (
                  <button
                    key={subj.subject_id}
                    onClick={() => loadSubjectDetail(subj.subject_id)}
                    className={clsx(
                      'w-full text-left rounded-xl p-3.5 border transition-all',
                      isSelected
                        ? 'border-purple-500 bg-purple-950/30 shadow-md ring-1 ring-purple-500/40'
                        : 'border-surface-700/70 bg-surface-900/70 hover:bg-surface-800'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-surface-100">
                        {subj.subject_id}
                      </span>
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                          isAD
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        )}
                      >
                        {isAD ? 'AD Positive' : 'Cognitively Intact'}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-surface-400 grid grid-cols-2 gap-1">
                      <span>Cohort: <strong className="text-surface-200">{subj.cohort_id}</strong></span>
                      <span>CDR: <strong className="text-surface-200">{subj.cdr_global}</strong></span>
                      <span>Hippocampus: <strong className="text-surface-200">{subj.hippocampus_volume_cm3} cm³</strong></span>
                      <span>Amyloid PET: <strong className="text-surface-200">{subj.amyloid_pet_suvr ?? 'N/A'}</strong></span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: Selected Subject Detailed Scan & Morphometry */}
          <div className="lg:col-span-2 space-y-4">
            {subjectDetails ? (
              <div className="rounded-xl border border-surface-700/70 bg-surface-900/90 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-surface-50 font-mono">
                        {subjectDetails.subject_id}
                      </h2>
                      <span className="rounded bg-surface-800 px-2 py-0.5 text-xs text-surface-300">
                        Session: {subjectDetails.session_id}
                      </span>
                    </div>
                    <p className="text-xs text-surface-400 mt-1">
                      Age: {subjectDetails.age_at_scan} y | Sex: {subjectDetails.sex} | MMSE: {subjectDetails.mmse_score} / 30 | Global CDR: {subjectDetails.cdr_global}
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'rounded-full px-3 py-1 text-xs font-bold border shrink-0',
                      subjectDetails.clinical_ad_status === 1
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    )}
                  >
                    Clinical Status: {subjectDetails.clinical_ad_status === 1 ? 'Alzheimer’s Disease' : 'Control (CDR 0)'}
                  </span>
                </div>

                {/* FreeSurfer Volumetric Morphometry Cards */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-3 flex items-center gap-1.5">
                    <Brain size={14} className="text-purple-400" />
                    FreeSurfer 3D Volumetric Morphometry (Structural MRI)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Hippocampus Volume</span>
                      <div className="text-base font-bold text-surface-100 font-mono">
                        {subjectDetails.hippocampus_volume_cm3} cm³
                      </div>
                      <span className="text-[10px] text-surface-500">
                        {subjectDetails.hippocampus_volume_cm3 < 3.2 ? '⚠️ Severe Atrophy (<3.2)' : '✓ Normal Range'}
                      </span>
                    </div>

                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Entorhinal Thickness</span>
                      <div className="text-base font-bold text-surface-100 font-mono">
                        {subjectDetails.entorhinal_cortex_thickness_mm} mm
                      </div>
                      <span className="text-[10px] text-surface-500">
                        {subjectDetails.entorhinal_cortex_thickness_mm < 2.5 ? '⚠️ Cortical Thinning (<2.5)' : '✓ Intact Thickness'}
                      </span>
                    </div>

                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Lateral Ventricles</span>
                      <div className="text-base font-bold text-surface-100 font-mono">
                        {subjectDetails.lateral_ventricles_volume_cm3} cm³
                      </div>
                      <span className="text-[10px] text-surface-500">
                        {subjectDetails.lateral_ventricles_volume_cm3 > 45.0 ? '⚠️ Ventriculomegaly (>45)' : '✓ Normal Volume'}
                      </span>
                    </div>

                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Norm. Whole Brain (nWBV)</span>
                      <div className="text-base font-bold text-surface-100 font-mono">
                        {subjectDetails.normalized_whole_brain_volume}
                      </div>
                      <span className="text-[10px] text-surface-500">Cerebral fraction</span>
                    </div>

                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Amyloid PET SUVR</span>
                      <div className="text-base font-bold text-cyan-400 font-mono">
                        {subjectDetails.amyloid_pet_suvr ?? 'N/A'}
                      </div>
                      <span className="text-[10px] text-surface-500">
                        {subjectDetails.amyloid_pet_suvr && subjectDetails.amyloid_pet_suvr > 1.11 ? '⚠️ Amyloid Positive (>1.11)' : 'Negative / Sub-threshold'}
                      </span>
                    </div>

                    <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800">
                      <span className="text-[11px] text-surface-400">Tau PET SUVR</span>
                      <div className="text-base font-bold text-rose-400 font-mono">
                        {subjectDetails.tau_pet_suvr ?? 'N/A'}
                      </div>
                      <span className="text-[10px] text-surface-500">
                        {subjectDetails.tau_pet_suvr && subjectDetails.tau_pet_suvr > 1.25 ? '⚠️ Tau Positive (>1.25)' : 'Negative / Sub-threshold'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DICOM/NIfTI Scan Acquisition Parameters */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-2 flex items-center gap-1.5">
                    <FileText size={14} className="text-cyan-400" />
                    Volumetric Scan Acquisition Metadata (NIfTI / DICOM Header Audit)
                  </h4>
                  <div className="space-y-2">
                    {subjectDetails.scans?.map((scan) => (
                      <div
                        key={scan.scan_id}
                        className="rounded-lg bg-surface-950/70 p-3 border border-surface-800 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-surface-100">{scan.scan_id}</span>
                          <span className="rounded bg-surface-800 px-2 py-0.5 text-[10px] text-surface-300">
                            {scan.modality} ({scan.file_format})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-surface-400">
                          <div>Scanner: <span className="text-surface-200">{scan.scanner_manufacturer}</span></div>
                          <div>Field Strength: <span className="text-surface-200">{scan.field_strength_tesla}T</span></div>
                          <div>Matrix: <span className="font-mono text-surface-200">{scan.matrix_dimensions.join('×')}</span></div>
                          <div>Voxel: <span className="font-mono text-surface-200">{scan.voxel_size_mm.join('×')} mm</span></div>
                          <div>TR / TE: <span className="text-surface-200">{scan.repetition_time_tr_ms} / {scan.echo_time_te_ms} ms</span></div>
                          <div>Orientation: <span className="text-surface-200">{scan.orientation}</span></div>
                          <div>Acquired: <span className="text-surface-200">{scan.acquisition_date}</span></div>
                          <div>QC Status: <span className="text-emerald-400 font-semibold">{scan.qc_pass ? 'PASSED' : 'FLAGGED'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-surface-700/60 bg-surface-900/40 p-12 text-center text-surface-400">
                Select a subject from the list to inspect volumetric MRI and PET biomarkers.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: MODALITY ABLATION COMPARISON ── */}
      {activeTab === 'comparison' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-surface-700/70 bg-surface-900/80 p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-surface-100">
                Independent Modality Predictive Comparison &amp; Fusion Gate
              </h3>
              <p className="text-xs text-surface-400 mt-0.5">
                Evaluates discrimination performance across individual input modalities and enforces the Multimodal Linkage Gate.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-700 text-surface-400">
                    <th className="pb-2.5 font-bold">Model Pipeline</th>
                    <th className="pb-2.5 font-bold">Input Modality</th>
                    <th className="pb-2.5 font-bold">Validation Cohort</th>
                    <th className="pb-2.5 font-bold">Accuracy</th>
                    <th className="pb-2.5 font-bold">ROC-AUC</th>
                    <th className="pb-2.5 font-bold">Sensitivity</th>
                    <th className="pb-2.5 font-bold">Specificity</th>
                    <th className="pb-2.5 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800 text-surface-200">
                  {modalityComparisons.map((m, idx) => (
                    <tr key={idx} className="hover:bg-surface-850/50">
                      <td className="py-3 font-semibold text-surface-100">
                        <div>{m.model_name}</div>
                        {m.notes && (
                          <div className="text-[10px] text-surface-400 font-normal line-clamp-1 mt-0.5">{m.notes}</div>
                        )}
                      </td>
                      <td className="py-3 text-surface-300">{m.modality}</td>
                      <td className="py-3 font-mono text-[11px] text-surface-400">{m.cohort}</td>
                      <td className="py-3 font-mono font-bold text-surface-100">
                        {m.accuracy !== null ? `${(m.accuracy * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-3 font-mono font-extrabold text-cyan-400">
                        {m.roc_auc !== null ? m.roc_auc.toFixed(3) : '—'}
                      </td>
                      <td className="py-3 font-mono text-emerald-400">
                        {m.sensitivity !== null ? `${(m.sensitivity * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-3 font-mono text-sky-400">
                        {m.specificity !== null ? `${(m.specificity * 100).toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-3">
                        <span
                          className={clsx(
                            'rounded-full px-2.5 py-0.5 text-[10px] font-bold border inline-block whitespace-nowrap',
                            m.status.includes('REPRODUCED')
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : m.status.includes('LITERATURE')
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          )}
                        >
                          {m.status.includes('REPRODUCED')
                            ? 'Verified on Local Data'
                            : m.status.includes('LITERATURE')
                            ? 'Literature Reference'
                            : 'Blocked (Access Required)'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
