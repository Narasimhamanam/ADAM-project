import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ChevronDown,
  Check,
  Sparkles,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { useDemoPhase } from '../../context/DemoPhaseContext';

const PHASE_OPTIONS = [
  { phase: 1, label: 'Phase 1: Foundation', desc: 'Core platform, DB health & settings' },
  { phase: 2, label: 'Phase 2: Ingestion & Datasets', desc: 'Adds 335 samples & Dataset Explorer' },
  { phase: 3, label: 'Phase 3: ML & Explainability', desc: 'Adds XGBoost, SHAP & PDF Reports' },
  { phase: 4, label: 'Phase 4: AI & Multi-Agent (All)', desc: 'All features (RAG, Chat, Multi-Agent)' },
];

export default function DemoPhaseSwitcher({ compact = false }) {
  const { activeDemoPhase, setDemoPhase } = useDemoPhase();
  const [isOpen, setIsOpen] = useState(false);

  const currentOption = PHASE_OPTIONS.find((o) => o.phase === activeDemoPhase) || PHASE_OPTIONS[3];

  if (compact) {
    return (
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-surface-700/80 bg-surface-800/90 hover:bg-surface-700 text-surface-200 text-xs font-semibold shadow-sm transition-all"
          title="Demo Feature Control — Select which phase to demonstrate"
        >
          <SlidersHorizontal size={13} className="text-[#0F9D8A]" />
          <span className="font-mono font-bold text-surface-50">Demo: P{activeDemoPhase}</span>
          <ChevronDown size={12} className="text-surface-400" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-surface-900 border border-surface-700 shadow-xl z-50 p-2 space-y-1 animate-fade-in">
              <div className="px-2 py-1.5 border-b border-surface-800">
                <p className="text-[10px] uppercase font-bold text-surface-400 tracking-wider">
                  Demonstration Phase
                </p>
              </div>
              {PHASE_OPTIONS.map((opt) => (
                <button
                  key={opt.phase}
                  type="button"
                  onClick={() => {
                    setDemoPhase(opt.phase);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-start justify-between transition-colors ${
                    activeDemoPhase === opt.phase
                      ? 'bg-[#E8F7F4] text-[#0F9D8A] font-bold border border-[#0F9D8A]/30'
                      : 'text-surface-300 hover:bg-surface-800 hover:text-surface-50'
                  }`}
                >
                  <div>
                    <p className="font-bold">{opt.label}</p>
                    <p className="text-[10px] text-surface-400 font-normal mt-0.5">{opt.desc}</p>
                  </div>
                  {activeDemoPhase === opt.phase && <Check size={14} className="shrink-0 text-[#0F9D8A] mt-0.5" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-surface-900/90 border border-surface-700/80 space-y-2 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-surface-200">
          <SlidersHorizontal size={14} className="text-[#0F9D8A]" />
          <span>Demo Phase Control</span>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#E8F7F4] text-[#0F9D8A] border border-[#0F9D8A]/30">
          Phase {activeDemoPhase} Active
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1 pt-1">
        {[1, 2, 3, 4].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setDemoPhase(p)}
            className={`py-1.5 text-center text-xs font-bold font-mono rounded-lg transition-all ${
              activeDemoPhase === p
                ? 'bg-[#0F9D8A] text-white shadow-sm ring-1 ring-[#0F9D8A]'
                : p <= activeDemoPhase
                ? 'bg-surface-800 text-surface-200 hover:bg-surface-700 hover:text-surface-50 border border-surface-700'
                : 'bg-surface-800/40 text-surface-500 hover:bg-surface-800 border border-surface-750'
            }`}
            title={`Activate features up to Phase ${p}`}
          >
            P{p}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-surface-400 leading-tight pt-0.5">
        {currentOption.desc}
      </p>
    </div>
  );
}
