import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiClient, fetchAvailableSamples } from '../api/client'
import ShapDivergingChart from '../components/reports/ShapDivergingChart'
import ValidationStatus from '../components/ValidationStatus'

export default function ReportsEvidence() {
  const [params, setParams] = useSearchParams()
  const id = (params.get('sample') || '').trim().toUpperCase()
  const [draft, setDraft] = useState(id)
  const [choices, setChoices] = useState([])
  const [result, setResult] = useState(null)
  useEffect(() => {
    fetchAvailableSamples(6).then(setChoices).catch(() => setChoices([]))
  }, [])
  useEffect(() => {
    setDraft(id)
    if (!id) return
    const controller = new AbortController()
    const options = { signal: controller.signal }
    async function load() {
      try {
        const { data: sample } = await apiClient.get('/samples/' + encodeURIComponent(id), options)
        if (sample.sample_id !== id) throw new Error('Returned record does not match the selection.')
        const predictions = await Promise.all(['xgboost', 'randomforest', 'logisticregression'].map(async model => {
          try {
            const { data } = await apiClient.post('/ml/predict', { sample_id: id, model_name: model }, options)
            return data.sample_id === id ? data : null
          } catch { return null }
        }))
        if (!controller.signal.aborted) setResult({ id, sample, predictions })
      } catch (error) {
        if (!controller.signal.aborted) setResult({ id, error: error.response?.status === 404 ? 'Record not found.' : 'Could not load this record.' })
      }
    }
    setResult(null)
    load()
    return () => controller.abort()
  }, [id])
  const current = result?.id === id ? result : null
  return <div className="space-y-4"><h1 className="text-xl font-bold">Reports &amp; Evidence</h1>
    <p>Research use only, not a medical device.</p>
    <form className="card p-4 flex gap-3 flex-wrap" onSubmit={e => { e.preventDefault(); setParams({ sample: draft.trim().toUpperCase() }) }}>
      <label>Sample ID <input required maxLength={80} className="bg-surface-900 border rounded p-2" value={draft} onChange={e => setDraft(e.target.value)} /></label>
      <button>Generate dossier</button>
      {choices.map(s => <button type="button" className="text-accent-400" key={s.sample_id} onClick={() => setParams({ sample: s.sample_id })}>{s.sample_id}</button>)}
    </form>
    <div aria-live="polite">{!id ? 'Select a record to generate a dossier.' : !current ? 'Loading ' + id + '…' : current.error ||
      <section className="card p-5 space-y-3"><h2>Sample {id} · Subject {current.sample.study_id ?? 'unavailable'}</h2>
        <p>Collection day {current.sample.day ?? 'unavailable'}</p>
        {['XGBoost', 'Random forest', 'Logistic regression'].map((name, i) => <p key={name}>{name} probability: {Number.isFinite(current.predictions[i]?.alzheimers_risk_probability) ? (current.predictions[i].alzheimers_risk_probability * 100).toFixed(1) + '%' : 'Unavailable'}</p>)}
        <p>Individual probability intervals are unavailable.</p><ShapDivergingChart predictionData={current.predictions[0]} />
        <button onClick={() => window.print()}>Print / save PDF</button>
      </section>}</div><ValidationStatus /><a href="/assistant">Search literature with AIRA</a></div>
}
