import React from 'react';
import { NavLink } from 'react-router-dom';
import { Brain, Menu, Activity, Sun, Moon, Settings } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { useTheme } from '../../context/ThemeContext';

export default function Header({ onMenuToggle, backendStatus }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-surface-700/70 bg-surface-900/90 backdrop-blur-md px-4 lg:px-6 transition-colors duration-200 shadow-sm no-print print:hidden">
      {/* Left: Logo + Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-colors lg:hidden focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <NavLink to="/overview" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-primary-500/20 blur-sm group-hover:bg-primary-500/30 transition-colors" />
            <div className="relative rounded-lg bg-gradient-to-br from-primary-600 to-accent-600 p-1.5 shadow-sm ring-1 ring-white/10">
              <Brain size={18} className="text-white" />
            </div>
          </div>
          <div className="leading-none select-none">
            <span className="text-sm font-extrabold tracking-tight text-surface-50">ADAM-1</span>
            <span className="ml-1 text-sm font-semibold text-primary-400">Enhanced</span>
          </div>
        </NavLink>
      </div>

      {/* Centre: Concise Research Description */}
      <div className="hidden md:flex items-center gap-2 text-xs text-surface-400 font-medium">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
        <span>AI-powered Alzheimer’s research and microbiome analysis.</span>
      </div>

      {/* Right: Telemetry status, Theme toggle & Settings */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Backend Connection Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-800/80 border border-surface-700/60">
          <Activity size={12} className="text-primary-400" />
          <span className="text-xs text-surface-400 font-medium hidden sm:inline">Backend:</span>
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

        {/* Compact Settings Link */}
        <NavLink
          to="/settings"
          className="rounded-lg p-2 text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-colors"
          title="Platform Settings & Environment"
          aria-label="Settings"
        >
          <Settings size={17} />
        </NavLink>
      </div>
    </header>
  );
}
