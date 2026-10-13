import React from 'react'
import { AlertOctagon, RotateCcw, Home } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught unhandled error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/overview'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[500px] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-2xl bg-surface-900 border border-surface-700/80 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertOctagon size={26} />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-surface-100">
                Application Rendering Notice
              </h2>
              <p className="text-xs text-surface-400 leading-relaxed">
                The application encountered an unexpected state while loading this page. You can recover immediately by reloading or navigating to the Overview dashboard.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-lg bg-surface-950 border border-surface-800 text-2xs font-mono text-rose-300/80 text-left overflow-x-auto max-h-24">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <RotateCcw size={13} />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-200 text-xs font-medium transition-colors"
              >
                <Home size={13} />
                <span>Overview</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
