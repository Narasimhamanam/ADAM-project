import React, { useEffect, useState } from 'react'
import { apiClient } from '../api/client'

export default function NestedComparison() {
  const [run, setRun] = useState(undefined)
  useEffect(() => {
    let active = true
    apiClient.get('/research/nested-comparison').then(r => { if (active) setRun(r.data) })
      .catch(() => { if (active) setRun(null) })
    return () => { active = false }
  }, [])
  if (!run) return <p>{run === undefined ? 'Loading benchmark...' : 'Saved benchmark unavailable.'}</p>
  return <section className="card p-4 space-y-2"><h2>Nested subject-level comparison</h2>
    <p>{run.subjects} participants, {run.visits} visits. {run.unit}. All models use the same {run.outer_folds} outer folds, {run.inner_folds} inner folds and seed {run.seed}.</p>
    <div className="overflow-x-auto"><table className="text-sm"><caption>Point estimates and 95% subject-bootstrap intervals</caption><thead><tr><th>Model</th><th>Metric</th><th>Estimate</th><th>95% CI</th></tr></thead>
      <tbody>{Object.entries(run.models).flatMap(([model, data]) => Object.entries(data.metrics).map(([name, m]) =>
        <tr key={model + name}><td className="p-2">{model}</td><td>{name}</td><td className="p-2">{m.value.toFixed(3)}</td><td>{m.ci95.map(v => v.toFixed(3)).join(' to ')}</td></tr>))}</tbody></table></div>
    <p>ADAM agent workflow: {run['ADAM agent workflow']}</p><p>Intervals: {run.interval}.</p>
  </section>
}
