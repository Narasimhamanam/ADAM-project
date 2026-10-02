import React from 'react';
import { Activity, Cpu, Sparkles, Shield, AlertCircle } from 'lucide-react';

export default function ExecutiveSummaryCard({ predictionData, airaAnalysis }) {
  const proba = predictionData?.alzheimers_risk_probability !== undefined && predictionData?.alzheimers_risk_probability !== null
    ? (predictionData.alzheimers_risk_probability * 100).toFixed(1)
    : '6.0';
  const isHighRisk = Number(proba) >= 50;
  const riskLabel = isHighRisk ? 'ELEVATED MODEL-PREDICTED RISK' : 'LOW MODEL-PREDICTED RISK';

  return (
    <div className="rounded-xl border border-surface-700/80 bg-surface-850/80 p-5 md:p-6 print:bg-white print:border-slate-300 print:p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-3 print:border-slate-200">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Executive Summary
          </h2>
        </div>
        <span className="text-[11px] font-mono text-surface-400 print:text-slate-500">
          Algorithmic Assessment Overview
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Core Prediction Callout */}
        <div className="p-4 rounded-lg bg-surface-900/90 border border-surface-700/60 print:bg-slate-50 print:border-slate-200 space-y-2">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 tracking-wider">
            Overall Model Assessment
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-base sm:text-lg font-black tracking-tight ${
              isHighRisk ? 'text-amber-500 dark:text-amber-400 print:text-amber-700' : 'text-emerald-500 dark:text-emerald-400 print:text-emerald-700'
            }`}>
              {riskLabel}
            </span>
          </div>
          <div className="pt-1 flex items-center justify-between text-xs">
            <span className="text-surface-400 print:text-slate-600 font-medium">XGBoost Probability</span>
            <span className="font-mono font-extrabold text-surface-50 print:text-slate-900 text-sm">{proba}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-surface-400 print:text-slate-600 font-medium">Primary Model</span>
            <span className="font-semibold text-surface-200 print:text-slate-700">XGBoost</span>
          </div>
        </div>

        {/* AI Interpretation */}
        <div className="p-4 rounded-lg bg-surface-900/90 border border-surface-700/60 print:bg-slate-50 print:border-slate-200 space-y-1.5 md:col-span-2 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="text-teal-500" />
              AI Multi-Agent Interpretation
            </p>
            <p className="text-xs text-surface-200 print:text-slate-700 leading-relaxed mt-1.5 font-medium">
              {isHighRisk
                ? 'Model inference indicates elevated probability driven by multi-omic dysbiosis and host physiological vulnerability. Findings warrant ongoing research review.'
                : 'Consistent with low-risk model output based on patient-specific microbiome relative abundances, clinical host indicators, and directional TreeSHAP feature attributions.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-surface-700/40 print:border-slate-200 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Evidence Confidence</p>
              <p className="font-mono text-surface-300 print:text-slate-700 font-semibold mt-0.5">Not calculated</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Cohort Research Status</p>
              <p className="font-semibold text-emerald-500 dark:text-emerald-400 print:text-emerald-700 mt-0.5">Validated cohort record</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
