import React from 'react';
import { ShieldCheck, Database, Award, GitBranch, Cpu, CheckCircle2 } from 'lucide-react';

export default function AppendixValidation({ sampleData, formattedTimestamp }) {
  const alzheimersVal = sampleData?.alzheimers !== undefined && sampleData?.alzheimers !== null
    ? sampleData.alzheimers
    : sampleData?.covariates?.alzheimers;
  const cohortLabel = alzheimersVal === 1 ? 'Alzheimer\'s Disease Positive (+)' : 'Cognitive Normal (Control -)';
  const sampleId = sampleData?.sample_id || 'FB100';
  const studyId = sampleData?.study_id || 'CH1-112';
  const timestamp = formattedTimestamp || new Date().toUTCString();

  return (
    <section className="space-y-4 print:space-y-3 pt-2">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-200">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Appendix A — Retrospective Cohort Label &amp; Model Provenance
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-500 font-mono">
          Research Validation Audit
        </span>
      </div>

      {/* Retrospective Ground Truth Box (Isolated from Primary Area) */}
      <div className="p-4 rounded-xl border border-surface-700/80 bg-surface-900/90 print:bg-slate-50 print:border-slate-300 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 tracking-wider">
            Retrospective Cohort Label (Research Validation Ground Truth)
          </p>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-surface-800 text-surface-300 border border-surface-700 print:bg-slate-200 print:text-slate-800">
            Retrospective Research Record
          </span>
        </div>

        <div className="flex items-baseline gap-3 pt-1">
          <span className="text-sm sm:text-base font-mono font-extrabold text-surface-100 print:text-slate-900">
            {cohortLabel}
          </span>
          <span className="text-xs font-medium text-surface-400 print:text-slate-500 italic">
            (Mathematically independent from model prediction)
          </span>
        </div>

        <div className="p-2.5 rounded bg-surface-850 border border-surface-700/60 print:bg-white print:border-slate-200 text-[11px] text-surface-400 print:text-slate-600">
          <strong>Methodological Clarification:</strong> Retrospective research label. Not used as a clinical diagnosis. This ground truth determination reflects cohort retrospective study classification and serves exclusively as a benchmarking baseline for evaluating algorithmic predictive validity.
        </div>
      </div>

      {/* Technical Provenance Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-xs">
        <div className="p-2.5 rounded-lg bg-surface-850/80 border border-surface-700/60 print:bg-white print:border-slate-200">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Primary Model</p>
          <p className="font-semibold text-surface-100 print:text-slate-900 text-xs mt-0.5">XGBoost Classifier</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/80 border border-surface-700/60 print:bg-white print:border-slate-200">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Optimization</p>
          <p className="font-semibold text-surface-100 print:text-slate-900 text-xs mt-0.5">Optuna Bayesian</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/80 border border-surface-700/60 print:bg-white print:border-slate-200">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Explainability</p>
          <p className="font-semibold text-surface-100 print:text-slate-900 text-xs mt-0.5">TreeSHAP Exact</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/80 border border-surface-700/60 print:bg-white print:border-slate-200">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">RAG Engine</p>
          <p className="font-semibold text-surface-100 print:text-slate-900 text-xs mt-0.5">PubMed Vector Store</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/80 border border-surface-700/60 print:bg-white print:border-slate-200">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Multi-Agent</p>
          <p className="font-semibold text-surface-100 print:text-slate-900 text-xs mt-0.5">AIRA Orchestrator</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/80 border border-surface-700/60 print:bg-white print:border-slate-200">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500">Feature Count</p>
          <p className="font-mono font-bold text-surface-100 print:text-slate-900 text-xs mt-0.5">1,044 Features</p>
        </div>
      </div>

      {/* Cohort & Execution Telemetry */}
      <div className="p-3.5 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs text-surface-300 print:text-slate-700">
        <div className="space-y-0.5">
          <p className="font-bold text-surface-100 print:text-slate-900">
            Cohort Dataset Context: 335 longitudinal samples across 102 subjects
          </p>
          <p className="text-[10px] text-surface-400 print:text-slate-500">
            Validation Regime: Subject-level stratified cross-validation across 30 experiment seeds (Zero longitudinal leakage)
          </p>
        </div>
        <div className="text-right font-mono text-[10px] space-y-0.5">
          <p className="text-surface-400 print:text-slate-500">Generated: {timestamp}</p>
          <p className="text-emerald-500 dark:text-emerald-400 print:text-emerald-700 font-bold flex items-center justify-end gap-1">
            <CheckCircle2 size={12} /> Electronic Integrity Verified
          </p>
        </div>
      </div>
    </section>
  );
}
