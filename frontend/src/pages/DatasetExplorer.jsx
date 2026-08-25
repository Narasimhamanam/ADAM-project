import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

// ── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const fullPath = `${API_BASE}${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(fullPath);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = '#7c3aed', icon }) {
  return (
    <div style={{
      background: 'rgba(30,20,60,0.7)',
      border: `1px solid ${color}40`,
      borderRadius: 12,
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      {icon && <span style={{ fontSize: 24 }}>{icon}</span>}
      <div>
        <div style={{ color: '#a78bfa', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginTop: 4 }}>{value ?? '—'}</div>
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ label, color }) {
  const colors = {
    INGESTED: '#22c55e', VALIDATED: '#22c55e', REGISTERED: '#3b82f6',
    INGESTING: '#f59e0b', FAILED: '#ef4444', DISCOVERED: '#6b7280',
    core_metadata: '#818cf8', target_label: '#f43f5e',
    microbiome: '#34d399', clinical_covariate: '#fbbf24',
    feature: '#9ca3af',
  };
  const bg = colors[label] || colors[color] || '#6b7280';
  return (
    <span style={{
      background: `${bg}22`, color: bg, border: `1px solid ${bg}44`,
      borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
      letterSpacing: '0.05em',
    }}>{label}</span>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Data Dictionary', 'Sample Explorer', 'Species Explorer', 'Validation'];

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(124,58,237,0.25)' : 'transparent',
      color: active ? '#c4b5fd' : '#6b7280',
      border: 'none',
      borderBottom: active ? '2px solid #7c3aed' : '2px solid transparent',
      padding: '10px 20px',
      cursor: 'pointer',
      fontWeight: active ? 700 : 500,
      fontSize: 14,
      transition: 'all 0.2s',
    }}>{label}</button>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Paginator({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}
        style={{ background: '#1e1440', color: '#a78bfa', border: '1px solid #4c1d95', borderRadius: 6, padding: '4px 14px', cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page <= 1 ? 0.4 : 1 }}>‹</button>
      <span style={{ color: '#7c6ba0', fontSize: 13 }}>Page {page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)}
        style={{ background: '#1e1440', color: '#a78bfa', border: '1px solid #4c1d95', borderRadius: 6, padding: '4px 14px', cursor: page < totalPages ? 'pointer' : 'not-allowed', opacity: page >= totalPages ? 0.4 : 1 }}>›</button>
    </div>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() {
  return <div style={{ color: '#a78bfa', textAlign: 'center', padding: 40 }}>⏳ Loading…</div>;
}

function ErrorMsg({ msg }) {
  return <div style={{ color: '#f87171', background: '#1f1010', borderRadius: 8, padding: 16, margin: '16px 0' }}>❌ {msg}</div>;
}

// ── Section: Overview ─────────────────────────────────────────────────────────
function OverviewTab() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    apiFetch('/datasets', { page_size: 20 })
      .then(d => { setDatasets(d.datasets || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <div className="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard label="Total Datasets" value={datasets.length} icon="📦" />
        <StatCard label="Ingested" value={datasets.filter(d => d.status === 'INGESTED').length} color="#22c55e" icon="✅" />
        <StatCard label="Total Samples" value="335" color="#3b82f6" icon="🧪" />
        <StatCard label="Species" value="940" color="#f59e0b" icon="🦠" />
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        {datasets.map(ds => (
          <div key={ds.id} onClick={() => setSelected(selected?.id === ds.id ? null : ds)}
            style={{
              background: selected?.id === ds.id ? 'rgba(124,58,237,0.15)' : 'rgba(20,12,50,0.6)',
              border: `1px solid ${selected?.id === ds.id ? '#7c3aed80' : '#2d1f5540'}`,
              borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ color: '#c4b5fd', fontWeight: 700, fontSize: 15, fontFamily: 'monospace' }}>{ds.name}</div>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4, maxWidth: 580 }}>{ds.description}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge label={ds.status} />
                <Badge label={ds.dataset_type} color="#818cf8" />
              </div>
            </div>
            {selected?.id === ds.id && (
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                <DataPill label="Rows" value={ds.rows ?? '?'} />
                <DataPill label="Columns" value={ds.columns ?? '?'} />
                <DataPill label="Size" value={ds.size_bytes ? `${(ds.size_bytes / 1024 / 1024).toFixed(2)} MB` : '?'} />
                <DataPill label="Checksum" value={ds.checksum ? ds.checksum.slice(0, 12) + '…' : '?'} />
                <DataPill label="Source" value={ds.source_file?.split('/').pop() ?? '?'} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataPill({ label, value }) {
  return (
    <div style={{ background: '#0f0828', borderRadius: 8, padding: '8px 14px', border: '1px solid #2d1f55' }}>
      <div style={{ color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ color: '#c4b5fd', fontWeight: 600, fontSize: 13, marginTop: 2, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

// ── Section: Data Dictionary ───────────────────────────────────────────────────
function DataDictTab() {
  const [datasets, setDatasets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [columns, setColumns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/datasets', { page_size: 20 })
      .then(d => {
        setDatasets(d.datasets || []);
        if (d.datasets?.length > 0 && !selectedId) setSelectedId(d.datasets[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    apiFetch(`/datasets/${selectedId}/columns`, { page, page_size: 50, search })
      .then(d => { setColumns(d.columns || []); setTotal(d.total || 0); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedId, page, search]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className="filter-row" style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={selectedId || ''} onChange={e => { setSelectedId(e.target.value); setPage(1); }}
          style={{ background: '#1e1440', color: '#c4b5fd', border: '1px solid #4c1d95', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
          {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
        </select>
        <input placeholder="🔍 Search columns…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ background: '#1e1440', color: '#c4b5fd', border: '1px solid #4c1d95', borderRadius: 8, padding: '8px 14px', fontSize: 13 }} />
        <span style={{ color: '#6b7280', fontSize: 13 }}>{total} columns</span>
      </div>

      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} /> : (
        <>
          <div className="table-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Column Name', 'Type', 'Nulls', 'Unique', 'Classification'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#7c6ba0', fontWeight: 600, borderBottom: '1px solid #2d1f55', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {columns.map((col, i) => (
                  <tr key={col.id} style={{ background: i % 2 === 0 ? 'rgba(30,20,70,0.3)' : 'transparent' }}>
                    <td style={{ padding: '8px 14px', color: '#c4b5fd', fontFamily: 'monospace', fontSize: 12 }}>{col.name}</td>
                    <td style={{ padding: '8px 14px', color: '#9ca3af' }}>{col.datatype}</td>
                    <td style={{ padding: '8px 14px', color: col.null_count > 0 ? '#f87171' : '#4ade80' }}>{col.null_count}</td>
                    <td style={{ padding: '8px 14px', color: '#9ca3af' }}>{col.unique_count}</td>
                    <td style={{ padding: '8px 14px' }}><Badge label={col.classification} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginator page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// ── Section: Sample Explorer ───────────────────────────────────────────────────
function SampleTab() {
  const [samples, setSamples] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [studyId, setStudyId] = useState('');
  const [adFilter, setAdFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSamples = useCallback(() => {
    setLoading(true);
    const params = { page, page_size: 20 };
    if (search) params.search = search;
    if (studyId) params.study_id = studyId;
    if (adFilter !== '') params.alzheimers = adFilter;
    apiFetch('/samples', params)
      .then(d => { setSamples(d.samples || []); setTotal(d.total || 0); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [page, search, studyId, adFilter]);

  useEffect(() => { fetchSamples(); }, [fetchSamples]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="filter-row" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="🔍 Sample ID (e.g. DC001)" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ background: '#1e1440', color: '#c4b5fd', border: '1px solid #4c1d95', borderRadius: 8, padding: '8px 14px', fontSize: 13 }} />
        <input placeholder="study_id (e.g. CH1-002)" value={studyId}
          onChange={e => { setStudyId(e.target.value); setPage(1); }}
          style={{ background: '#1e1440', color: '#c4b5fd', border: '1px solid #4c1d95', borderRadius: 8, padding: '8px 14px', fontSize: 13 }} />
        <select value={adFilter} onChange={e => { setAdFilter(e.target.value); setPage(1); }}
          style={{ background: '#1e1440', color: '#c4b5fd', border: '1px solid #4c1d95', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
          <option value="">All Labels</option>
          <option value="0.0">Control (0.0)</option>
          <option value="1.0">Alzheimer's (1.0)</option>
        </select>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{total} samples</span>
      </div>

      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} /> : (
        <>
          <div className="table-scroll" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Sample ID', 'Study ID', 'Age', 'Sex', 'Day', 'CFS', 'Alzheimer\'s', 'PPI'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#7c6ba0', fontWeight: 600, borderBottom: '1px solid #2d1f55', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {samples.map((s, i) => (
                  <tr key={s.sample_id} style={{ background: i % 2 === 0 ? 'rgba(30,20,70,0.3)' : 'transparent' }}>
                    <td style={{ padding: '8px 14px', color: '#c4b5fd', fontFamily: 'monospace', fontWeight: 600 }}>{s.sample_id}</td>
                    <td style={{ padding: '8px 14px', color: '#9ca3af' }}>{s.study_id}</td>
                    <td style={{ padding: '8px 14px', color: '#9ca3af' }}>{s.age}</td>
                    <td style={{ padding: '8px 14px', color: '#9ca3af' }}>{s.male === 1 ? '♂ M' : '♀ F'}</td>
                    <td style={{ padding: '8px 14px', color: '#9ca3af' }}>{s.day}</td>
                    <td style={{ padding: '8px 14px', color: '#9ca3af' }}>{s.clinical_frailty_scale}</td>
                    <td style={{ padding: '8px 14px' }}>
                      {s.alzheimers === 1.0
                        ? <Badge label="AD" color="#ef4444" />
                        : <Badge label="Control" color="#22c55e" />}
                    </td>
                    <td style={{ padding: '8px 14px', color: '#9ca3af' }}>{s.ppi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {samples.length === 0 && <div style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>No samples found.</div>}
          <Paginator page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// ── Section: Species Explorer ──────────────────────────────────────────────────
function SpeciesTab() {
  const [species, setSpecies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiFetch('/species', { page, page_size: 50, search })
      .then(d => { setSpecies(d.species || []); setTotal(d.total || 0); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [page, search]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <div className="filter-row" style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <input placeholder="🔍 Search species (e.g. Faecalibacterium)" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ background: '#1e1440', color: '#c4b5fd', border: '1px solid #4c1d95', borderRadius: 8, padding: '8px 14px', fontSize: 13 }} />
        <span style={{ color: '#6b7280', fontSize: 13 }}>{total} species</span>
      </div>

      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} /> : (
        <>
          <div style={{ display: 'grid', gap: 8 }}>
            {species.map(sp => (
              <div key={sp.species_id} style={{ background: 'rgba(20,12,50,0.5)', border: '1px solid #2d1f5530', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ color: '#34d399', fontStyle: 'italic', fontWeight: 600, fontSize: 13 }}>{sp.species_name}</div>
                <div style={{ color: '#4b5563', fontSize: 11, marginTop: 4, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {sp.taxonomy_hierarchy}
                </div>
              </div>
            ))}
          </div>
          {species.length === 0 && <div style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>No species found.</div>}
          <Paginator page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// ── Section: Validation ────────────────────────────────────────────────────────
function ValidationTab() {
  const [datasets, setDatasets] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ingestMsg, setIngestMsg] = useState(null);
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    apiFetch('/datasets', { page_size: 20 })
      .then(d => {
        setDatasets(d.datasets || []);
        if (d.datasets?.length > 0) setSelectedId(d.datasets[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    apiFetch(`/datasets/${selectedId}/validation`)
      .then(d => { setValidations(d.validations || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedId]);

  const triggerIngest = async () => {
    setIngesting(true);
    setIngestMsg(null);
    try {
      const res = await fetch(`${API_BASE}/ingest`, { method: 'POST' });
      const data = await res.json();
      setIngestMsg({ ok: true, text: JSON.stringify(data.results, null, 2) });
    } catch (e) {
      setIngestMsg({ ok: false, text: e.message });
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={selectedId || ''} onChange={e => setSelectedId(e.target.value)}
          style={{ background: '#1e1440', color: '#c4b5fd', border: '1px solid #4c1d95', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
          {datasets.map(ds => <option key={ds.id} value={ds.id}>{ds.name}</option>)}
        </select>
        <button onClick={triggerIngest} disabled={ingesting} style={{
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff',
          border: 'none', borderRadius: 8, padding: '8px 20px', cursor: ingesting ? 'not-allowed' : 'pointer',
          fontWeight: 700, fontSize: 13, opacity: ingesting ? 0.6 : 1,
        }}>
          {ingesting ? '⏳ Ingesting…' : '▶ Run Ingestion'}
        </button>
      </div>

      {ingestMsg && (
        <pre style={{
          background: ingestMsg.ok ? '#052e16' : '#1f1010',
          color: ingestMsg.ok ? '#4ade80' : '#f87171',
          borderRadius: 10, padding: 16, fontSize: 12, overflowX: 'auto', marginBottom: 20
        }}>{ingestMsg.text}</pre>
      )}

      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} /> : (
        <div style={{ display: 'grid', gap: 10 }}>
          {validations.map(v => (
            <div key={v.id} style={{
              background: v.checks_passed ? 'rgba(20,60,30,0.3)' : 'rgba(60,20,20,0.3)',
              border: `1px solid ${v.checks_passed ? '#22c55e30' : '#ef444430'}`,
              borderRadius: 10, padding: '14px 18px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <Badge label={v.status} />
                  <span style={{ color: '#6b7280', fontSize: 12, marginLeft: 10 }}>
                    {new Date(v.run_timestamp).toLocaleString()}
                  </span>
                </div>
                {v.metrics_json && (
                  <div style={{ display: 'flex', gap: 16 }}>
                    {Object.entries(v.metrics_json).map(([k, val]) => (
                      <span key={k} style={{ color: '#7c6ba0', fontSize: 12 }}>
                        <strong style={{ color: '#a78bfa' }}>{k}:</strong> {val}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {v.error_log && <div style={{ color: '#f87171', fontSize: 12, marginTop: 8, fontFamily: 'monospace' }}>{v.error_log}</div>}
            </div>
          ))}
          {validations.length === 0 && <div style={{ color: '#6b7280', textAlign: 'center', padding: 24 }}>No validation history yet. Run ingestion to populate.</div>}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DatasetExplorer() {
  const [activeTab, setActiveTab] = useState('Overview');

  return (
    <div className="dataset-explorer-page" style={{
      padding: '16px',
      fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
      color: '#e2e8f0',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg,#a78bfa,#38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
          Dataset Explorer
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 6 }}>
          ADAM-1 Enhanced · Phase 2 · Real data from{' '}
          <code style={{ color: '#818cf8', background: '#1e1440', padding: '1px 6px', borderRadius: 4 }}>
            original_adam/ADAM/global_resources/
          </code>
        </p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #2d1f55', marginBottom: 24, display: 'flex', gap: 4, overflowX: 'auto' }}>
        {TABS.map(t => <Tab key={t} label={t} active={activeTab === t} onClick={() => setActiveTab(t)} />)}
      </div>

      {/* Content */}
      {activeTab === 'Overview' && <OverviewTab />}
      {activeTab === 'Data Dictionary' && <DataDictTab />}
      {activeTab === 'Sample Explorer' && <SampleTab />}
      {activeTab === 'Species Explorer' && <SpeciesTab />}
      {activeTab === 'Validation' && <ValidationTab />}
    </div>
  );
}
