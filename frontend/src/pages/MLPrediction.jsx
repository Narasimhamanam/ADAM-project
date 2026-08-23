import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Brain,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  RefreshCw,
  Search,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export default function MLPrediction() {
  const [samples, setSamples] = useState([]);
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [selectedModel, setSelectedModel] = useState('xgboost');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  // Load candidate samples on mount
  useEffect(() => {
    async function loadSamples() {
      try {
        const res = await fetch(`${API_BASE}/samples?page=1&page_size=30`);
        if (res.ok) {
          const data = await res.json();
          setSamples(data.samples || []);
          if (data.samples && data.samples.length > 0) {
            setSelectedSampleId(data.samples[0].sample_id);
          }
        }
      } catch (err) {
        console.error('Failed to load samples for prediction selector:', err);
      }
    }
    loadSamples();
  }, []);

  async function handlePredict() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/ml/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: selectedModel,
          sample_id: selectedSampleId || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Prediction failed');
      }
      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Trigger initial prediction once sample is selected
  useEffect(() => {
    if (selectedSampleId && !prediction && !loading) {
      handlePredict();
    }
  }, [selectedSampleId]);

  const riskPercent = prediction ? Math.round(prediction.alzheimers_risk_probability * 100) : 0;
  const isHighRisk = prediction?.predicted_label === 1 || riskPercent >= 60;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">ML Risk Prediction Studio</h1>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30">
              Phase 3 Live
            </span>
          </div>
          <p className="text-surface-300 mt-1 text-sm">
            Real-time Alzheimer's Disease classification &amp; microbiome biomarker risk profiling using XGBoost.
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={handlePredict} />}

      {/* ── Control Bar ── */}
      <div className="card p-5 bg-gradient-to-r from-surface-800/80 to-surface-900/80 border border-surface-700/60">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Sample selector */}
          <div>
            <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-2">
              Select Patient Cohort Sample
            </label>
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-500"
            >
              {samples.map((s) => (
                <option key={s.sample_id} value={s.sample_id}>
                  {s.sample_id} ({s.study_id}) — Actual: {s.alzheimers_diagnosis === 1 ? 'AD Positive' : 'Control'}
                </option>
              ))}
            </select>
          </div>

          {/* Model selector */}
          <div>
            <label className="block text-xs font-semibold text-surface-300 uppercase tracking-wider mb-2">
              Inference Model
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'xgboost', label: 'XGBoost' },
                { id: 'randomforest', label: 'Random Forest' },
                { id: 'logisticregression', label: 'Logistic Reg' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`py-2 px-2 text-xs font-medium rounded-lg border transition-all ${
                    selectedModel === m.id
                      ? 'bg-accent-600/30 border-accent-500 text-accent-200 shadow-md shadow-accent-900/20'
                      : 'bg-surface-900/60 border-surface-700 text-surface-400 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div>
            <button
              onClick={handlePredict}
              disabled={loading}
              className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-accent-600 to-primary-600 hover:from-accent-500 hover:to-primary-500 shadow-lg shadow-accent-950/40 text-white font-medium rounded-lg"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>{loading ? 'Evaluating Model...' : 'Calculate Alzheimer’s Risk'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Prediction Result Dashboard ── */}
      {prediction && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Gauge Card */}
          <div className="card p-6 bg-gradient-to-b from-surface-800/90 to-surface-900/90 border border-surface-700/60 flex flex-col items-center justify-center text-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-400 mb-4">
              Alzheimer's Risk Probability
            </h2>

            {/* Circular Gauge visual */}
            <div className="relative w-44 h-44 flex items-center justify-center my-2">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-surface-700"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className={`transition-all duration-1000 ${
                    isHighRisk ? 'stroke-danger-500' : riskPercent >= 35 ? 'stroke-warning-500' : 'stroke-success-500'
                  }`}
                  strokeWidth="8"
                  strokeDasharray={264}
                  strokeDashoffset={264 - (264 * riskPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold text-white tracking-tight">{riskPercent}%</span>
                <span className="text-[11px] text-surface-400 font-medium mt-0.5">Risk Score</span>
              </div>
            </div>

            {/* Classification Badge */}
            <div className="mt-4">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${
                  isHighRisk
                    ? 'bg-danger-600/20 text-danger-300 border-danger-500/40'
                    : riskPercent >= 35
                    ? 'bg-warning-600/20 text-warning-300 border-warning-500/40'
                    : 'bg-success-600/20 text-success-300 border-success-500/40'
                }`}
              >
                {isHighRisk ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />}
                {prediction.risk_level}
              </span>
            </div>

            <p className="text-xs text-surface-400 mt-3 leading-relaxed">
              Inference by <span className="font-semibold text-surface-200 uppercase">{prediction.model_name}</span> on sample{' '}
              <code className="text-accent-300">{prediction.sample_id}</code>.
            </p>
          </div>

          {/* Biomarker Contributors (SHAP Waterfall) */}
          <div className="lg:col-span-2 card p-6 bg-surface-800/80 border border-surface-700/60">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Activity size={16} className="text-accent-400" />
                  Key Feature &amp; Biomarker Drivers (SHAP)
                </h2>
                <p className="text-xs text-surface-400 mt-0.5">
                  Microbiome species relative abundances and clinical scores influencing this prediction.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {prediction.feature_contributions.map((c, i) => {
                const increasesRisk = c.impact === 'increases_risk';
                const barWidth = Math.min(100, Math.abs(c.shap_value) * 120);

                return (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-surface-900/60 border border-surface-700/40 flex items-center justify-between text-xs gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-surface-200 truncate">{c.feature}</span>
                        <span
                          className={`font-mono font-semibold ${
                            increasesRisk ? 'text-danger-400' : 'text-success-400'
                          }`}
                        >
                          {increasesRisk ? '+' : ''}
                          {c.shap_value.toFixed(4)}
                        </span>
                      </div>

                      {/* Visual contribution bar */}
                      <div className="w-full bg-surface-800 h-1.5 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all ${
                            increasesRisk ? 'bg-danger-500' : 'bg-success-500'
                          }`}
                          style={{ width: `${Math.max(5, barWidth)}%` }}
                        />
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 ${
                        increasesRisk
                          ? 'bg-danger-600/15 text-danger-300 border border-danger-500/30'
                          : 'bg-success-600/15 text-success-300 border border-success-500/30'
                      }`}
                    >
                      {increasesRisk ? 'Increases AD Risk' : 'Protective / Decreases'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
