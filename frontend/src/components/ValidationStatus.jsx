import React, { useEffect, useState } from 'react'
import { fetchRigorReport } from '../api/client'

export default function ValidationStatus() {
  const [result, setResult] = useState(undefined)
  const [internal, setInternal] = useState(null)
  useEffect(() => {
    let active = true
    fetchRigorReport().then(r => { if (active) { setResult(r.alzbiom ?? null); setInternal({ n: r.provenance?.n_subjects, metrics: r.repeated?.summary?.full_subject }) } })
      .catch(() => { if (active) setResult(null) })
    return () => { active = false }
  }, [])
  return <section className="card p-4 space-y-2"><h2>Validation status</h2>
    {internal?.metrics && <div><h3>ADAM repeated subject-level evaluation · full feature set</h3>
      {[['AUROC', 'subject_auc_repeat_averaged_probability'], ['Brier', 'brier']].map(([label, key]) => {
        const metric = internal.metrics[key]
        return metric && <p key={key}>{label} {metric.estimate.toFixed(3)} (95% CI {metric.ci95.map(v => v.toFixed(3)).join('–')}, n={internal.n} subjects)</p>
      })}</div>}
    {result ? <p>Frozen genus-level logistic regression trained on {result.source_subjects} ADAM participants.
      AlzBiom (n={result.external_records}): AUROC {result.auc.toFixed(3)} (95% CI {result.auc_ci95.map(v => v.toFixed(3)).join('â€“')}).
      Brier {result.brier.toFixed(5)} versus {result.source_prior_brier.toFixed(5)} for the training prevalence.
      No detectable transfer. The interval is conditional on the fitted model.</p> :
      <p>{result === undefined ? 'Loading validation artifactâ€¦' : 'External evaluation artifact unavailable.'}</p>}
    <p>The species-plus-clinical model and its conformal coverage remain externally unvalidated.</p>
    <a className="text-accent-400 underline" href="/rigor">Internal evaluation and uncertainty</a>
  </section>
}
