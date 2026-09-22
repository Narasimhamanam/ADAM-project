import React, { useState, useEffect, useCallback } from 'react'
import {
  Database,
  CheckCircle2,
  TestTube,
  Bug,
  Search,
  Play,
  Filter,
  FileText,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ErrorAlert from '../components/ui/ErrorAlert'
import EmptyState from '../components/ui/EmptyState'
import ResponsiveTable from '../components/ui/ResponsiveTable'
import Skeleton from '../components/ui/Skeleton'

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

// ── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString()
  const fullPath = `${API_BASE}${path}${qs ? '?' + qs : ''}`
  const res = await fetch(fullPath)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function DatasetBadge({ label, variant }) {
  const isIngested = label === 'INGESTED' || label === 'VALIDATED'
  const isFeature = label === 'feature' || label === 'clinical_covariate'
  const isTarget = label === 'target_label'
  const isMicrobiome = label === 'microbiome'

  if (isIngested) {
    return (
      <span className="badge-connected text-[10px]">
        ✓ {label}
      </span>
    )
  }
  if (isTarget) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-danger-500/15 border border-danger-500/30 px-2.5 py-0.5 text-[10px] font-bold text-danger-500 dark:text-danger-400 font-mono">
        {label}
      </span>
    )
  }
  if (isMicrobiome) {
    return (
      <span className="badge-teal text-[10px]">
        {label}
      </span>
    )
  }
  if (isFeature) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-500/15 border border-primary-500/30 px-2.5 py-0.5 text-[10px] font-bold text-primary-600 dark:text-primary-400 font-mono">
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-800 border border-surface-700 px-2.5 py-0.5 text-[10px] font-bold text-surface-400 font-mono">
      {label}
    </span>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Data Dictionary', 'Sample Explorer', 'Species Explorer', 'Validation']

