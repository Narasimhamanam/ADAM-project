/**
 * Header — top navigation bar with branding and system status
 */
import React from 'react'
import { Brain, Menu, Bell, Activity } from 'lucide-react'
import StatusBadge from '../ui/StatusBadge'

export default function Header({ onMenuToggle, backendStatus }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-surface-700/60 bg-surface-900/80 backdrop-blur-md px-4 lg:px-6">
      {/* Left: Logo + menu toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-1.5 text-surface-400 hover:bg-surface-700/60 hover:text-white transition-colors lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-accent-500/30 blur-md" />
            <div className="relative rounded-lg bg-gradient-to-br from-accent-500 to-primary-600 p-1.5">
              <Brain size={18} className="text-white" />
            </div>
          </div>
          <div className="leading-none">
            <span className="text-sm font-bold text-white">ADAM-1</span>
            <span className="ml-1 text-sm font-light text-accent-300">Enhanced</span>
          </div>
        </div>
      </div>

      {/* Centre: subtitle (hidden on small screens) */}
      <p className="hidden md:block text-xs text-surface-400 tracking-wide">
        AI-Powered Alzheimer's Disease &amp; Microbiome Research
      </p>

      {/* Right: status indicators */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <Activity size={12} className="text-surface-400" />
          <span className="text-xs text-surface-400">Backend:</span>
          <StatusBadge status={backendStatus} />
        </div>

        <button
          className="rounded-md p-1.5 text-surface-400 hover:bg-surface-700/60 hover:text-white transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  )
}
