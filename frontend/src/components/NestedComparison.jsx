import React, { useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { ForestPlot } from './ui/RichDataDisplays'

export default function NestedComparison() {
  const [run, setRun] = useState(undefined)
  useEffect(() => {
    let active = true
    apiClient.get('/research/nested-comparison').then(r => { if (active) setRun(r.data) })
      .catch(() => { if (active) setRun(null) })
    return () => { active = false }
  }, [])

  if (!run) return <p className="text-xs text-surface-400 p-4">{run === undefined ? 'Loading benchmark...' : 'Saved benchmark unavailable.'}</p>

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
        <div>
          <h2 className="text-base font-bold text-surface-50">Nested subject-level comparison</h2>
          <p className="text-xs text-surface-400 mt-1">
            {run.subjects} participants, {run.visits} visits. {run.unit}. All models use the same {run.outer_folds} outer folds, {run.inner_folds} inner folds and seed {run.seed}.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-700/60">
        <table className="w-full text-xs text-left">
          <thead className="bg-surface-850/80 text-surface-300 font-semibold uppercase tracking-wider border-b border-surface-700/60">
            <tr>
              <th scope="col" className="p-3">Model</th>
              <th scope="col" className="p-3">Metric</th>
              <th scope="col" className="p-3 font-mono text-right">Estimate</th>
              <th scope="col" className="p-3 font-mono">95% CI</th>
              <th scope="col" className="p-3">Forest Plot (0 to 1)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/40">
            {Object.entries(run.models).flatMap(([model, data]) =>
              Object.entries(data.metrics).map(([name, m]) => {
                const isTrainingPrevConstant = model === 'Training prevalence' && (name.includes('Calibration') || name.includes('AUROC'))
                return (
                  <tr key={model + name} className="hover:bg-surface-800/40 transition-colors">
                    <td className="p-3 font-medium text-surface-100">{model}</td>
                    <td className="p-3 text-surface-300 flex items-center gap-1.5">
                      <span>{name}</span>
                      {isTrainingPrevConstant && (
                        <span
                          className="cursor-help text-[10px] text-amber-400 border border-amber-500/30 px-1 rounded"
                          title="Training-prevalence baseline: calibration slope/intercept are not meaningful for constant predictor; AUROC varies from 0.5 solely due to cross-validation fold-prevalence fluctuations."
                        >
                          *
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-surface-50 text-right tabular-nums">
                      {m.value.toFixed(3)}
                    </td>
                    <td className="p-3 font-mono text-surface-300 tabular-nums">
                      {m.ci95.map(v => v.toFixed(3)).join(' to ')}
                    </td>
                    <td className="p-3">
                      {(name === 'AUROC' || name === 'Brier') && (
                        <ForestPlot estimate={m.value} ci={m.ci95} min={0} max={1} />
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-surface-400 space-y-1 bg-surface-900/60 p-3 rounded-lg border border-surface-700/50">
        <p><strong>* Footnote on baseline:</strong> For the training-prevalence baseline, calibration slope and intercept are mathematically not meaningful for a constant predictor, and AUROC differs from 0.5 only because fold-level prevalence changes across splits.</p>
        <p><strong>ADAM agent workflow:</strong> {run['ADAM agent workflow']}</p>
        <p><strong>Intervals:</strong> {run.interval}.</p>
      </div>
    </section>
  )
}
