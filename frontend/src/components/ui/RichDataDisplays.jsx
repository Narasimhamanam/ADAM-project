import React from 'react'

export function Callout({ variant = 'info', title, children, className = '' }) {
  const styles = {
    info: 'bg-primary-950/40 border-primary-500/30 text-primary-200',
    warning: 'bg-amber-950/40 border-amber-500/40 text-amber-200',
    danger: 'bg-rose-950/40 border-rose-500/40 text-rose-200',
    success: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
  }
  return (
    <div className={`p-4 rounded-xl border ${styles[variant]} ${className}`} role={variant === 'warning' ? 'alert' : 'note'}>
      {title && <h4 className="font-bold text-sm tracking-tight mb-1">{title}</h4>}
      <div className="text-xs leading-relaxed">{children}</div>
    </div>
  )
}

export function MetricCard({ title, value, ci, subtitle, badge }) {
  return (
    <div className="p-4 rounded-xl bg-surface-900/80 border border-surface-700/60 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-surface-400">{title}</span>
        {badge && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary-500/15 text-primary-300 border border-primary-500/30">{badge}</span>}
      </div>
      <div className="mt-2">
        <strong className="text-2xl font-extrabold font-mono text-surface-50">{value}</strong>
        {ci && <p className="text-[11px] font-mono text-surface-400 mt-0.5">95% CI: {ci}</p>}
        {subtitle && <p className="text-[11px] text-surface-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  )
}

export function ForestPlot({ estimate, ci, min = 0, max = 1, width = 160, height = 24, label = '' }) {
  if (!ci || ci.length < 2 || !Number.isFinite(estimate)) return null
  const [ciMin, ciMax] = ci
  const span = max - min
  const leftX = Math.max(0, Math.min(width, ((ciMin - min) / span) * width))
  const rightX = Math.max(0, Math.min(width, ((ciMax - min) / span) * width))
  const estX = Math.max(0, Math.min(width, ((estimate - min) / span) * width))
  const centerY = height / 2

  return (
    <svg width={width} height={height} className="inline-block align-middle" role="img" aria-label={`Estimate ${estimate.toFixed(3)} (CI: ${ciMin.toFixed(3)} to ${ciMax.toFixed(3)})`}>
      {/* Background guide */}
      <line x1={0} y1={centerY} x2={width} y2={centerY} stroke="currentColor" strokeOpacity={0.15} strokeWidth={1} />
      {/* 95% CI bar */}
      <line x1={leftX} y1={centerY} x2={rightX} y2={centerY} stroke="currentColor" strokeOpacity={0.65} strokeWidth={2.5} strokeLinecap="round" />
      {/* Point estimate diamond/square */}
      <rect x={estX - 3.5} y={centerY - 3.5} width={7} height={7} fill="var(--glass-tint, #2dd4bf)" rx={1.5} />
    </svg>
  )
}
