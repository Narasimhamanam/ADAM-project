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
  apiClient,
  fetchResearchDatasets,
  fetchBenchmarkRuns,
  fetchCrosswalkAudit,
  fetchGardStatus,
} from '../api/client'
import ValidationStatus from '../components/ValidationStatus'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'

export default function ResearchValidation() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = ['benchmarks', 'linkage'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'datasets'
  const [activeTab, setActiveTab] = useState(initialTab) // 'datasets' | 'benchmarks' | 'neuroimaging' | 'linkage'

  // Datasets state
  const [datasets, setDatasets] = useState([])
  const [datasetSearch, setDatasetSearch] = useState('')
  const [selectedDataset, setSelectedDataset] = useState(null)

  // Benchmarks state
  const [benchmarkRuns, setBenchmarkRuns] = useState([])
  const [benchmarkFilter, setBenchmarkFilter] = useState('all') // 'all' | 'local' | 'exploratory' | 'literature' | 'not_run'

  // Neuroimaging state

  const [integrity, setIntegrity] = useState(null)
  const [integrityError, setIntegrityError] = useState(false)
  useEffect(() => {
    if (activeTab === 'linkage') {
      apiClient.get('/research/integrity').then(r => { setIntegrity(r.data); setIntegrityError(false) })
        .catch(() => { setIntegrity(null); setIntegrityError(true) })
    }
  }, [activeTab])

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
        const data = await fetchResearchDatasets()
        setDatasets(data.datasets)
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
            Independent dataset registry, cross-cohort benchmark ledgers, and data linkage checks.
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

              <details className="card p-3"><summary>Planned / external resources</summary>
                {filteredDatasets.filter(ds => !(ds.downloaded_unique_participants > 0)).map(ds => <p className="my-2" key={ds.dataset_id}>
                  <a className="text-accent-400 underline" href={ds.official_url}>{ds.name}</a> · {ds.accession} · {ds.access_status?.replaceAll('_', ' ')} · Cataloged participants: {ds.enrolled_participants ?? 'unknown'} · Terms: {ds.license_or_dua || 'Unverified'}
                </p>)}
              </details>
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
                      {filteredDatasets.filter(ds => ds.downloaded_unique_participants > 0).map((ds) => {
                        const isVerifiedLocal = ds.downloaded_unique_participants > 0
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
                                  {ds.downloaded_unique_participants} participants (registry)
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
                        {selectedDataset.official_url ? (
                          <a
                            href={selectedDataset.official_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:underline flex items-center gap-1"
                          >
                            <span>{selectedDataset.official_url}</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          'Local Research File System'
                        )}
                      </div>
                      <div>
                        <strong className="text-surface-400 block">Permitted Research Use:</strong>
                        <span>{selectedDataset.license_or_dua || 'Reuse terms unverified'}</span>
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
          {activeTab === 'benchmarks' && <ValidationStatus />}
          {/* ══════════════════════════════════════════════════════════════════
              TAB 4: DATA LINKAGE & INTEGRITY GATES
             ══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'linkage' && <section className="card p-4 space-y-2"><h2>Local ADAM integrity checks</h2>
            {integrity ? <><p>{integrity.samples} samples · {integrity.subjects} subjects · {integrity.cells} cells checked</p>
              {Object.entries(integrity.checks).map(([name, count]) => <p key={name}>{name}: {count} · {count ? 'Review' : 'Pass'}</p>)}</> :
              <p>{integrityError ? 'Integrity audit unavailable.' : 'Running integrity checks…'}</p>}
            <p>Independent subject overlap and cross-cohort taxonomy matching require compatible manifests. No imaging linkage has been verified.</p>
          </section>}
        </>
      )}
    </div>
  )
}