// ── Pagination ────────────────────────────────────────────────────────────────
function Paginator({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between mt-4 px-2">
      <p className="text-xs text-surface-400 font-mono">
        Page <span className="text-surface-50 font-bold">{page}</span> of <span className="text-surface-50 font-bold">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="btn-ghost px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="btn-ghost px-3 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Section: Overview ─────────────────────────────────────────────────────────
function OverviewTab() {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    apiFetch('/datasets', { page_size: 20 })
      .then(d => { setDatasets(d.datasets || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <Skeleton variant="table" lines={5} />
  if (error) return <ErrorAlert message={error} />

  const totalIngested = datasets.filter(d => d.status === 'INGESTED').length

  return (
    <div className="space-y-6">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Database}
          label="Total Datasets"
          value={datasets.length}
          sub="Registered in catalog"
          accent="accent"
        />
        <StatCard
          icon={CheckCircle2}
          label="Ingested"
          value={totalIngested}
          sub="Ready for ML & RAG"
          accent="success"
        />
        <StatCard
          icon={TestTube}
          label="Total Samples"
          value="335"
          sub="Patient cohort"
          accent="primary"
        />
        <StatCard
          icon={Bug}
          label="Microbiome Species"
          value="940"
          sub="Metagenomic features"
          accent="warning"
        />
      </div>

      {/* Dataset Cards List */}
      <div className="space-y-3">
        {datasets.map(ds => {
          const isSelected = selected?.id === ds.id
          return (
            <div
              key={ds.id}
              onClick={() => setSelected(isSelected ? null : ds)}
              className={`card p-4 transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'border-accent-500 bg-accent-500/10 shadow-md ring-1 ring-accent-500/30'
                  : 'hover:border-surface-600 bg-surface-900/60'
              }`}
            >
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-surface-50">{ds.name}</span>
                    <DatasetBadge label={ds.status} />
                    <DatasetBadge label={ds.dataset_type} />
                  </div>
                  <p className="text-xs text-surface-400 max-w-2xl leading-relaxed">
                    {ds.description}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-accent-500 dark:text-accent-400 font-semibold shrink-0">
                  {isSelected ? 'Hide Details ▲' : 'View Details ▼'}
                </span>
              </div>

              {isSelected && (
                <div className="mt-4 pt-3 border-t border-surface-700/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 animate-fade-in">
                  <div className="p-2.5 rounded-lg bg-surface-800/80 border border-surface-700/50">
                    <p className="text-[10px] uppercase font-bold text-surface-400">Rows</p>
                    <p className="font-data text-sm font-bold text-surface-50 mt-0.5">{ds.rows?.toLocaleString() ?? '—'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-800/80 border border-surface-700/50">
                    <p className="text-[10px] uppercase font-bold text-surface-400">Columns</p>
                    <p className="font-data text-sm font-bold text-surface-50 mt-0.5">{ds.columns?.toLocaleString() ?? '—'}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-800/80 border border-surface-700/50">
                    <p className="text-[10px] uppercase font-bold text-surface-400">File Size</p>
                    <p className="font-data text-sm font-bold text-surface-50 mt-0.5">
                      {ds.size_bytes ? `${(ds.size_bytes / 1024 / 1024).toFixed(2)} MB` : '—'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-800/80 border border-surface-700/50">
                    <p className="text-[10px] uppercase font-bold text-surface-400">Checksum</p>
                    <p className="font-mono text-xs text-surface-300 mt-0.5 truncate" title={ds.checksum}>
                      {ds.checksum ? `${ds.checksum.slice(0, 10)}…` : '—'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-surface-800/80 border border-surface-700/50">
                    <p className="text-[10px] uppercase font-bold text-surface-400">Source File</p>
                    <p className="font-mono text-xs text-surface-300 mt-0.5 truncate" title={ds.source_file}>
                      {ds.source_file?.split('/').pop()?.split('\\').pop() ?? '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section: Data Dictionary ───────────────────────────────────────────────────
function DataDictTab() {
  const [datasets, setDatasets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [columns, setColumns] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch('/datasets', { page_size: 20 })
      .then(d => {
        setDatasets(d.datasets || [])
        if (d.datasets?.length > 0 && !selectedId) setSelectedId(d.datasets[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    apiFetch(`/datasets/${selectedId}/columns`, { page, page_size: 50, search })
      .then(d => { setColumns(d.columns || []); setTotal(d.total || 0); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [selectedId, page, search])

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-3 flex-wrap items-center">
        <select
          value={selectedId || ''}
          onChange={e => { setSelectedId(e.target.value); setPage(1) }}
          className="input max-w-xs"
        >
          {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
        </select>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            placeholder="Search column names…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input pl-9"
          />
        </div>
        <span className="text-xs text-surface-400 font-mono ml-auto">
          {total.toLocaleString()} columns indexed
        </span>
      </div>

      {loading ? (
        <Skeleton variant="table" lines={8} />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <>
          <ResponsiveTable minWidth="650px">
            <thead>
              <tr className="border-b border-surface-700/60 bg-surface-800/60 text-surface-400 uppercase text-[11px] font-bold">
                <th className="p-3 pl-4">Column Name</th>
                <th className="p-3">Data Type</th>
                <th className="p-3">Null Count</th>
                <th className="p-3">Unique Values</th>
                <th className="p-3 pr-4">Classification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40 font-mono text-xs">
              {columns.map((col) => (
                <tr key={col.id} className="hover:bg-surface-800/40 transition-colors">
                  <td className="p-3 pl-4 font-bold text-accent-500 dark:text-accent-400">{col.name}</td>
                  <td className="p-3 text-surface-300">{col.datatype}</td>
                  <td className="p-3">
                    <span className={col.null_count > 0 ? 'text-danger-500 font-bold' : 'text-success-500 font-medium'}>
                      {col.null_count}
                    </span>
                  </td>
                  <td className="p-3 text-surface-300">{col.unique_count}</td>
                  <td className="p-3 pr-4">
                    <DatasetBadge label={col.classification} />
                  </td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
          {columns.length === 0 && (
            <EmptyState
              title="No columns found"
              description="No matching columns in the selected dataset."
            />
          )}
          <Paginator page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  )
}

// ── Section: Sample Explorer ───────────────────────────────────────────────────
function SampleTab() {
  const [samples, setSamples] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [studyId, setStudyId] = useState('')
  const [adFilter, setAdFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSamples = useCallback(() => {
    setLoading(true)
    const params = { page, page_size: 20 }
    if (search) params.search = search
    if (studyId) params.study_id = studyId
    if (adFilter !== '') params.alzheimers = adFilter
    apiFetch('/samples', params)
      .then(d => { setSamples(d.samples || []); setTotal(d.total || 0); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [page, search, studyId, adFilter])

  useEffect(() => { fetchSamples() }, [fetchSamples])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative min-w-[160px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            placeholder="Sample ID (e.g. DC001)"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input pl-9"
          />
        </div>
        <input
          placeholder="Study ID (e.g. CH1-002)"
          value={studyId}
          onChange={e => { setStudyId(e.target.value); setPage(1) }}
          className="input max-w-[180px]"
        />
        <select
          value={adFilter}
          onChange={e => { setAdFilter(e.target.value); setPage(1) }}
          className="input max-w-[160px]"
        >
          <option value="">All Diagnoses</option>
          <option value="0.0">Control (0.0)</option>
          <option value="1.0">Alzheimer's (1.0)</option>
        </select>
        <span className="text-xs text-surface-400 font-mono ml-auto">
          {total} patient samples
        </span>
      </div>

      {loading ? (
        <Skeleton variant="table" lines={8} />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <>
          <ResponsiveTable minWidth="750px">
            <thead>
              <tr className="border-b border-surface-700/60 bg-surface-800/60 text-surface-400 uppercase text-[11px] font-bold">
                <th className="p-3 pl-4">Sample ID</th>
                <th className="p-3">Study ID</th>
                <th className="p-3">Age</th>
                <th className="p-3">Sex</th>
                <th className="p-3">Day</th>
                <th className="p-3">Frailty Scale</th>
                <th className="p-3">Diagnosis</th>
                <th className="p-3 pr-4">PPI Usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40 font-mono text-xs">
              {samples.map((s) => (
                <tr key={s.sample_id} className="hover:bg-surface-800/40 transition-colors">
                  <td className="p-3 pl-4 font-bold text-accent-500 dark:text-accent-400">{s.sample_id}</td>
                  <td className="p-3 text-surface-300">{s.study_id}</td>
                  <td className="p-3 text-surface-200">{s.age}</td>
                  <td className="p-3 text-surface-300">{s.male === 1 ? '♂ Male' : '♀ Female'}</td>
                  <td className="p-3 text-surface-300">{s.day}</td>
                  <td className="p-3 text-surface-300">{s.clinical_frailty_scale}</td>
                  <td className="p-3">
                    {s.alzheimers === 1.0 ? (
                      <span className="badge-error text-[10px]">AD Positive</span>
                    ) : (
                      <span className="badge-connected text-[10px]">Control</span>
                    )}
                  </td>
                  <td className="p-3 pr-4 text-surface-300">{s.ppi ?? '0'}</td>
                </tr>
              ))}
            </tbody>
          </ResponsiveTable>
          {samples.length === 0 && (
            <EmptyState
              title="No patient samples found"
              description="Try clearing your filters or searching for another sample ID."
            />
          )}
          <Paginator page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  )
}

// ── Section: Species Explorer ──────────────────────────────────────────────────
function SpeciesTab() {
  const [species, setSpecies] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    apiFetch('/species', { page, page_size: 50, search })
      .then(d => { setSpecies(d.species || []); setTotal(d.total || 0); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [page, search])

  const totalPages = Math.ceil(total / 50)

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            placeholder="Search species (e.g. Faecalibacterium prausnitzii)…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="input pl-9"
          />
        </div>
        <span className="text-xs text-surface-400 font-mono ml-auto">
          {total.toLocaleString()} species catalogued
        </span>
      </div>

      {loading ? (
        <Skeleton variant="table" lines={8} />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {species.map(sp => (
              <div
                key={sp.species_id}
                className="card p-3.5 bg-surface-900/60 border border-surface-700/60 hover:border-accent-500/40 transition-colors"
              >
                <div className="text-accent-500 dark:text-accent-400 font-semibold text-xs italic tracking-wide">
                  {sp.species_name}
                </div>
                <div className="text-[11px] text-surface-400 font-mono mt-1 break-all line-clamp-2">
                  {sp.taxonomy_hierarchy}
                </div>
              </div>
            ))}
          </div>
          {species.length === 0 && (
            <EmptyState
              title="No species matched"
              description="Try a different taxonomic search term or check spelling."
            />
          )}
          <Paginator page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  )
}

// ── Section: Validation ────────────────────────────────────────────────────────
function ValidationTab() {
  const [datasets, setDatasets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [validations, setValidations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ingestMsg, setIngestMsg] = useState(null)
  const [ingesting, setIngesting] = useState(false)

  useEffect(() => {
    apiFetch('/datasets', { page_size: 20 })
      .then(d => {
        setDatasets(d.datasets || [])
        if (d.datasets?.length > 0) setSelectedId(d.datasets[0].id)
      })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    apiFetch(`/datasets/${selectedId}/validation`)
      .then(d => { setValidations(d.validations || []); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [selectedId])

  const triggerIngest = async () => {
    setIngesting(true)
    setIngestMsg(null)
    try {
      const res = await fetch(`${API_BASE}/ingest`, { method: 'POST' })
      const data = await res.json()
      setIngestMsg({ ok: true, text: JSON.stringify(data.results, null, 2) })
    } catch (e) {
      setIngestMsg({ ok: false, text: e.message })
    } finally {
      setIngesting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <select
          value={selectedId || ''}
          onChange={e => setSelectedId(e.target.value)}
          className="input max-w-xs"
        >
          {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
        </select>
        <button
          onClick={triggerIngest}
          disabled={ingesting}
          className="btn-teal text-xs py-2 px-4 flex items-center gap-2 font-semibold disabled:opacity-60"
        >
          <Play size={14} className={ingesting ? 'animate-spin' : ''} />
          {ingesting ? 'Running Ingestion…' : 'Trigger Ingestion Pipeline'}
        </button>
      </div>

      {ingestMsg && (
        <pre className={`p-4 rounded-xl text-xs font-mono overflow-x-auto border ${
          ingestMsg.ok
            ? 'bg-success-500/10 border-success-500/30 text-success-600 dark:text-success-400'
            : 'bg-danger-500/10 border-danger-500/30 text-danger-500'
        }`}>
          {ingestMsg.text}
        </pre>
      )}

      {loading ? (
        <Skeleton variant="table" lines={4} />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : (
        <div className="space-y-3">
          {validations.map(v => (
            <div
              key={v.id}
              className={`card p-4 border ${
                v.checks_passed
                  ? 'border-success-500/30 bg-success-500/5'
                  : 'border-danger-500/30 bg-danger-500/5'
              }`}
            >
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={v.status === 'PASSED' ? 'connected' : 'error'} />
                  <span className="text-xs text-surface-400 font-mono flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(v.run_timestamp).toLocaleString()}
                  </span>
                </div>
                {v.metrics_json && (
                  <div className="flex gap-3 text-xs font-mono">
                    {Object.entries(v.metrics_json).map(([k, val]) => (
                      <span key={k} className="text-surface-400">
                        <span className="text-surface-500">{k}:</span> {val}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {v.error_log && (
                <div className="text-xs font-mono text-danger-500 mt-2 p-2 rounded bg-danger-500/10">
                  {v.error_log}
                </div>
              )}
            </div>
          ))}
          {validations.length === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title="No validation audit logs"
              description="Trigger ingestion above to generate validation metrics."
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DatasetExplorer() {
  const [activeTab, setActiveTab] = useState('Overview')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-surface-50">
            Dataset Explorer
          </h1>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400 border border-accent-500/30">
            Phase 2 Data
          </span>
        </div>
        <p className="text-sm text-surface-400 mt-1 font-medium">
          Multi-omic metagenomics and clinical cohort metadata curated from Alzheimer's Disease gut microbiome studies.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-surface-700/60 overflow-x-auto pb-1">
        {TABS.map(t => {
          const isActive = activeTab === t
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border border-accent-500/30'
                  : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'
              }`}
            >
              {t}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'Overview' && <OverviewTab />}
        {activeTab === 'Data Dictionary' && <DataDictTab />}
        {activeTab === 'Sample Explorer' && <SampleTab />}
        {activeTab === 'Species Explorer' && <SpeciesTab />}
        {activeTab === 'Validation' && <ValidationTab />}
      </div>
    </div>
  )
}
