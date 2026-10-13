import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  FlaskConical,
  Database,
  TrendingUp,
  Scan,
  ShieldAlert,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Clock,
  BookOpen,
  XCircle,
} from 'lucide-react'
import {
  fetchResearchDatasets,
  fetchBenchmarkRuns,
  fetchCrosswalkAudit,
  fetchNeuroimagingSubjects,
  fetchModalityComparison,
  fetchGardStatus,
} from '../api/client'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'

export default function ResearchValidation() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'datasets'
  const [activeTab, setActiveTab] = useState(initialTab) // 'datasets' | 'benchmarks' | 'neuroimaging' | 'linkage'

  // Datasets state
  const [datasets, setDatasets] = useState([])
  const [datasetSearch, setDatasetSearch] = useState('')
  const [selectedDataset, setSelectedDataset] = useState(null)

  // Benchmarks state
  const [benchmarkRuns, setBenchmarkRuns] = useState([])
  const [benchmarkFilter, setBenchmarkFilter] = useState('all') // 'all' | 'local' | 'exploratory' | 'literature' | 'not_run'

  // Neuroimaging state
  const [neuroSubjects, setNeuroSubjects] = useState([])
  const [modalityComps, setModalityComps] = useState([])

  // Linkage state
  const [crosswalkAudits, setCrosswalkAudits] = useState([])
  const [gardStatus, setGardStatus] = useState(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sync tab with URL query parameter
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  useEffect(() => {
    async function loadResearchData() {
      setLoading(true)
      try {
        const [dsRes, runsRes, crossRes, neuroRes, modRes, gardRes] = await Promise.allSettled([
          fetchResearchDatasets(),
          fetchBenchmarkRuns(),
          fetchCrosswalkAudit(),
          fetchNeuroimagingSubjects('OASIS1_MRI'),
          fetchModalityComparison(),
          fetchGardStatus(),
        ])

        if (dsRes.status === 'fulfilled') setDatasets(dsRes.value?.datasets || [])
        if (runsRes.status === 'fulfilled') setBenchmarkRuns(runsRes.value?.runs || [])
        if (crossRes.status === 'fulfilled') setCrosswalkAudits(crossRes.value?.audits || [])
        if (neuroRes.status === 'fulfilled') setNeuroSubjects(neuroRes.value?.subjects || [])
        if (modRes.status === 'fulfilled') setModalityComps(modRes.value?.comparisons || [])
        if (gardRes.status === 'fulfilled') setGardStatus(gardRes.value)
      } catch (err) {
        setError('Failed to load research infrastructure telemetry.')
      } finally {
        setLoading(false)
      }
    }
    loadResearchData()
  }, [])

  // Filtered datasets
  const filteredDatasets = datasets.filter((d) => {
    return (
      !datasetSearch ||
      d.name?.toLowerCase().includes(datasetSearch.toLowerCase()) ||
      d.dataset_id?.toLowerCase().includes(datasetSearch.toLowerCase()) ||
      d.accession?.toLowerCase().includes(datasetSearch.toLowerCase())
    )
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Page Header ── */}
      <div className="border-b border-surface-700/60 pb-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-surface-50 flex items-center gap-2">
            <FlaskConical size={22} className="text-purple-400" />
            <span>Research Infrastructure &amp; Scientific Validation</span>
          </h1>
          <p className="text-xs text-surface-400 mt-0.5">
            Independent dataset registry, cross-cohort benchmark ledgers, neuroimaging resources, and data linkage gates.
          </p>
        </div>

        {/* 4 Internal Tabs */}
        <div className="flex rounded-lg bg-surface-900 border border-surface-700 p-0.5 text-xs">
          <button
            onClick={() => handleTabChange('datasets')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'datasets'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Database size={13} />
            <span>Datasets</span>
          </button>
          <button
            onClick={() => handleTabChange('benchmarks')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'benchmarks'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <TrendingUp size={13} />
            <span>Benchmarks</span>
          </button>
          <button
            onClick={() => handleTabChange('neuroimaging')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'neuroimaging'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <Scan size={13} />
            <span>Neuroimaging</span>
          </button>
          <button
            onClick={() => handleTabChange('linkage')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'linkage'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            }`}
          >
            <ShieldAlert size={13} />
            <span>Data Linkage &amp; Integrity</span>
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="card p-12 text-center">
          <LoadingSpinner size="md" />
          <p className="text-xs text-surface-400 mt-2">Loading research registry and benchmark ledgers...</p>
        </div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════════
              TAB 1: DATASETS REGISTRY
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'datasets' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-surface-400" />
                  <input
                    type="text"
                    placeholder="Search datasets or accessions..."
                    value={datasetSearch}
                    onChange={(e) => setDatasetSearch(e.target.value)}
                    className="text-xs pl-8 pr-3 py-1.5 rounded-md bg-surface-900 border border-surface-700 text-surface-100 placeholder-surface-500 w-64 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <span className="text-xs text-surface-400 font-mono">
                  Showing {filteredDatasets.length} of {datasets.length} cataloged cohorts
                </span>
              </div>

              {/* Datasets Table */}
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-surface-300">
                    <thead className="bg-surface-900 text-surface-400 uppercase text-[10px] font-semibold border-b border-surface-700">
                      <tr>
                        <th className="p-3">Dataset Name &amp; ID</th>
                        <th className="p-3">Accession</th>
                        <th className="p-3">Modalities</th>
                        <th className="p-3">Verified Cohort Size</th>
                        <th className="p-3">Access Status</th>
                        <th className="p-3">Local Download</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                      {filteredDatasets.map((ds) => {
                        const isVerifiedLocal = ds.dataset_id === 'ADAM1_BASELINE'
                        return (
                          <tr key={ds.dataset_id} className="hover:bg-surface-850">
                            <td className="p-3">
                              <div className="font-bold text-surface-100">{ds.name}</div>
                              <div className="font-mono text-[10px] text-surface-400">{ds.dataset_id}</div>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-surface-300">
                              {ds.accession || 'N/A'}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {(ds.modalities || []).map((m, idx) => (
                                  <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 text-surface-300">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 font-mono text-[11px]">
                              {isVerifiedLocal ? (
                                <span className="text-emerald-400 font-bold">
                                  335 samples / 102 subj
                                </span>
                              ) : (
                                <span className="text-surface-400">
                                  {ds.enrolled_participants ? `${ds.enrolled_participants} subj (cataloged)` : 'Pending access'}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                  isVerifiedLocal
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : ds.access_status === 'CONTROLLED_ACCESS'
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {ds.access_status?.replace(/_/g, ' ') || 'UNKNOWN'}
                              </span>
                            </td>
                            <td className="p-3">
                              {isVerifiedLocal ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                                  <CheckCircle2 size={12} /> Local Verified
                                </span>
                              ) : (
                                <span className="text-surface-500 text-[11px] flex items-center gap-1">
                                  <Lock size={11} /> Not Downloaded
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => setSelectedDataset(selectedDataset?.dataset_id === ds.dataset_id ? null : ds)}
                                className="text-purple-400 hover:text-purple-300 font-semibold text-[11px]"
                              >
                                {selectedDataset?.dataset_id === ds.dataset_id ? 'Hide' : 'Details'}
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Details Drawer */}
                {selectedDataset && (
                  <div className="p-4 bg-surface-900/90 border-t border-surface-700/80 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-surface-100 flex items-center gap-2">
                        <span>Cohort Provenance: {selectedDataset.name}</span>
                        <span className="font-mono text-[10px] text-surface-400">({selectedDataset.dataset_id})</span>
                      </h4>
                      <button
                        onClick={() => setSelectedDataset(null)}
                        className="text-surface-400 hover:text-surface-200 text-xs"
                      >
                        Close
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-surface-300 text-[11px]">
                      <div>
                        <strong className="text-surface-400 block">Repository / Source URL:</strong>
                        {selectedDataset.source_url ? (
                          <a
                            href={selectedDataset.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:underline flex items-center gap-1"
                          >
                            <span>{selectedDataset.source_url}</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          'Local Research File System'
                        )}
                      </div>
                      <div>
                        <strong className="text-surface-400 block">Permitted Research Use:</strong>
                        <span>{selectedDataset.permitted_use || 'Non-commercial academic research'}</span>
                      </div>
                      <div>
                        <strong className="text-surface-400 block">Experiment Eligibility:</strong>
                        <span className={selectedDataset.dataset_id === 'ADAM1_BASELINE' ? 'text-emerald-400' : 'text-amber-400'}>
                          {selectedDataset.dataset_id === 'ADAM1_BASELINE' ? 'Eligible for Empirical Training' : 'Requires Raw Data Ingestion'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-surface-400 pt-2 border-t border-surface-800">
                      <strong>Reconciliation Notes:</strong>{' '}
                      {selectedDataset.audit_reconciliation_notes ||
                        'Dataset cataloged in accordance with the ADAM-1 research evidence registry.'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 2: BENCHMARKS LEDGER
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'benchmarks' && (
            <div className="space-y-6">
              {/* Category 1: Local Verified Experiments */}
              <div className="card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-700/60 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-bold text-surface-50">
                      Local Experiments (Verified on Authentic Local CSV Records)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    STATUS: REPRODUCED_AND_VERIFIED
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg bg-surface-900 border border-surface-700/60 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-xs text-surface-100 font-mono">
                        BENCH_001_ADAM1_INTERNAL_XGB — Primary Internal Validation
                      </span>
                      <span className="text-[11px] text-surface-400">
                        1,044 Features (940 Microbiome + 99 Clinical Covariates + 3 Demographic + 1 Day + 1 Hopsn)
                      </span>
                    </div>

                    {/* Both Sample-Level AND Participant-Level Endpoints Explicitly Separated */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {/* Sample-Level Endpoint */}
                      <div className="p-3 rounded-lg bg-surface-950/60 border border-surface-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-accent-400">1. Sample-Level Primary Endpoint</span>
                          <span className="font-mono text-surface-400">73 test samples</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-surface-400 text-[11px]">Accuracy:</span>{' '}
                            <strong className="text-surface-100 font-mono">82.19% (60/73)</strong>
                          </div>
                          <div>
                            <span className="text-surface-400 text-[11px]">ROC-AUC:</span>{' '}
                            <strong className="text-surface-100 font-mono">0.8813</strong>
                          </div>
                          <div>
                            <span className="text-surface-400 text-[11px]">Sensitivity:</span>{' '}
                            <strong className="text-surface-100 font-mono">69.23% (18/26)</strong>
                          </div>
                          <div>
                            <span className="text-surface-400 text-[11px]">Specificity:</span>{' '}
                            <strong className="text-surface-100 font-mono">89.36% (42/47)</strong>
                          </div>
                          <div>
                            <span className="text-surface-400 text-[11px]">Precision:</span>{' '}
                            <strong className="text-surface-100 font-mono">78.26% (18/23)</strong>
                          </div>
                          <div>
                            <span className="text-surface-400 text-[11px]">F1-Score:</span>{' '}
                            <strong className="text-surface-100 font-mono">73.47%</strong>
                          </div>
                        </div>
                        <div className="text-[10px] text-surface-500 pt-1 border-t border-surface-800">
                          95% Cluster-Bootstrap CIs (1,000 iter): Acc [0.6667, 0.9351], AUC [0.6948, 0.9733]
                        </div>
                      </div>

                      {/* Participant-Level Endpoint */}
                      <div className="p-3 rounded-lg bg-surface-950/60 border border-surface-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-primary-400">2. Participant-Level Endpoint</span>
                          <span className="font-mono text-surface-400">21 unique subjects</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-surface-400 text-[11px]">Accuracy:</span>{' '}
                            <strong className="text-surface-100 font-mono">76.19% (16/21)</strong>
                          </div>
                          <div>
                            <span className="text-surface-400 text-[11px]">ROC-AUC:</span>{' '}
                            <strong className="text-surface-100 font-mono">0.7404</strong>
                          </div>
                          <div>
                            <span className="text-surface-400 text-[11px]">Sensitivity:</span>{' '}
                            <strong className="text-surface-100 font-mono">62.50% (5/8)</strong>
                          </div>
                          <div>
                            <span className="text-surface-400 text-[11px]">Specificity:</span>{' '}
                            <strong className="text-surface-100 font-mono">84.62% (11/13)</strong>
                          </div>
                          <div>
                            <span className="text-surface-400 text-[11px]">Balanced Acc:</span>{' '}
                            <strong className="text-surface-100 font-mono">73.56%</strong>
                          </div>
                          <div>
                            <span className="text-surface-400 text-[11px]">Precision:</span>{' '}
                            <strong className="text-surface-100 font-mono">71.43% (5/7)</strong>
                          </div>
                        </div>
                        <div className="text-[10px] text-surface-500 pt-1 border-t border-surface-800 font-mono">
                          Confusion Matrix: [[11, 2], [3, 5]] • 95% Bootstrap CI: Acc [0.5714, 0.9524]
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-surface-950 text-[11px] text-surface-400">
                      <strong>Supplementary Balanced Subsample:</strong> 30 samples drawn with seed 42 (15 AD + 15 Control from 16 of the same 21 subjects) achieved 80.00% accuracy and 0.8889 ROC-AUC. Disclosed as a supplementary subset of the same participants, not an independent cohort.
                    </div>
                  </div>
                </div>
              </div>

              {/* Category 2: Retrospective Exploratory Analyses */}
              <div className="card p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-700/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-sky-400" />
                    <h3 className="text-sm font-bold text-surface-50">
                      Retrospective Exploratory Analyses (Reusing Same 73 Held-Out Samples)
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    STATUS: RETROSPECTIVE_EXPLORATORY
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 text-xs text-surface-300">
                  <p className="leading-relaxed">
                    <strong>Chronology Disclosure:</strong> These models were evaluated retrospectively on the existing held-out test set after primary results were known. They do not constitute pre-specified confirmatory proof of modality superiority.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-surface-300">
                    <thead className="bg-surface-900 text-surface-400 uppercase text-[10px] font-semibold border-b border-surface-700">
                      <tr>
                        <th className="p-2.5">Model Variant</th>
                        <th className="p-2.5">Features</th>
                        <th className="p-2.5">Sample Acc</th>
                        <th className="p-2.5">Sample AUC</th>
                        <th className="p-2.5">Participant Acc</th>
                        <th className="p-2.5">Participant AUC</th>
                        <th className="p-2.5">Scientific Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                      <tr className="hover:bg-surface-850">
                        <td className="p-2.5 font-bold text-surface-100">Pure Microbiome-Only</td>
                        <td className="p-2.5 font-mono">940</td>
                        <td className="p-2.5 font-mono">72.60%</td>
                        <td className="p-2.5 font-mono">0.7619</td>
                        <td className="p-2.5 font-mono">71.43%</td>
                        <td className="p-2.5 font-mono">0.6635</td>
                        <td className="p-2.5 text-surface-400 text-[11px]">MetaPhlAn relative abundances alone</td>
                      </tr>
                      <tr className="hover:bg-surface-850">
                        <td className="p-2.5 font-bold text-surface-100">Clinical/Demographic-Only</td>
                        <td className="p-2.5 font-mono">104</td>
                        <td className="p-2.5 font-mono">64.38%</td>
                        <td className="p-2.5 font-mono">0.7823</td>
                        <td className="p-2.5 font-mono">57.14%</td>
                        <td className="p-2.5 font-mono">0.5962</td>
                        <td className="p-2.5 text-surface-400 text-[11px]">Host frailty, medications, age category</td>
                      </tr>
                      <tr className="hover:bg-surface-850">
                        <td className="p-2.5 font-bold text-surface-100">Ablation: Excluding Visit Day</td>
                        <td className="p-2.5 font-mono">1,043</td>
                        <td className="p-2.5 font-mono">82.19%</td>
                        <td className="p-2.5 font-mono">0.8813</td>
                        <td className="p-2.5 font-mono">76.19%</td>
                        <td className="p-2.5 font-mono">0.7404</td>
                        <td className="p-2.5 text-surface-400 text-[11px]">Bitwise identical (day not used in tree splits)</td>
                      </tr>
                      <tr className="hover:bg-surface-850">
                        <td className="p-2.5 font-bold text-surface-100">Ablation: Excluding Facility (hopsn)</td>
                        <td className="p-2.5 font-mono">1,043</td>
                        <td className="p-2.5 font-mono">82.19%</td>
                        <td className="p-2.5 font-mono">0.8813</td>
                        <td className="p-2.5 font-mono">76.19%</td>
                        <td className="p-2.5 font-mono">0.7404</td>
                        <td className="p-2.5 text-surface-400 text-[11px]">Bitwise identical (hopsn not used in tree splits)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Category 3: External Validation & Literature References */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* External Validation (Not Run) */}
                <div className="card p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-700/60 pb-2">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      External Validation Runs (Local Data Not Downloaded)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                      NOT_RUN
                    </span>
                  </div>
                  <ul className="text-xs text-surface-400 space-y-2">
                    <li>
                      <strong className="text-surface-200">BENCH_002 (AlzBiom Unchanged):</strong> Metrics marked <code className="text-amber-400 font-mono">None</code>. Awaiting raw FASTQ sequence download.
                    </li>
                    <li>
                      <strong className="text-surface-200">BENCH_003 (AlzBiom Retrained):</strong> Metrics marked <code className="text-amber-400 font-mono">None</code>. Local pipeline pending data ingestion.
                    </li>
                    <li>
                      <strong className="text-surface-200">BENCH_004 (Chinese Cohort):</strong> Metrics marked <code className="text-amber-400 font-mono">None</code>. Fastq data access required.
                    </li>
                  </ul>
                </div>

                {/* Published Literature References */}
                <div className="card p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-surface-700/60 pb-2">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                      Published Literature References (Attributed)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                      CITED_LITERATURE
                    </span>
                  </div>
                  <ul className="text-xs text-surface-400 space-y-2">
                    <li>
                      <strong className="text-surface-200">AlzBiom Cross-Sectional (PRJEB47976):</strong> Published taxonomic AUROC 0.76 (training) / 0.61 (validation).
                    </li>
                    <li>
                      <strong className="text-surface-200">AlzBiom MCI Conversion (PRJEB72198):</strong> Published AUROC 0.87 (baseline), 0.92 (1yr), 0.95 (4yr) taxonomic; 0.96/0.96/0.97 ensemble.
                    </li>
                    <li>
                      <strong className="text-surface-200">Structural MRI / PET (OASIS / ADNI):</strong> Published literature benchmarks 86.5% MRI acc, 91.4% PET acc.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 3: NEUROIMAGING RESOURCES
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'neuroimaging' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-surface-900 border border-surface-700/60 text-xs text-surface-300 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Scan size={14} />
                  <span>Independent Imaging Research Cohorts</span>
                </div>
                <p className="text-[11px] text-surface-400 leading-relaxed">
                  OASIS-1, OASIS-3, and ADNI are independent neuroimaging cohorts. Volumetric measurements (Hippocampus, Lateral Ventricles, Total Intracranial Volume) are retrieved from cataloged baseline records. Stool metagenomics are not linked to these participants.
                </p>
              </div>

              <div className="card p-5 space-y-4">
                <h3 className="text-xs font-bold text-surface-50 uppercase tracking-wider">
                  OASIS-1 Structural Volumetric Biomarkers ({neuroSubjects.length} verified records):
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-surface-300">
                    <thead className="bg-surface-900 text-surface-400 uppercase text-[10px] font-semibold border-b border-surface-700">
                      <tr>
                        <th className="p-2.5">Subject ID</th>
                        <th className="p-2.5">Age</th>
                        <th className="p-2.5">Sex</th>
                        <th className="p-2.5">CDR Score</th>
                        <th className="p-2.5">Hippocampus (cm³)</th>
                        <th className="p-2.5">Ventricles (cm³)</th>
                        <th className="p-2.5">eTIV (cm³)</th>
                        <th className="p-2.5">Field Strength</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                      {neuroSubjects.map((s) => (
                        <tr key={s.subject_id} className="hover:bg-surface-850">
                          <td className="p-2.5 font-mono font-bold text-surface-100">{s.subject_id}</td>
                          <td className="p-2.5">{s.age}</td>
                          <td className="p-2.5">{s.gender}</td>
                          <td className="p-2.5 font-mono">{s.cdr_score?.toFixed(1) || '0.0'}</td>
                          <td className="p-2.5 font-mono text-cyan-400">{s.hippocampus_volume_cm3?.toFixed(2)}</td>
                          <td className="p-2.5 font-mono">{s.lateral_ventricles_volume_cm3?.toFixed(2)}</td>
                          <td className="p-2.5 font-mono">{s.estimated_total_intracranial_volume_cm3?.toFixed(0)}</td>
                          <td className="p-2.5 font-mono text-[10px] text-surface-400">1.5T / 3.0T MRI</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: DATA LINKAGE & INTEGRITY GATES
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'linkage' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-surface-900 border border-surface-700/60 text-xs text-surface-300 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <ShieldAlert size={15} />
                  <span>Cross-Cohort Linkage Gate &amp; Provenance Ledger</span>
                </div>
                <p className="text-[11px] text-surface-400 leading-relaxed">
                  To prevent fraudulent multimodal fusion, ADAM-1 Enhanced enforces strict identifier intersection checks. Merging disparate cohorts (e.g., combining ADAM-1 stool with OASIS MRI) is strictly blocked unless authorized identity crosswalks are verified.
                </p>
              </div>

              {/* 5-Dimension Crosswalk Table */}
              <div className="card p-5 space-y-3">
                <h3 className="text-xs font-bold text-surface-50 uppercase tracking-wider">
                  5-Dimension Crosswalk Audit Catalog ({crosswalkAudits.length} cohorts):
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-surface-300">
                    <thead className="bg-surface-900 text-surface-400 uppercase text-[10px] font-semibold border-b border-surface-700">
                      <tr>
                        <th className="p-2.5">Cohort ID</th>
                        <th className="p-2.5">ID Intersection</th>
                        <th className="p-2.5">Public Search</th>
                        <th className="p-2.5">Authorized Crosswalk</th>
                        <th className="p-2.5">Real-World Overlap</th>
                        <th className="p-2.5">Linkage Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                      {crosswalkAudits.map((a) => (
                        <tr key={a.cohort_id} className="hover:bg-surface-850">
                          <td className="p-2.5 font-mono font-bold text-surface-100">{a.cohort_id}</td>
                          <td className="p-2.5 font-mono text-center">
                            {a.exact_intersection_count ?? a.exact_id_intersection_in_inspected_manifests ?? 0}
                          </td>
                          <td className="p-2.5 text-[11px] text-surface-400">
                            {a.public_crosswalk_search || 'NO_PUBLIC_CROSSWALK_FOUND'}
                          </td>
                          <td className="p-2.5 text-[11px] text-amber-400 font-mono">
                            {a.authorized_crosswalk_status || 'NO_AUTHORIZED_CROSSWALK'}
                          </td>
                          <td className="p-2.5 text-[11px] text-surface-400">
                            {a.real_world_overlap_status || 'UNRESOLVED_REAL_WORLD_OVERLAP'}
                          </td>
                          <td className="p-2.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold font-mono">
                              BLOCKED_CROSS_COHORT
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Outstanding Provenance Alerts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-4 space-y-2 border-l-4 border-l-amber-500">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <AlertTriangle size={14} />
                    <span>GARD Linkage State: REQUEST_NOT_SENT</span>
                  </div>
                  <p className="text-xs text-surface-400 leading-relaxed">
                    Multimodal paired microbiome-neuroimaging participant count is marked <code className="text-amber-400 font-mono">UNKNOWN_NOT_VERIFIED</code>. Multi-modal data fusion requests require documented institutional approval.
                  </p>
                </div>

                <div className="card p-4 space-y-2 border-l-4 border-l-sky-500">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                    <Clock size={14} />
                    <span>Follow-Up Provenance: UNRESOLVED</span>
                  </div>
                  <p className="text-xs text-surface-400 leading-relaxed">
                    Curated CSV spans up to 311 days (Subject CH1-173, FB323) whereas NCBI BioProject PRJNA529586 text describes "up to 5 months" (~155 days). Marked unresolved for source provenance without altering dates.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
