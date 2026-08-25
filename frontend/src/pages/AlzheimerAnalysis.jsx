import React, { useState, useEffect } from 'react';
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Search,
  Activity,
  Sliders,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Dna,
  UserCheck,
  UserX,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export default function AlzheimerAnalysis() {
  const [samples, setSamples] = useState([]);
  const [selectedSampleId, setSelectedSampleId] = useState('');
  const [sampleDetail, setSampleDetail] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [selectedModel, setSelectedModel] = useState('xgboost');
  const [searchQuery, setSearchQuery] = useState('');
  const [diagnosisFilter, setDiagnosisFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Load sample cohort list
  async function loadCohort() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/samples?page=1&page_size=335`);
      if (!res.ok) throw new Error('Failed to load patient samples');
      const data = await res.json();
      setSamples(data.samples || []);
      if (data.samples && data.samples.length > 0) {
        setSelectedSampleId(data.samples[0].sample_id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCohort();
  }, []);

  // Run comprehensive analysis for selected patient record
  async function analyzeRecord(sampleId, modelName) {
    if (!sampleId) return;
    setAnalyzing(true);
    setError(null);
    try {
      const [detailRes, predRes] = await Promise.all([
        fetch(`${API_BASE}/samples/${sampleId}`),
        fetch(`${API_BASE}/ml/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model_name: modelName, sample_id: sampleId }),
        }),
      ]);

      if (!detailRes.ok || !predRes.ok) {
        throw new Error('Failed to analyze selected patient record');
      }

      const detailData = await detailRes.json();
      const predData = await predRes.json();

      setSampleDetail(detailData);
      setPrediction(predData);
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  useEffect(() => {
    if (selectedSampleId) {
      analyzeRecord(selectedSampleId, selectedModel);
    }
  }, [selectedSampleId, selectedModel]);

  const filteredSamples = samples.filter((s) => {
    const isAD = s.alzheimers === 1 || s.alzheimers_diagnosis === 1;
    const matchesDiagnosis =
      diagnosisFilter === 'all' ||
      (diagnosisFilter === 'positive' && isAD) ||
      (diagnosisFilter === 'negative' && !isAD);
    const matchesSearch =
      !searchQuery ||
      s.sample_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.study_id && s.study_id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDiagnosis && matchesSearch;
  });

  // Calculate actual vs predicted comparison states
  const rawActual = sampleDetail?.alzheimers ?? sampleDetail?.alzheimers_diagnosis;
  const actualLabel = rawActual !== undefined ? (rawActual === 1 || rawActual === 1.0 ? 1 : 0) : undefined;
  const predictedLabel = prediction?.predicted_label;
  const isMatch = actualLabel !== undefined && predictedLabel !== undefined && actualLabel === predictedLabel;
  const riskPercent = prediction ? (prediction.alzheimers_risk_probability * 100).toFixed(1) : '0.0';

  const confusionType =
    actualLabel === 1 && predictedLabel === 1
      ? 'True Positive (Correct Detection)'
      : actualLabel === 0 && predictedLabel === 0
      ? 'True Negative (Correct Control)'
      : actualLabel === 1 && predictedLabel === 0
      ? 'False Negative (Under-predicted)'
      : 'False Positive (Over-predicted)';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-surface-50">Alzheimer's Disease Patient Analysis</h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-600/15 text-accent-600 dark:text-accent-300 border border-accent-500/30">
              Cohort Intelligence
            </span>
          </div>
          <p className="text-surface-400 mt-1 text-sm font-medium">
            Multi-omic profiling comparing Alzheimer's patients vs. cognitively normal control participants.
          </p>
        </div>
        <button
          onClick={loadCohort}
          disabled={loading}
          className="btn-ghost text-xs border border-surface-600/60 flex items-center gap-1.5"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Cohort
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={() => analyzeRecord(selectedSampleId, selectedModel)} />}

      {/* ── 2-Column Layout: Patient Selector + Detailed Actual vs Predicted Analysis ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Patient Cohort Selector */}
        <div className="card p-4 bg-surface-800/80 border border-surface-700/60 flex flex-col h-[750px]">
          <div className="mb-3 space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Select Cohort Record ({filteredSamples.length} Samples)
            </h2>

            {/* Filter buttons */}
            <div className="flex gap-1.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'positive', label: 'AD Positive' },
                { id: 'negative', label: 'Control' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDiagnosisFilter(f.id)}
                  className={`flex-1 py-1 text-[11px] font-medium rounded border transition-all ${
                    diagnosisFilter === f.id
                      ? 'bg-accent-600/30 border-accent-500 text-white'
                      : 'bg-surface-900 border-surface-700 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-surface-400" />
              <input
                type="text"
                placeholder="Search Sample / Study ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-900 border border-surface-600 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-accent-500"
              />
            </div>
          </div>

          {/* Scrollable Sample List */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner message="Loading cohort..." />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredSamples.map((s) => {
                const isSelected = s.sample_id === selectedSampleId;
                const isAD = s.alzheimers === 1 || s.alzheimers_diagnosis === 1;

                return (
                  <button
                    key={s.sample_id}
                    onClick={() => setSelectedSampleId(s.sample_id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-accent-600/25 border-accent-500 text-white shadow-md shadow-accent-950/30'
                        : 'bg-surface-900/60 border-surface-700/40 text-surface-300 hover:border-surface-600'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-white">{s.sample_id}</p>
                      <p className="text-[10px] text-surface-400">Study: {s.study_id}</p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        isAD
                          ? 'bg-danger-600/20 text-danger-300 border border-danger-500/30'
                          : 'bg-success-600/20 text-success-300 border border-success-500/30'
                      }`}
                    >
                      {isAD ? 'AD Positive' : 'Control'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Comparative Analysis & Patient Dossier */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── Actual Outcome vs Model Predicted Outcome Card ── */}
          <div className="card p-6 bg-gradient-to-br from-surface-800 to-surface-900 border border-surface-700/60">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Brain size={18} className="text-accent-400" />
                Actual Record Outcome vs Model Prediction
              </h2>

              {/* Model Switcher */}
              <div className="flex items-center gap-1.5 bg-surface-900 p-1 rounded-lg border border-surface-700">
                {['xgboost', 'randomforest', 'logisticregression'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedModel(m)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold uppercase transition-all ${
                      selectedModel === m
                        ? 'bg-accent-600 text-white'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    {m === 'xgboost' ? 'XGBoost' : m === 'randomforest' ? 'Random Forest' : 'Logistic Reg'}
                  </button>
                ))}
              </div>
            </div>

            {analyzing ? (
              <div className="py-12 flex justify-center">
                <LoadingSpinner message="Evaluating patient profile and calculating biomarker attribution..." />
              </div>
            ) : sampleDetail && prediction ? (
              <div className="space-y-5">
                {/* Visual Comparative Matrix Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Actual Cohort Record Card */}
                  <div className="p-4 rounded-xl bg-surface-900/90 border border-surface-700/60 flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                        Ground Truth Record
                      </p>
                      <p className="text-xs text-surface-500 mt-0.5">Clinical Cohort Dataset Entry</p>
                    </div>

                    <div className="my-3 flex items-center gap-3">
                      <div
                        className={`p-3 rounded-xl shrink-0 ${
                          actualLabel === 1
                            ? 'bg-danger-600/20 text-danger-400'
                            : 'bg-success-600/20 text-success-400'
                        }`}
                      >
                        {actualLabel === 1 ? <UserX size={24} /> : <UserCheck size={24} />}
                      </div>
                      <div>
                        <p className="text-lg font-extrabold text-white">
                          {actualLabel === 1 ? 'Alzheimer’s Disease (Positive)' : 'Cognitive Normal (Control)'}
                        </p>
                        <p className="text-xs text-surface-400">Diagnosis Flag: {actualLabel}</p>
                      </div>
                    </div>

                    <div className="text-[11px] text-surface-400 pt-2 border-t border-surface-800">
                      Sample ID: <code className="text-accent-300 font-mono">{sampleDetail.sample_id}</code> (Subject: {sampleDetail.study_id})
                    </div>
                  </div>

                  {/* Model Prediction Card */}
                  <div className="p-4 rounded-xl bg-surface-900/90 border border-surface-700/60 flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-surface-400 uppercase tracking-wider">
                        Model Predicted Outcome
                      </p>
                      <p className="text-xs text-surface-500 mt-0.5">Inference by {prediction.model_name.toUpperCase()}</p>
                    </div>

                    <div className="my-3 flex items-center gap-3">
                      <div
                        className={`p-3 rounded-xl shrink-0 ${
                          predictedLabel === 1
                            ? 'bg-danger-600/20 text-danger-400'
                            : 'bg-success-600/20 text-success-400'
                        }`}
                      >
                        <Activity size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-extrabold text-white">
                            {predictedLabel === 1 ? 'Predicted Positive' : 'Predicted Negative (Control)'}
                          </p>
                          <span className="text-xs font-mono font-bold text-accent-300 bg-accent-950/60 px-2 py-0.5 rounded border border-accent-800">
                            {riskPercent}% Risk
                          </span>
                        </div>
                        <p className="text-xs text-surface-400">Classification: {prediction.risk_level}</p>
                      </div>
                    </div>

                    <div className="text-[11px] text-surface-400 pt-2 border-t border-surface-800">
                      Status:{' '}
                      <span
                        className={`font-semibold ${
                          isMatch ? 'text-success-400' : 'text-warning-400'
                        }`}
                      >
                        {confusionType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match Verdict Pill */}
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                    isMatch
                      ? 'bg-success-600/10 border-success-500/30 text-success-300'
                      : 'bg-warning-600/10 border-warning-500/30 text-warning-300'
                  }`}
                >
                  {isMatch ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                  <span>
                    <strong>Model Verdict:</strong> {isMatch ? 'Model prediction exactly matches clinical ground truth.' : 'Model predicted different probability threshold than cohort ground truth label.'}
                  </span>
                </div>

                {/* Clinical Metadata Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 text-center">
                    <p className="text-[10px] text-surface-400 uppercase">Age</p>
                    <p className="text-sm font-bold text-white mt-0.5">{sampleDetail.age ?? '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 text-center">
                    <p className="text-[10px] text-surface-400 uppercase">Frailty Scale</p>
                    <p className="text-sm font-bold text-white mt-0.5">{sampleDetail.clinical_frailty_scale ?? '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 text-center">
                    <p className="text-[10px] text-surface-400 uppercase">Malnutrition Score</p>
                    <p className="text-sm font-bold text-white mt-0.5">{sampleDetail.malnutrition_indicator_sco ?? '—'}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-900/60 border border-surface-700/40 text-center">
                    <p className="text-[10px] text-surface-400 uppercase">PPI Medication</p>
                    <p className="text-sm font-bold text-white mt-0.5">{sampleDetail.ppi === 1 ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                {/* Top Driving Biomarkers for This Specific Record */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-surface-300 mb-2.5 flex items-center gap-1.5">
                    <Dna size={14} className="text-accent-400" />
                    Top Microbiome &amp; Clinical Biomarkers Influencing This Patient
                  </h3>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {prediction.feature_contributions?.slice(0, 8).map((c, i) => {
                      const increases = c.impact === 'increases_risk';
                      return (
                        <div
                          key={i}
                          className="p-2 rounded bg-surface-900/50 border border-surface-700/30 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-medium text-surface-200">{c.feature}</span>
                            <span className="text-[10px] text-surface-500 font-mono ml-2">
                              (Val: {c.feature_value.toFixed(3)})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono text-[11px] font-semibold ${
                                increases ? 'text-danger-400' : 'text-success-400'
                              }`}
                            >
                              {increases ? '+' : ''}
                              {c.shap_value.toFixed(4)}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                increases
                                  ? 'bg-danger-600/15 text-danger-300'
                                  : 'bg-success-600/15 text-success-300'
                              }`}
                            >
                              {increases ? 'Pushes AD' : 'Protective'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
