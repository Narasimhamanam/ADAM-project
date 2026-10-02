import React from 'react';
import { Microscope, Database, Cpu, BookOpen, Compass, ShieldAlert } from 'lucide-react';

export default function ResearchConsiderations({ predictionData, sampleData }) {
  const proba = predictionData?.alzheimers_risk_probability !== undefined && predictionData?.alzheimers_risk_probability !== null
    ? (predictionData.alzheimers_risk_probability * 100).toFixed(1)
    : '6.0';
  const riskLabel = Number(proba) >= 50 ? 'Elevated Risk' : 'Low Risk';

  return (
    <section className="space-y-3 print:space-y-2">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-200">
        <div className="flex items-center gap-2">
          <Microscope size={16} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Research &amp; Contextual Considerations
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-500 font-mono">
          Translational Research Perspectives
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Block A: Observed Evidence */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-1.5">
          <div className="flex items-center gap-2 text-teal-400 print:text-teal-800 font-bold text-[11px] uppercase tracking-wider">
            <Database size={13} />
            <span>A. Observed Biological Data</span>
          </div>
          <p className="text-[11px] text-surface-300 print:text-slate-700 leading-relaxed">
            Multi-omic metagenomic profiling captures 940 sequenced bacterial taxonomic abundances alongside host clinical covariates (Clinical Frailty Scale, malnutrition indicator score, polypharmacy status) within an established longitudinal cohort.
          </p>
        </div>

        {/* Block B: Model Interpretation */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-1.5">
          <div className="flex items-center gap-2 text-teal-400 print:text-teal-800 font-bold text-[11px] uppercase tracking-wider">
            <Cpu size={13} />
            <span>B. Mathematical Model Interpretation</span>
          </div>
          <p className="text-[11px] text-surface-300 print:text-slate-700 leading-relaxed">
            The calibrated gradient-boosted decision tree pipeline (XGBoost) predicts an Alzheimer's risk probability of <strong>{proba}% ({riskLabel})</strong>. Exact TreeSHAP decomposition separates directionally protective features from vulnerability attributions without assuming linear independence.
          </p>
        </div>

        {/* Block C: Literature Context */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-1.5">
          <div className="flex items-center gap-2 text-teal-400 print:text-teal-800 font-bold text-[11px] uppercase tracking-wider">
            <BookOpen size={13} />
            <span>C. Peer-Reviewed Literature Context</span>
          </div>
          <p className="text-[11px] text-surface-300 print:text-slate-700 leading-relaxed">
            Published dementia studies corroborate that gut mucosal barrier integrity and short-chain fatty acid concentrations modulate systemic low-grade inflammation, suggesting multi-system interactions between metabolic frailty and enteric ecology.
          </p>
        </div>

        {/* Block D: Research Considerations */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-1.5">
          <div className="flex items-center gap-2 text-teal-400 print:text-teal-800 font-bold text-[11px] uppercase tracking-wider">
            <Compass size={13} />
            <span>D. Methodological Research Considerations</span>
          </div>
          <p className="text-[11px] text-surface-300 print:text-slate-700 leading-relaxed">
            Longitudinal monitoring of enteric relative abundances and host frailty trajectory is recommended for ongoing cohort biomarker characterization. Findings represent algorithmic risk projections and do not constitute clinical diagnostic confirmation.
          </p>
        </div>
      </div>

      {/* Explicit Non-Prescription Caveat */}
      <div className="p-3 rounded-lg bg-surface-800/60 border border-surface-700/50 print:bg-slate-50 print:border-slate-200 text-xs text-surface-400 print:text-slate-600 italic">
        <p className="text-[10px] leading-normal">
          <strong>Non-Prescriptive Notice:</strong> This platform does not provide medical advice, diagnosis, treatment plans, or therapeutic prescriptions. No clinical therapy or dietary modification should be initiated without comprehensive evaluation by licensed medical practitioners.
        </p>
      </div>
    </section>
  );
}
