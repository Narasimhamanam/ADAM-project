import React from 'react';
import { ShieldCheck, FileText, Calendar, Database, CheckCircle2 } from 'lucide-react';

export default function ReportHeader({ sampleData, formattedDate }) {
  const sampleId = sampleData?.sample_id || 'FB100';
  const studyId = sampleData?.study_id || 'CH1-112';
  const day = sampleData?.day ?? 0;
  const analysisDate = formattedDate || new Date().toISOString().split('T')[0];

  return (
    <div className="report-letterhead border-b border-surface-700/80 pb-5 space-y-4 print:border-slate-300 print:pb-4">
      {/* Top Research Badge & Status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 print:border-slate-400 print:bg-slate-100 print:text-slate-800">
            <ShieldCheck size={12} className="text-teal-500 print:text-slate-700" />
            RESEARCH ANALYSIS REPORT — NOT FOR CLINICAL DIAGNOSIS
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-surface-400 print:text-slate-600 font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Validated Research Record</span>
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between flex-wrap gap-2">
          <h1 className="text-2xl sm:text-3xl font-black text-surface-50 print:text-slate-950 tracking-tight font-sans">
            ADAM-1 ENHANCED
          </h1>
          <span className="text-xs font-semibold text-surface-400 print:text-slate-600 uppercase tracking-widest font-mono">
            Protocol: ADAM-1 IEEE Access (2025)
          </span>
        </div>
        <h2 className="text-sm sm:text-base font-bold text-teal-600 dark:text-teal-400 print:text-teal-800 tracking-normal">
          Multimodal Alzheimer’s &amp; Microbiome Research
        </h2>
        <p className="text-xs text-surface-400 print:text-slate-600 font-medium">
          Evidence-Based Multi-Omic Research Assessment · Gut Metagenomics, Machine Learning Inference &amp; Clinical Frailty Risk Characterization
        </p>
      </div>

      {/* Institutional Metadata Grid (6-Box Compact Laboratory Table) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2 text-xs">
        <div className="p-2.5 rounded-lg bg-surface-850/90 border border-surface-700/70 print:bg-slate-50 print:border-slate-300">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 tracking-wider">Sample ID</p>
          <p className="font-mono font-bold text-surface-50 print:text-slate-900 text-sm mt-0.5">{sampleId}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/90 border border-surface-700/70 print:bg-slate-50 print:border-slate-300">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 tracking-wider">Subject ID</p>
          <p className="font-mono font-bold text-surface-50 print:text-slate-900 text-sm mt-0.5">{studyId}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/90 border border-surface-700/70 print:bg-slate-50 print:border-slate-300">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 tracking-wider">Collection</p>
          <p className="font-semibold text-surface-50 print:text-slate-900 text-sm mt-0.5">Day {day}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/90 border border-surface-700/70 print:bg-slate-50 print:border-slate-300">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 tracking-wider">Analysis Date</p>
          <p className="font-mono font-semibold text-surface-50 print:text-slate-900 text-xs mt-1">{analysisDate}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/90 border border-surface-700/70 print:bg-slate-50 print:border-slate-300">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 tracking-wider">Research Status</p>
          <p className="font-semibold text-emerald-600 dark:text-emerald-400 print:text-emerald-800 text-xs mt-1">Cohort Record</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/90 border border-surface-700/70 print:bg-slate-50 print:border-slate-300">
          <p className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 tracking-wider">Pipeline Verification</p>
          <p className="font-bold text-teal-600 dark:text-teal-400 print:text-teal-800 text-xs mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} /> Passed
          </p>
        </div>
      </div>
    </div>
  );
}
