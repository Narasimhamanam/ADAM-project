import { Search, ChevronRight } from 'lucide-react'
import { recentRecords } from '../context/recentRecords'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAvailableSamples, fetchResearchDatasets } from '../api/client'
import ValidationStatus from '../components/ValidationStatus'

export default function Overview() {
  const [samples, setSamples] = useState(null)
  const [registry, setRegistry] = useState(null)
  const [id, setId] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    Promise.allSettled([fetchAvailableSamples(350), fetchResearchDatasets()]).then(([s, d]) => {
      if (!active) return
      if (s.status === 'fulfilled') setSamples(s.value)
      if (d.status === 'fulfilled') setRegistry(d.value.datasets)
      setLoading(false)
    })
    return () => { active = false }
  }, [])
  const rows = samples?.filter(s => s.sample_id.toLowerCase().includes(id.trim().toLowerCase()))
  const count = value => loading ? 'Loading…' : value ?? 'Unavailable'
  return <div className="overview-workspace space-y-5"><h1 className="text-xl font-bold">ADAM research dashboard</h1>
    <div className="grid gap-3 sm:grid-cols-3">
      <Link className="card p-4" to="/patients"><span>ADAM samples returned</span><strong>{count(samples?.length)}</strong></Link>
      <Link className="card p-4" to="/patients"><span>Participants in returned samples</span><strong>{count(samples && new Set(samples.map(s => s.study_id)).size)}</strong></Link>
      <Link className="card p-4" to="/research"><span>Cataloged datasets</span><strong>{count(registry?.length)}</strong></Link>
    </div><div className="overview-columns"><ValidationStatus />
    <section className="record-finder card p-4 space-y-2"><label>Find a research record <span className="record-input"><Search size={16}/><input className="bg-surface-900 border rounded p-2" value={id} onChange={e => setId(e.target.value)} placeholder="Sample ID" /></span></label>
      {loading && <p role="status">Loading records…</p>}
      {!loading && !samples && <p>Record index unavailable.</p>}
      {!id && recentRecords().some(r=>samples?.some(s=>s.sample_id===r)) && <div className="export-actions">Recent records {recentRecords().filter(r=>samples?.some(s=>s.sample_id===r)).map(r=><Link key={r} to={'/reports?sample='+encodeURIComponent(r)}>{r}</Link>)}</div>}
      {rows?.slice(0, 5).map(s => <p key={s.sample_id}><Link className="record-item" to={'/reports?sample=' + encodeURIComponent(s.sample_id)}>{s.sample_id} · {s.study_id}<ChevronRight size={14}/></Link></p>)}
      {rows?.length === 0 && <p>No matching record.</p>}
    </section></div></div>
}
