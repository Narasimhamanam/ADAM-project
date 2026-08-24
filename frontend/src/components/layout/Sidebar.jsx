/**
 * Sidebar — navigation with 11 pages grouped by phase
 */
import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  ChevronRight,
  Dna,
  X,
} from 'lucide-react'
import clsx from 'clsx'

const ACTIVE_ROUTES = ['/dashboard', '/datasets']

const NAV_SECTIONS = [
  {
    label: 'Platform',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',         phase: null },
      { to: '/datasets',  icon: Database,        label: 'Dataset Explorer',  phase: null },
    ],
  },
  {
    label: 'Analysis & Research',
    items: [
      { to: '/alzheimer',  icon: Brain,      label: 'Alzheimer Analysis',   phase: null },
    ],
  },
  {
    label: 'Machine Learning — Phase 3 (Complete)',
    items: [
      { to: '/ml',        icon: TrendingUp,  label: 'ML Prediction',       phase: null },
      { to: '/models',    icon: BarChart3,   label: 'Model Comparison',    phase: null },
      { to: '/shap',      icon: Zap,         label: 'SHAP Explainability', phase: null },
      { to: '/reports',   icon: FileText,    label: 'Reports',             phase: null },
    ],
  },
  {
    label: 'AI & Literature — Phase 4 (Complete)',
    items: [
      { to: '/assistant',  icon: MessageSquare, label: 'Research Assistant', phase: null },
      { to: '/literature', icon: BookOpen,      label: 'Literature / RAG',   phase: null },
      { to: '/agents',     icon: Bot,           label: 'AI Agents',          phase: null },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', icon: Settings, label: 'Settings', phase: null },
    ],
  },
]

function NavItem({ to, icon: Icon, label, phase }) {
  const isComingSoon = phase !== null
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          isActive ? 'nav-item-active' : 'nav-item',
          isComingSoon && 'opacity-70',
        )
      }
      title={phase ? `${label} — ${phase}` : label}
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {phase && (
        <span className="shrink-0 rounded text-[10px] px-1.5 py-0.5 bg-surface-700/60 text-surface-400 border border-surface-600/40">
          {phase}
        </span>
      )}
    </NavLink>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-40 h-full w-64 bg-surface-900 border-r border-surface-700/60',
          'flex flex-col transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto lg:h-auto lg:flex-shrink-0',
        )}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/60 lg:hidden">
          <div className="flex items-center gap-2">
            <Dna size={16} className="text-accent-400" />
            <span className="text-sm font-semibold text-white">Navigation</span>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-surface-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItem key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-surface-700/60 px-4 py-3">
          <p className="text-[10px] text-surface-500">ADAM-1 Enhanced v1.0.0</p>
          <p className="text-[10px] text-success-500 font-semibold">Phase 4 Complete — All Verified</p>
        </div>
      </aside>
    </>
  )
}
