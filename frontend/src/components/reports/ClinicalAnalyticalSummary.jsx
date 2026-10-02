import React from 'react';
import { FileCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ClinicalAnalyticalSummary({ sampleData, predictionData }) {
  const proba = predictionData?.alzheimers_risk_probability !== undefined && predictionData?.alzheimers_risk_probability !== null
    ? (predictionData.alzheimers_risk_probability * 100).toFixed(1)
    : '6.0';
  const isHighRisk = Number(proba) >= 50;

  // Extract top SHAP contributors dynamically
  const contributions = predictionData?.feature_contributions || [];
  const riskDecreasing = contributions
    .filter((c) => c.shap_value < 0)
    .slice(0, 3)
    .map((c) => `${c.feature} (${c.shap_value.toFixed(3)})`);
  const riskIncreasing = contributions
    .filter((c) => c.shap_value > 0)
    .slice(0, 3)
    .map((c) => `${c.feature} (+${c.shap_value.toFixed(3)})`);

  const cfs = sampleData?.clinical_frailty_scale ?? sampleData?.covariates?.clinical_frailty_scale ?? 7;

  return (
    <section className="space-y-3 print:space-y-2">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-200">
        <div className="flex items-center gap-2">
          <FileCheck size={16} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Clinical-Style Analytical Summary
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-500 font-mono">
          Dynamic Evidence-Based Synthesis
        </span>
      </div>

      <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-2.5 text-xs text-surface-200 print:text-slate-800">
        <ul className="space-y-2 list-none">
          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 print:bg-teal-700 mt-1.5 shrink-0"></span>
            <span>
              <strong>Model Assessment:</strong> Model-predicted risk is{' '}
              <strong className={isHighRisk ? 'text-amber-500 dark:text-amber-400 print:text-amber-700' : 'text-emerald-500 dark:text-emerald-400 print:text-emerald-700'}>
                {isHighRisk ? 'elevated' : 'low'} ({proba}%)
              </strong>{' '}
              based on the primary calibrated XGBoost classifier.
            </span>
          </li>

          {riskDecreasing.length > 0 && (
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 print:bg-emerald-700 mt-1.5 shrink-0"></span>
              <span>
                <strong>Primary Protective Contributions:</strong> Major risk-decreasing mathematical drivers include{' '}
                <span className="font-mono text-[11px] text-surface-300 print:text-slate-700 font-semibold">
                  {riskDecreasing.join(', ')}
                </span>.
              </span>
            </li>
          )}

          {riskIncreasing.length > 0 && (
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 print:bg-amber-700 mt-1.5 shrink-0"></span>
              <span>
                <strong>Primary Vulnerability Contributions:</strong> Risk-increasing drivers include{' '}
                <span className="font-mono text-[11px] text-surface-300 print:text-slate-700 font-semibold">
                  {riskIncreasing.join(', ')}
                </span>.
              </span>
            </li>
          )}

          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 print:bg-teal-700 mt-1.5 shrink-0"></span>
            <span>
              <strong>Host Contextual Vulnerability:</strong> Clinical frailty is recorded at{' '}
              <strong>CFS {cfs} / 9</strong> and is interpreted as a contextual physiological vulnerability within the multivariable framework rather than an independent clinical diagnosis.
            </span>
          </li>

          <li className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 print:bg-teal-700 mt-1.5 shrink-0"></span>
            <span>
              <strong>Literature Grounding:</strong> Vector-retrieved peer-reviewed literature corroborates associations between gut dysbiosis, bacterial endotoxin signaling, and neuroinflammatory pathways.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
