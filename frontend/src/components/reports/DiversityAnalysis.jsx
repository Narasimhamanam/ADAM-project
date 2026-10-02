import React from 'react';
import { Sparkles, Compass } from 'lucide-react';

function formatShannonDiversity(val) {
  if (val !== undefined && val !== null && !isNaN(Number(val))) {
    return `${Number(val).toFixed(2)} (H')`;
  }
  return 'Not reported in cohort';
}

function formatBetaDiversity(val) {
  if (val !== undefined && val !== null && !isNaN(Number(val))) {
    return `${Number(val).toFixed(4)} (Bray-Curtis)`;
  }
  return 'Not reported in cohort';
}

export default function DiversityAnalysis({ sampleData }) {
  const shannonRaw = sampleData?.secondary_covariates?.shannon_diversity ?? sampleData?.covariates?.shannon_diversity;
  const brayRaw = sampleData?.secondary_covariates?.bray_curtis_distance ?? sampleData?.covariates?.bray_curtis_distance;

  const isShannonReported = shannonRaw !== undefined && shannonRaw !== null && !isNaN(Number(shannonRaw));
  const isBrayReported = brayRaw !== undefined && brayRaw !== null && !isNaN(Number(brayRaw));

  return (
    <section className="space-y-3 print:space-y-2">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-200">
        <div className="flex items-center gap-2">
          <Compass size={16} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Alpha &amp; Beta Ecological Diversity Analysis
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-500 font-mono">
          Community Structure Metrics
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Alpha Diversity Card */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-surface-400 print:text-slate-600">
              Alpha Diversity
            </h3>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              isShannonReported
                ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                : 'bg-surface-800 text-surface-400 border border-surface-700/60 print:bg-slate-100 print:text-slate-600'
            }`}>
              {isShannonReported ? 'Measured' : 'Cohort Unmeasured'}
            </span>
          </div>

          <div className="pt-1">
            <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">
              Shannon Diversity Index (H')
            </p>
            <p className="text-base font-extrabold text-surface-50 print:text-slate-900 font-mono mt-0.5">
              {formatShannonDiversity(shannonRaw)}
            </p>
          </div>

          <div className="pt-2 border-t border-surface-700/40 print:border-slate-200 text-xs text-surface-300 print:text-slate-700 leading-relaxed">
            <p className="text-[11px]">
              <strong>Ecological Interpretation:</strong> Quantifies both species richness and equitable abundance distribution. Cohort benchmark investigations demonstrate that reduced alpha diversity associates with depletion of keystone butyrate synthesizers and accelerated physiological frailty.
            </p>
          </div>
        </div>

        {/* Beta Diversity Card */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-surface-400 print:text-slate-600">
              Beta Diversity
            </h3>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
              isBrayReported
                ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30'
                : 'bg-surface-800 text-surface-400 border border-surface-700/60 print:bg-slate-100 print:text-slate-600'
            }`}>
              {isBrayReported ? 'Measured' : 'Cohort Unmeasured'}
            </span>
          </div>

          <div className="pt-1">
            <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">
              Bray-Curtis Dissimilarity Distance
            </p>
            <p className="text-base font-extrabold text-surface-50 print:text-slate-900 font-mono mt-0.5">
              {formatBetaDiversity(brayRaw)}
            </p>
          </div>

          <div className="pt-2 border-t border-surface-700/40 print:border-slate-200 text-xs text-surface-300 print:text-slate-700 leading-relaxed">
            <p className="text-[11px]">
              <strong>Ecological Interpretation:</strong> Evaluates compositional divergence from reference cohort centroids. Beta diversity shifts capture wholesale ecological transitions linked to enteric mucosal permeability and systemic immune engagement.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
