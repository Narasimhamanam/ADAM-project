/**
 * LoadingSpinner — full-page or inline loader
 */
import React from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

export default function LoadingSpinner({ fullPage = false, message = 'Loading...' }) {
  if (fullPage) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="animate-spin text-accent-400" />
        <p className="text-sm text-surface-300">{message}</p>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-surface-300">
      <Loader2 size={16} className="animate-spin text-accent-400" />
      <span className="text-sm">{message}</span>
    </div>
  )
}
