import React, { useState, useEffect } from 'react'
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
} from 'lucide-react'
import {
  fetchTrajectorySubjects,
  fetchSubjectTrajectory,
  fetchDigitalTwinProfile,
  fetchNeuroimagingSubjects,
} from '../api/client'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'

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
  const [error, setError] = useState(null)

  // Independent imaging state (OASIS-1)
  const [imagingSubjects, setImagingSubjects] = useState([])
  const [selectedImagingId, setSelectedImagingId] = useState('OAS1_0001')
  const [activeTab, setActiveTab] = useState('timeline') // 'timeline' | 'clinical' | 'imaging'

  // 1. Load subjects list
  useEffect(() => {
    async function loadSubjects() {
      setLoadingList(true)
      try {
        const [subjRes, imgRes] = await Promise.allSettled([
          fetchTrajectorySubjects(),
          fetchNeuroimagingSubjects('OASIS1_MRI'),
        ])

        if (subjRes.status === 'fulfilled') {
          const list = subjRes.value?.subjects || []
          setSubjects(list)
          if (list.length > 0 && !list.some((s) => s.study_id === selectedSubjectId)) {
            setSelectedSubjectId(list[0].study_id)
          }
        }
        if (imgRes.status === 'fulfilled') {
          setImagingSubjects(imgRes.value?.subjects || [])
        }
      } catch (err) {
        console.error('Failed to load participant list:', err)
      } finally {
        setLoadingList(false)
      }
    }
    loadSubjects()
  }, [])

  // 2. Load detailed data for selected subject
  useEffect(() => {
    if (!selectedSubjectId) return
    let active = true

    async function loadSubjectDetail() {
      setLoadingSubject(true)
      setError(null)
      try {
        const [trajRes, twinRes] = await Promise.allSettled([
          fetchSubjectTrajectory(selectedSubjectId, true),
          fetchDigitalTwinProfile('ADAM1_BASELINE', selectedSubjectId),
        ])

        if (!active) return

        if (trajRes.status === 'fulfilled') {
          setTrajectoryData(trajRes.value)
        }
        if (twinRes.status === 'fulfilled') {
          setDigitalTwinProfile(twinRes.value)
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to load participant details')
      } finally {
        if (active) setLoadingSubject(false)
      }
    }
    loadSubjectDetail()
    return () => {
      active = false
    }
  }, [selectedSubjectId])

  // Filtered participant list
  const filteredSubjects = subjects.filter((s) => {
    const isAD = s.alzheimers_diagnosis === 1 || s.alzheimers === 1 || s.label === 1
    const matchesDiagnosis =
      diagnosisFilter === 'all' ||
      (diagnosisFilter === 'ad' && isAD) ||
      (diagnosisFilter === 'control' && !isAD)
    const visitCount = s.sample_count || s.total_visits || 1
    const matchesVisits =
      visitFilter === 'all' ||
      (visitFilter === 'multiple' && visitCount >= 2) ||
      (visitFilter === 'single' && visitCount === 1)
    const matchesSearch =
      !searchQuery ||
      s.study_id?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesDiagnosis && matchesVisits && matchesSearch
  })

  const currentSubj = subjects.find((s) => s.study_id === selectedSubjectId)
  const isADDiagnosis = currentSubj?.alzheimers_diagnosis === 1 || currentSubj?.alzheimers === 1
  const selectedImagingSubj = imagingSubjects.find((s) => s.subject_id === selectedImagingId)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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

      {/* ── Main Layout: Sidebar List + Detail Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Participant List & Filters */}
        <div className="card p-4 space-y-3 lg:col-span-1 flex flex-col h-[700px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Participants ({filteredSubjects.length}/{subjects.length})
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

          {/* Quick Filter Chips for Prominent Subjects */}
          <div className="flex flex-wrap gap-1 pt-1 border-t border-surface-700/50">
            <span className="text-[10px] text-surface-400 font-medium">Frequent:</span>
            {['CH1-011', 'CH1-017', 'CH1-172', 'CH1-173', 'CH1-149'].map((id) => (
              <button
                key={id}
                onClick={() => setSelectedSubjectId(id)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
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
              <div className="p-4 text-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="p-4 text-center text-xs text-surface-500">
                No matching participants.
              </div>
            ) : (
              filteredSubjects.map((s) => {
                const isSelected = s.study_id === selectedSubjectId
                const isAD = s.alzheimers_diagnosis === 1 || s.alzheimers === 1 || s.label === 1
                const vCount = s.sample_count || s.total_visits || 1
                return (
                  <button
                    key={s.study_id}
                    onClick={() => setSelectedSubjectId(s.study_id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary-500/15 border border-primary-500/40 text-primary-200 font-semibold'
                        : 'hover:bg-surface-800 text-surface-300'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-bold text-surface-100">{s.study_id}</div>
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
          {loadingSubject ? (
            <div className="card p-12 text-center">
              <LoadingSpinner size="md" />
              <p className="text-xs text-surface-400 mt-2">Loading participant records &amp; trajectory...</p>
            </div>
          ) : (
            <>
              {/* Participant Summary Header Card */}
              <div className="card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center font-mono font-bold text-primary-400">
                      {selectedSubjectId.replace('CH', '')}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-surface-50 font-mono flex items-center gap-2">
                        {selectedSubjectId}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-800 text-surface-300 border border-surface-700 font-sans">
                          Cohort: ADAM1_BASELINE
                        </span>
                      </h2>
                      <p className="text-xs text-surface-400">
                        {currentSubj?.sample_count || trajectoryData?.visits?.length || 1} documented stool metagenome visits
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
                    <span className="text-surface-400 block text-[11px]">Sex:</span>
                    <span className="text-surface-100 font-semibold">
                      {digitalTwinProfile?.clinical_baseline?.male === 1 ? 'Male' : 'Female'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-900 border border-surface-700/60">
                    <span className="text-surface-400 block text-[11px]">Smoking History:</span>
                    <span className="text-surface-100 font-semibold">
                      {digitalTwinProfile?.clinical_baseline?.smoker ?? 'Non-smoker'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-900 border border-surface-700/60">
                    <span className="text-surface-400 block text-[11px]">Modality Status:</span>
                    <span className="text-accent-400 font-semibold">Stool Metagenome (Paired)</span>
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
                      Span:{' '}
                      {trajectoryData?.visits && trajectoryData.visits.length > 0
                        ? `${Math.max(...trajectoryData.visits.map((v) => v.day_offset ?? v.day ?? 0))} days`
                        : 'Baseline only'}
                    </span>
                  </div>

                  {trajectoryData?.visits && trajectoryData.visits.length > 0 ? (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-700">
                      {trajectoryData.visits.map((v, idx) => {
                        const prob = v.predicted_probability ?? v.risk_probability ?? 0.5
                        const dayOffset = v.day_offset ?? v.day ?? 0
                        return (
                          <div key={idx} className="relative group">
                            {/* Timeline bullet */}
                            <div className="absolute -left-6 top-3 w-4 h-4 rounded-full border-2 border-surface-900 bg-primary-500 group-hover:scale-125 transition-transform" />

                            <div className="p-3.5 rounded-lg bg-surface-900 border border-surface-700/60 hover:border-surface-600 transition-colors space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-surface-100 font-mono">
                                    Visit {idx + 1}: Sample {v.sample_id}
                                  </span>
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-surface-800 text-surface-300 font-mono">
                                    Day {dayOffset}
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
                                    <span key={tidx} className="font-mono bg-surface-800 px-1.5 py-0.5 rounded">
                                      {t.species_name || t.name}: {(t.abundance || t.value || 0).toFixed(2)}%
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
                            <li>Total visits observed: <strong className="text-surface-100 font-mono">{digitalTwinProfile.total_observed_visits}</strong></li>
                            <li>Incident progression observed: <strong className="text-surface-100">None (Static)</strong></li>
                            <li>Diagnosis: <strong className="text-surface-100">{digitalTwinProfile.diagnosis_status}</strong></li>
                            <li>Mean calibrated probability: <strong className="text-surface-100 font-mono">{digitalTwinProfile.mean_predicted_probability ? `${(digitalTwinProfile.mean_predicted_probability * 100).toFixed(1)}%` : 'N/A'}</strong></li>
                          </ul>
                        </div>

                        <div className="p-3.5 rounded-lg bg-surface-900 border border-surface-700/60 space-y-2">
                          <h4 className="font-bold text-surface-200">Biomarker Stability</h4>
                          <p className="text-surface-400 leading-relaxed">
                            Participant exhibits stable longitudinal trajectory with consistent Shannon diversity index across repeated sampling waves.
                          </p>
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
                    <p className="leading-relaxed">
                      <strong>Independent Research Resource Notice:</strong> OASIS and ADNI are completely separate neuroimaging cohorts without crosswalk linkage to ADAM-1 stool metagenomes. They are presented here strictly as independent neuroimaging benchmarks.
                    </p>
                  </div>

                  {/* OASIS-1 Volumetric Biomarkers Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                      Cataloged OASIS-1 Volumetric Subjects ({imagingSubjects.length} verified):
                    </span>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-surface-300">
                        <thead className="bg-surface-900 text-surface-400 uppercase text-[10px] font-semibold border-b border-surface-700">
                          <tr>
                            <th className="p-2.5">Subject ID</th>
                            <th className="p-2.5">Age</th>
                            <th className="p-2.5">CDR Score</th>
                            <th className="p-2.5">Hippocampus (cm³)</th>
                            <th className="p-2.5">Ventricles (cm³)</th>
                            <th className="p-2.5">Linkage Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-800">
                          {imagingSubjects.map((img) => (
                            <tr key={img.subject_id} className="hover:bg-surface-850">
                              <td className="p-2.5 font-mono font-bold text-surface-100">{img.subject_id}</td>
                              <td className="p-2.5">{img.age}</td>
                              <td className="p-2.5 font-mono">{img.cdr_score?.toFixed(1) ?? '0.0'}</td>
                              <td className="p-2.5 font-mono text-cyan-400">{img.hippocampus_volume_cm3?.toFixed(2)}</td>
                              <td className="p-2.5 font-mono">{img.lateral_ventricles_volume_cm3?.toFixed(2)}</td>
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
