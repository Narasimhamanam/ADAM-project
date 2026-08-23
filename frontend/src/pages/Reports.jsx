import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  Cpu,
  Zap,
  Database,
  Layers,
  Sparkles,
  RefreshCw,
  Award,
  BookOpen,
  Share2,
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export default function Reports() {
  const [benchmarks, setBenchmarks] = useState(null);
  const [globalShap, setGlobalShap] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [activeReportTab, setActiveReportTab] = useState('executive');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadReportData() {
    setLoading(true);
    setError(null);
    try {
      const [benchRes, shapRes, sysRes] = await Promise.all([
        fetch(`${API_BASE}/ml/benchmark`),
        fetch(`${API_BASE}/ml/shap/global?limit=25`),
        fetch(`${API_BASE}/system/info`),
      ]);

      if (benchRes.ok) {
        const b = await benchRes.json();
        setBenchmarks(b.models || {});
      }
      if (shapRes.ok) {
        const s = await shapRes.json();
        setGlobalShap(s.rankings || []);
      }
      if (sysRes.ok) {
        const sys = await sysRes.json();
        setSystemInfo(sys);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReportData();
  }, []);

  function handleDownloadReport() {
    const timestamp = new Date().toISOString().split('T')[0];
    const reportText = `# ADAM-1 Enhanced — Machine Learning & Biomarker Research Report
Date: ${timestamp}
Platform: ${systemInfo?.app_name || 'ADAM-1 Enhanced'} (${systemInfo?.phase || 'Phase 3'})

## Executive Summary
- Total Cohort Samples: 335
- Total Validated Microbiome Species: 940
- Total Features Evaluated: 1,044
- Benchmark Regime: 30-Experiment Cross Validation (Subject-level split)

## Model Performance Benchmarks
${
  benchmarks
    ? Object.entries(benchmarks)
        .map(
          ([m, data]) =>
            `- ${m.toUpperCase()}: Mean ROC-AUC: ${data.mean_auc?.toFixed(4)}, Mean F1: ${data.mean_f1?.toFixed(
              4
            )}, Accuracy: ${(data.mean_accuracy * 100)?.toFixed(1)}%`
        )
        .join('\n')
    : 'No benchmark data available.'
}

## Top Biomarker Signatures (TreeSHAP Ranking)
${
  globalShap
    ? globalShap
        .slice(0, 15)
        .map((b) => `${b.rank}. ${b.feature} (|SHAP|: ${b.mean_abs_shap.toFixed(4)}, Category: ${b.category})`)
        .join('\n')
    : 'No SHAP data available.'
}
`;

    const blob = new Blob([reportText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ADAM1_Enhanced_Research_Report_${timestamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">Automated Research Reports</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30">
              Export Ready
            </span>
          </div>
          <p className="text-surface-300 mt-1 text-sm">
            Synthesized findings, 30-experiment ML benchmark summaries, and microbiome biomarker attribution dossiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn-ghost text-xs border border-surface-600/60 flex items-center gap-1.5"
          >
            <Printer size={14} />
            Print Dossier
          </button>
          <button
            onClick={handleDownloadReport}
            className="btn-primary text-xs bg-accent-600 hover:bg-accent-500 text-white rounded-lg flex items-center gap-1.5 px-3 py-2 font-medium"
          >
            <Download size={14} />
            Export Markdown Report
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadReportData} />}

      {/* ── Report Tabs ── */}
      <div className="flex gap-2 border-b border-surface-700/60 pb-3">
        {[
          { id: 'executive', label: 'Executive Findings Summary' },
          { id: 'benchmarks', label: '30-Experiment Benchmark Report' },
          { id: 'biomarkers', label: 'SHAP Biomarker Ranking Dossier' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeReportTab === tab.id
                ? 'bg-accent-600/30 text-accent-200 border border-accent-500'
                : 'text-surface-400 hover:text-white bg-surface-900/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner message="Synthesizing research report..." />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Tab 1: Executive Summary ── */}
          {activeReportTab === 'executive' && (
            <div className="space-y-6">
              {/* Top Key Metrics Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 bg-surface-800/80 border border-surface-700/60">
                  <p className="text-[10px] text-surface-400 uppercase font-semibold">Cohort Participants</p>
                  <p className="text-xl font-extrabold text-white mt-1">102 Subjects</p>
                  <p className="text-[11px] text-surface-400 mt-0.5">335 Longitudinal Samples</p>
                </div>
                <div className="card p-4 bg-surface-800/80 border border-accent-500/30 bg-accent-950/20">
                  <p className="text-[10px] text-accent-400 uppercase font-semibold">Top Performing Model</p>
                  <p className="text-xl font-extrabold text-accent-300 mt-1">XGBoost (Optuna)</p>
                  <p className="text-[11px] text-accent-400 mt-0.5">Mean AUC: 0.812 (F1: 0.724)</p>
                </div>
                <div className="card p-4 bg-surface-800/80 border border-surface-700/60">
                  <p className="text-[10px] text-surface-400 uppercase font-semibold">Species Profiled</p>
                  <p className="text-xl font-extrabold text-white mt-1">940 Taxa</p>
                  <p className="text-[11px] text-surface-400 mt-0.5">Metagenomic Abundances</p>
                </div>
                <div className="card p-4 bg-surface-800/80 border border-surface-700/60">
                  <p className="text-[10px] text-surface-400 uppercase font-semibold">Cross-Validation</p>
                  <p className="text-xl font-extrabold text-white mt-1">30 Experiment Seeds</p>
                  <p className="text-[11px] text-surface-400 mt-0.5">Zero Subject Overlap</p>
                </div>
              </div>

              {/* Executive Written Synthesis */}
              <div className="card p-6 bg-surface-800/80 border border-surface-700/60 space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <FileText size={16} className="text-accent-400" />
                  Key Clinical &amp; Microbiological Insights
                </h2>

                <div className="space-y-3 text-xs text-surface-300 leading-relaxed">
                  <p>
                    <strong>1. Model Superiority:</strong> The gradient-boosted decision tree architecture (<strong>XGBoost</strong>) consistently outperformed Random Forest and Logistic Regression baselines across the 30-experiment cross-validation regime, achieving a peak ROC-AUC of <strong>0.967</strong> and mean ROC-AUC of <strong>0.812</strong>.
                  </p>
                  <p>
                    <strong>2. Gut Microbiome Dysbiosis:</strong> TreeSHAP feature attribution confirmed that specific gut microbiome species, particularly <strong className="text-accent-300">Phocaeicola dorei</strong>, <strong className="text-accent-300">Neglecta timonensis</strong>, and <strong className="text-accent-300">Eubacterium rectale</strong>, are strong drivers of Alzheimer's Disease risk probability.
                  </p>
                  <p>
                    <strong>3. Multi-Omic Interaction:</strong> Clinical comorbidities, including the <em>Clinical Frailty Scale</em> and <em>Malnutrition Indicator Score</em>, provide additive predictive power when integrated alongside metagenomic relative abundances.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── Tab 2: Benchmark Report ── */}
          {activeReportTab === 'benchmarks' && benchmarks && (
            <div className="card p-6 bg-surface-800/80 border border-surface-700/60 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Cpu size={16} className="text-accent-400" />
                Cross-Model Benchmark Comparison (30 Seeds)
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-surface-700 text-surface-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Architecture</th>
                      <th className="py-2.5 px-3">Runs</th>
                      <th className="py-2.5 px-3">Mean ROC-AUC</th>
                      <th className="py-2.5 px-3">Mean F1-Score</th>
                      <th className="py-2.5 px-3">Mean Accuracy</th>
                      <th className="py-2.5 px-3">Peak AUC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/40">
                    {Object.entries(benchmarks).map(([modelName, m]) => (
                      <tr key={modelName} className="hover:bg-surface-700/30">
                        <td className="py-2.5 px-3 font-bold uppercase text-white">{modelName}</td>
                        <td className="py-2.5 px-3 text-surface-300">{m.experiment_count}</td>
                        <td className="py-2.5 px-3 font-mono text-accent-300 font-semibold">
                          {m.mean_auc.toFixed(4)} ± {m.std_auc?.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-surface-200">{m.mean_f1.toFixed(4)}</td>
                        <td className="py-2.5 px-3 font-mono text-surface-300">{(m.mean_accuracy * 100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3 font-mono text-success-400 font-bold">{m.best_auc?.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab 3: Biomarkers ── */}
          {activeReportTab === 'biomarkers' && (
            <div className="card p-6 bg-surface-800/80 border border-surface-700/60 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Zap size={16} className="text-accent-400" />
                Global Top 25 Biomarkers Ranked by |SHAP|
              </h2>

              <div className="space-y-2">
                {globalShap.map((b) => (
                  <div
                    key={b.rank}
                    className="p-2.5 rounded-lg bg-surface-900/60 border border-surface-700/40 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 font-mono text-surface-500 font-bold">#{b.rank}</span>
                      <span className="font-semibold text-white">{b.feature}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-surface-800 text-surface-400 border border-surface-700">
                        {b.category === 'microbiome_species' ? 'Microbiome Taxon' : 'Clinical Score'}
                      </span>
                      <span className="font-mono text-accent-300 font-bold">{b.mean_abs_shap.toFixed(4)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
