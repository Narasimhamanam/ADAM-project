/**
 * Layout — main application shell
 * Manages sidebar open/close state and provides the content area.
 */
import React, { useState } from 'react'
import ResearchAssistant from '../../pages/ResearchAssistant'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Layout({ children, backendStatus }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [chatOpen, setChatOpen] = useState(false)
  const location = useLocation()
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
        {location.pathname !== '/assistant' && <aside className="fixed bottom-3 right-3 z-30 max-w-[min(28rem,95vw)] print:hidden">
          {chatOpen && <div className="max-h-[65vh] overflow-auto"><ResearchAssistant /></div>}
          <button className="bg-surface-800 border rounded p-2" aria-expanded={chatOpen} onClick={() => setChatOpen(!chatOpen)}>{chatOpen ? 'Close AIRA' : 'Ask AIRA'}</button>
        </aside>}
      </div>
    </div>
  )
}
