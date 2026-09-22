import React from 'react'
import clsx from 'clsx'

/**
 * Skeleton — Clinical shimmer placeholder for async UI elements
 * Supports 'text', 'card', 'stat', 'circle', 'table', and custom dimensions.
 */
export default function Skeleton({
  variant = 'rect',
  className = '',
  width,
  height,
  lines = 3,
}) {
  const baseClasses = 'animate-pulse bg-surface-700/50 dark:bg-surface-700/40 rounded'

  if (variant === 'circle') {
    return (
      <div
        className={clsx('rounded-full shrink-0 animate-pulse bg-surface-700/50 dark:bg-surface-700/40', className)}
        style={{ width: width || 40, height: height || 40 }}
      />
    )
  }

  if (variant === 'text') {
    return (
      <div className={clsx('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={clsx(
              baseClasses,
              'h-4',
              i === lines - 1 ? 'w-3/5' : 'w-full'
            )}
            style={i === 0 && width ? { width } : undefined}
          />
        ))}
      </div>
    )
  }

  if (variant === 'stat') {
    return (
      <div className={clsx('card p-5 bg-surface-800/40 border border-surface-700/40 space-y-3', className)}>
        <div className="h-3 w-20 bg-surface-700/50 rounded" />
        <div className="h-8 w-28 bg-surface-700/60 rounded" />
        <div className="h-2.5 w-36 bg-surface-700/40 rounded" />
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className={clsx('space-y-3 p-4', className)}>
        <div className="h-8 bg-surface-700/50 rounded-lg w-full mb-4" />
        {Array.from({ length: lines || 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-center">
            <div className="h-4 bg-surface-700/40 rounded w-1/4" />
            <div className="h-4 bg-surface-700/40 rounded w-1/4" />
            <div className="h-4 bg-surface-700/40 rounded w-1/4" />
            <div className="h-4 bg-surface-700/40 rounded w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div
        className={clsx(
          'card p-5 bg-surface-800/40 border border-surface-700/40 space-y-4 animate-pulse',
          className
        )}
      >
        <div className="h-4 bg-surface-700/60 rounded w-1/3" />
        <div className="space-y-2">
          <div className="h-3 bg-surface-700/40 rounded w-full" />
          <div className="h-3 bg-surface-700/40 rounded w-5/6" />
        </div>
        <div className="h-24 bg-surface-700/30 rounded-lg w-full" />
      </div>
    )
  }

  return (
    <div
      className={clsx(baseClasses, className)}
      style={{
        width: width,
        height: height || 20,
      }}
    />
  )
}
