import React, { useState } from 'react'
import { Download, Loader2, AlertCircle } from 'lucide-react'
import { apiClient } from '../api/client'

export default function ReportDownloads({ record }) {
  const [busy, setBusy] = useState('')
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState('')

  async function download(format) {
    if (!record || busy) return
    setBusy(format)
    setStatusText('Compiling dossier...')
    setError('')

    try {
      // Simulate/indicate progress phases
      const progressTimer = setTimeout(() => {
        setStatusText(format === 'pdf' ? 'Rendering charts...' : 'Serializing JSON payload...')
      }, 700)

      const response = await apiClient.get('/reports/' + encodeURIComponent(record), {
        params: { format },
        responseType: 'blob',
        timeout: 120000
      })

      clearTimeout(progressTimer)
      setStatusText('Downloading...')

      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a')
      a.href = url
      const headerFilename = response.headers['content-disposition']?.match(/filename="([^"]+)"/)?.[1]
      const defaultFilename = `ADAM_report_${record}_${new Date(response.headers.date || Date.now()).toISOString().slice(0, 10)}.${format}`
      a.download = headerFilename || defaultFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch {
      setError('Export failed. Verify backend service connection and retry.')
    } finally {
      setBusy('')
      setStatusText('')
    }
  }

  return (
    <div className="flex flex-col gap-2 print:hidden" aria-busy={!!busy}>
      <div className="export-actions flex items-center gap-2">
        <button
          type="button"
          className="glass-button flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg"
          disabled={!!busy || !record}
          onClick={() => download('pdf')}
          aria-label="Download patient report as PDF"
        >
          {busy === 'pdf' ? (
            <Loader2 size={14} className="animate-spin text-primary-400" />
          ) : (
            <Download size={14} />
          )}
          <span>{busy === 'pdf' ? statusText || 'Preparing PDF...' : 'Download PDF Dossier'}</span>
        </button>

        <button
          type="button"
          className="glass-button flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg"
          disabled={!!busy || !record}
          onClick={() => download('json')}
          aria-label="Export patient record as JSON"
        >
          {busy === 'json' ? (
            <Loader2 size={14} className="animate-spin text-primary-400" />
          ) : (
            <Download size={14} />
          )}
          <span>{busy === 'json' ? statusText || 'Exporting JSON...' : 'Export JSON Record'}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-1.5 text-xs text-danger-400 mt-1">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-[11px] text-surface-400 leading-tight">
        Research use only. Cohort identifiers and records are de-identified or synthetic.
      </p>
    </div>
  )
}
