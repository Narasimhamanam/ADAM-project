/**
 * StatCard — metric card with icon, value, label, and optional trend
 */
import React from 'react'
import clsx from 'clsx'

export default function StatCard({ icon: Icon, label, value, sub, accent = 'accent', className }) {
  const accentMap = {
    accent:  'from-accent-600/20 to-accent-700/5 border-accent-500/20 text-accent-400',
    primary: 'from-primary-600/20 to-primary-700/5 border-primary-500/20 text-primary-400',
    success: 'from-success-600/20 to-success-700/5 border-success-500/20 text-success-400',
    warning: 'from-warning-600/20 to-warning-700/5 border-warning-500/20 text-warning-400',
    danger:  'from-danger-600/20 to-danger-700/5 border-danger-500/20 text-danger-400',
  }

  const accentCls = accentMap[accent] || accentMap.accent

  return (
    <div className={clsx('card p-5 bg-gradient-to-br', accentCls, 'animate-fade-in', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-surface-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={clsx('rounded-lg p-2.5 bg-current/10')}>
            <Icon size={20} className="opacity-80" />
          </div>
        )}
      </div>
    </div>
  )
}
