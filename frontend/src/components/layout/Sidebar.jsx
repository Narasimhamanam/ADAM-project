/**
 * Sidebar.jsx — Streamlined 5-Destination Research Navigation
 * ============================================================================
 * Implements the simplified, research-focused navigation architecture:
 * 1. Overview (/overview)
 * 2. Analyze (/analyze)
 * 3. Patient Explorer (/patients)
 * 4. Research & Validation (/research)
 * 5. Reports & Evidence (/reports)
 * + Compact platform settings action in the footer.
 * ============================================================================
 */
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FlaskConical,
  Users,
  ShieldCheck,
  FileText,
  Settings,
  Dna,
  X,
  ChevronRight,
  Activity,
} from 'lucide-react';
import clsx from 'clsx';
import { useDemoPhase } from '../../context/DemoPhaseContext';

const PRIMARY_DESTINATIONS = [
  {
    to: '/overview',
    icon: LayoutDashboard,
    label: 'Overview',
    description: 'System metrics & research status',
  },
  {
    to: '/analyze',
    icon: FlaskConical,
    label: 'Analyze',
    description: 'Models, workflow & SHAP',
  },
  {
    to: '/patients',
    icon: Users,
    label: 'Patient Explorer',
    description: '102 subjects & timeline history',
  },
  {
    to: '/research',
    icon: ShieldCheck,
    label: 'Research & Validation',
    description: 'Datasets, benchmarks & linkage',
  },
  {
    to: '/reports',
    icon: FileText,
    label: 'Reports & Evidence',
    description: 'Dossiers, RAG & citations',
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { activeDemoPhase } = useDemoPhase();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Main Sidebar Drawer */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-full w-64 bg-surface-900 border-r border-surface-700/70 shadow-lg no-print print:hidden',
          'flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto lg:h-auto lg:flex-shrink-0 lg:shadow-none'
        )}
      >
        {/* Mobile Header / Brand */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/60 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-600/20 text-primary-400 border border-primary-500/30">
              <Dna size={16} />
            </div>
            <div>
              <span className="text-sm font-bold text-surface-50">ADAM-1</span>
              <span className="ml-1 text-xs text-primary-400 font-semibold">Enhanced</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Category Label */}
        <div className="px-4 pt-4 pb-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
            Research Workspace
          </p>
        </div>

        {/* 5 Core Navigation Destinations */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-1 space-y-1">
          {PRIMARY_DESTINATIONS.map(({ to, icon: Icon, label, description }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-500/15 text-primary-300 border border-primary-500/30 shadow-sm font-semibold'
                    : 'text-surface-300 hover:text-surface-100 hover:bg-surface-800/80 border border-transparent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={clsx(
                      'shrink-0 transition-colors',
                      isActive ? 'text-primary-400' : 'text-surface-400 group-hover:text-surface-200'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate leading-tight">{label}</div>
                    <div className="text-[10px] text-surface-500 truncate font-normal leading-tight mt-0.5">
                      {description}
                    </div>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Platform Settings & System Status Footer */}
        <div className="border-t border-surface-700/60 p-3 bg-surface-950/40 space-y-2">
          {/* Settings Link */}
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'bg-surface-800 text-surface-100 border border-surface-700'
                  : 'text-surface-400 hover:text-surface-200 hover:bg-surface-850'
              )
            }
          >
            <Settings size={15} className="shrink-0" />
            <span className="flex-1 truncate">Settings &amp; Environment</span>
            <ChevronRight size={13} className="text-surface-500" />
          </NavLink>

          {/* Verification Badge */}
          <div className="px-3 py-2 rounded-lg bg-surface-900/80 border border-surface-800 text-[10px] space-y-1">
            <div className="flex items-center justify-between text-surface-400">
              <span className="font-medium">Pipeline Status</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified
              </span>
            </div>
            <div className="text-surface-500 text-[9px] font-mono truncate">
              Phase {activeDemoPhase} • IEEE Access (2025)
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
