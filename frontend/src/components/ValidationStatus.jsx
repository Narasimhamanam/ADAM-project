import React, { useEffect, useState } from 'react'
import { fetchRigorReport } from '../api/client'

function Reliability({ bins }) {
  const points = (bins || []).filter(b => b.n > 0 && Number.isFinite(b.mean_predicted) && Number.isFinite(b.observed_rate))
  if (!points.length) return <p>Calibration curve unavailable.</p>
  const xy = points.map(b => (40 + 230 * b.mean_predicted) + ',' + (145 - 120 * b.observed_rate)).join(' ')
  return <details><summary>XGBoost reliability curve (last internal repeat)</summary>
    <figure><svg viewBox="0 0 300 180" width="300" role="img" aria-label="Observed case fraction versus predicted probability, both from zero to one">
      <path d="M40 25V145H270" fill="none" stroke="currentColor" />
      <path d="M40 145L270 25" fill="none" stroke="gray" strokeDasharray="4 3" />
      <polyline points={xy} fill="none" stroke="currentColor" strokeWidth="2" />
      <g fill="currentColor" fontSize="9"><text x="4" y="20">Observed fraction</text><text x="100" y="172">Predicted probability</text>
        <text x="26" y="29">1</text><text x="26" y="146">0</text><text x="40" y="158">0</text><text x="268" y="158">1</text></g>
    </svg><figcaption>Solid line: observed fractions in nonempty bins. Dashed line: perfect calibration.
      Visits in this repeat: {points.reduce((n, b) => n + b.n, 0)}.</figcaption></figure>
  </details>
}

export default function ValidationStatus() {
  const [report, setReport] = useState(undefined)
  useEffect(() => {
    let active = true
    fetchRigorReport().then(data => { if (active) setReport(data) })
      .catch(() => { if (active) setReport(null) })
    return () => { active = false }
  }, [])
  const metrics = report?.repeated?.summary?.full_subject
  const ext = report?.alzbiom
  const status = report?.validation_status
  const cohort = status?.genus_model
  return <section className="card p-4 space-y-2"><h2>Validation status</h2>
    {report === undefined ? <p>Loading validation artifacts...</p> : <>
      {metrics && <div><h3>Internal repeated subject-level evaluation, full feature set</h3>
        {[['AUROC', 'subject_auc_repeat_averaged_probability'], ['Brier', 'brier']].map(([label, key]) => {
          const metric = metrics[key]
          return metric && <p key={key}>{label} {metric.estimate.toFixed(3)} (95% CI {metric.ci95.map(v => v.toFixed(3)).join(' to ')}, n={report.provenance.n_subjects} subjects)</p>
        })}</div>}
      <Reliability bins={report?.calibration?.reliability_bins_raw_last_repeat} />
      {ext && cohort && cohort.cases + cohort.controls === ext.external_records ? <p>
        Frozen genus-level logistic regression trained on {ext.source_subjects} ADAM subjects.
        {' '}{cohort.cohort} included {cohort.cases} cases and {cohort.controls} controls.
        AUROC {ext.auc.toFixed(3)} (95% CI {ext.auc_ci95.map(v => v.toFixed(3)).join(' to ')}).
        Brier {ext.brier.toFixed(5)} versus {ext.source_prior_brier.toFixed(5)} for training prevalence.
        {' '}{cohort.interpretation} {cohort.interval_scope}</p> : <p>External evaluation details unavailable.</p>}
      <p>{status?.species_clinical || 'Species model validation status unavailable.'}</p>
    </>}<a className="text-accent-400 underline" href="/rigor">Internal evaluation and uncertainty</a>
  </section>
}
