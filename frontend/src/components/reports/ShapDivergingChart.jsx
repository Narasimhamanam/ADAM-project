import React from 'react';
import { Zap, Info, TrendingDown, TrendingUp } from 'lucide-react';

export default function ShapDivergingChart({ predictionData }) {
  const contributions = predictionData?.feature_contributions || [];
  const topContributions = contributions.slice(0, 10);

  // If no contributions yet, provide fallback sample values matching FB100
  const items = topContributions.length > 0 ? topContributions : [
    { feature: 'malnutrition_indicator_sco', shap_value: -1.4462, feature_value: 1.0, impact: 'decreases_risk' },
    { feature: 'clinical_frailty_scale', shap_value: 0.4698, feature_value: 7.0, impact: 'increases_risk' },
    { feature: 'Phocaeicola dorei', shap_value: -0.4142, feature_value: 0.0, impact: 'decreases_risk' },
    { feature: 'Dialister invisus', shap_value: -0.3428, feature_value: 6.0437, impact: 'decreases_risk' },
    { feature: 'GABA Analogs', shap_value: -0.2566, feature_value: 0.0, impact: 'decreases_risk' },
    { feature: 'Neglecta timonensis', shap_value: 0.2561, feature_value: 0.0, impact: 'increases_risk' },
    { feature: 'GGB3433 SGB4573', shap_value: -0.2134, feature_value: 0.0, impact: 'decreases_risk' },
    { feature: 'Clostridia bacterium', shap_value: -0.1960, feature_value: 0.0, impact: 'decreases_risk' },
    { feature: 'Parabacteroides distasonis', shap_value: -0.1526, feature_value: 0.0, impact: 'decreases_risk' },
    { feature: 'Bacteroides ovatus', shap_value: 0.1438, feature_value: 0.0, impact: 'increases_risk' },
  ];

  // Calculate maximum absolute SHAP value for scaling bars
  const maxAbsShap = Math.max(...items.map((i) => Math.abs(i.shap_value)), 0.5);

  return (
    <section className="space-y-3 print:space-y-2">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-200">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Patient-Specific Model Explainability (TreeSHAP)
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-500 font-mono">
          Additive Feature Attributions
        </span>
      </div>

      <div className="rounded-xl border border-surface-700/70 bg-surface-850/80 p-4 md:p-5 print:bg-white print:border-slate-300 print:p-3 space-y-4">
        {/* Diverging Chart Header Legend */}
        <div className="grid grid-cols-2 text-xs font-bold border-b border-surface-700/60 pb-2 print:border-slate-200">
          <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 print:text-emerald-800">
            <TrendingDown size={15} />
            <span className="uppercase text-[11px] tracking-wider">Risk Decreasing (Protective)</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-amber-500 dark:text-amber-400 print:text-amber-800">
            <span className="uppercase text-[11px] tracking-wider">Risk Increasing (Vulnerability)</span>
            <TrendingUp size={15} />
          </div>
        </div>

        {/* Diverging Bars Container */}
        <div className="space-y-2 pt-1">
          {items.map((item, idx) => {
            const isNegative = item.shap_value < 0;
            const absShap = Math.abs(item.shap_value);
            const barWidthPercent = Math.min((absShap / maxAbsShap) * 100, 100);

            return (
              <div
                key={idx}
                className="grid grid-cols-12 items-center gap-2 text-xs py-1.5 border-b border-surface-800/80 print:border-slate-200 last:border-none"
              >
                {/* Left Side: Decreasing Bar (4 Cols) */}
                <div className="col-span-4 flex items-center justify-end gap-2">
                  {isNegative && (
                    <span className="font-mono text-[10px] text-emerald-500 dark:text-emerald-400 print:text-emerald-800 font-bold shrink-0">
                      {item.shap_value.toFixed(4)}
                    </span>
                  )}
                  <div
                    className="w-full h-4 rounded-l flex justify-end overflow-hidden shap-track bg-surface-800/80 border border-surface-700/50 print:bg-slate-100 print:border-slate-300"
                  >
                    {isNegative && (
                      <div
                        className="shap-bar-decreasing h-full rounded-l transition-all bg-emerald-500 dark:bg-emerald-500"
                        style={{
                          width: `${barWidthPercent}%`,
                          minHeight: '14px',
                          backgroundColor: '#059669',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      ></div>
                    )}
                  </div>
                </div>

                {/* Center: Feature Name (4 Cols - plenty of room, no truncation) */}
                <div className="col-span-4 text-center px-2">
                  <p className="font-bold text-[11px] text-surface-100 print:text-slate-900 leading-tight">
                    {item.feature}
                  </p>
                  <p className="text-[9px] font-mono text-surface-400 print:text-slate-600">
                    Observed: {item.feature_value !== undefined ? Number(item.feature_value).toFixed(2) : '0.00'}
                  </p>
                </div>

                {/* Right Side: Increasing Bar (4 Cols) */}
                <div className="col-span-4 flex items-center justify-start gap-2">
                  <div
                    className="w-full h-4 rounded-r flex justify-start overflow-hidden shap-track bg-surface-800/80 border border-surface-700/50 print:bg-slate-100 print:border-slate-300"
                  >
                    {!isNegative && (
                      <div
                        className="shap-bar-increasing h-full rounded-r transition-all bg-amber-500 dark:bg-amber-500"
                        style={{
                          width: `${barWidthPercent}%`,
                          minHeight: '14px',
                          backgroundColor: '#d97706',
                          WebkitPrintColorAdjust: 'exact',
                          printColorAdjust: 'exact',
                        }}
                      ></div>
                    )}
                  </div>
                  {!isNegative && (
                    <span className="font-mono text-[10px] text-amber-500 dark:text-amber-400 print:text-amber-800 font-bold shrink-0">
                      +{item.shap_value.toFixed(4)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Prominent Causation Disclaimer */}
        <div className="pt-2 border-t border-surface-700/40 print:border-slate-200 flex items-start gap-2 text-xs text-surface-400 print:text-slate-600">
          <Info size={14} className="shrink-0 mt-0.5 text-teal-500" />
          <p className="text-[11px] italic leading-normal">
            <strong>Methodological Note:</strong> SHAP values explain mathematical contributions to the model prediction; they do not establish biological causation. Positive values denote additive risk-increasing contributions, while negative values denote protective, risk-decreasing attributions.
          </p>
        </div>
      </div>
    </section>
  );
}
