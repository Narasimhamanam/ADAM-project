/**
 * ComingSoon — polished placeholder for future-phase pages
 */
import React from 'react'
import { FlaskConical, Clock, Rocket } from 'lucide-react'

export default function ComingSoon({ title, description, phase, icon: Icon = FlaskConical }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6 animate-fade-in">
      {/* Glowing icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-accent-500/20 blur-2xl scale-150" />
        <div className="relative rounded-2xl border border-surface-600/60 bg-surface-800/80 p-6">
          <Icon size={48} className="text-accent-400" />
        </div>
      </div>

      {/* Phase badge */}
      {phase && (
        <span className="coming-soon-badge mb-4">
          <Clock size={12} />
          {phase}
        </span>
      )}

      <h1 className="text-3xl font-bold text-white mb-3">{title}</h1>
      <p className="text-surface-300 max-w-md text-balance leading-relaxed mb-8">
        {description}
      </p>

      <div className="card p-4 flex items-center gap-3 text-sm text-surface-300 max-w-sm">
        <Rocket size={16} className="shrink-0 text-accent-400" />
        <span>
          This feature is on the roadmap and will be activated in a future phase.
          The platform foundation is active and ready.
        </span>
      </div>
    </div>
  )
}
