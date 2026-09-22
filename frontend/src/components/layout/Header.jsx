import React from 'react'
import { Brain, Menu, Bell, Activity, Sun, Moon } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { useTheme } from '../../context/ThemeContext'

export default function Header({ onMenuToggle, backendStatus }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-surface-700/70 bg-surface-900/85 backdrop-blur-md px-4 lg:px-6 transition-colors duration-200 shadow-sm">
      {/* Left: Logo + menu toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-colors lg:hidden focus:outline-none focus:ring-2 focus:ring-accent-500"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-accent-500/30 blur-sm" />
            <div className="relative rounded-lg bg-gradient-to-br from-accent-500 to-primary-600 p-1.5 shadow-sm ring-1 ring-white/20">
              <Brain size={18} className="text-white" />
            </div>
          </div>
          <div className="leading-none select-none">
            <span className="text-sm font-extrabold tracking-tight text-surface-50">ADAM-1</span>
            <span className="ml-1 text-sm font-medium text-accent-500 dark:text-accent-400">Enhanced</span>
          </div>
        </div>
      </div>

      {/* Centre: Clinical Subtitle */}
      <div className="hidden md:flex items-center gap-2 text-xs text-surface-400 font-medium">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-500 animate-pulse"></span>
        <span>AI-Powered Alzheimer's Disease &amp; Gut Microbiome Multi-Agent Platform</span>
      </div>

      {/* Right: status indicators & theme toggle */}
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-800/60 border border-surface-700/50">
          <Activity size={12} className="text-accent-500" />
          <span className="text-xs text-surface-400 font-medium">API:</span>
          <StatusBadge status={backendStatus} />
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-surface-700/70 bg-surface-800/80 hover:bg-surface-700 text-surface-200 hover:text-surface-50 text-xs font-semibold transition-all duration-150 shadow-sm active:scale-95"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <>
              <Moon size={14} className="text-primary-600" />
              <span className="hidden sm:inline font-medium">Dark</span>
            </>
          ) : (
            <>
              <Sun size={14} className="text-amber-400" />
              <span className="hidden sm:inline font-medium">Light</span>
            </>
          )}
        </button>

        <button
          className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={17} />
        </button>
      </div>
    </header>
  )
}
