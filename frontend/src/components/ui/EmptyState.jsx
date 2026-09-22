import React from 'react'
import { FolderSearch } from 'lucide-react'
import clsx from 'clsx'

/**
 * EmptyState — Consistent zero-state UI with clinical aesthetic
 */
export default function EmptyState({
  icon: Icon = FolderSearch,
  title = 'No records found',
  description = 'Try adjusting your search criteria or filter parameters.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={clsx(
        'card p-8 text-center flex flex-col items-center justify-center max-w-md mx-auto my-8 border border-surface-700/60 bg-surface-900/40',
        className
      )}
    >
      <div className="rounded-2xl p-4 bg-surface-800/80 text-surface-400 border border-surface-700/60 mb-4">
        <Icon size={32} className="text-accent-500 opacity-90" />
      </div>
      <h3 className="text-base font-bold text-surface-50 mb-1">{title}</h3>
      <p className="text-xs text-surface-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="btn-teal text-xs px-4 py-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
