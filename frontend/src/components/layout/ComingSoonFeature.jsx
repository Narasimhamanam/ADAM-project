import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  ArrowLeft,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { PHASES } from '../../config/featurePhases';

export default function ComingSoonFeature({ feature }) {
  const navigate = useNavigate();

  if (!feature) {
    return (
      <div className="card p-12 text-center space-y-4 max-w-xl mx-auto my-8">
        <p className="text-sm font-bold text-surface-50">Feature Not Found</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary text-xs mx-auto">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const phaseMeta = PHASES[feature.phase] || {
    number: feature.phase,
    name: `Phase ${feature.phase}`,
    summary: 'Planned for upcoming development milestone.',
  };

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6 animate-fade-in">
      {/* ── Top Navigation / Back ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-surface-400 hover:text-surface-50 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <span className="text-[11px] px-2.5 py-1 rounded-full font-mono font-bold bg-surface-800 text-surface-400 border border-surface-700">
          Phase {feature.phase} — Planned
        </span>
      </div>

      {/* ── Main Coming-Up Card ── */}
      <div className="card p-8 md:p-10 bg-surface-900 border border-surface-700 shadow-lg space-y-6 relative overflow-hidden">
        {/* Subtle Ambient Background Gradient */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-gradient-to-br from-[#0F9D8A]/10 to-primary-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Badge & Title */}
        <div className="space-y-3 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#E8F7F4] text-[#0F9D8A] border border-[#0F9D8A]/30">
            <Rocket size={14} className="text-[#0F9D8A] animate-pulse" />
            <span>Coming Up</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-surface-50 tracking-tight">
            {feature.name}
          </h1>

          <p className="text-xs font-bold text-surface-400 uppercase tracking-wider">
            This feature is planned as part of:
          </p>
        </div>

        {/* Phase Banner */}
        <div className="p-4 rounded-xl bg-surface-800 border border-surface-700 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#0F9D8A]/15 border border-[#0F9D8A]/30 flex items-center justify-center text-[#0F9D8A] shrink-0 font-bold">
            <Layers size={20} />
          </div>
          <div className="space-y-1 flex-1">
            <h2 className="text-sm font-bold text-surface-50">
              Phase {feature.phase} – {phaseMeta.name}
            </h2>
            <p className="text-xs text-surface-400 leading-relaxed font-medium">
              {phaseMeta.summary}
            </p>
          </div>
        </div>

        {/* Feature Overview */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
            Feature Description
          </h3>
          <p className="text-xs text-surface-300 leading-relaxed font-medium">
            {feature.description}
          </p>
        </div>

        {/* Planned Capabilities */}
        {feature.capabilities && feature.capabilities.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400">
              Key Capabilities Planned for Phase {feature.phase}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {feature.capabilities.map((cap, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-surface-800/80 border border-surface-700/60 flex items-start gap-2.5 text-xs text-surface-300 font-medium"
                >
                  <CheckCircle2 size={15} className="text-[#0F9D8A] shrink-0 mt-0.5" />
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Footer */}
        <div className="pt-4 border-t border-surface-700 flex items-center justify-between text-xs text-surface-400 font-medium">
          <p>
            <span className="font-semibold text-surface-200">Status: </span>
            <span className="text-[#D97706] font-bold">Planned for Phase {feature.phase}</span>
          </p>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface-800 border border-surface-700 text-surface-400 font-mono">
            {phaseMeta.status}
          </span>
        </div>
      </div>
    </div>
  );
}
