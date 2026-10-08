/**
 * LongitudinalTrajectory.jsx — Longitudinal AD Risk Trajectory Module
 * ====================================================================
 * Visualizes patient-level chronological timelines, model-estimated AD risk
 * probability evolution across observed follow-up, multi-signal biomarker curves,
 * SHAP factor progression, grounded RAG literature, and subject comparison.
 *
 * Strict Research Governance:
 * - Patient timelines grouped by real subject ID (study_id).
 * - No fabricated future diagnoses or arbitrary date extrapolation.
 * - Displays scientific disclaimers and exact model probability change wording.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Activity,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldCheck,
  Search,
  ChevronRight,
  Database,
  BookOpen,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  CheckCircle2,
  FileText,
  GitCompare,
  Sliders,
  Filter,
  BarChart2,
  Dna,
  Hash,
} from 'lucide-react'
import clsx from 'clsx'

import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import {
  fetchTrajectorySubjects,
  fetchSubjectTrajectory,
  fetchTrajectoryLiterature,
  compareSubjectTrajectories,
  fetchRiskModelCapabilities,
  fetchTrajectoryEvaluation,
} from '../api/client'

const QUICK_SUBJECTS = ['CH1-003', 'CH1-011', 'CH1-017', 'CH1-009', 'CH1-020', 'CH1-091']

export default function LongitudinalTrajectory() {
  const [subjects, setSubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('CH1-003')
  const [searchQuery, setSearchQuery] = useState('')
  const [trajectory, setTrajectory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Multi-signal tab: 'probability' | 'diversity' | 'microbiome' | 'clinical' | 'shap'
  const [activeSignalTab, setActiveSignalTab] = useState('probability')

  // Selected visit index for deep inspection
  const [selectedVisitIndex, setSelectedVisitIndex] = useState(0)

  // Time horizon exploration state
  const [horizonDay, setHorizonDay] = useState(null)
  const [customHorizonInput, setCustomHorizonInput] = useState('')

  // Observation literature RAG state
  const [literatureData, setLiteratureData] = useState(null)
  const [literatureLoading, setLiteratureLoading] = useState(false)
  const [literatureError, setLiteratureError] = useState(null)

  // Subject comparison state
  const [compareSubjectIds, setCompareSubjectIds] = useState(['CH1-003', 'CH1-017'])
  const [comparisonResults, setComparisonResults] = useState(null)
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareLoading, setCompareLoading] = useState(false)

  // Architectural capabilities & evaluation stats
  const [capabilities, setCapabilities] = useState(null)
  const [cohortEvaluation, setCohortEvaluation] = useState(null)

  // Load subject registry and capabilities on mount
  useEffect(() => {
    async function init() {
      setSubjectsLoading(true)
      try {
        const [subjRes, capRes, evalRes] = await Promise.allSettled([
          fetchTrajectorySubjects(),
          fetchRiskModelCapabilities(),
          fetchTrajectoryEvaluation(),
        ])

        if (subjRes.status === 'fulfilled') {
          const list = subjRes.value.subjects || []
          setSubjects(list)
          if (list.length > 0 && !selectedSubjectId) {
            setSelectedSubjectId(list[0].subject_id)
          }
        }
        if (capRes.status === 'fulfilled') {
          setCapabilities(capRes.value)
        }
        if (evalRes.status === 'fulfilled') {
          setCohortEvaluation(evalRes.value)
        }
      } catch (err) {
        console.error('Failed to load initial trajectory metadata:', err)
      } finally {
        setSubjectsLoading(false)
      }
    }
    init()
  }, [])

  // Load trajectory for active subject
  const loadTrajectory = useCallback(async (sid, horizon = null) => {
    if (!sid) return
    setLoading(true)
    setError(null)
    setLiteratureData(null)
    try {
      const data = await fetchSubjectTrajectory(sid, true, horizon)
      setTrajectory(data)
      // Default to latest visit
      if (data.observations && data.observations.length > 0) {
        setSelectedVisitIndex(data.observations.length - 1)
      }
      if (horizon !== null) {
        setHorizonDay(horizon)
        setCustomHorizonInput(String(horizon))
      } else {
        setHorizonDay(data.max_observed_day)
        setCustomHorizonInput(String(data.max_observed_day))
      }
    } catch (err) {
      setError(err.message || `Failed to load trajectory for subject ${sid}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSubjectId) {
      loadTrajectory(selectedSubjectId, null)
    }
  }, [selectedSubjectId, loadTrajectory])

  // Filter subjects for selector
  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return subjects
    const q = searchQuery.toLowerCase().trim()
    return subjects.filter(
      (s) =>
        s.subject_id.toLowerCase().includes(q) ||
        s.sample_ids.some((smp) => smp.toLowerCase().includes(q))
    )
  }, [subjects, searchQuery])

  // Active observation detail
  const currentObs = useMemo(() => {
    if (!trajectory || !trajectory.observations || trajectory.observations.length === 0) return null
    const safeIdx = Math.max(0, Math.min(selectedVisitIndex, trajectory.observations.length - 1))
    return trajectory.observations[safeIdx]
  }, [trajectory, selectedVisitIndex])

  // Fetch literature for the current selected observation
  const handleFetchLiterature = async () => {
    if (!trajectory || !currentObs) return
    setLiteratureLoading(true)
    setLiteratureError(null)
    try {
      const lit = await fetchTrajectoryLiterature(trajectory.subject_id, currentObs.sample_id)
      setLiteratureData(lit)
    } catch (err) {
      setLiteratureError(err.message || 'Failed to retrieve literature for this observation')
    } finally {
      setLiteratureLoading(false)
    }
  }

  // Handle side-by-side comparison
  const handleRunComparison = async () => {
    if (compareSubjectIds.length < 2) return
    setCompareLoading(true)
    try {
      const res = await compareSubjectTrajectories(compareSubjectIds)
      setComparisonResults(res.comparisons || [])
    } catch (err) {
      console.error('Failed to compare trajectories:', err)
    } finally {
      setCompareLoading(false)
    }
  }

  // Trajectory direction styles
  const directionBadge = (dir) => {
    switch (dir) {
      case 'Increasing':
        return {
          icon: TrendingUp,
          color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          desc: 'Model probability increased over follow-up',
        }
      case 'Decreasing':
        return {
          icon: TrendingDown,
          color: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
          desc: 'Model probability decreased over follow-up',
        }
      case 'Stable':
        return {
          icon: Minus,
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          desc: 'Model probability remained within ±5 pp',
        }
      default:
        return {
          icon: Info,
          color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
          desc: 'Single visit recorded (insufficient longitudinal points)',
        }
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* ── HEADER & DISCLAIMER ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Activity size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                Longitudinal AD Risk Trajectory
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-surface-800 border border-surface-700 text-surface-300 font-mono font-normal">
                  Phase 3 Biomarker Engine
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono font-bold">
                  RESEARCH_ONLY
                </span>
              </h1>
              <p className="text-sm text-surface-400">
                Model-estimated AD probability tracking across repeated patient observations without extrapolating future diagnoses
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setCompareModalOpen(true)
              handleRunComparison()
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 border border-surface-700 transition"
          >
            <GitCompare size={14} className="text-purple-400" />
            Compare Subjects
          </button>
        </div>
      </div>

      {/* ── SCIENTIFIC DISCLAIMER BANNER ─────────────────────────────────── */}
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <span className="font-semibold text-amber-300 uppercase tracking-wider text-[11px]">
            Research-Only Analysis Notice
          </span>
          <p className="text-surface-300 leading-relaxed">
            This longitudinal trajectory represents <strong>model-estimated AD-associated risk</strong> based on observed research data.
            It is <strong>not</strong> a clinical diagnosis, prognosis, or validated prediction of future Alzheimer's disease onset.
            The current cohort contains repeated longitudinal measurements across 102 subjects, but zero observed Control → AD disease-transition events.
          </p>
        </div>
      </div>

      {/* ── SUBJECT SELECTOR BAR ─────────────────────────────────────────── */}
      <div className="p-4 rounded-xl border border-surface-800 bg-surface-900/60 backdrop-blur-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-400 font-mono">
              Select Subject:
            </span>
            <div className="relative">
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={subjectsLoading}
                aria-label="Select Subject ID"
                className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-purple-500 pr-8 cursor-pointer"
              >
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>
                    {s.subject_id} ({s.observation_count} visits, {s.follow_up_days}d follow-up — {s.diagnosis_status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Switch Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-[11px] text-surface-400 font-mono mr-1">Top Cohorts:</span>
            {QUICK_SUBJECTS.map((sid) => (
              <button
                key={sid}
                onClick={() => setSelectedSubjectId(sid)}
                className={clsx(
                  'px-2.5 py-1 text-xs font-mono rounded-lg border transition',
                  selectedSubjectId === sid
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/50 font-bold'
                    : 'bg-surface-800/80 hover:bg-surface-700 text-surface-300 border-surface-700/60'
                )}
              >
                {sid}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-surface-400 font-mono animate-pulse">
            Computing longitudinal AD risk trajectory & TreeSHAP explanations...
          </p>
        </div>
      ) : error ? (
        <ErrorAlert message={error} />
      ) : trajectory ? (
        <div className="space-y-6">
          {/* ── TOP METRICS CARDS ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Subject ID"
              value={trajectory.subject_id}
              description={`${trajectory.observation_count} visits observed`}
              icon={Activity}
            />
            <StatCard
              label="Follow-up Duration"
              value={`${trajectory.follow_up_days} days`}
              description={`Day ${trajectory.baseline_day} → Day ${trajectory.latest_day}`}
              icon={Calendar}
            />
            <StatCard
              label="Baseline AD Prob."
              value={`${(trajectory.baseline_probability * 100).toFixed(1)}%`}
              description={trajectory.baseline_date || 'Visit 1'}
              icon={Clock}
            />
            <StatCard
              label="Latest AD Prob."
              value={`${(trajectory.latest_probability * 100).toFixed(1)}%`}
              description={trajectory.latest_date || 'Final Visit'}
              icon={Activity}
            />
            <StatCard
              label="Probability Change"
              value={`${trajectory.probability_change_percentage_points > 0 ? '+' : ''}${trajectory.probability_change_percentage_points.toFixed(1)} pp`}
              description={`Relative: ${(trajectory.relative_probability_change * 100).toFixed(1)}%`}
              trend={
                trajectory.probability_change_percentage_points > 0
                  ? 'up'
                  : trajectory.probability_change_percentage_points < 0
                  ? 'down'
                  : 'neutral'
              }
              icon={TrendingUp}
            />
            <div className="p-4 rounded-xl border border-surface-800 bg-surface-900/60 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-surface-400 uppercase tracking-wider">
                Trajectory Direction
              </span>
              <div className="my-1">
                {(() => {
                  const b = directionBadge(trajectory.trajectory_direction)
                  const Icon = b.icon
                  return (
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border font-mono',
                        b.color
                      )}
                    >
                      <Icon size={13} />
                      {trajectory.trajectory_direction}
                    </span>
                  )
                })()}
              </div>
              <span className="text-[10px] text-surface-400 truncate">
                {trajectory.monthly_slope_percentage_points !== null
                  ? `${trajectory.monthly_slope_percentage_points > 0 ? '+' : ''}${trajectory.monthly_slope_percentage_points.toFixed(2)} pp/30d`
                  : 'Slope: N/A'}
              </span>
            </div>
          </div>

          {/* ── RESEARCH INTERPRETATION CALLOUT ─────────────────────────── */}
          <div className="p-4 rounded-xl border border-surface-800 bg-surface-900/40 flex items-start gap-3">
            <Info size={18} className="text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-semibold text-purple-300 font-mono text-[11px] uppercase tracking-wider">
                Research Scientific Interpretation
              </span>
              <p className="text-surface-200 text-sm leading-relaxed">
                "{trajectory.research_interpretation}"
              </p>
            </div>
          </div>

          {/* ── MULTI-SIGNAL TRAJECTORY CHART ───────────────────────────── */}
          <div className="rounded-xl border border-surface-800 bg-surface-900/70 p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart2 size={16} className="text-purple-400" />
                  Multi-Signal Longitudinal Trajectory Curve
                </h3>
                <p className="text-xs text-surface-400">
                  Click on any observation node below to inspect that specific visit's clinical & SHAP factors
                </p>
              </div>

              {/* Signal Tabs */}
              <div className="flex items-center gap-1 bg-surface-800/80 p-1 rounded-lg border border-surface-700/60 overflow-x-auto">
                {[
                  { id: 'probability', label: 'AD Probability' },
                  { id: 'diversity', label: 'Alpha Diversity' },
                  { id: 'microbiome', label: 'Microbiome Taxa' },
                  { id: 'clinical', label: 'Clinical (CFS/Malnutrition)' },
                  { id: 'shap', label: 'Top SHAP Features' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSignalTab(tab.id)}
                    className={clsx(
                      'px-3 py-1 text-xs font-semibold rounded-md transition whitespace-nowrap',
                      activeSignalTab === tab.id
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-surface-300 hover:text-white hover:bg-surface-700/50'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive SVG Chart */}
            <div className="relative w-full h-72 sm:h-80 bg-surface-950/60 rounded-xl p-4 border border-surface-800/80 flex flex-col justify-between">
              {/* SVG Area */}
              <svg className="w-full h-full overflow-visible" viewBox="0 0 800 240" preserveAspectRatio="none">
                {/* Horizontal gridlines */}
                {[0, 0.25, 0.5, 0.75, 1.0].map((v, i) => (
                  <g key={i}>
                    <line
                      x1="40"
                      y1={210 - v * 180}
                      x2="780"
                      y2={210 - v * 180}
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-surface-800/70"
                    />
                    <text
                      x="10"
                      y={215 - v * 180}
                      fill="currentColor"
                      className="text-[10px] font-mono fill-surface-400"
                    >
                      {activeSignalTab === 'probability'
                        ? `${(v * 100).toFixed(0)}%`
                        : activeSignalTab === 'diversity'
                        ? (v * 4.5).toFixed(1)
                        : (v * 100).toFixed(0)}
                    </text>
                  </g>
                ))}

                {/* Plot line & nodes according to activeSignalTab */}
                {(() => {
                  const obs = trajectory.observations
                  if (obs.length === 0) return null

                  const maxDay = Math.max(1, trajectory.follow_up_days, trajectory.latest_day)
                  const getX = (d) => 50 + (d / maxDay) * 710

                  let getY = (o) => 210 - o.ad_probability * 180
                  if (activeSignalTab === 'diversity') {
                    getY = (o) => 210 - Math.min(1, o.diversity_metrics.shannon_index / 4.5) * 180
                  } else if (activeSignalTab === 'clinical') {
                    getY = (o) => 210 - (o.clinical_features.clinical_frailty_scale / 9.0) * 180
                  }

                  const points = obs.map((o) => `${getX(o.study_day)},${getY(o)}`).join(' ')

                  return (
                    <g>
                      {/* Trend path */}
                      {obs.length > 1 && (
                        <polyline
                          fill="none"
                          stroke={
                            activeSignalTab === 'probability'
                              ? '#A855F7'
                              : activeSignalTab === 'diversity'
                              ? '#06B6D4'
                              : '#F59E0B'
                          }
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points}
                        />
                      )}

                      {/* Baseline reference horizontal dashed line */}
                      {obs.length > 1 && activeSignalTab === 'probability' && (
                        <line
                          x1="50"
                          y1={getY(obs[0])}
                          x2="760"
                          y2={getY(obs[0])}
                          stroke="#A855F7"
                          strokeWidth="1"
                          strokeDasharray="2 4"
                          opacity="0.4"
                        />
                      )}

                      {/* Observation Nodes */}
                      {obs.map((o, idx) => {
                        const cx = getX(o.study_day)
                        const cy = getY(o)
                        const isSelected = idx === selectedVisitIndex

                        return (
                          <g
                            key={idx}
                            className="cursor-pointer group"
                            onClick={() => setSelectedVisitIndex(idx)}
                          >
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isSelected ? '7' : '5'}
                              fill={isSelected ? '#EC4899' : '#A855F7'}
                              stroke="#0F172A"
                              strokeWidth="2"
                              className="transition-all hover:scale-125"
                            />
                            {/* Day label */}
                            <text
                              x={cx}
                              y="235"
                              textAnchor="middle"
                              fill="currentColor"
                              className={clsx(
                                'text-[10px] font-mono transition',
                                isSelected ? 'fill-pink-400 font-bold' : 'fill-surface-400'
                              )}
                            >
                              Day {o.study_day}
                            </text>
                            {/* Value label above point */}
                            <text
                              x={cx}
                              y={cy - 12}
                              textAnchor="middle"
                              fill="currentColor"
                              className={clsx(
                                'text-[10px] font-mono transition',
                                isSelected ? 'fill-pink-300 font-bold' : 'fill-surface-300'
                              )}
                            >
                              {activeSignalTab === 'probability'
                                ? `${(o.ad_probability * 100).toFixed(1)}%`
                                : activeSignalTab === 'diversity'
                                ? o.diversity_metrics.shannon_index.toFixed(2)
                                : `CFS ${o.clinical_features.clinical_frailty_scale}`}
                            </text>
                          </g>
                        )
                      })}
                    </g>
                  )
                })()}
              </svg>

              <div className="flex items-center justify-between text-[11px] text-surface-400 font-mono pt-1">
                <span>Start: Day {trajectory.baseline_day}</span>
                <span>Active Observation: Day {currentObs ? currentObs.study_day : 0} ({currentObs ? currentObs.sample_id : ''})</span>
                <span>Max Observed: Day {trajectory.latest_day}</span>
              </div>
            </div>

            {/* ── TRAJECTORY EXPLORATION & TIME HORIZON UI ───────────────── */}
            <div className="p-4 rounded-xl border border-surface-800 bg-surface-900/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5 font-mono">
                    <Sliders size={14} className="text-purple-400" />
                    Trajectory Horizon Exploration (Observed Follow-Up Window)
                  </span>
                  <p className="text-[11px] text-surface-400">
                    Filter trajectory up to a specific study day. Extrapolation beyond observed dates is strictly prohibited.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-400 font-mono">Cutoff Day:</span>
                  <input
                    type="number"
                    min="0"
                    max={trajectory.max_observed_day + 100}
                    value={customHorizonInput}
                    onChange={(e) => setCustomHorizonInput(e.target.value)}
                    aria-label="Cutoff Day"
                    placeholder={`Max: ${trajectory.max_observed_day}`}
                    className="w-24 bg-surface-800 border border-surface-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      const val = parseInt(customHorizonInput, 10)
                      if (!isNaN(val)) {
                        loadTrajectory(selectedSubjectId, val)
                      }
                    }}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition font-mono"
                  >
                    Apply Horizon
                  </button>
                  <button
                    onClick={() => loadTrajectory(selectedSubjectId, null)}
                    className="px-2.5 py-1 text-xs rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-300 border border-surface-700 transition"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Horizon warning banner if user requested beyond observed */}
              {trajectory.horizon_warning && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-start gap-2.5 animate-pulse">
                  <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-200 leading-relaxed font-mono">
                    {trajectory.horizon_warning ||
                      `No observed data are available beyond Day ${trajectory.max_observed_day}. Future disease-onset prediction is not currently validated by this dataset.`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── SELECTED OBSERVATION DETAIL INSPECTOR ────────────────────── */}
          {currentObs && (
            <div className="rounded-xl border border-surface-800 bg-surface-900/60 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/30">
                    Day {currentObs.study_day}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Observation Detail: Sample <span className="font-mono text-purple-400">{currentObs.sample_id}</span>
                    </h3>
                    <p className="text-xs text-surface-400">
                      Collection Date: {currentObs.sample_date || 'Baseline'} • Model-estimated AD Probability: {(currentObs.ad_probability * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFetchLiterature}
                    disabled={literatureLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 transition font-mono"
                  >
                    <BookOpen size={13} />
                    {literatureLoading ? 'Retrieving Evidence...' : 'Retrieve Literature (RAG)'}
                  </button>
                </div>
              </div>

              {/* Observation Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/60">
                  <span className="text-surface-400 block text-[10px] uppercase">Shannon Alpha Diversity</span>
                  <span className="text-white text-sm font-bold">{currentObs.diversity_metrics.shannon_index}</span>
                  <span className="text-surface-400 block text-[10px]">Simpson: {currentObs.diversity_metrics.simpson_index}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/60">
                  <span className="text-surface-400 block text-[10px] uppercase">Bray-Curtis to Baseline</span>
                  <span className="text-white text-sm font-bold">{currentObs.diversity_metrics.bray_curtis_to_baseline}</span>
                  <span className="text-surface-400 block text-[10px]">Berger-Parker: {currentObs.diversity_metrics.berger_parker_dominance}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/60">
                  <span className="text-surface-400 block text-[10px] uppercase">Clinical Frailty Scale (CFS)</span>
                  <span className="text-white text-sm font-bold">{currentObs.clinical_features.clinical_frailty_scale} / 9</span>
                  <span className="text-surface-400 block text-[10px]">Malnutrition Score: {currentObs.clinical_features.malnutrition_indicator_sco}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/60">
                  <span className="text-surface-400 block text-[10px] uppercase">AD Classification State</span>
                  <span className={clsx('text-sm font-bold', currentObs.ad_prediction === 1 ? 'text-rose-400' : 'text-emerald-400')}>
                    {currentObs.ad_prediction === 1 ? 'High-Risk Profile' : 'Control-Like Profile'}
                  </span>
                  <span className="text-surface-400 block text-[10px]">Prob: {(currentObs.ad_probability * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Local SHAP Explanations at this Visit */}
              {currentObs.shap_explanation && currentObs.shap_explanation.top_features && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-surface-300 font-mono flex items-center gap-1.5">
                    <Sparkles size={13} className="text-purple-400" />
                    Top TreeSHAP Biomarker Drivers for Day {currentObs.study_day}:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {currentObs.shap_explanation.top_features.slice(0, 6).map((feat, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-800/40 border border-surface-700/50 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={clsx(
                              'w-2 h-2 rounded-full shrink-0',
                              feat.shap_value > 0 ? 'bg-rose-400' : 'bg-teal-400'
                            )}
                          />
                          <span className="truncate text-white" title={feat.feature}>
                            {feat.feature}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-surface-400 text-[11px]">val: {feat.feature_value.toFixed(2)}</span>
                          <span
                            className={clsx(
                              'font-bold text-[11px]',
                              feat.shap_value > 0 ? 'text-rose-400' : 'text-teal-400'
                            )}
                          >
                            {feat.shap_value > 0 ? '+' : ''}{feat.shap_value.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence-Grounded Literature (RAG) Block */}
              {literatureLoading && (
                <div className="p-6 flex items-center justify-center gap-2 text-xs font-mono text-purple-300 animate-pulse">
                  <LoadingSpinner size="sm" />
                  Querying indexed PubMed evidence for Day {currentObs.study_day} biomarkers...
                </div>
              )}
              {literatureData && (
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-purple-300 flex items-center gap-1.5">
                      <BookOpen size={14} />
                      Grounded Scientific Evidence for Observation {literatureData.sample_id}
                    </span>
                    <span className="text-[10px] text-surface-400 truncate max-w-xs" title={`SHA-256: ${literatureData.prompt_hash}`}>
                      Hash: {literatureData.prompt_hash.slice(0, 12)}...
                    </span>
                  </div>

                  <div className="space-y-2">
                    {literatureData.articles.map((art, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-surface-900/80 border border-surface-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white hover:text-purple-300 transition">
                            {art.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-800 text-[10px] font-mono text-purple-300 shrink-0">
                            {art.pmid}
                          </span>
                        </div>
                        <p className="text-[11px] text-surface-400 font-mono">
                          {art.authors} • {art.journal} ({art.year})
                        </p>
                        <p className="text-surface-300 text-[11px] line-clamp-2 leading-relaxed">
                          {art.snippet || art.abstract}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── EXTENSIBLE RISK MODEL ARCHITECTURE (SECTION 12 & 21) ──────── */}
          {capabilities && (
            <div className="rounded-xl border border-surface-800 bg-surface-900/60 p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Layers size={14} className="text-purple-400" />
                Extensible Risk Model Architecture & Time-to-Event Governance
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Classification */}
                <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Cross-Sectional Model</span>
                    <StatusBadge status="ACTIVE" size="xs" />
                  </div>
                  <p className="text-[11px] text-surface-400">
                    ADAM-1 XGBoost Biomarker Classifier trained on 1044 metagenomic & clinical features with subject-level splitting.
                  </p>
                </div>

                {/* 2. Longitudinal */}
                <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Longitudinal Trajectory</span>
                    <StatusBadge status="ACTIVE" size="xs" />
                  </div>
                  <p className="text-[11px] text-surface-400">
                    Empirical trajectory tracking model-estimated AD probability across observed follow-up days.
                  </p>
                </div>

                {/* 3. Time-to-event */}
                <div className="p-3 rounded-lg bg-surface-800/40 border border-surface-700/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Time-to-Event Model</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      NOT AVAILABLE
                    </span>
                  </div>
                  <p className="text-[11px] text-surface-400">
                    {capabilities.future_time_to_event_model.reason}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* ── SIDE-BY-SIDE PATIENT COMPARISON MODAL ───────────────────────── */}
      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-4xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <GitCompare size={18} className="text-purple-400" />
                  Side-by-Side Subject Trajectory Comparison
                </h3>
                <p className="text-xs text-surface-400">
                  Compare longitudinal model probabilities and slopes between subjects across follow-up
                </p>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="text-surface-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Subject Selectors */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-surface-400">Compare Subjects:</span>
              {compareSubjectIds.map((sid, idx) => (
                <select
                  key={idx}
                  value={sid}
                  onChange={(e) => {
                    const updated = [...compareSubjectIds]
                    updated[idx] = e.target.value
                    setCompareSubjectIds(updated)
                  }}
                  className="bg-surface-800 border border-surface-700 rounded-lg px-3 py-1 text-xs text-white font-mono"
                >
                  {subjects.map((s) => (
                    <option key={s.subject_id} value={s.subject_id}>
                      {s.subject_id} ({s.observation_count} visits)
                    </option>
                  ))}
                </select>
              ))}
              <button
                onClick={handleRunComparison}
                disabled={compareLoading}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono transition"
              >
                {compareLoading ? 'Comparing...' : 'Refresh'}
              </button>
            </div>

            {/* Comparison Table */}
            {comparisonResults && comparisonResults.length > 0 && (
              <div className="rounded-xl border border-surface-800 overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-surface-800/80 text-surface-400">
                    <tr>
                      <th className="p-3 text-left">Subject</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Visits</th>
                      <th className="p-3 text-left">Follow-Up</th>
                      <th className="p-3 text-left">Baseline Prob.</th>
                      <th className="p-3 text-left">Latest Prob.</th>
                      <th className="p-3 text-left">Change</th>
                      <th className="p-3 text-left">Direction</th>
                      <th className="p-3 text-left">Shannon Δ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800 text-surface-200">
                    {comparisonResults.map((c, i) => (
                      <tr key={i} className="hover:bg-surface-800/40">
                        <td className="p-3 font-bold text-white">{c.subject_id}</td>
                        <td className="p-3">{c.diagnosis_status}</td>
                        <td className="p-3">{c.observation_count}</td>
                        <td className="p-3">{c.follow_up_days}d</td>
                        <td className="p-3">{(c.baseline_probability * 100).toFixed(1)}%</td>
                        <td className="p-3">{(c.latest_probability * 100).toFixed(1)}%</td>
                        <td className={clsx('p-3 font-bold', c.probability_change_percentage_points > 0 ? 'text-rose-400' : 'text-emerald-400')}>
                          {c.probability_change_percentage_points > 0 ? '+' : ''}{c.probability_change_percentage_points.toFixed(1)} pp
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-surface-800 text-[10px] border border-surface-700">
                            {c.trajectory_direction}
                          </span>
                        </td>
                        <td className="p-3">
                          {c.baseline_shannon.toFixed(2)} → {c.latest_shannon.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
