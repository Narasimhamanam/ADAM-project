/**
 * Settings Page — Phase 1 Foundation & System Status
 */
import React, { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Server, Database, Globe, Info, ExternalLink, ShieldAlert, Cpu } from 'lucide-react'
import { fetchSystemInfo } from '../api/client'
import Skeleton from '../components/ui/Skeleton'

function SettingsSection({ title, icon: Icon, children }) {
  return (
    <div className="card-raised p-5 space-y-4">
      <h2 className="text-xs font-bold text-surface-50 flex items-center gap-2 uppercase tracking-wider">
        {Icon && <Icon size={15} className="text-accent-500" />}
        {title}
      </h2>
      <div className="divider" />
      {children}
    </div>
  )
}

function SettingsRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-surface-400 font-medium">{label}</span>
      <span className={`text-surface-100 ${mono ? 'font-mono text-[11px] bg-surface-800/80 border border-surface-700/60 px-2 py-0.5 rounded text-accent-400' : 'font-semibold'}`}>
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
          <SettingsIcon size={20} className="text-accent-500" /> Settings
        </h1>
        <p className="section-subtitle">Application configuration, runtime environment, and system diagnostics</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="card-raised p-5 space-y-3">
            <Skeleton variant="text" width="40%" height="16px" />
            <div className="divider" />
            <div className="space-y-2">
              <Skeleton variant="text" width="100%" height="14px" />
              <Skeleton variant="text" width="80%" height="14px" />
              <Skeleton variant="text" width="90%" height="14px" />
            </div>
          </div>
          <div className="card-raised p-5 space-y-3">
            <Skeleton variant="text" width="30%" height="16px" />
            <div className="divider" />
            <div className="space-y-2">
              <Skeleton variant="text" width="100%" height="14px" />
              <Skeleton variant="text" width="70%" height="14px" />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <SettingsSection title="Application Architecture" icon={Info}>
            <SettingsRow label="Application Name" value={info?.app_name} />
            <SettingsRow label="Release Version" value={`v${info?.version}`} mono />
            <SettingsRow label="Implementation Phase" value={info?.phase} />
            <SettingsRow label="Active Environment" value={info?.environment} mono />
          </SettingsSection>

          <SettingsSection title="Backend Runtime & Engine" icon={Server}>
            <SettingsRow label="Python Runtime" value={info?.python_version?.split(' ')[0]} mono />
            <SettingsRow label="Host OS Platform" value={`${info?.platform_system} ${info?.platform_release}`} />
            <SettingsRow label="PostgreSQL pgvector Extension" value={info?.pgvector_enabled ? 'Enabled (Active)' : 'Disabled'} />
          </SettingsSection>

          <SettingsSection title="API Gateway & Endpoints" icon={Globe}>
            <SettingsRow label="Health Diagnostics" value={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/health`} mono />
            <SettingsRow label="System Telemetry" value={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/system/info`} mono />
            <SettingsRow label="Metagenomic Datasets" value={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/datasets`} mono />
            <div className="pt-2">
              <a
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/docs`}
                target="_blank" rel="noopener noreferrer"
                className="btn-ghost text-xs border border-surface-700 text-surface-200 hover:text-surface-50 w-fit inline-flex items-center gap-1.5"
              >
                <ExternalLink size={13} className="text-accent-500" /> Open Interactive Swagger UI
              </a>
            </div>
          </SettingsSection>

          <SettingsSection title="Future Integrations & Extensibility" icon={ShieldAlert}>
            <div className="card border-surface-700/60 bg-surface-800/30 p-3.5 text-xs text-surface-400 space-y-1.5 rounded-lg">
              <p className="text-surface-200 font-semibold flex items-center gap-1.5">
                <Cpu size={13} className="text-accent-500" /> Staged Module Capabilities
              </p>
              <p className="text-[11px] leading-relaxed text-surface-400">
                Advanced integrations (provider credentials, external embedding pipelines, on-demand automated training epochs) are managed via backend environment configurations (.env) to maintain zero secrets in browser builds.
              </p>
            </div>
          </SettingsSection>
        </div>
      )}
    </div>
  )
}
