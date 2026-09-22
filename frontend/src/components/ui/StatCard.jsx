/**
 * StatCard — metric card with icon, value, label, and optional trend
 * Elevated with 2nd tier elevation (.card-raised) and high-contrast clinical typography
 */
import React from 'react'
import clsx from 'clsx'

export default function StatCard({ icon: Icon, label, value, sub, accent = 'accent', className }) {
  const accentMap = {
    accent:  'from-accent-500/15 via-accent-600/5 to-transparent border-accent-500/25 text-accent-500 dark:text-accent-400',
    primary: 'from-primary-500/15 via-primary-600/5 to-transparent border-primary-500/25 text-primary-600 dark:text-primary-400',
    success: 'from-success-500/15 via-success-600/5 to-transparent border-success-500/25 text-success-600 dark:text-success-400',
    warning: 'from-warning-500/15 via-warning-600/5 to-transparent border-warning-500/25 text-warning-600 dark:text-warning-400',
    danger:  'from-danger-500/15 via-danger-600/5 to-transparent border-danger-500/25 text-danger-600 dark:text-danger-400',
  }

  const accentCls = accentMap[accent] || accentMap.accent

  return (
    <div className={clsx('card-raised p-5 bg-gradient-to-br transition-all duration-200 hover:-translate-y-0.5', accentCls, className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="stat-label text-surface-400">{label}</p>
          <p className="font-data text-3xl font-extrabold tracking-tight text-surface-50 mt-1.5 truncate">
            {value ?? '—'}
          </p>
          {sub && <p className="text-xs text-surface-400 mt-1.5 flex items-center gap-1">{sub}</p>}
        </div>
        {Icon && (
          <div className="rounded-xl p-2.5 bg-surface-900/60 dark:bg-surface-950/60 border border-current/20 shrink-0 ml-3 shadow-sm">
            <Icon size={20} className="opacity-90" />
          </div>
        )}
      </div>
    </div>
  )
}
