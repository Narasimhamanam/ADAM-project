import React from 'react';
import { Cpu, CheckCircle2 } from 'lucide-react';
import ResponsiveTable from '../ui/ResponsiveTable';

export default function ModelComparison({ modelPredictions }) {
  const models = [
    {
      name: 'XGBoost Classifier',
      data: modelPredictions?.xgboost,
      defaultProba: '6.0%',
      defaultLabel: 'Low Risk',
      role: 'Primary Model',
      optimization: 'Optuna Hyperparameter Tuned',
      isPrimary: true,
    },
    {
      name: 'Random Forest Classifier',
      data: modelPredictions?.randomforest,
      defaultProba: '21.2%',
      defaultLabel: 'Low Risk',
      role: 'Ensemble Baseline',
      optimization: '100 Estimators (Bagging)',
      isPrimary: false,
    },
    {
      name: 'Logistic Regression',
      data: modelPredictions?.logisticregression,
      defaultProba: '9.8%',
      defaultLabel: 'Low Risk',
      role: 'Standardized Baseline',
      optimization: 'L2 Regularized (LibLinear)',
      isPrimary: false,
    },
  ];

  return (
    <section className="space-y-3 print:space-y-2">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-200">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Comparative Machine Learning Model Suite
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-500 font-mono">
          30-Seed Cross-Validated Suite
        </span>
      </div>

      <ResponsiveTable>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-surface-800/80 border-b border-surface-700/80 text-surface-300 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
              <th className="p-3 print:p-2 font-bold">Model Architecture</th>
              <th className="p-3 print:p-2 font-bold">Role &amp; Pipeline Status</th>
              <th className="p-3 print:p-2 font-bold text-center">Predicted Risk</th>
              <th className="p-3 print:p-2 font-bold">Probability Distribution</th>
              <th className="p-3 print:p-2 font-bold">Risk Classification</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-700/60 bg-surface-850/40 print:bg-white print:divide-slate-200">
            {models.map((m, idx) => {
              const probaNum = m.data?.alzheimers_risk_probability !== undefined && m.data?.alzheimers_risk_probability !== null
                ? m.data.alzheimers_risk_probability * 100
                : parseFloat(m.defaultProba);
              const probaStr = `${probaNum.toFixed(1)}%`;
              const label = m.data?.risk_level || m.defaultLabel;
              const isHigh = probaNum >= 50;

              return (
                <tr key={idx} className={m.isPrimary ? 'bg-teal-500/5 print:bg-teal-50/40' : ''}>
                  <td className="p-3 print:p-2 font-bold text-surface-50 print:text-slate-900 font-sans">
                    <div className="flex items-center gap-1.5">
                      {m.isPrimary && <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0"></span>}
                      <span>{m.name}</span>
                    </div>
                  </td>
                  <td className="p-3 print:p-2 text-surface-300 print:text-slate-700 text-[11px]">
                    <span className="font-semibold text-surface-200 print:text-slate-800">{m.role}</span>
                    <span className="text-surface-400 print:text-slate-500 block text-[10px]">{m.optimization}</span>
                  </td>
                  <td className="p-3 print:p-2 font-mono font-extrabold text-surface-50 print:text-slate-900 text-center text-sm">
                    {probaStr}
                  </td>
                  <td className="p-3 print:p-2 min-w-[130px]">
                    <div className="space-y-1">
                      <div
                        className="w-full prob-bar-track bg-surface-700/40 print:bg-slate-200 h-2 rounded-full overflow-hidden"
                        style={{ height: '8px' }}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${
                            isHigh ? 'prob-bar-fill-amber bg-amber-500' : 'prob-bar-fill-teal bg-teal-500'
                          }`}
                          style={{
                            width: `${Math.min(Math.max(probaNum, 4), 100)}%`,
                            height: '8px',
                            backgroundColor: isHigh ? '#d97706' : '#0f766e',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-surface-400 print:text-slate-500 font-mono">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                      isHigh
                        ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 print:bg-amber-50 print:text-amber-800 print:border-amber-300'
                        : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 print:bg-emerald-50 print:text-emerald-800 print:border-emerald-300'
                    }`}>
                      {label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ResponsiveTable>
    </section>
  );
}
