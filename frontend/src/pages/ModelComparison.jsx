import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Cpu,
  BarChart3,
  Award,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export default function ModelComparison() {
  const [benchmarks, setBenchmarks] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [selectedModelFilter, setSelectedModelFilter] = useState('all');
  const [searchSeed, setSearchSeed] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Custom train state
  const [customModel, setCustomModel] = useState('xgboost');
  const [customSeed, setCustomSeed] = useState(42);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [benchRes, expRes] = await Promise.all([
        fetch(`${API_BASE}/ml/benchmark`),
        fetch(`${API_BASE}/ml/experiments`),
      ]);
      if (!benchRes.ok || !expRes.ok) {
        throw new Error('Failed to load model benchmarks');
      }
      const benchData = await benchRes.json();
      const expData = await expRes.json();
      setBenchmarks(benchData.models || {});
      setExperiments(expData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleTrainCustom() {
    setTraining(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/ml/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_name: customModel,
          seed: parseInt(customSeed, 10) || 42,
          test_size: 0.25,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Training failed');
      }
      const data = await res.json();
      setTrainResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setTraining(false);
    }
  }

  const filteredExperiments = experiments.filter((e) => {
    const matchesModel =
      selectedModelFilter === 'all' || e.model.toLowerCase().includes(selectedModelFilter.toLowerCase());
    const matchesSeed = !searchSeed || e.seed.toString().includes(searchSeed) || e.experiment_number.toString().includes(searchSeed);
    return matchesModel && matchesSeed;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">Model Comparison &amp; Benchmarks</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-600/15 text-accent-600 dark:text-accent-300 border border-accent-500/30">
              30-Seed Cross-Validation
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            Rigorous cross-model evaluation between XGBoost, Random Forest, and Logistic Regression.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-ghost text-xs border border-surface-600/60 flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={loadData} />}

      {/* ── Benchmark Summary Cards ── */}
      {benchmarks && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'xgboost', title: 'XGBoost Classifier', color: 'accent', badge: 'Best Performance' },
            { key: 'randomforest', title: 'Random Forest', color: 'primary', badge: 'Tree Ensemble' },
            { key: 'logisticregression', title: 'Logistic Regression', color: 'warning', badge: 'Linear Baseline' },
          ].map((m) => {
            const data = benchmarks[m.key] || {};
            const isWinner = m.key === 'xgboost';

            return (
              <div
                key={m.key}
                className={`card p-5 border relative overflow-hidden ${
                  isWinner
                    ? 'border-accent-500/40 bg-gradient-to-br from-accent-600/15 to-surface-800/80 shadow-lg shadow-accent-950/20'
                    : 'border-surface-700/60 bg-surface-800/80'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Cpu size={16} className={isWinner ? 'text-accent-400' : 'text-surface-400'} />
                    {m.title}
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-surface-700 border border-surface-600 text-surface-300">
                    {m.badge}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center my-3 py-2 bg-surface-900/60 rounded-lg border border-surface-700/40">
                  <div>
                    <p className="text-[10px] text-surface-400 uppercase tracking-wider">Mean ROC-AUC</p>
                    <p className="text-base font-bold text-white mt-0.5">
                      {data.mean_auc ? data.mean_auc.toFixed(3) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-surface-400 uppercase tracking-wider">Mean F1</p>
                    <p className="text-base font-bold text-white mt-0.5">
                      {data.mean_f1 ? data.mean_f1.toFixed(3) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-surface-400 uppercase tracking-wider">Accuracy</p>
                    <p className="text-base font-bold text-white mt-0.5">
                      {data.mean_accuracy ? (data.mean_accuracy * 100).toFixed(1) + '%' : '—'}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-surface-400 text-right mt-1">
                  Evaluated across <span className="font-semibold text-surface-200">{data.experiment_count || 30} seeds</span>
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Interactive Custom Training Panel ── */}
      <div className="card p-5 bg-surface-800/80 border border-surface-700/60">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-accent-400" />
          Train On-Demand Experiment
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Select Architecture</label>
            <select
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-xs text-white"
            >
              <option value="xgboost">XGBoost (Optuna Tuned)</option>
              <option value="randomforest">Random Forest</option>
              <option value="logisticregression">Logistic Regression</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-surface-400 mb-1">Random Split Seed</label>
            <input
              type="number"
              value={customSeed}
              onChange={(e) => setCustomSeed(e.target.value)}
              className="w-full bg-surface-900 border border-surface-600 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-surface-400 mb-1">Split Ratio</label>
            <input
              type="text"
              value="75% Train / 25% Test (Subject Split)"
              disabled
              className="w-full bg-surface-900/40 border border-surface-700 rounded-lg px-3 py-2 text-xs text-surface-400"
            />
          </div>

          <div>
            <button
              onClick={handleTrainCustom}
              disabled={training}
              className="w-full btn-primary py-2 text-xs flex items-center justify-center gap-1.5 bg-accent-600 hover:bg-accent-500 text-white rounded-lg font-medium"
            >
              {training ? <RefreshCw size={14} className="animate-spin" /> : <Layers size={14} />}
              <span>{training ? 'Training Model...' : 'Train & Evaluate'}</span>
            </button>
          </div>
        </div>

        {/* Live Train Result Feedback */}
        {trainResult && (
          <div className="mt-4 p-4 rounded-lg bg-surface-900/80 border border-accent-500/30 grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-[10px] text-surface-400 uppercase">Test Accuracy</p>
              <p className="text-base font-bold text-success-400 mt-0.5">
                {(trainResult.metrics.accuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-surface-400 uppercase">Test ROC-AUC</p>
              <p className="text-base font-bold text-accent-300 mt-0.5">
                {trainResult.metrics.auc.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-surface-400 uppercase">F1 Score</p>
              <p className="text-base font-bold text-white mt-0.5">
                {trainResult.metrics.f1_score.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-surface-400 uppercase">Features Evaluated</p>
              <p className="text-base font-bold text-surface-200 mt-0.5">
                {trainResult.feature_count}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 30 Experiments Historical Log Table ── */}
      <div className="card p-5 bg-surface-800/80 border border-surface-700/60">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-accent-400" />
              30-Experiment Replication Logs
            </h2>
            <p className="text-xs text-surface-400 mt-0.5">
              Exact individual seeds and performance results from the ADAM-1 benchmark study.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedModelFilter}
              onChange={(e) => setSelectedModelFilter(e.target.value)}
              className="bg-surface-900 border border-surface-600 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="all">All Models</option>
              <option value="xgboost">XGBoost Only</option>
              <option value="randomforest">Random Forest Only</option>
              <option value="logisticregression">Logistic Regression Only</option>
            </select>

            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2 text-surface-400" />
              <input
                type="text"
                placeholder="Search seed..."
                value={searchSeed}
                onChange={(e) => setSearchSeed(e.target.value)}
                className="bg-surface-900 border border-surface-600 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white w-32 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-surface-700 text-surface-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Exp #</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3 font-mono">Seed</th>
                <th className="py-2.5 px-3 font-mono">ROC-AUC</th>
                <th className="py-2.5 px-3 font-mono">F1-Score</th>
                <th className="py-2.5 px-3 font-mono">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {filteredExperiments.slice(0, 40).map((exp, i) => (
                <tr key={i} className="hover:bg-surface-700/30 transition-colors">
                  <td className="py-2 px-3 font-semibold text-surface-300">{exp.experiment_number}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                        exp.model.includes('xgb')
                          ? 'bg-accent-600/20 text-accent-300 border border-accent-500/30'
                          : exp.model.includes('forest')
                          ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30'
                          : 'bg-warning-600/20 text-warning-300 border border-warning-500/30'
                      }`}
                    >
                      {exp.model}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-surface-400">{exp.seed}</td>
                  <td className="py-2 px-3 font-mono font-semibold text-white">{exp.auc.toFixed(4)}</td>
                  <td className="py-2 px-3 font-mono text-surface-200">{exp.f1_score.toFixed(4)}</td>
                  <td className="py-2 px-3 font-mono text-surface-300">{(exp.accuracy * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
