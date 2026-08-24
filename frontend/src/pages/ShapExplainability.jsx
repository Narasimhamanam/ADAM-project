import React, { useState, useEffect } from 'react';
import {
  Zap,
  Activity,
  Filter,
  Search,
  BookOpen,
  Info,
  Dna,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export default function ShapExplainability() {
  const [globalShap, setGlobalShap] = useState([]);
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState('');
  const [sampleShap, setSampleShap] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load global SHAP rankings and samples list
  async function loadInitialData() {
    setLoading(true);
    setError(null);
    try {
      const [shapRes, samplesRes] = await Promise.all([
        fetch(`${API_BASE}/ml/shap/global?limit=50`),
        fetch(`${API_BASE}/samples?page=1&page_size=30`),
      ]);

      if (shapRes.ok) {
        const shapData = await shapRes.json();
        setGlobalShap(shapData.rankings || []);
      }
      if (samplesRes.ok) {
        const sampleData = await samplesRes.json();
        setSamples(sampleData.samples || []);
        if (sampleData.samples && sampleData.samples.length > 0) {
          setSelectedSample(sampleData.samples[0].sample_id);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load local SHAP explanation when sample changes
  async function loadSampleExplanation(sampleId) {
    if (!sampleId) return;
    setSampleLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ml/shap/sample/${sampleId}?model_name=xgboost`);
      if (res.ok) {
        const data = await res.json();
        setSampleShap(data);
      }
    } catch (err) {
      console.error('Failed to load sample SHAP explanation:', err);
    } finally {
      setSampleLoading(false);
    }
  }

  useEffect(() => {
    if (selectedSample) {
      loadSampleExplanation(selectedSample);
    }
  }, [selectedSample]);

  const filteredBiomarkers = globalShap.filter((b) => {
    const matchesCat =
      categoryFilter === 'all' ||
      (categoryFilter === 'microbiome' && b.category === 'microbiome_species') ||
      (categoryFilter === 'clinical' && b.category === 'clinical');
    const matchesSearch = !searchQuery || b.feature.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const maxShap = globalShap.length > 0 ? Math.max(...globalShap.map((b) => b.mean_abs_shap)) : 1.0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">SHAP Biomarker Explainability Center</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-600/15 text-accent-600 dark:text-accent-300 border border-accent-500/30">
              TreeSHAP Live
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            Global biomarker importance ranking and patient sample-level feature attribution.
          </p>
        </div>
        <button
          onClick={loadInitialData}
          disabled={loading}
          className="btn-ghost text-xs border border-surface-600/60 flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadInitialData} />}

      {/* ── Key Scientific Findings Alert ── */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-accent-950/40 via-surface-800 to-surface-850 border border-accent-500/30 text-xs flex gap-3.5">
        <Info size={18} className="text-accent-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">
            ADAM-1 Paper Biomarker Summary (30 Experiments Global Consensus)
          </p>
          <p className="text-surface-300 leading-relaxed">
            Consistently across the 30 XGBoost experiments, gut species such as <strong className="text-accent-300">Phocaeicola dorei</strong>, <strong className="text-accent-300">Neglecta timonensis</strong>, and <strong className="text-accent-300">Eubacterium rectale</strong> exhibit strong SHAP feature importance alongside clinical frailty scale and malnutrition indicators in predicting Alzheimer's Disease.
          </p>
        </div>
      </div>

      {/* ── Main 2-Column Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Global SHAP Rankings */}
        <div className="card p-5 bg-surface-800/80 border border-surface-700/60 flex flex-col h-full">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Zap size={16} className="text-accent-400" />
              Global Biomarker Rankings (|SHAP|)
            </h2>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-surface-900 border border-surface-600 rounded-lg px-2 py-1 text-xs text-white"
              >
                <option value="all">All Features</option>
                <option value="microbiome">Species Only</option>
                <option value="clinical">Clinical Scores</option>
              </select>

              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2 text-surface-400" />
                <input
                  type="text"
                  placeholder="Filter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-surface-900 border border-surface-600 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white w-28 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner message="Calculating global SHAP values..." />
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[520px] pr-1">
              {filteredBiomarkers.map((b) => {
                const widthPercent = (b.mean_abs_shap / maxShap) * 100;
                const isSpecies = b.category === 'microbiome_species';

                return (
                  <div
                    key={b.rank}
                    className="p-2.5 rounded-lg bg-surface-900/60 border border-surface-700/40 text-xs hover:border-surface-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 text-[10px] font-mono text-surface-500 text-right">#{b.rank}</span>
                        <span className={`font-semibold truncate ${isSpecies ? 'text-accent-200' : 'text-primary-200'}`}>
                          {b.feature}
                        </span>
                      </div>
                      <span className="font-mono text-white text-[11px] font-bold">
                        {b.mean_abs_shap.toFixed(4)}
                      </span>
                    </div>

                    {/* Gradient Bar representing Mean |SHAP| */}
                    <div className="w-full bg-surface-800 h-2 rounded-full overflow-hidden flex items-center">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isSpecies
                            ? 'bg-gradient-to-r from-accent-600 to-accent-400'
                            : 'bg-gradient-to-r from-primary-600 to-primary-400'
                        }`}
                        style={{ width: `${Math.max(4, widthPercent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Local Patient Sample Breakdown */}
        <div className="card p-5 bg-surface-800/80 border border-surface-700/60 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Activity size={16} className="text-accent-400" />
              Patient Sample Feature Attribution
            </h2>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-surface-400 mb-1.5">Select Sample to Inspect</label>
            <select
              value={selectedSample}
              onChange={(e) => setSelectedSample(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-xs text-white"
            >
              {samples.map((s) => (
                <option key={s.sample_id} value={s.sample_id}>
                  {s.sample_id} ({s.study_id}) — {s.alzheimers_diagnosis === 1 ? 'Alzheimer’s (+)' : 'Control (-)'}
                </option>
              ))}
            </select>
          </div>

          {sampleLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner message="Calculating sample SHAP breakdown..." />
            </div>
          ) : sampleShap ? (
            <div className="space-y-4">
              {/* Sample Risk Overview Banner */}
              <div className="p-3.5 rounded-lg bg-surface-900/80 border border-surface-700/60 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-surface-400 uppercase tracking-wider">Prediction Outcome</p>
                  <p className="text-sm font-bold text-white mt-0.5">{sampleShap.risk_level}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-surface-400 uppercase tracking-wider">Risk Probability</p>
                  <p className="text-base font-extrabold text-accent-300 mt-0.5">
                    {(sampleShap.alzheimers_risk_probability * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Contributing Features List */}
              <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
                {sampleShap.feature_contributions?.map((c, i) => {
                  const increases = c.impact === 'increases_risk';

                  return (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-surface-900/60 border border-surface-700/40 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-surface-200 truncate">{c.feature}</span>
                          <span
                            className={`font-mono font-bold ${
                              increases ? 'text-danger-400' : 'text-success-400'
                            }`}
                          >
                            {increases ? '+' : ''}
                            {c.shap_value.toFixed(4)}
                          </span>
                        </div>
                        <p className="text-[10px] text-surface-500 font-mono">
                          Observed Value: {c.feature_value.toFixed(4)}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 ${
                          increases
                            ? 'bg-danger-600/15 text-danger-300 border border-danger-500/30'
                            : 'bg-success-600/15 text-success-300 border border-success-500/30'
                        }`}
                      >
                        {increases ? 'Pushes toward AD' : 'Protective'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-surface-400 text-center py-8">Select a sample above to view feature attributions.</p>
          )}
        </div>
      </div>
    </div>
  );
}
