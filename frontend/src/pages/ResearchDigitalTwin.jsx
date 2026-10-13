/**
 * ResearchDigitalTwin.jsx — Option 4 Longitudinal Personalized AD Research Digital Twin
 * ======================================================================================
 * Interactive research digital twin tracking an individual's observed multi-omic history:
 * - Chronological visit timeline across all 102 cohort participants (up to 12 visits)
 * - Multi-omic microbial dysbiosis index and clinical frailty tracking
 * - Calibrated risk estimates with 95% bootstrap prediction intervals
 * - Model abstention flags (e.g. antibiotic exposure)
 * - Strict research governance banner prohibiting unvalidated future conversion claims
 */
import React, { useState, useEffect } from 'react'
import {
  Activity,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Minus,
  Info,
  Layers,
  Dna,
  FileText,
  Search,
  Filter,
  BarChart2,
  Lock,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import {
  fetchDigitalTwinParticipants,
  fetchDigitalTwinProfile,
} from '../api/client'

export default function ResearchDigitalTwin() {
  const [participants, setParticipants] = useState([])
  const [selectedParticipantId, setSelectedParticipantId] = useState('CH1-017')
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetchDigitalTwinParticipants('ADAM1_BASELINE')
        setParticipants(res.participants || [])
        if (res.participants?.length > 0) {
          const firstId = res.participants[0].participant_id
          setSelectedParticipantId(firstId)
          await loadProfile(firstId)
        }
      } catch (err) {
        setError(err.message || 'Failed to load digital twin participant catalog')
      } finally {
        setLoading(false)
      }
    }
    loadInitial()
  }, [])

  const loadProfile = async (participantId) => {
    try {
      setProfileLoading(true)
      setSelectedParticipantId(participantId)
      const data = await fetchDigitalTwinProfile('ADAM1_BASELINE', participantId)
      setProfile(data)
    } catch (err) {
      console.error(err)
    } finally {
      setProfileLoading(false)
    }
  }

  const filteredParticipants = participants.filter((p) =>
    p.participant_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.clinical_diagnosis.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading Longitudinal Research Digital Twin Profiles..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-xs font-bold text-teal-400 border border-teal-500/20">
              Option 4
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-surface-50">
              Longitudinal Personalized AD Research Digital Twin
            </h1>
          </div>
          <p className="text-sm text-surface-400 mt-1">
            Tracks individual multi-omic observed histories, clinical frailty drift, and calibrated risk estimates over time under static diagnostic ground truth.
          </p>
        </div>
      </div>

      {/* Prominent Research Integrity Banner */}
      <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-4 text-xs text-teal-200 flex items-start gap-3">
        <Info size={18} className="text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-teal-300 font-semibold block">
            Observed-History Timeline &amp; Non-Transition Governance Notice:
          </strong>
          <p className="text-teal-300/80 leading-relaxed">
            The baseline processed cohort contains exactly ZERO clinical diagnosis transitions across all 102 participants (75 subjects have repeated visits, up to 12 visits). All participants remained consistently diagnosed as AD or non-AD. Therefore, temporal trajectories represent <strong>observed model stability estimates</strong> under fixed clinical ground truth, NOT validated clinical conversion or future-onset forecasts. This platform is an exploratory research instrument, not a clinical diagnostic device.
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Participant Directory */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Participants Directory ({participants.length})
            </h3>
            <span className="text-[11px] text-surface-500 font-mono">
              Namespace: [ADAM1:]
            </span>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-surface-500" />
            <input
              type="text"
              placeholder="Filter by subject ID or diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-surface-700 bg-surface-900/90 pl-9 pr-3 py-1.5 text-xs text-surface-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredParticipants.map((p) => {
              const isSelected = selectedParticipantId === p.participant_id
              const isAD = p.clinical_diagnosis.includes("Alzheimer's")
              return (
                <button
                  key={p.participant_id}
                  onClick={() => loadProfile(p.participant_id)}
                  className={clsx(
                    'w-full text-left rounded-xl p-3 border transition-all',
                    isSelected
                      ? 'border-teal-500 bg-teal-950/30 shadow-md ring-1 ring-teal-500/40'
                      : 'border-surface-700/70 bg-surface-900/70 hover:bg-surface-800'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-surface-100">
                      {p.participant_id}
                    </span>
                    <span
                      className={clsx(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold border',
                        isAD
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      )}
                    >
                      {p.clinical_diagnosis}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-surface-400 flex items-center justify-between">
                    <span>
                      Observed Visits: <strong className="text-teal-400 font-mono font-bold">{p.sample_count}</strong>
                    </span>
                    <span>
                      Span: <strong className="text-surface-200">{p.observation_span_days} days</strong>
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Selected Participant Digital Twin Timeline & Multi-Omics */}
        <div className="lg:col-span-2 space-y-5">
          {profile ? (
            <div className="rounded-xl border border-surface-700/70 bg-surface-900/90 p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-surface-50 font-mono">
                      {profile.participant_id}
                    </h2>
                    <span className="rounded bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 text-xs text-teal-300 font-mono font-bold">
                      {profile.namespace}
                    </span>
                  </div>
                  <p className="text-xs text-surface-400 mt-1">
                    Baseline Age: {profile.baseline_age} y | Sex: {profile.sex} | Observation Span: {profile.observation_span_days} days across {profile.total_observed_visits} visits
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={clsx(
                      'rounded-full px-3 py-1 text-xs font-bold border inline-block',
                      profile.static_clinical_diagnosis.includes("Alzheimer's")
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    )}
                  >
                    {profile.static_clinical_diagnosis}
                  </span>
                  <span className="text-[10px] text-surface-500 block mt-1 font-mono">
                    Stability: {profile.longitudinal_stability_verdict}
                  </span>
                </div>
              </div>

              {/* Chronological Visit Timeline */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400 flex items-center gap-1.5">
                  <Clock size={14} className="text-teal-400" />
                  Chronological Observed Visit History ({profile.observed_visits.length} Timepoints)
                </h3>

                <div className="space-y-3">
                  {profile.observed_visits.map((visit) => {
                    const isHighRisk = visit.calibrated_probability >= 0.7
                    return (
                      <div
                        key={visit.sample_id}
                        className={clsx(
                          'rounded-xl border p-4 transition-all space-y-3',
                          visit.abstention_flag
                            ? 'bg-amber-950/15 border-amber-500/30'
                            : 'bg-surface-950/70 border-surface-800'
                        )}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-surface-800 px-2 py-0.5 font-mono text-xs font-bold text-teal-300">
                              Visit #{visit.visit_index}
                            </span>
                            <span className="font-mono text-xs text-surface-200">
                              Sample: {visit.sample_id}
                            </span>
                            <span className="text-xs text-surface-400">
                              (Study Day: <strong>{visit.study_day}</strong>
                              {visit.calendar_date ? ` • ${visit.calendar_date}` : ''})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-surface-400">Est. AD Risk:</span>
                            <span
                              className={clsx(
                                'font-mono text-sm font-extrabold',
                                isHighRisk ? 'text-rose-400' : 'text-emerald-400'
                              )}
                            >
                              {(visit.calibrated_probability * 100).toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-surface-500 font-mono">
                              CI: [{(visit.prediction_interval_95[0] * 100).toFixed(0)}%-{(visit.prediction_interval_95[1] * 100).toFixed(0)}%]
                            </span>
                          </div>
                        </div>

                        {/* Multi-Omic & Clinical Biomarkers Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs rounded-lg bg-surface-900/60 p-2.5 border border-surface-800/80">
                          <div>
                            <span className="text-surface-500 block">Shannon Diversity:</span>
                            <strong className="text-surface-200 font-mono">
                              {visit.shannon_alpha_diversity}
                            </strong>
                          </div>
                          <div>
                            <span className="text-surface-500 block">F. prausnitzii (Protective):</span>
                            <strong className="text-emerald-400 font-mono">
                              {(visit.faecalibacterium_prausnitzii_rel_abund * 100).toFixed(3)}%
                            </strong>
                          </div>
                          <div>
                            <span className="text-surface-500 block">Dysbiosis Ratio:</span>
                            <strong className="text-amber-400 font-mono">
                              {visit.dysbiosis_risk_ratio}
                            </strong>
                          </div>
                          <div>
                            <span className="text-surface-500 block">Clinical Frailty Scale:</span>
                            <strong className="text-surface-200 font-mono">
                              {visit.clinical_frailty_scale} / 9
                            </strong>
                          </div>
                        </div>

                        {/* Abstention Warning if antibiotics present */}
                        {visit.abstention_flag && (
                          <div className="rounded bg-amber-500/10 border border-amber-500/30 p-2.5 text-xs text-amber-300 flex items-start gap-2">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                            <span>
                              <strong>Model Abstention Alert:</strong> {visit.abstention_reason}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-surface-700/60 bg-surface-900/40 p-12 text-center text-surface-400">
              Select a participant from the directory to construct their Longitudinal Research Digital Twin.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
