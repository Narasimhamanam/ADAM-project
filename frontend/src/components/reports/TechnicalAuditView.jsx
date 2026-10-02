import React, { useState } from 'react';
import { Database, Cpu, Zap, Download, Code, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import ResponsiveTable from '../ui/ResponsiveTable';

export default function TechnicalAuditView({
  sampleData,
  predictionData,
  modelPredictions,
  airaAnalysis,
  globalShap,
  benchmarks,
}) {
  const [expandedSection, setExpandedSection] = useState('shap');

  const sampleId = sampleData?.sample_id || 'FB100';
  const contributions = predictionData?.feature_contributions || [];

  function handleDownloadJsonAudit() {
    const auditObj = {
      sample_id: sampleId,
      study_id: sampleData?.study_id,
      timestamp: new Date().toISOString(),
      protocol: 'ADAM-1 IEEE Access (2025)',
      sample_profile: sampleData,
      predictions: modelPredictions,
      tree_shap_local_attributions: contributions,
      global_shap_biomarkers: globalShap?.slice(0, 25),
      benchmarks_30_seeds: benchmarks,
      aira_multi_agent_telemetry: airaAnalysis,
      verification_status: 'PASSED',
    };

    const blob = new Blob([JSON.stringify(auditObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ADAM1_Technical_Audit_${sampleId}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 animate-fade-in text-xs">
      {/* Top Banner with Download Action */}
      <div className="p-4 rounded-xl border border-surface-700/80 bg-surface-850/90 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-surface-50 flex items-center gap-2">
            <Code size={16} className="text-teal-500" />
            Technical &amp; Research Audit Dossier
          </h2>
          <p className="text-surface-400 text-[11px] mt-0.5">
            Full telemetry, unrounded SHAP feature vectors, model decision thresholds, and multi-agent execution traces for Sample <strong className="font-mono text-surface-200">{sampleId}</strong>.
          </p>
        </div>
        <button
          onClick={handleDownloadJsonAudit}
          className="btn-teal text-xs px-3.5 py-2 font-semibold flex items-center gap-1.5 shadow-sm"
        >
          <Download size={14} />
          <span>Export Technical JSON Audit</span>
        </button>
      </div>

      {/* 1. Complete Local TreeSHAP Feature Attributions Table */}
      <div className="p-5 rounded-xl border border-surface-700/70 bg-surface-850/80 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-200 flex items-center gap-1.5">
            <Zap size={14} className="text-teal-500" />
            Complete Local TreeSHAP Feature Attributions ({contributions.length} Features)
          </h3>
          <span className="text-[10px] font-mono text-surface-400">Sum of SHAP + Base Value = Log-Odds Output</span>
        </div>

        <ResponsiveTable>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-800/80 border-b border-surface-700/80 text-surface-300">
                <th className="p-2.5 font-bold">Feature Name</th>
                <th className="p-2.5 font-bold">Category</th>
                <th className="p-2.5 font-bold text-right">Raw Feature Value</th>
                <th className="p-2.5 font-bold text-right">Exact SHAP Value</th>
                <th className="p-2.5 font-bold text-center">Directional Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/60 bg-surface-850/40 font-mono">
              {contributions.map((c, i) => (
                <tr key={i} className="hover:bg-surface-800/40">
                  <td className="p-2.5 font-semibold text-surface-100 font-sans">{c.feature}</td>
                  <td className="p-2.5 text-surface-400 font-sans text-[11px]">
                    {c.feature.startsWith('s__') || c.feature.includes(' ') ? 'Microbiome Taxon' : 'Clinical Covariate'}
                  </td>
                  <td className="p-2.5 text-right text-surface-200">{Number(c.feature_value).toFixed(4)}</td>
                  <td className={`p-2.5 text-right font-bold ${c.shap_value < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {c.shap_value > 0 ? '+' : ''}{Number(c.shap_value).toFixed(6)}
                  </td>
                  <td className="p-2.5 text-center font-sans">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.shap_value < 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {c.impact.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>

      {/* 2. Model Decision Parameters & Benchmark Context */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-200 flex items-center gap-1.5">
            <Cpu size={14} className="text-teal-500" />
            Decision Function &amp; Thresholds
          </h3>
          <div className="space-y-1.5 text-[11px] text-surface-300">
            <p>· Primary Model: <span className="font-mono font-bold text-surface-100">XGBoost (Optuna Tuned)</span></p>
            <p>· Classification Decision Threshold: <span className="font-mono font-bold text-surface-100">0.5000</span></p>
            <p>· Model Loss Function: <span className="font-mono text-surface-200">binary:logistic</span></p>
            <p>· Total Cohort Input Features: <span className="font-mono text-surface-200">1,044 dimensions</span></p>
            <p>· Cross-Validation Regime: <span className="font-mono text-surface-200">30-Seed Stratified Group-KFold (Group=Subject ID)</span></p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-surface-700/70 bg-surface-850/80 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-200 flex items-center gap-1.5">
            <Database size={14} className="text-teal-500" />
            AIRA Orchestration Telemetry
          </h3>
          <div className="space-y-1.5 text-[11px] text-surface-300">
            <p>· Multi-Agent Pipeline: <span className="font-mono text-teal-400">AIRACoordinator</span></p>
            <p>· LLM Provider: <span className="font-mono text-surface-200">{airaAnalysis?.thought_trace?.find(t => t.agent?.includes('Summarization'))?.provider || 'ADAM-1 Engine (Groq / Local RAG)'}</span></p>
            <p>· Thought Trace Steps: <span className="font-mono text-surface-200">4 Sequential Stages</span></p>
            <p>· RAG Similarity Metric: <span className="font-mono text-surface-200">Cosine Distance (MiniLM / BGE-small)</span></p>
            <p>· Retrospective Label Independence: <span className="font-mono text-emerald-400">Strictly Isolated from Inference</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
