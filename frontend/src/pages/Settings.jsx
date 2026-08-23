/**
 * Settings Page — Phase 1 Foundation
 */
import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Server, Database, Globe, Info, ExternalLink } from 'lucide-react'
import { fetchSystemInfo } from '../api/client'
import LoadingSpinner from '../components/ui/LoadingSpinner'

function SettingsSection({ title, children }) {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wider">
        {title}
      </h2>
      <div className="divider" />
      {children}
    </div>
  )
}

function SettingsRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-surface-300">{label}</span>
      <span className={`text-sm text-white ${mono ? 'font-mono text-xs bg-surface-700/60 px-2 py-0.5 rounded' : 'font-medium'}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

export default function Settings() {
  const [info, setInfo]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSystemInfo().then(setInfo).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <div>
        <h1 className="section-title flex items-center gap-2">
          <SettingsIcon size={20} className="text-accent-400" /> Settings
        </h1>
        <p className="section-subtitle">Application configuration and system information</p>
      </div>

      {loading ? <LoadingSpinner message="Loading system info…" /> : (
        <>
          <SettingsSection title="Application">
            <SettingsRow label="Name" value={info?.app_name} />
            <SettingsRow label="Version" value={`v${info?.version}`} />
            <SettingsRow label="Phase" value={info?.phase} />
            <SettingsRow label="Environment" value={info?.environment} />
          </SettingsSection>

          <SettingsSection title="Backend Runtime">
            <SettingsRow label="Python Version" value={info?.python_version?.split(' ')[0]} mono />
            <SettingsRow label="Platform" value={`${info?.platform_system} ${info?.platform_release}`} />
            <SettingsRow label="pgvector" value={info?.pgvector_enabled ? 'Enabled' : 'Disabled'} />
          </SettingsSection>

          <SettingsSection title="API Endpoints">
            <SettingsRow label="Health Check" value={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/health`} mono />
            <SettingsRow label="System Info" value={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/system/info`} mono />
            <SettingsRow label="Datasets" value={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/datasets`} mono />
            <div className="pt-2">
              <a
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/docs`}
                target="_blank" rel="noopener noreferrer"
                className="btn-ghost text-xs border border-surface-600/60 w-fit"
              >
                <ExternalLink size={13} /> Open Swagger UI
              </a>
            </div>
          </SettingsSection>

          <SettingsSection title="Future Configuration (Locked)">
            <div className="card border-surface-600/30 bg-surface-700/20 p-3 text-xs text-surface-400 space-y-1">
              <p className="text-surface-300 font-medium">These settings will be enabled in future phases:</p>
              <p>• OpenAI API Key — Phase 4 (LLM/RAG)</p>
              <p>• LangChain Configuration — Phase 4</p>
              <p>• Optuna Hyperparameter Settings — Phase 3</p>
              <p>• PubMed API Key — Phase 4</p>
            </div>
          </SettingsSection>
        </>
      )}
    </div>
  )
}
