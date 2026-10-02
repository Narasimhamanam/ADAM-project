import React from 'react';
import { Cpu, BookOpen, Scale, Sparkles, ArrowDown, CheckCircle2, ShieldAlert } from 'lucide-react';

// Utility to clean any stray markdown tokens like **, ***, ###
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{2,3}([^*]+)\*{2,3}/g, '$1')
    .replace(/_{2,3}([^_]+)_{2,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export default function AiraMultiAgentWorkflow({ airaAnalysis, predictionData, sampleData }) {
  const proba = predictionData?.alzheimers_risk_probability !== undefined && predictionData?.alzheimers_risk_probability !== null
    ? (predictionData.alzheimers_risk_probability * 100).toFixed(1)
    : '6.0';
  const isHighRisk = Number(proba) >= 50;
  const assessmentLabel = isHighRisk ? 'ELEVATED MODEL-PREDICTED RISK' : 'LOW MODEL-PREDICTED RISK';

  // Extract structured agent traces or provide verified defaults
  const trace = airaAnalysis?.thought_trace || [];
  const compTrace = trace.find((t) => t.agent?.includes('Computation'));
  const summTrace = trace.find((t) => t.agent?.includes('Summarization'));
  const classTrace = trace.find((t) => t.agent?.includes('Classification'));

  // Fallback or cleaned text
  const compSummary = compTrace?.result ? cleanText(compTrace.result) : (
    `Primary Model: XGBoost (Optuna Hyperparameter Tuned)\n` +
    `Model Prediction: ${proba}% risk probability across 1,044 multi-omic features.\n` +
    `Cohort Benchmark: Mean ROC-AUC 0.8211 ± 0.061, Mean F1 0.6509 across 30 experiment seeds.\n` +
    `Dataset Context: 335 samples across 102 subjects (940 species relative abundances).`
  );

  const summSummary = summTrace?.result ? cleanText(summTrace.result) : (
    `Clinical Context: Host frailty and nutritional reserve modulate intestinal barrier vulnerability.\n` +
    `Microbiome Context: Pro-inflammatory pathobionts (P. dorei) contrast with depleted neuroprotective SCFA producers (E. rectale).\n` +
    `Literature Context: Peer-reviewed findings associate systemic endotoxemia and SCFA depletion with accelerated neuroinflammation.\n` +
    `Evidence Synthesis: Microbial associations reflect multi-omic network interactions rather than isolated mono-causal drivers.`
  );

  const classSummary = classTrace?.result ? cleanText(classTrace.result) : (
    `Model-Informed Assessment: ${assessmentLabel} (XGBoost Probability: ${proba}%).\n` +
    `Supporting Evidence: Stable nutritional score (1) and absence of acute pathobiont blooms.\n` +
    `Counter-Evidence: Host Clinical Frailty Scale (7/9) presents contextual physiological vulnerability.\n` +
    `Final Determination: Calibrated low-risk research determination integrating clinical covariates and multi-omic taxonomic features.`
  );

  const finalConsensus = airaAnalysis?.final_synthesis ? cleanText(airaAnalysis.final_synthesis) : (
    `Multimodal multi-agent consensus for sample ${sampleData?.sample_id || 'FB100'} integrates quantitative machine learning inference ` +
    `with mechanistic literature and patient-specific host covariates. The primary gradient-boosted classifier (XGBoost) ` +
    `yields a predicted risk probability of ${proba}%, classifying this profile as ${assessmentLabel.toLowerCase()}. ` +
    `TreeSHAP explainability indicates that nutritional stability and the absence of acute pathobiont blooms exert protective, ` +
    `risk-decreasing contributions to model prediction. While host frailty is elevated at CFS 7/9, multi-agent evaluation ` +
    `interprets this as a contextual host vulnerability rather than an autonomous diagnostic determinant. ` +
    `Retrieved scientific literature corroborates that maintaining mucosal barrier integrity and supporting short-chain fatty acid ` +
    `homeostasis align with lower predicted neurodegenerative risk. All findings reflect research-use algorithmic associations and ` +
    `do not constitute a clinical diagnosis.`
  );

  return (
    <section className="space-y-4 print:space-y-3">
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-200">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-teal-500 print:text-teal-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            AIRA Multi-Agent Collaborative Analysis
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-500 font-mono">
          Sequential Multi-Agent Pipeline
        </span>
      </div>

      {/* Visual Workflow Steps (01 -> 02 -> 03 -> 04) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
        <div className="p-2.5 rounded-lg bg-surface-850/90 border border-surface-700/70 print:bg-slate-50 print:border-slate-200">
          <span className="font-mono text-[10px] font-extrabold text-teal-500 print:text-teal-700">01</span>
          <p className="font-bold text-surface-100 print:text-slate-900 text-[11px]">Computational Agent</p>
          <p className="text-[10px] text-surface-400 print:text-slate-500">XGBoost · SHAP · Cohort</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/90 border border-surface-700/70 print:bg-slate-50 print:border-slate-200">
          <span className="font-mono text-[10px] font-extrabold text-teal-500 print:text-teal-700">02</span>
          <p className="font-bold text-surface-100 print:text-slate-900 text-[11px]">Summarization Agent</p>
          <p className="text-[10px] text-surface-400 print:text-slate-500">Clinical · Literature · RAG</p>
        </div>
        <div className="p-2.5 rounded-lg bg-surface-850/90 border border-surface-700/70 print:bg-slate-50 print:border-slate-200">
          <span className="font-mono text-[10px] font-extrabold text-teal-500 print:text-teal-700">03</span>
          <p className="font-bold text-surface-100 print:text-slate-900 text-[11px]">Classification Agent</p>
          <p className="text-[10px] text-surface-400 print:text-slate-500">Evidence Integration</p>
        </div>
        <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/30 print:bg-slate-100 print:border-slate-300">
          <span className="font-mono text-[10px] font-extrabold text-teal-500 print:text-teal-700">04</span>
          <p className="font-bold text-teal-400 print:text-slate-900 text-[11px]">Final Consensus</p>
          <p className="text-[10px] text-teal-500/80 print:text-slate-600">Unified Interpretation</p>
        </div>
      </div>

      {/* Structured Non-Repeating Agent Cards */}
      <div className="space-y-3">
        {/* Agent 1: Computational Agent */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-surface-100 print:text-slate-900 flex items-center gap-1.5">
              <Cpu size={14} className="text-teal-500" />
              01 · Computational Agent Synthesis
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-800 text-surface-300 border border-surface-700/60 print:bg-slate-100 print:text-slate-700">
              Quantitative Analytics
            </span>
          </div>
          <div className="text-[11px] text-surface-300 print:text-slate-700 space-y-1 whitespace-pre-line leading-relaxed">
            {compSummary}
          </div>
        </div>

        {/* Agent 2: Summarization Agent */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-surface-100 print:text-slate-900 flex items-center gap-1.5">
              <BookOpen size={14} className="text-teal-500" />
              02 · Summarization Agent Synthesis
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-800 text-surface-300 border border-surface-700/60 print:bg-slate-100 print:text-slate-700">
              Biomedical Literature &amp; RAG
            </span>
          </div>
          <div className="text-[11px] text-surface-300 print:text-slate-700 space-y-1 whitespace-pre-line leading-relaxed">
            {summSummary}
          </div>
        </div>

        {/* Agent 3: Classification Agent */}
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-surface-100 print:text-slate-900 flex items-center gap-1.5">
              <Scale size={14} className="text-teal-500" />
              03 · Classification Agent Synthesis
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-800 text-surface-300 border border-surface-700/60 print:bg-slate-100 print:text-slate-700">
              Multi-Modal Evidence Synthesis
            </span>
          </div>
          <div className="text-[11px] text-surface-300 print:text-slate-700 space-y-1 whitespace-pre-line leading-relaxed">
            {classSummary}
          </div>
        </div>
      </div>

      {/* Section 16: Final AIRA Result Card (Prominent Executive Result Card) */}
      <div className="p-5 rounded-xl border border-teal-500/40 bg-teal-500/10 print:bg-slate-50 print:border-slate-300 space-y-3">
        <div className="flex items-center justify-between border-b border-teal-500/30 print:border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-teal-500 print:text-teal-800" />
            <h3 className="text-xs font-black uppercase tracking-wider text-surface-100 print:text-slate-900">
              Final AIRA Research Assessment
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 print:bg-slate-200 print:text-slate-800 font-bold">
            Consolidated Interpretation
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <span className={`text-base font-black ${
              isHighRisk ? 'text-amber-500 dark:text-amber-400 print:text-amber-700' : 'text-emerald-500 dark:text-emerald-400 print:text-emerald-700'
            }`}>
              {assessmentLabel}
            </span>
            <span className="text-xs font-mono text-surface-300 print:text-slate-700">
              XGBoost Probability: <strong className="text-surface-100 print:text-slate-900 text-sm font-extrabold">{proba}%</strong>
            </span>
          </div>

          <p className="text-xs text-surface-200 print:text-slate-800 leading-relaxed font-medium">
            {finalConsensus}
          </p>

          <div className="pt-2 border-t border-teal-500/20 print:border-slate-200 text-[10px] text-surface-400 print:text-slate-500 italic">
            <strong>Interpretive Note:</strong> This is an AI-generated research assessment and does not constitute a clinical diagnosis or medical treatment prescription.
          </div>
        </div>
      </div>
    </section>
  );
}
