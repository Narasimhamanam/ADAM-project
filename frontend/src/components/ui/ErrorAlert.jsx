/**
 * ErrorAlert — displays API or runtime errors
 */
import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ErrorAlert({ message, onRetry }) {
  return (
    <div className="card border-danger-500/30 bg-danger-950/20 p-4 flex items-start gap-3 animate-fade-in">
      <AlertTriangle size={18} className="shrink-0 text-danger-400 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-danger-300">Error</p>
        <p className="text-xs text-danger-400/80 mt-0.5">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="shrink-0 rounded-md p-1.5 text-danger-400 hover:bg-danger-500/10 transition-colors"
          title="Retry"
        >
          <RefreshCw size={14} />
        </button>
      )}
    </div>
  )
}
