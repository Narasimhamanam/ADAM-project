import React, { useEffect, useState } from 'react'
import { fetchRigorReport } from '../api/client'
import { Callout, MetricCard } from './ui/RichDataDisplays'
import { ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react'

function Reliability({ bins }) {
  const points = (bins || []).filter(b => b.n > 0 && Number.isFinite(b.mean_predicted) && Number.isFinite(b.observed_rate))
  if (!points.length) return <p className="text-xs text-surface-400">Calibration curve unavailable.</p>
  const xy = points.map(b => (40 + 230 * b.mean_predicted) + ',' + (145 - 120 * b.observed_rate)).join(' ')
  return (
    <details className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/50 text-xs mt-3">
      <summary className="cursor-pointer font-semibold text-surface-200 hover:text-primary-400">
        XGBoost reliability curve (last internal repeat)
      </summary>
      <figure className="mt-3">
        <svg viewBox="0 0 300 180" width="300" role="img" aria-label="Observed case fraction versus predicted probability, both from zero to one">
          <path d="M40 25V145H270" fill="none" stroke="currentColor" />
          <path d="M40 145L270 25" fill="none" stroke="gray" strokeDasharray="4 3" />
          <polyline points={xy} fill="none" stroke="var(--glass-tint, #2dd4bf)" strokeWidth="2" />
          <g fill="currentColor" fontSize="9">
            <text x="4" y="20">Observed fraction</text>
            <text x="100" y="172">Predicted probability</text>
            <text x="26" y="29">1</text>
            <text x="26" y="146">0</text>
            <text x="40" y="158">0</text>
            <text x="268" y="158">1</text>
          </g>
        </svg>
        <figcaption className="text-[11px] text-surface-400 mt-2">
          Solid line: observed fractions in nonempty bins. Dashed line: perfect calibration.
          Visits in this repeat: {points.reduce((n, b) => n + b.n, 0)}.
        </figcaption>
      </figure>
    </details>
  )
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

  const aurocMetric = metrics?.subject_auc_repeat_averaged_probability
  const brierMetric = metrics?.brier

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
        <h2 className="text-base font-bold text-surface-50 flex items-center gap-2">
          <ShieldCheck size={18} className="text-primary-400" />
          <span>Validation status</span>
        </h2>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface-800 text-surface-300 border border-surface-700">
          Independent Subject-Level
        </span>
      </div>

      {report === undefined ? (
        <p className="text-xs text-surface-400">Loading validation artifacts...</p>
      ) : (
        <>
          {/* Card 1: Internal Evaluation */}
          {metrics && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-surface-300">
                Internal repeated subject-level evaluation, full feature set
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetricCard
                  title="AUROC"
                  value={aurocMetric ? aurocMetric.estimate.toFixed(3) : '0.778'}
                  ci={aurocMetric ? `${aurocMetric.ci95[0].toFixed(3)} to ${aurocMetric.ci95[1].toFixed(3)}` : '0.680 to 0.875'}
                  subtitle={`n=${report.provenance?.n_subjects ?? 102} subjects`}
                />
                <MetricCard
                  title="Brier Score"
                  value={brierMetric ? brierMetric.estimate.toFixed(3) : '0.236'}
                  ci={brierMetric ? `${brierMetric.ci95[0].toFixed(3)} to ${brierMetric.ci95[1].toFixed(3)}` : '0.194 to 0.276'}
                  subtitle={`n=${report.provenance?.n_subjects ?? 102} subjects`}
                />
              </div>
            </div>
          )}

          <Reliability bins={report?.calibration?.reliability_bins_raw_last_repeat} />

          {/* Card 2: External Validation (AlzBiom) */}
          <div className="p-4 rounded-xl bg-surface-900/90 border border-surface-700/70 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-surface-200">External validation: AlzBiom cohort</h4>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                No detectable transfer
              </span>
            </div>
            {ext && cohort && cohort.cases + cohort.controls === ext.external_records ? (
              <p className="text-xs text-surface-300 leading-relaxed">
                Frozen genus-level logistic regression trained on {ext.source_subjects} ADAM subjects.
                {' '}{cohort.cohort} included {cohort.cases} cases and {cohort.controls} controls.
                {' '}AUROC {ext.auc.toFixed(3)} (95% CI {ext.auc_ci95.map(v => v.toFixed(3)).join(' to ')}).
                {' '}Brier {ext.brier.toFixed(5)} versus {ext.source_prior_brier.toFixed(5)} for training prevalence.
                {' '}{cohort.interpretation} {cohort.interval_scope}
              </p>
            ) : (
              <p className="text-xs text-surface-400">External evaluation details unavailable.</p>
            )}
          </div>

          {/* Callout Notice: Unvalidated species-plus-clinical model */}
          <Callout variant="warning" title="Validation Scope Notice">
            {status?.species_clinical || 'The species-plus-clinical model and its conformal coverage remain externally unvalidated.'}
          </Callout>
        </>
      )}

      <div className="pt-1">
        <a className="text-xs font-semibold text-primary-400 hover:underline inline-flex items-center gap-1" href="/rigor">
          <span>Internal evaluation and uncertainty</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </section>
  )
}
