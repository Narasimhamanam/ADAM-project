import React from 'react';
import { AlertCircle, ShieldAlert } from 'lucide-react';

export default function ResearchNotice({ variant = 'default' }) {
  const isCompact = variant === 'compact';

  return (
    <div className={`rounded-xl border border-teal-500/30 bg-teal-500/5 p-4 print:border-slate-300 print:bg-slate-50 print:p-3 text-xs leading-relaxed transition-all ${
      isCompact ? 'py-3' : 'py-4'
    }`}>
      <div className="flex items-start gap-3">
        <ShieldAlert size={18} className="text-teal-600 dark:text-teal-400 print:text-slate-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-extrabold uppercase tracking-wider text-[11px] text-teal-600 dark:text-teal-400 print:text-slate-900">
            Important Research Notice
          </p>
          <p className="text-surface-300 print:text-slate-700 text-[11px] leading-relaxed">
            ADAM-1 Enhanced is a biomedical research platform for multimodal biomarker exploration and computational analysis.
            This report is <strong>not a clinical diagnosis, medical prescription, or therapeutic recommendation</strong>.
            All findings must be independently reviewed and interpreted by qualified healthcare professionals in the appropriate clinical context.
          </p>
        </div>
      </div>
    </div>
  );
}
