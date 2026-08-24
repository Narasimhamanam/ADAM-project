import React from 'react'
import { Brain, Menu, Bell, Activity, Sun, Moon } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'
import { useTheme } from '../../context/ThemeContext'

export default function Header({ onMenuToggle, backendStatus }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-surface-700/60 bg-surface-900/80 backdrop-blur-md px-4 lg:px-6 transition-colors duration-200">
      {/* Left: Logo + menu toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-1.5 text-surface-400 hover:bg-surface-700/60 hover:text-surface-100 transition-colors lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-accent-500/30 blur-md" />
            <div className="relative rounded-lg bg-gradient-to-br from-accent-500 to-primary-600 p-1.5 shadow-sm">
              <Brain size={18} className="text-white" />
            </div>
          </div>
          <div className="leading-none">
            <span className="text-sm font-bold text-surface-50">ADAM-1</span>
            <span className="ml-1 text-sm font-light text-accent-500">Enhanced</span>
          </div>
        </div>
      </div>

      {/* Centre: subtitle (hidden on small screens) */}
      <p className="hidden md:block text-xs text-surface-400 tracking-wide font-medium">
        AI-Powered Alzheimer's Disease &amp; Microbiome Research
      </p>

      {/* Right: status indicators & theme toggle */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <Activity size={12} className="text-surface-400" />
          <span className="text-xs text-surface-400 font-medium">Backend:</span>
          <StatusBadge status={backendStatus} />
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-surface-700/60 bg-surface-800/80 hover:bg-surface-700 text-surface-200 hover:text-surface-50 text-xs font-semibold transition-all duration-150 shadow-sm"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Minimal Theme`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <>
              <Moon size={14} className="text-primary-600" />
              <span className="hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <Sun size={14} className="text-amber-400" />
              <span className="hidden sm:inline">Light</span>
            </>
          )}
        </button>

        <button
          className="rounded-md p-1.5 text-surface-400 hover:bg-surface-700/60 hover:text-surface-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}

