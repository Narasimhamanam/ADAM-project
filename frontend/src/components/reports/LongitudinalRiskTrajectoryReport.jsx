import React, { useState, useEffect } from 'react';
import { Activity, Calendar, Clock, TrendingUp, TrendingDown, Minus, AlertTriangle, ShieldCheck, BookOpen, Sparkles } from 'lucide-react';
import { fetchSubjectTrajectory } from '../../api/client';

export default function LongitudinalRiskTrajectoryReport({ sampleData }) {
  const [trajectory, setTrajectory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const subjectId = sampleData?.study_id || sampleData?.sample_id;

  useEffect(() => {
    if (!subjectId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchSubjectTrajectory(subjectId, true)
      .then((data) => {
        if (isMounted) setTrajectory(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Could not load trajectory');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  if (!subjectId) return null;

  return (
    <section className="space-y-4 print:space-y-3 print:break-inside-avoid">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-700/60 pb-2 print:border-slate-300">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-purple-400 print:text-purple-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-surface-200 print:text-slate-800">
            Longitudinal AD Risk Trajectory Analysis
          </h2>
        </div>
        <span className="text-[11px] text-surface-400 print:text-slate-600 font-mono">
          Research-Only Longitudinal Observation
        </span>
      </div>

      {loading ? (
        <div className="p-4 text-center text-xs font-mono text-surface-400 animate-pulse">
          Loading longitudinal trajectory metrics...
        </div>
      ) : error ? (
        <div className="p-3 rounded-lg border border-surface-700 bg-surface-800/40 text-xs text-surface-400">
          Longitudinal trajectory not available for this sample ({error})
        </div>
      ) : trajectory ? (
        <div className="space-y-4 print:space-y-3">
          {/* Summary Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300">
              <span className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 block">
                Subject ID &amp; Follow-up
              </span>
              <span className="text-sm font-bold text-white print:text-slate-900 font-mono">
                {trajectory.subject_id}
              </span>
              <span className="text-[10px] text-surface-400 print:text-slate-600 block mt-0.5">
                {trajectory.observation_count} visits • {trajectory.follow_up_days} days span
              </span>
            </div>

            <div className="p-3 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300">
              <span className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 block">
                Baseline → Latest Risk
              </span>
              <span className="text-sm font-bold text-white print:text-slate-900 font-mono">
                {(trajectory.baseline_probability * 100).toFixed(1)}% → {(trajectory.latest_probability * 100).toFixed(1)}%
              </span>
              <span className="text-[10px] text-surface-400 print:text-slate-600 block mt-0.5 font-mono">
                Change: {trajectory.probability_change_percentage_points > 0 ? '+' : ''}
                {trajectory.probability_change_percentage_points.toFixed(1)} pp
              </span>
            </div>

            <div className="p-3 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300">
              <span className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 block">
                Trajectory Direction
              </span>
              <span className="text-sm font-bold font-mono text-purple-400 print:text-purple-700">
                {trajectory.trajectory_direction}
              </span>
              <span className="text-[10px] text-surface-400 print:text-slate-600 block mt-0.5 font-mono">
                {trajectory.monthly_slope_percentage_points !== null
                  ? `${trajectory.monthly_slope_percentage_points > 0 ? '+' : ''}${trajectory.monthly_slope_percentage_points.toFixed(2)} pp/30d`
                  : 'Slope: N/A'}
              </span>
            </div>

            <div className="p-3 rounded-xl border border-surface-700/70 bg-surface-850/80 print:bg-white print:border-slate-300">
              <span className="text-[10px] uppercase font-bold text-surface-400 print:text-slate-500 block">
                Model Governance
              </span>
              <span className="text-xs font-bold text-white print:text-slate-900 font-mono">
                {trajectory.model_version}
              </span>
              <span className="text-[10px] text-surface-400 print:text-slate-600 block mt-0.5 font-mono">
                Schema: {trajectory.feature_schema_version}
              </span>
            </div>
          </div>

          {/* Research Interpretation */}
          <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 print:border-slate-300 print:bg-slate-50">
            <span className="text-[10px] font-bold text-purple-300 print:text-purple-800 uppercase tracking-wider block mb-1">
              Model Research Interpretation
            </span>
            <p className="text-xs text-surface-200 print:text-slate-800 leading-relaxed font-mono">
              "{trajectory.research_interpretation}"
            </p>
          </div>

          {/* Temporal Observation Timeline Table */}
          <div className="rounded-xl border border-surface-700/70 overflow-hidden print:border-slate-300">
            <table className="w-full text-[11px] font-mono">
              <thead className="bg-surface-800 text-surface-400 print:bg-slate-100 print:text-slate-700">
                <tr>
                  <th className="p-2 text-left">Study Day</th>
                  <th className="p-2 text-left">Sample ID</th>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Model AD Prob.</th>
                  <th className="p-2 text-left">Shannon (H')</th>
                  <th className="p-2 text-left">CFS Frailty</th>
                  <th className="p-2 text-left">Top TreeSHAP Driver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800 print:divide-slate-200 text-surface-200 print:text-slate-800">
                {trajectory.observations.map((obs, idx) => {
                  const topShap = obs.shap_explanation?.top_features?.[0];
                  return (
                    <tr key={idx} className="hover:bg-surface-800/40 print:hover:bg-transparent">
                      <td className="p-2 font-bold text-purple-300 print:text-purple-700">Day {obs.study_day}</td>
                      <td className="p-2">{obs.sample_id}</td>
                      <td className="p-2">{obs.sample_date || 'N/A'}</td>
                      <td className="p-2 font-bold">{(obs.ad_probability * 100).toFixed(1)}%</td>
                      <td className="p-2">{obs.diversity_metrics?.shannon_index?.toFixed(2)}</td>
                      <td className="p-2">{obs.clinical_features?.clinical_frailty_scale} / 9</td>
                      <td className="p-2 truncate max-w-xs" title={topShap ? topShap.feature : 'N/A'}>
                        {topShap ? (
                          <span>
                            {topShap.feature} ({topShap.shap_value > 0 ? '+' : ''}{topShap.shap_value.toFixed(2)})
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mandatory Research Disclaimer */}
          <div className="p-3 rounded-lg border border-amber-500/25 bg-amber-500/5 print:border-slate-300 print:bg-slate-50 flex items-start gap-2 text-[10px]">
            <AlertTriangle size={14} className="text-amber-400 print:text-amber-700 shrink-0 mt-0.5" />
            <p className="text-surface-300 print:text-slate-700 leading-relaxed">
              <strong>Research Disclaimer:</strong> This analysis is intended for research purposes only.
              The reported trajectory represents model-estimated AD-associated risk across observed longitudinal
              samples and should not be interpreted as a clinical diagnosis or validated prediction of future disease onset.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
