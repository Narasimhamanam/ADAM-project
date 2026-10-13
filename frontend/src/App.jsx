/**
 * App.jsx — Root Application with Streamlined 5-Destination Routing & Legacy Redirects
 * ===================================================================================
 * Navigation Destinations:
 *   1. /overview  — Overview Dashboard (Executive research command center)
 *   2. /analyze   — Analyze (Multi-model studio, workflow stepper, SHAP attributions)
 *   3. /patients  — Patient Explorer (102 cohort subjects, longitudinal timeline)
 *   4. /research  — Research & Validation (Datasets, benchmarks, imaging, crosswalks)
 *   5. /reports   — Reports & Evidence (Clinical dossiers, PubMed RAG, plain text)
 *   +  /settings  — Platform Settings & Environment Configuration
 *
 * All legacy routes (/dashboard, /datasets, /ml, /trajectory, etc.) are cleanly
 * redirected to their consolidated destinations for seamless backwards compatibility.
 * ===================================================================================
 */
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { DemoPhaseProvider } from './context/DemoPhaseContext';
import { fetchHealth } from './api/client';

import ErrorBoundary from './components/ui/ErrorBoundary';

// The 5 Core Redesigned Pages
import Overview from './pages/Overview';
import Analyze from './pages/Analyze';
import PatientExplorer from './pages/PatientExplorer';
import ResearchValidation from './pages/ResearchValidation';
import ReportsEvidence from './pages/ReportsEvidence';
import Settings from './pages/Settings';

export default function App() {
  const [backendStatus, setBackendStatus] = useState('loading');

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      try {
        const h = await fetchHealth();
        if (isMounted) {
          setBackendStatus(h.status === 'healthy' ? 'connected' : 'degraded');
        }
      } catch {
        if (isMounted) {
          setBackendStatus('disconnected');
        }
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <DemoPhaseProvider>
      <Layout backendStatus={backendStatus}>
        <ErrorBoundary>
          <Routes>

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/overview" replace />} />

          {/* ── 5 PRIMARY REDESIGNED DESTINATIONS ── */}
          <Route path="/overview" element={<Overview />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/patients" element={<PatientExplorer />} />
          <Route path="/research" element={<ResearchValidation />} />
          <Route path="/reports" element={<ReportsEvidence />} />

          {/* Platform Settings */}
          <Route path="/settings" element={<Settings />} />

          {/* ── BACKWARDS-COMPATIBILITY ROUTE REDIRECTS ── */}
          {/* Overview Aliases */}
          <Route path="/dashboard" element={<Navigate to="/overview" replace />} />

          {/* Analyze Aliases */}
          <Route path="/ml" element={<Navigate to="/analyze" replace />} />
          <Route path="/models" element={<Navigate to="/analyze" replace />} />
          <Route path="/shap" element={<Navigate to="/analyze" replace />} />
          <Route path="/workflow" element={<Navigate to="/analyze" replace />} />
          <Route path="/assistant" element={<Navigate to="/analyze" replace />} />
          <Route path="/agents" element={<Navigate to="/analyze" replace />} />

          {/* Patient Explorer Aliases */}
          <Route path="/alzheimer" element={<Navigate to="/patients" replace />} />
          <Route path="/trajectory" element={<Navigate to="/patients" replace />} />
          <Route path="/digital-twin" element={<Navigate to="/patients" replace />} />

          {/* Research & Validation Aliases */}
          <Route path="/datasets" element={<Navigate to="/research" replace />} />
          <Route path="/cross-cohort" element={<Navigate to="/research" replace />} />
          <Route path="/performance" element={<Navigate to="/research" replace />} />
          <Route path="/neuroimaging" element={<Navigate to="/research" replace />} />
          <Route path="/multimodal-gate" element={<Navigate to="/research" replace />} />

          {/* Reports & Evidence Aliases */}
          <Route path="/literature" element={<Navigate to="/reports" replace />} />

          {/* Catch-All Fallback */}
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
        </ErrorBoundary>
      </Layout>
    </DemoPhaseProvider>
  );
}

