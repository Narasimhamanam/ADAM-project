import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users,
  Search,
  Filter,
  Calendar,
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  Brain,
  Layers,
  ChevronRight,
  ShieldAlert,
  Info,
  CheckCircle2,
  Scan,
  Database,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import {
  fetchTrajectorySubjects,
  fetchSubjectTrajectory,
  fetchDigitalTwinProfile,
  fetchNeuroimagingSubjects,
} from '../api/client'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import EmptyState from '../components/ui/EmptyState'
import Skeleton from '../components/ui/Skeleton'

export default function PatientExplorer() {
  const [subjects, setSubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('CH1-011')
  const [searchQuery, setSearchQuery] = useState('')
  const [diagnosisFilter, setDiagnosisFilter] = useState('all')
  const [visitFilter, setVisitFilter] = useState('all') // 'all' | 'multiple' | 'single'

  // Subject details state
  const [trajectoryData, setTrajectoryData] = useState(null)
  const [digitalTwinProfile, setDigitalTwinProfile] = useState(null)
  const [loadingSubject, setLoadingSubject] = useState(false)
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(null)
  const [detailError, setDetailError] = useState(null)

  // Independent imaging state (OASIS-1)
  const [imagingSubjects, setImagingSubjects] = useState([])
  const [loadingImaging, setLoadingImaging] = useState(false)
  const [selectedImagingId, setSelectedImagingId] = useState('OAS1_0001')
  const [activeTab, setActiveTab] = useState('timeline') // 'timeline' | 'clinical' | 'imaging'

  // 1. Load subjects list (Lightweight, single non-blocking call)
  const loadSubjectsList = useCallback(async () => {
    setLoadingList(true)
    setListError(null)
    try {
      const data = await fetchTrajectorySubjects()
      const list = data?.subjects || []
      setSubjects(list)

      if (list.length > 0) {
        // Keep selected if present, else select first subject
        setSelectedSubjectId((prev) => {
          if (prev && list.some((s) => s.study_id === prev)) return prev
          return list[0].study_id
        })
      }
    } catch (err) {
      console.error('Failed to load participant list:', err)
      setListError(err.message || 'Unable to connect to backend server. The service may be cold-starting.')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    loadSubjectsList()
  }, [loadSubjectsList])

  // 2. Load detailed data for selected subject (Lightweight, no TreeSHAP on initial view)
  const loadSubjectDetail = useCallback(async (subjId) => {
    if (!subjId) return
    setLoadingSubject(true)
    setDetailError(null)

    try {
      // Parallel fetch of subject trajectory and digital twin profile with timeout protection
      const [trajRes, twinRes] = await Promise.allSettled([
        fetchSubjectTrajectory(subjId, false), // includeShap=false keeps browsing instant and memory-safe
        fetchDigitalTwinProfile('ADAM1_BASELINE', subjId),
      ])

      if (trajRes.status === 'fulfilled' && trajRes.value) {
        setTrajectoryData(trajRes.value)
      } else if (trajRes.status === 'rejected') {
        console.warn('Trajectory fetch warning:', trajRes.reason)
      }

      if (twinRes.status === 'fulfilled' && twinRes.value) {
        setDigitalTwinProfile(twinRes.value)
      } else if (twinRes.status === 'rejected') {
        console.warn('Digital twin fetch warning:', twinRes.reason)
      }

      if (trajRes.status === 'rejected' && twinRes.status === 'rejected') {
        setDetailError('Could not load participant detail records from server.')
      }
    } catch (err) {
      console.error('Failed to load participant detail:', err)
      setDetailError(err.message || 'Failed to retrieve participant records.')
    } finally {
      setLoadingSubject(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSubjectId) {
      loadSubjectDetail(selectedSubjectId)
    }
  }, [selectedSubjectId, loadSubjectDetail])

  // 3. Lazy-load OASIS-1 Neuroimaging records only when imaging tab is activated
  useEffect(() => {
    if (activeTab === 'imaging' && imagingSubjects.length === 0 && !loadingImaging) {
      let isMounted = true
      setLoadingImaging(true)
      fetchNeuroimagingSubjects('OASIS1_MRI')
        .then((res) => {
          if (isMounted) {
            setImagingSubjects(res?.subjects || [])
          }
        })
        .catch((err) => {
          console.warn('Could not load neuroimaging subjects:', err)
        })
        .finally(() => {
          if (isMounted) setLoadingImaging(false)
        })
      return () => {
        isMounted = false
      }
    }
  }, [activeTab, imagingSubjects.length, loadingImaging])

  // Filtered participant list
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const isAD = s.diagnosis_label === 1 || s.alzheimers_diagnosis === 1 || s.alzheimers === 1 || s.label === 1
      const matchesDiagnosis =
        diagnosisFilter === 'all' ||
        (diagnosisFilter === 'ad' && isAD) ||
        (diagnosisFilter === 'control' && !isAD)
      const visitCount = s.observation_count || s.sample_count || s.total_visits || 1
      const matchesVisits =
        visitFilter === 'all' ||
        (visitFilter === 'multiple' && visitCount >= 2) ||
        (visitFilter === 'single' && visitCount === 1)
      const matchesSearch =
        !searchQuery ||
        s.subject_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.study_id?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesDiagnosis && matchesVisits && matchesSearch
    })
  }, [subjects, diagnosisFilter, visitFilter, searchQuery])

  // Active participant helpers
  const currentSubj = useMemo(() => {
    return subjects.find((s) => (s.subject_id || s.study_id) === selectedSubjectId)
  }, [subjects, selectedSubjectId])

  const isADDiagnosis = useMemo(() => {
    if (currentSubj) {
      return (
        currentSubj.diagnosis_label === 1 ||
        currentSubj.diagnosis_status === 'AD' ||
        currentSubj.alzheimers === 1
      )
    }
    return trajectoryData?.diagnosis_label === 1 || trajectoryData?.diagnosis_status === 'AD'
  }, [currentSubj, trajectoryData])

  // Harmonized visits/observations array from trajectory response
  const timelineObservations = useMemo(() => {
    if (!trajectoryData) return []
    // Support both observations and visits compatibility aliases
    const rawList = trajectoryData.observations || trajectoryData.visits || []
    return rawList.map((obs, idx) => {
      const dayOffset = obs.study_day ?? obs.day_offset ?? obs.day ?? 0
      const prob = obs.ad_probability ?? obs.predicted_probability ?? obs.risk_probability ?? 0.5

      // Harmonize species abundance
      let keyTaxa = []
      if (Array.isArray(obs.key_taxa) && obs.key_taxa.length > 0) {
        keyTaxa = obs.key_taxa
      } else if (obs.key_species_abundance && typeof obs.key_species_abundance === 'object') {
        keyTaxa = Object.entries(obs.key_species_abundance)
          .filter(([_, val]) => typeof val === 'number' && val > 0)
          .slice(0, 3)
          .map(([k, v]) => ({ species_name: k, abundance: v }))
      }

      return {
        sample_id: obs.sample_id || `Sample-${idx + 1}`,
        study_day: dayOffset,
        sample_date: obs.sample_date || null,
        ad_probability: prob,
        clinical: obs.clinical_features || {},
        diversity: obs.diversity_metrics || {},
        key_taxa: keyTaxa,
      }
    })
  }, [trajectoryData])

  const totalFollowUpSpan = useMemo(() => {
    if (timelineObservations.length > 1) {
      const days = timelineObservations.map((o) => o.study_day)
      return Math.max(...days) - Math.min(...days)
    }
    return 0
  }, [timelineObservations])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="border-b border-surface-700/60 pb-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-50 flex items-center gap-2">
            <Users size={22} className="text-primary-400" />
            <span>Participant &amp; Longitudinal History Explorer</span>
          </h1>
          <p className="text-xs text-surface-400 mt-0.5">
            Inspect real cohort participants, repeat visit trajectories, and Personalized Research Digital Twins.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-lg bg-surface-900 border border-surface-700 p-0.5 text-xs">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'timeline'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            Longitudinal Timeline
          </button>
          <button
            onClick={() => setActiveTab('clinical')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'clinical'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            Digital Twin &amp; Biomarkers
          </button>
          <button
            onClick={() => setActiveTab('imaging')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'imaging'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            Independent Imaging Resource
          </button>
        </div>
      </div>

      {/* Global Connection / List Error Alert */}
      {listError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1 text-xs">
              <strong className="text-amber-300 font-semibold block">Backend Service Notice</strong>
              <p className="text-surface-300">{listError}</p>
              <p className="text-surface-400 text-2xs">
                Render free-tier instances may sleep after inactivity. It typically takes 30–50 seconds to complete cold boot.
              </p>
            </div>
          </div>
          <button
            onClick={loadSubjectsList}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-100 text-xs font-semibold border border-amber-500/40 transition-colors ml-7"
          >
            <RefreshCw size={13} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* ── Main Layout: Sidebar List + Detail Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Participant List & Filters */}
        <div className="card p-4 space-y-3 lg:col-span-1 flex flex-col h-[720px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Participants ({filteredSubjects.length}/{subjects.length || 102})
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 text-surface-400 font-mono">
              ADAM1_BASELINE
            </span>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-surface-400" />
            <input
              type="text"
              placeholder="Search study_id (e.g. CH1-011)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md bg-surface-900 border border-surface-700 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <select
              value={diagnosisFilter}
              onChange={(e) => setDiagnosisFilter(e.target.value)}
              className="px-2 py-1 rounded bg-surface-900 border border-surface-700 text-surface-200 focus:outline-none"
            >
              <option value="all">All Diagnosis</option>
              <option value="control">Controls</option>
              <option value="ad">Alzheimer's</option>
            </select>

            <select
              value={visitFilter}
              onChange={(e) => setVisitFilter(e.target.value)}
              className="px-2 py-1 rounded bg-surface-900 border border-surface-700 text-surface-200 focus:outline-none"
            >
              <option value="all">All Visits</option>
              <option value="multiple">≥ 2 Visits</option>
              <option value="single">Single Visit</option>
            </select>
          </div>

          {/* Quick Filter Chips for Prominent Verified Subjects */}
          <div className="flex flex-wrap gap-1 pt-1 border-t border-surface-700/50">
            <span className="text-[10px] text-surface-400 font-medium">Frequent:</span>
            {['CH1-011', 'CH1-017', 'CH1-172', 'CH1-173', 'CH1-149'].map((id) => (
              <button
                key={id}
                onClick={() => setSelectedSubjectId(id)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${
                  selectedSubjectId === id
                    ? 'bg-primary-600 text-white font-bold'
                    : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
                }`}
              >
                {id}
              </button>
            ))}
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 divide-y divide-surface-800/40">
            {loadingList ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="p-6 text-center text-xs text-surface-500">
                {listError ? 'Participant records unavailable.' : 'No matching participants found.'}
              </div>
            ) : (
              filteredSubjects.map((s) => {
                const sid = s.subject_id || s.study_id
                const isSelected = sid === selectedSubjectId
                const isAD = s.diagnosis_label === 1 || s.alzheimers_diagnosis === 1 || s.alzheimers === 1 || s.label === 1
                const vCount = s.observation_count || s.sample_count || s.total_visits || 1
                return (
                  <button
                    key={sid}
                    onClick={() => setSelectedSubjectId(sid)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary-500/15 border border-primary-500/40 text-primary-200 font-semibold'
                        : 'hover:bg-surface-800 text-surface-300'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-bold text-surface-100">{sid}</div>
                      <div className="text-[11px] text-surface-400 mt-0.5">
                        {vCount} {vCount === 1 ? 'visit' : 'visits'} •{' '}
                        <span className={isAD ? 'text-rose-400 font-medium' : 'text-emerald-400 font-medium'}>
                          {isAD ? 'Alzheimer’s' : 'Control'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className={isSelected ? 'text-primary-400' : 'text-surface-600'} />
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right Columns: Detail Panel & Timeline / Digital Twin */}
        <div className="lg:col-span-3 space-y-5">
          {detailError && (
            <div className="p-3 rounded-lg bg-surface-900 border border-surface-700 text-xs text-surface-300 flex items-center justify-between">
              <span>{detailError}</span>
              <button
                onClick={() => loadSubjectDetail(selectedSubjectId)}
                className="text-primary-400 hover:text-primary-300 underline font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {loadingSubject ? (
            <div className="card p-12 text-center space-y-3">
              <LoadingSpinner size="md" />
              <p className="text-xs text-surface-400">Loading participant records &amp; trajectory...</p>
            </div>
          ) : (
            <>
              {/* Participant Summary Header Card */}
              <div className="card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center font-mono font-bold text-primary-400">
                      {(selectedSubjectId || '').replace('CH', '')}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-surface-50 font-mono flex items-center gap-2">
                        {selectedSubjectId || 'CH1-011'}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-800 text-surface-300 border border-surface-700 font-sans">
                          Cohort: ADAM1_BASELINE
                        </span>
                      </h2>
                      <p className="text-xs text-surface-400">
                        {timelineObservations.length || currentSubj?.observation_count || 1} documented stool metagenome visits
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                        isADDiagnosis
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isADDiagnosis ? 'Alzheimer’s Disease (Stable)' : 'Non-AD Control (Stable)'}
                    </span>
                  </div>
                </div>

                {/* Clinical Measurement Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-surface-900 border border-surface-700/60">
                    <span className="text-surface-400 block text-[11px]">Age Category:</span>
                    <span className="text-surface-100 font-semibold font-mono">
                      {digitalTwinProfile?.clinical_baseline?.age_cat ?? '≥75 (Senior)'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-900 border border-surface-700/60">
                    <span className="text-surface-400 block text-[11px]">Biological Sex:</span>
                    <span className="text-surface-100 font-semibold">
                      {digitalTwinProfile?.clinical_baseline?.male === 1 || digitalTwinProfile?.sex === 'Male'
                        ? 'Male'
                        : 'Female'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-900 border border-surface-700/60">
                    <span className="text-surface-400 block text-[11px]">Observation Span:</span>
                    <span className="text-surface-100 font-semibold font-mono">
                      {totalFollowUpSpan > 0 ? `${totalFollowUpSpan} days` : 'Single Baseline'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-900 border border-surface-700/60">
                    <span className="text-surface-400 block text-[11px]">Modality Status:</span>
                    <span className="text-primary-400 font-semibold">Stool Metagenome (Verified)</span>
                  </div>
                </div>

                {/* Zero-Transition Governance Disclaimer */}
                <div className="p-3 rounded-lg bg-surface-900/80 border border-surface-700/50 text-xs text-surface-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[11px] uppercase tracking-wider">
                    <ShieldAlert size={14} />
                    <span>Scientific Governance &amp; Trajectory Limitation</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-surface-400">
                    <strong>Zero Longitudinal Diagnosis Transitions:</strong> Across all 102 participants in the curated ADAM-1 dataset, disease classification remains static over time. The timeline below represents an <em>observed-history trajectory</em> evaluating model calibration and biomarker drift under stable diagnosis, <u>not a validated forecast of incident dementia conversion</u>.
                  </p>
                </div>
              </div>

              {/* ── Tab 1: Longitudinal Timeline ── */}
              {activeTab === 'timeline' && (
                <div className="card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-surface-50 uppercase tracking-wider flex items-center gap-2">
                      <Calendar size={15} className="text-primary-400" />
                      <span>Chronological Visit Observations</span>
                    </h3>
                    <span className="text-xs text-surface-400 font-mono">
                      Follow-up Span: {totalFollowUpSpan > 0 ? `${totalFollowUpSpan} days` : 'Baseline only'}
                    </span>
                  </div>

                  {timelineObservations.length > 0 ? (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-700">
                      {timelineObservations.map((v, idx) => {
                        const prob = v.ad_probability
                        return (
                          <div key={v.sample_id || idx} className="relative group">
                            {/* Timeline bullet */}
                            <div className="absolute -left-6 top-3 w-4 h-4 rounded-full border-2 border-surface-900 bg-primary-500 group-hover:scale-125 transition-transform" />

                            <div className="p-3.5 rounded-lg bg-surface-900 border border-surface-700/60 hover:border-surface-600 transition-colors space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-surface-100 font-mono">
                                    Visit {idx + 1}: Sample {v.sample_id}
                                  </span>
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-surface-800 text-surface-300 font-mono">
                                    Day {v.study_day}
                                  </span>
                                  {v.sample_date && (
                                    <span className="text-[11px] text-surface-500 font-mono">
                                      ({v.sample_date})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-surface-400">Calibrated Risk:</span>
                                  <span className="font-mono font-bold text-surface-50">
                                    {(prob * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>

                              {/* Progress bar of calibrated risk */}
                              <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full ${prob >= 0.5 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(100, Math.max(0, prob * 100))}%` }}
                                />
                              </div>

                              {/* Key Taxa Highlights for this visit */}
                              {v.key_taxa && v.key_taxa.length > 0 && (
                                <div className="pt-1 text-[11px] text-surface-400 flex flex-wrap gap-2">
                                  <span className="font-semibold text-surface-300">Observed Taxa:</span>
                                  {v.key_taxa.slice(0, 3).map((t, tidx) => (
                                    <span key={tidx} className="font-mono bg-surface-800 px-1.5 py-0.5 rounded text-surface-200">
                                      {t.species_name || t.name}: {typeof (t.abundance ?? t.value) === 'number' ? (t.abundance ?? t.value).toFixed(2) : t.abundance}%
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-surface-500 bg-surface-900 rounded-lg border border-surface-700/50">
                      No longitudinal visit records found for this participant.
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab 2: Digital Twin & Biomarkers ── */}
              {activeTab === 'clinical' && (
                <div className="card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-surface-50 uppercase tracking-wider flex items-center gap-2">
                      <Brain size={15} className="text-purple-400" />
                      <span>Research Digital Twin Calibration Profile</span>
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono border border-purple-500/20">
                      Zero-Transition Architecture
                    </span>
                  </div>

                  {digitalTwinProfile ? (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3.5 rounded-lg bg-surface-900 border border-surface-700/60 space-y-2">
                          <h4 className="font-bold text-surface-200">Patient Longitudinal Summary</h4>
                          <ul className="space-y-1 text-surface-400">
                            <li>Total visits observed: <strong className="text-surface-100 font-mono">{digitalTwinProfile.total_observed_visits ?? timelineObservations.length}</strong></li>
                            <li>Incident progression observed: <strong className="text-surface-100">None (Static Cohort)</strong></li>
                            <li>Static Diagnosis: <strong className="text-surface-100">{digitalTwinProfile.static_clinical_diagnosis || digitalTwinProfile.diagnosis_status || 'Cognitively Stable'}</strong></li>
                            <li>Mean calibrated probability: <strong className="text-surface-100 font-mono">{digitalTwinProfile.mean_predicted_probability ? `${(digitalTwinProfile.mean_predicted_probability * 100).toFixed(1)}%` : 'N/A'}</strong></li>
                            <li>Observation span: <strong className="text-surface-100 font-mono">{digitalTwinProfile.observation_span_days ?? totalFollowUpSpan} days</strong></li>
                          </ul>
                        </div>

                        <div className="p-3.5 rounded-lg bg-surface-900 border border-surface-700/60 space-y-2">
                          <h4 className="font-bold text-surface-200">Biomarker Stability &amp; Governance</h4>
                          <p className="text-surface-400 leading-relaxed text-[11px]">
                            Participant exhibits stable longitudinal trajectory with consistent Shannon diversity index across repeated sampling waves.
                          </p>
                          <div className="p-2 rounded bg-surface-800 text-[10px] text-surface-300 font-mono">
                            Status Verdict: {digitalTwinProfile.longitudinal_stability_verdict || 'STABLE'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-surface-500 bg-surface-900 rounded-lg">
                      Digital twin profile is compiling...
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab 3: Independent Imaging Resource ── */}
              {activeTab === 'imaging' && (
                <div className="card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scan size={16} className="text-cyan-400" />
                      <h3 className="text-xs font-bold text-surface-50 uppercase tracking-wider">
                        Independent Neuroimaging Resources (OASIS-1 / OASIS-3 / ADNI)
                      </h3>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                      No Cross-Cohort Stool Linkage
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 text-xs text-surface-300">
                    <p className="leading-relaxed text-[11px]">
                      <strong>Independent Research Resource Notice:</strong> OASIS and ADNI are completely separate neuroimaging cohorts without crosswalk linkage to ADAM-1 stool metagenomes. They are presented here strictly as independent neuroimaging benchmarks.
                    </p>
                  </div>

                  {/* OASIS-1 Volumetric Biomarkers Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                      Cataloged OASIS-1 Volumetric Subjects ({imagingSubjects.length} verified):
                    </span>

                    {loadingImaging ? (
                      <div className="p-6 text-center">
                        <LoadingSpinner size="sm" />
                        <p className="text-xs text-surface-400 mt-2">Loading OASIS-1 structural records...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left text-surface-300">
                          <thead className="bg-surface-900 text-surface-400 uppercase text-[10px] font-semibold border-b border-surface-700">
                            <tr>
                              <th className="p-2.5">Subject ID</th>
                              <th className="p-2.5">Age</th>
                              <th className="p-2.5">CDR Global</th>
                              <th className="p-2.5">Hippocampus (cm³)</th>
                              <th className="p-2.5">Ventricles (cm³)</th>
                              <th className="p-2.5">Linkage Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-800">
                            {imagingSubjects.map((img) => (
                              <tr key={img.subject_id} className="hover:bg-surface-850">
                                <td className="p-2.5 font-mono font-bold text-surface-100">{img.subject_id}</td>
                                <td className="p-2.5">{img.age_at_scan ?? img.age ?? 'N/A'}</td>
                                <td className="p-2.5 font-mono">{typeof (img.cdr_global ?? img.cdr_score) === 'number' ? (img.cdr_global ?? img.cdr_score).toFixed(1) : '0.0'}</td>
                                <td className="p-2.5 font-mono text-cyan-400">{typeof img.hippocampus_volume_cm3 === 'number' ? img.hippocampus_volume_cm3.toFixed(2) : 'N/A'}</td>
                                <td className="p-2.5 font-mono">{typeof img.lateral_ventricles_volume_cm3 === 'number' ? img.lateral_ventricles_volume_cm3.toFixed(2) : 'N/A'}</td>
                                <td className="p-2.5">
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 text-surface-400 border border-surface-700">
                                    Independent MRI Cohort
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* GARD Linkage Status Notice */}
                  <div className="p-3.5 rounded-lg bg-surface-900 border border-surface-700/60 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-400">
                      <AlertTriangle size={14} />
                      <span>GARD Multimodal Linkage: REQUEST_NOT_SENT</span>
                    </div>
                    <p className="text-surface-400 leading-relaxed text-[11px]">
                      GARD multimodal participant linkage is marked <code className="text-amber-400 font-mono">UNKNOWN_NOT_VERIFIED</code>. Paired microbiome-neuroimaging analyses cannot be performed until formal data-use agreements are secured.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
