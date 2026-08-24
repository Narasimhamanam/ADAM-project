/**
 * App.jsx — Root application with routing, phase control guards, and health state
 */
import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import PhaseFeatureGuard from './components/layout/PhaseFeatureGuard'
import { DemoPhaseProvider } from './context/DemoPhaseContext'
import Dashboard         from './pages/Dashboard'
import DatasetExplorer   from './pages/DatasetExplorer'
import AlzheimerAnalysis from './pages/AlzheimerAnalysis'
import MLPrediction      from './pages/MLPrediction'
import ModelComparison   from './pages/ModelComparison'
import ShapExplainability from './pages/ShapExplainability'
import ResearchAssistant from './pages/ResearchAssistant'
import LiteratureRAG     from './pages/LiteratureRAG'
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
    <DemoPhaseProvider>
      <Layout backendStatus={backendStatus}>
        <Routes>
          <Route path="/"            element={<Navigate to="/dashboard" replace />} />
          
          {/* Phase 1: Foundation & Platform */}
          <Route path="/dashboard"   element={<PhaseFeatureGuard path="/dashboard"><Dashboard /></PhaseFeatureGuard>} />
          <Route path="/settings"    element={<PhaseFeatureGuard path="/settings"><Settings /></PhaseFeatureGuard>} />

          {/* Phase 2: Ingestion & Dataset Explorer */}
          <Route path="/datasets"    element={<PhaseFeatureGuard path="/datasets"><DatasetExplorer /></PhaseFeatureGuard>} />

          {/* Phase 3: ML Benchmarks & SHAP Explainability */}
          <Route path="/alzheimer"   element={<PhaseFeatureGuard path="/alzheimer"><AlzheimerAnalysis /></PhaseFeatureGuard>} />
          <Route path="/ml"          element={<PhaseFeatureGuard path="/ml"><MLPrediction /></PhaseFeatureGuard>} />
          <Route path="/models"      element={<PhaseFeatureGuard path="/models"><ModelComparison /></PhaseFeatureGuard>} />
          <Route path="/shap"        element={<PhaseFeatureGuard path="/shap"><ShapExplainability /></PhaseFeatureGuard>} />
          <Route path="/reports"     element={<PhaseFeatureGuard path="/reports"><Reports /></PhaseFeatureGuard>} />

          {/* Phase 4: AI & Literature Multi-Agent */}
          <Route path="/assistant"   element={<PhaseFeatureGuard path="/assistant"><ResearchAssistant /></PhaseFeatureGuard>} />
          <Route path="/literature"  element={<PhaseFeatureGuard path="/literature"><LiteratureRAG /></PhaseFeatureGuard>} />
          <Route path="/agents"      element={<PhaseFeatureGuard path="/agents"><AIAgents /></PhaseFeatureGuard>} />

          <Route path="*"            element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </DemoPhaseProvider>
  )
}
