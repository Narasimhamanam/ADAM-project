/**
 * StatusBadge — displays a coloured status indicator
 * Props: status ('connected'|'disconnected'|'loading'|'degraded'|'coming-soon')
 *        label (optional override text)
 */
import React from 'react'
import { Wifi, WifiOff, Loader2, AlertTriangle, Clock } from 'lucide-react'
import clsx from 'clsx'

const CONFIG = {
  connected:    { cls: 'badge-connected',  Icon: Wifi,          text: 'Connected' },
  disconnected: { cls: 'badge-error',      Icon: WifiOff,       text: 'Disconnected' },
  loading:      { cls: 'badge-loading',    Icon: Loader2,       text: 'Checking...' },
  degraded:     { cls: 'badge-degraded',   Icon: AlertTriangle, text: 'Degraded' },
  'coming-soon':{ cls: 'badge-info',       Icon: Clock,         text: 'Coming Soon' },
}

export default function StatusBadge({ status = 'loading', label }) {
  const cfg = CONFIG[status] || CONFIG.loading
  const { cls, Icon, text } = cfg
  const isSpinning = status === 'loading'

  return (
    <span className={cls}>
      <Icon size={12} className={clsx(isSpinning && 'animate-spin')} />
      {label ?? text}
    </span>
  )
}
