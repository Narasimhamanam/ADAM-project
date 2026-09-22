/**
 * Sidebar — navigation grouped by phase
 * Phase visibility is controlled only by ACTIVE_DEMO_PHASE in featurePhases.js
 * Elevated clinical aesthetic with refined phase chips and smooth transitions
 */
import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  Brain,
  TrendingUp,
  BarChart3,
  Zap,
  MessageSquare,
  BookOpen,
  Bot,
  FileText,
  Settings,
  Dna,
  X,
  Lock,
  GitMerge,
  Award,
} from 'lucide-react'
import clsx from 'clsx'
import { useDemoPhase } from '../../context/DemoPhaseContext'

const NAV_SECTIONS = [
  {
    label: 'Platform — Phase 1',
    phaseRequired: 1,
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',       phase: 1 },
      { to: '/settings',  icon: Settings,        label: 'Settings',        phase: 1 },
    ],
  },
  {
    label: 'Data & Ingestion — Phase 2',
    phaseRequired: 2,
    items: [
      { to: '/datasets',  icon: Database,        label: 'Dataset Explorer', phase: 2 },
    ],
  },
  {
    label: 'Machine Learning — Phase 3',
    phaseRequired: 3,
    items: [
      { to: '/alzheimer', icon: Brain,       label: 'Alzheimer Analysis',  phase: 3 },
      { to: '/ml',        icon: TrendingUp,  label: 'ML Prediction',       phase: 3 },
      { to: '/models',    icon: BarChart3,   label: 'Model Comparison',    phase: 3 },
      { to: '/shap',      icon: Zap,         label: 'SHAP Explainability', phase: 3 },
      { to: '/reports',   icon: FileText,    label: 'Reports & PDF',       phase: 3 },
    ],
  },
  {
    label: 'AI & Literature — Phase 4',
    phaseRequired: 4,
    items: [
      { to: '/workflow',    icon: GitMerge,      label: 'ADAM Workflow',     phase: 4 },
      { to: '/performance', icon: Award,         label: 'ADAM Performance', phase: 4 },
      { to: '/assistant',   icon: MessageSquare, label: 'Research Assistant', phase: 4 },
      { to: '/literature',  icon: BookOpen,      label: 'Literature / RAG',   phase: 4 },
      { to: '/agents',      icon: Bot,           label: 'AI Agents',          phase: 4 },
    ],
  },
]

function NavItem({ to, icon: Icon, label, phase, activeDemoPhase, onClose }) {
  const isLocked = phase > activeDemoPhase
  const isCurrentActive = phase === activeDemoPhase

  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) =>
        clsx(
          isActive ? 'nav-item-active' : 'nav-item',
          isLocked && 'opacity-60 hover:opacity-85',
        )
      }
      title={isLocked ? `${label} — Coming in Phase ${phase}` : `${label} — Phase ${phase}`}
    >
      <Icon size={16} className={clsx('shrink-0 transition-colors', isLocked && 'text-surface-500')} />
      <span className="flex-1 truncate font-medium">{label}</span>
      {isLocked ? (
        <span className="shrink-0 flex items-center gap-1 rounded-md text-[10px] px-1.5 py-0.5 bg-surface-800 text-amber-500/80 border border-amber-500/25 font-mono font-bold">
          <Lock size={9} />
          P{phase}
        </span>
      ) : isCurrentActive ? (
        <span className="shrink-0 flex items-center gap-1 rounded-md text-[9px] px-1.5 py-0.5 bg-accent-500/15 text-accent-600 dark:text-accent-400 font-mono font-bold border border-accent-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500"></span>
          P{phase}
        </span>
      ) : (
        <span className="shrink-0 rounded-md text-[9px] px-1.5 py-0.5 bg-surface-800/80 text-surface-400 font-mono font-semibold border border-surface-700/50">
          P{phase}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  const { activeDemoPhase } = useDemoPhase()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-40 h-full w-64 bg-surface-900 border-r border-surface-700/70 shadow-sm',
          'flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto lg:h-auto lg:flex-shrink-0',
        )}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/60 lg:hidden">
          <div className="flex items-center gap-2">
            <Dna size={16} className="text-accent-500" />
            <span className="text-sm font-bold text-surface-50">Navigation</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-surface-400 hover:text-surface-100 hover:bg-surface-800">
            <X size={18} />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_SECTIONS.map((section) => {
            const isSectionFuture = section.phaseRequired > activeDemoPhase
            return (
              <div key={section.label} className="space-y-1">
                <div className="flex items-center justify-between px-3 mb-1.5">
                  <p className={clsx(
                    'text-[10px] font-bold uppercase tracking-wider',
                    isSectionFuture ? 'text-surface-600' : 'text-surface-400',
                  )}>
                    {section.label}
                  </p>
                  {isSectionFuture && (
                    <span className="text-[9px] font-bold text-amber-500/70 font-mono">
                      Upcoming
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.to}
                      {...item}
                      activeDemoPhase={activeDemoPhase}
                      onClose={onClose}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-surface-700/60 px-4 py-3 bg-surface-950/30">
          <p className="text-[10px] text-surface-500 font-medium">ADAM-1 Enhanced Platform</p>
          <p className="text-[10px] text-accent-500 font-semibold mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-500 inline-block animate-pulse"></span>
            Phase {activeDemoPhase} Production Active
          </p>
        </div>
      </aside>
    </>
  )
}
