import React, { createContext, useContext } from 'react';
import {
  ACTIVE_DEMO_PHASE,
  isFeatureEnabled,
  PHASES,
  FEATURE_CONFIG,
} from '../config/featurePhases';

/**
 * DemoPhaseContext
 * ================
 * The active demo phase is determined ONLY by the ACTIVE_DEMO_PHASE constant
 * in frontend/src/config/featurePhases.js.
 *
 * There is NO runtime user control over phase selection.
 * Do not add localStorage, URL param, or UI-based phase switching.
 */
const DemoPhaseContext = createContext({
  activeDemoPhase: ACTIVE_DEMO_PHASE,
  isAvailable: () => true,
  phases: PHASES,
  features: FEATURE_CONFIG,
});

export function DemoPhaseProvider({ children }) {
  const isAvailable = (path) => isFeatureEnabled(path, ACTIVE_DEMO_PHASE);

  return (
    <DemoPhaseContext.Provider
      value={{
        activeDemoPhase: ACTIVE_DEMO_PHASE,
        isAvailable,
        phases: PHASES,
        features: FEATURE_CONFIG,
      }}
    >
      {children}
    </DemoPhaseContext.Provider>
  );
}

export function useDemoPhase() {
  return useContext(DemoPhaseContext);
}
