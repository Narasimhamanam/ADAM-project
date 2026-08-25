/**
 * StatusBadge — displays a coloured status indicator
 * Props: status ('connected'|'healthy'|'disconnected'|'unavailable'|'loading'|'degraded'|'upcoming'|'coming-soon'|'not_configured'|'active'|'in_progress')
 *        label (optional override text)
 */
import React from 'react'
import { Wifi, WifiOff, Loader2, AlertTriangle, Clock, Slash, CheckCircle2, Play } from 'lucide-react'
import clsx from 'clsx'

const CONFIG = {
  connected:      { cls: 'badge-connected', Icon: CheckCircle2,  text: 'Connected' },
  healthy:        { cls: 'badge-connected', Icon: CheckCircle2,  text: 'Healthy' },
  active:         { cls: 'badge-teal',      Icon: Play,          text: 'In Progress' },
  in_progress:    { cls: 'badge-teal',      Icon: Play,          text: 'In Progress' },
  disconnected:   { cls: 'badge-error',     Icon: WifiOff,       text: 'Unavailable' },
  unavailable:    { cls: 'badge-error',     Icon: WifiOff,       text: 'Unavailable' },
  loading:        { cls: 'badge-loading',   Icon: Loader2,       text: 'Checking...' },
  degraded:       { cls: 'badge-degraded',  Icon: AlertTriangle, text: 'Degraded' },
  upcoming:       { cls: 'badge-loading',   Icon: Clock,         text: 'Upcoming' },
  'coming-soon':  { cls: 'badge-info',      Icon: Clock,         text: 'Coming Soon' },
  not_configured: { cls: 'badge-loading',   Icon: Slash,         text: 'Not Configured' },
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
