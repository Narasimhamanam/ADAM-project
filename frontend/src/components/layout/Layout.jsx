/**
 * Layout — main application shell
 * Manages sidebar open/close state and provides the content area.
 */
import React, { useState } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout({ children, backendStatus }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950 print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden print:overflow-visible">
        <Header
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          backendStatus={backendStatus}
        />

        {/* Scrollable page content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 lg:p-6 print:p-0 print:m-0 print:overflow-visible"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
