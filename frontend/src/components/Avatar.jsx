import React, { lazy, Suspense, useEffect, useState } from 'react'
const OrbCanvas = lazy(() => import('./OrbCanvas'))

export function OrbIcon({ size = 30, className }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
    <circle cx="32" cy="32" r="23" fill="#175962" stroke="#95e4d9" strokeWidth="2"/>
    <ellipse cx="32" cy="32" rx="29" ry="10" fill="none" stroke="#68bdcb" strokeWidth="2" transform="rotate(-26 32 32)"/>
    <ellipse cx="26" cy="26" rx="8" ry="5" fill="#d8fffa" opacity=".8"/>
    <circle cx="33" cy="34" r="4" fill="#a1fff1"/>
  </svg>
}

export default function Avatar({ state = 'idle', animated = false }) {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const pref = matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setEnabled(animated && !document.hidden && !pref.matches && !(navigator.deviceMemory < 3))
    sync()
    document.addEventListener('visibilitychange',sync)
    pref.addEventListener('change',sync)
    return () => { document.removeEventListener('visibilitychange',sync); pref.removeEventListener('change',sync) }
  }, [animated])
  return <span className="aira-orb" data-state={state}><OrbIcon size={44}/>{enabled && <Suspense fallback={null}><OrbCanvas state={state}/></Suspense>}</span>
}
