import React from 'react';
import { useLocation } from 'react-router-dom';
import { useDemoPhase } from '../../context/DemoPhaseContext';
import { getFeatureByPath } from '../../config/featurePhases';
import ComingSoonFeature from './ComingSoonFeature';

export default function PhaseFeatureGuard({ path, children }) {
  const location = useLocation();
  const targetPath = path || location.pathname;
  const { isAvailable } = useDemoPhase();

  const isEnabled = isAvailable(targetPath);

  if (!isEnabled) {
    const feature = getFeatureByPath(targetPath);
    return <ComingSoonFeature feature={feature} />;
  }

  return <>{children}</>;
}
