import React from 'react'
import clsx from 'clsx'

/**
 * ResponsiveTable — Container for tabular data with scroll preservation and responsive padding
 */
export default function ResponsiveTable({
  children,
  className = '',
  maxHeight,
  minWidth = '640px',
  stickyHeader = false,
}) {
  return (
    <div
      className={clsx(
        'w-full overflow-x-auto rounded-xl border border-surface-700/60 bg-surface-900/50 shadow-sm relative',
        className
      )}
      style={{
        maxHeight: maxHeight || undefined,
        overflowY: maxHeight ? 'auto' : undefined,
      }}
    >
      <div style={{ minWidth }}>
        <table className={clsx('w-full text-left text-xs border-collapse', stickyHeader && '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-surface-800')}>
          {children}
        </table>
      </div>
    </div>
  )
}
