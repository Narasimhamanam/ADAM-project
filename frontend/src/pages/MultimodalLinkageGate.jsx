/**
 * MultimodalLinkageGate.jsx — Phase 2 & Phase 7 Linkage Governance
 * ================================================================
 * Implements strict patient identity governance:
 * - Patient-ID & Crosswalk Audit Matrix across all cohorts
 * - Interactive Multimodal Linkage Gate Simulator (enforces independent streams)
 * - GARD Linked-Data Request Workflow & 9-Point Feasibility Checklist
 * - Formal Scientific Data-Request Email Generator
 */
import React, { useState, useEffect } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Mail,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Info,
  Layers,
  Dna,
  Brain,
  Sliders,
  Send,
  FileText,
} from 'lucide-react'
import clsx from 'clsx'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import {
  fetchCrosswalkAudit,
  checkMultimodalEligibility,
  fetchGardStatus,
  updateGardStatus,
} from '../api/client'

const STATUS_BADGES = {
  EXACT_ID_INTERSECTION_COMPUTED: { label: 'Exact ID Intersection Computed', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  NO_EXACT_ID_INTERSECTION_IN_INSPECTED_MANIFESTS: { label: 'No Exact ID Match in Inspected Manifests', bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  NO_PUBLIC_CROSSWALK_FOUND: { label: 'No Public Crosswalk Found; Confirmation Pending', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  CROSSWALK_REQUEST_PENDING: { label: 'Crosswalk Request Pending', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  CROSSWALK_CONFIRMED: { label: 'Crosswalk Confirmed', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  MANIFEST_UNAVAILABLE: { label: 'Manifest Unavailable', bg: 'bg-surface-700 text-surface-300 border-surface-600' },
  NOT_VERIFIED: { label: 'Not Verified', bg: 'bg-surface-700 text-surface-400 border-surface-600' },
  INDEPENDENT_VALIDATION_ONLY: { label: 'Independent Validation Stream', bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  NO_CROSSWALK_FOUND: { label: 'No Public Crosswalk Found', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
}

export default function MultimodalLinkageGate() {
  const [activeTab, setActiveTab] = useState('crosswalk')
  const [crosswalkAudits, setCrosswalkAudits] = useState([])
  const [gardState, setGardState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // Simulator state
  const [simCohort, setSimCohort] = useState('ADAM1_BASELINE')
  const [simSubject, setSimSubject] = useState('CH1-002')
  const [simMicrobiome, setSimMicrobiome] = useState(true)
  const [simImaging, setSimImaging] = useState(true)
  const [simDecision, setSimDecision] = useState(null)
  const [simLoading, setSimLoading] = useState(false)

  // GARD update state
  const [newGardStatus, setNewGardStatus] = useState('REQUEST_NOT_SENT')
  const [gardNotes, setGardNotes] = useState('')
  const [updatingGard, setUpdatingGard] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)
        const [auditRes, gardRes] = await Promise.all([
          fetchCrosswalkAudit(),
          fetchGardStatus(),
        ])
        setCrosswalkAudits(auditRes.audits || [])
        setGardState(gardRes)
        if (gardRes?.current_status) {
          setNewGardStatus(gardRes.current_status)
          setGardNotes(gardRes.notes || '')
        }
      } catch (err) {
        setError(err.message || 'Failed to load linkage audit data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleTestSimulator = async () => {
    try {
      setSimLoading(true)
      const mods = []
      if (simMicrobiome) mods.push('microbiome')
      if (simImaging) mods.push('mri')
      const decision = await checkMultimodalEligibility(simCohort, simSubject, mods)
      setSimDecision(decision)
    } catch (err) {
      console.error(err)
    } finally {
      setSimLoading(false)
    }
  }

  const handleUpdateGard = async () => {
    try {
      setUpdatingGard(true)
      const updated = await updateGardStatus(newGardStatus, gardNotes)
      setGardState(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setUpdatingGard(false)
    }
  }

  const handleCopyEmail = () => {
    if (!gardState?.sample_email) return
    navigator.clipboard.writeText(gardState.sample_email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading Patient-ID Audit & Linkage Gate..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/20">
              Phase 2 & Phase 7
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-surface-50">
              Strict Patient-ID Matching &amp; Multimodal Linkage Gate
            </h1>
          </div>
          <p className="text-sm text-surface-400 mt-1">
            Enforces strict namespace isolation, blocks unauthorized cross-study merges, and manages the formal GARD data-request protocol.
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      {/* Tabs */}
      <div className="flex border-b border-surface-700/60 gap-4">
        <button
          onClick={() => setActiveTab('crosswalk')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'crosswalk'
              ? 'border-rose-400 text-rose-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          )}
        >
          <ShieldAlert size={16} />
          Crosswalk &amp; Namespace Audit Matrix ({crosswalkAudits.length})
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'simulator'
              ? 'border-rose-400 text-rose-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          )}
        >
          <Lock size={16} />
          Live Multimodal Linkage Gate Simulator
        </button>
        <button
          onClick={() => setActiveTab('gard')}
          className={clsx(
            'flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-colors',
            activeTab === 'gard'
              ? 'border-rose-400 text-rose-400'
              : 'border-transparent text-surface-400 hover:text-surface-200'
          )}
        >
          <Mail size={16} />
          GARD Linked-Data Request Workflow
        </button>
      </div>

      {/* ── TAB 1: CROSSWALK AUDIT MATRIX ── */}
      {activeTab === 'crosswalk' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-surface-700/70 bg-surface-900/80 p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold text-surface-100">
                Cross-Study Identity &amp; Crosswalk Audit
              </h3>
              <p className="text-xs text-surface-400 mt-0.5">
                Every cohort is isolated into its verified identifier namespace. Merging records across cohorts without an authorized crosswalk is strictly blocked.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-surface-700 text-surface-400">
                    <th className="pb-2.5 font-bold">Target Cohort</th>
                    <th className="pb-2.5 font-bold">Namespace</th>
                    <th className="pb-2.5 font-bold">Inspected IDs</th>
                    <th className="pb-2.5 font-bold">Exact Matches with ADAM-1</th>
                    <th className="pb-2.5 font-bold">Authorized Crosswalk?</th>
                    <th className="pb-2.5 font-bold">Governance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800 text-surface-200">
                  {crosswalkAudits.map((audit) => {
                    const badge = STATUS_BADGES[audit.status] || {
                      label: audit.status,
                      bg: 'bg-surface-800 text-surface-300',
                    }
                    return (
                      <tr key={audit.target_dataset_id} className="hover:bg-surface-850/50">
                        <td className="py-3 font-semibold text-surface-100">
                          {audit.target_name}
                        </td>
                        <td className="py-3 font-mono text-cyan-400 font-bold">
                          {audit.target_namespace}
                        </td>
                        <td className="py-3 text-surface-300 font-mono">
                          {audit.target_identifiers_inspected}
                        </td>
                        <td className="py-3 font-mono font-bold text-rose-400">
                          {audit.exact_intersection_count}
                        </td>
                        <td className="py-3">
                          <span className={clsx('font-semibold', audit.authorized_crosswalk_exists ? 'text-emerald-400' : 'text-surface-500')}>
                            {audit.authorized_crosswalk_exists ? 'Yes (Certified)' : 'None (Unresolved Overlap)'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={clsx('rounded-full px-2.5 py-0.5 text-[10px] font-bold border', badge.bg)}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: LINKAGE GATE SIMULATOR ── */}
      {activeTab === 'simulator' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-surface-700/70 bg-surface-900/80 p-5 space-y-5">
            <div>
              <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                <Lock size={18} className="text-rose-400" />
                Live Multimodal Linkage Gate Simulator
              </h3>
              <p className="text-xs text-surface-400 mt-0.5">
                Test whether specific candidate data merges pass scientific linkage requirements or get safely blocked.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-950/60 p-4 rounded-xl border border-surface-800">
              <div>
                <label className="text-xs text-surface-400 font-medium block mb-1">Target Cohort:</label>
                <select
                  value={simCohort}
                  onChange={(e) => setSimCohort(e.target.value)}
                  className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-surface-200"
                >
                  <option value="ADAM1_BASELINE">ADAM1_BASELINE (Haran Nursing Home)</option>
                  <option value="OASIS1_MRI">OASIS1_MRI (WashU Saint Louis)</option>
                  <option value="OASIS3_MULTIMODAL">OASIS3_MULTIMODAL (WashU Longitudinal)</option>
                  <option value="ADNI_MULTIMODAL">ADNI_MULTIMODAL (ADNI North America)</option>
                  <option value="GARD_MULTIMODAL">GARD_MULTIMODAL (Chosun University Korea)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-surface-400 font-medium block mb-1">Subject ID:</label>
                <input
                  type="text"
                  value={simSubject}
                  onChange={(e) => setSimSubject(e.target.value)}
                  className="w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-xs text-surface-200 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-surface-400 font-medium block mb-1">Requested Modalities:</label>
                <div className="flex items-center gap-4 pt-1.5 text-xs text-surface-300">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simMicrobiome}
                      onChange={(e) => setSimMicrobiome(e.target.checked)}
                      className="rounded border-surface-700 text-rose-500 focus:ring-rose-500"
                    />
                    Microbiome
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simImaging}
                      onChange={(e) => setSimImaging(e.target.checked)}
                      className="rounded border-surface-700 text-rose-500 focus:ring-rose-500"
                    />
                    Neuroimaging (MRI/PET)
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleTestSimulator}
              disabled={simLoading}
              className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={14} className={clsx(simLoading && 'animate-spin')} />
              Evaluate Linkage Gate
            </button>

            {simDecision && (
              <div
                className={clsx(
                  'rounded-xl p-4 border text-xs space-y-2',
                  simDecision.eligible_for_fusion
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {simDecision.eligible_for_fusion ? (
                      <ShieldCheck size={18} className="text-emerald-400" />
                    ) : (
                      <ShieldAlert size={18} className="text-rose-400" />
                    )}
                    <span>Verdict: {simDecision.verdict}</span>
                  </div>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-surface-900 border border-surface-700">
                    Action: {simDecision.enforcement_action}
                  </span>
                </div>
                <p className="leading-relaxed text-surface-300 pt-1">
                  {simDecision.scientific_rationale}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: GARD REQUEST WORKFLOW ── */}
      {activeTab === 'gard' && gardState && (
        <div className="space-y-6">
          {/* Status Tracker Bar */}
          <div className="rounded-xl border border-surface-700/70 bg-surface-900/80 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
                  <Mail size={18} className="text-cyan-400" />
                  GARD Linked-Data Access Workflow Status
                </h3>
                <p className="text-xs text-surface-400 mt-0.5">
                  Governs inquiry to Gwangju Alzheimer’s &amp; Related Dementias Center regarding individual-level paired microbiome &amp; neuroimaging.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={newGardStatus}
                  onChange={(e) => setNewGardStatus(e.target.value)}
                  className="rounded-lg border border-surface-700 bg-surface-800 px-3 py-1.5 text-xs text-surface-200"
                >
                  <option value="REQUEST_NOT_SENT">REQUEST_NOT_SENT</option>
                  <option value="REQUEST_SENT">REQUEST_SENT</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="DENIED">DENIED</option>
                  <option value="NOT_NEEDED">NOT_NEEDED</option>
                </select>
                <button
                  onClick={handleUpdateGard}
                  disabled={updatingGard}
                  className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
                >
                  Update
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-surface-950/60 p-3 border border-surface-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-surface-500">Current Status:</span>{' '}
                <strong className="text-cyan-400 font-mono">{gardState.current_status}</strong>
              </div>
              <div>
                <span className="text-surface-500">Last Updated:</span>{' '}
                <span className="text-surface-300 font-mono">{gardState.last_updated}</span>
              </div>
            </div>
          </div>

          {/* 8-Point Feasibility Checklist */}
          <div className="rounded-xl border border-surface-700/70 bg-surface-900/80 p-5 space-y-3">
            <h3 className="text-sm font-bold text-surface-100">
              8-Point Multimodal Linked-Data Feasibility Checklist
            </h3>
            <div className="space-y-2">
              {gardState.checklist.map((item, idx) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-surface-950/70 p-3 border border-surface-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-surface-100">
                      {idx + 1}. {item.question}
                    </span>
                    <span className="font-mono text-[10px] rounded bg-surface-800 px-2 py-0.5 text-amber-400 shrink-0">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-surface-400">{item.scientific_importance}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Email Template */}
          <div className="rounded-xl border border-surface-700/70 bg-surface-900/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                <FileText size={16} className="text-cyan-400" />
                Formal Data-Access Inquiry Email Template
              </h3>
              <button
                onClick={handleCopyEmail}
                className="rounded-lg bg-surface-800 px-3 py-1.5 text-xs font-semibold text-surface-200 hover:bg-surface-700 border border-surface-700 flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Template'}
              </button>
            </div>
            <pre className="rounded-lg bg-surface-950 p-4 border border-surface-800 text-[11px] font-mono text-surface-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {gardState.sample_email}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
