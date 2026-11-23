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
  return <div className="space-y-5"><h1 className="text-xl font-bold">ADAM research dashboard</h1>
    <div className="grid gap-3 sm:grid-cols-3">
      <Link className="card p-4" to="/patients">ADAM samples returned · {count(samples?.length)}</Link>
      <Link className="card p-4" to="/patients">Participants in returned samples · {count(samples && new Set(samples.map(s => s.study_id)).size)}</Link>
      <Link className="card p-4" to="/research">Cataloged datasets · {count(registry?.length)}</Link>
    </div><ValidationStatus />
    <section className="card p-4 space-y-2"><label>Find a research record <input className="bg-surface-900 border rounded p-2" value={id} onChange={e => setId(e.target.value)} placeholder="Sample ID" /></label>
      {rows?.slice(0, 5).map(s => <p key={s.sample_id}><Link className="underline text-accent-400" to={'/reports?sample=' + encodeURIComponent(s.sample_id)}>{s.sample_id} · {s.study_id}</Link></p>)}
      {rows?.length === 0 && <p>No matching record.</p>}
    </section></div>
}
