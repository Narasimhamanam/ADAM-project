/**
 * App.jsx — Root application with routing and health state
 */
import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard         from './pages/Dashboard'
import DatasetExplorer   from './pages/DatasetExplorer'
import AlzheimerAnalysis from './pages/AlzheimerAnalysis'
import MLPrediction      from './pages/MLPrediction'
import ModelComparison   from './pages/ModelComparison'
import ShapExplainability from './pages/ShapExplainability'
import ResearchAssistant from './pages/ResearchAssistant'
import Literature        from './pages/Literature'
import AIAgents          from './pages/AIAgents'
import Reports           from './pages/Reports'
import Settings          from './pages/Settings'
import { fetchHealth }   from './api/client'

export default function App() {
  const [backendStatus, setBackendStatus] = useState('loading')

  useEffect(() => {
    const check = async () => {
      try {
        const h = await fetchHealth()
        setBackendStatus(h.status === 'healthy' ? 'connected' : 'degraded')
      } catch {
        setBackendStatus('disconnected')
      }
    }
    check()
    const interval = setInterval(check, 30_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Layout backendStatus={backendStatus}>
      <Routes>
        <Route path="/"            element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"   element={<Dashboard />} />
        <Route path="/datasets"    element={<DatasetExplorer />} />
        <Route path="/alzheimer"   element={<AlzheimerAnalysis />} />
        <Route path="/ml"          element={<MLPrediction />} />
        <Route path="/models"      element={<ModelComparison />} />
        <Route path="/shap"        element={<ShapExplainability />} />
        <Route path="/assistant"   element={<ResearchAssistant />} />
        <Route path="/literature"  element={<Literature />} />
        <Route path="/agents"      element={<AIAgents />} />
        <Route path="/reports"     element={<Reports />} />
        <Route path="/settings"    element={<Settings />} />
        <Route path="*"            element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}
