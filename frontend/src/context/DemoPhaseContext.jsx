import React, { createContext, useContext } from 'react';
import {
  ACTIVE_DEMO_PHASE,
  isFeatureEnabled,
  PHASES,
  FEATURE_CONFIG,
  getPhaseStatus,
  getPlatformStatus,
} from '../config/featurePhases';

/**
 * DemoPhaseContext
 * ================
 * The active demo phase is determined ONLY by the ACTIVE_DEMO_PHASE constant
 * in frontend/src/config/featurePhases.js.
 */
const DemoPhaseContext = createContext({
  activeDemoPhase: ACTIVE_DEMO_PHASE,
  isAvailable: () => true,
  phases: PHASES,
  features: FEATURE_CONFIG,
  getPhaseStatus: (num) => getPhaseStatus(num, ACTIVE_DEMO_PHASE),
  platformStatus: getPlatformStatus(ACTIVE_DEMO_PHASE),
});

export function DemoPhaseProvider({ children }) {
  const isAvailable = (path) => isFeatureEnabled(path, ACTIVE_DEMO_PHASE);
  const phaseStatus = (num) => getPhaseStatus(num, ACTIVE_DEMO_PHASE);
  const platformStatus = getPlatformStatus(ACTIVE_DEMO_PHASE);

  return (
    <DemoPhaseContext.Provider
      value={{
        activeDemoPhase: ACTIVE_DEMO_PHASE,
        isAvailable,
        phases: PHASES,
        features: FEATURE_CONFIG,
        getPhaseStatus: phaseStatus,
        platformStatus,
      }}
    >
      {children}
    </DemoPhaseContext.Provider>
  );
}

export function useDemoPhase() {
  return useContext(DemoPhaseContext);
}

