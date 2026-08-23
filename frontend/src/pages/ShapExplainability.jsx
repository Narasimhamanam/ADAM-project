import React from 'react'
import ComingSoon from '../components/ui/ComingSoon'
import { Zap } from 'lucide-react'
export default function ShapExplainability() {
  return <ComingSoon icon={Zap} title="SHAP Explainability" phase="Coming in Phase 3"
    description="SHAP (SHapley Additive exPlanations) feature importance visualizations for the trained XGBoost model. Includes waterfall plots, summary plots, and microbiome biomarker ranking. SHAP explainability will be connected after the ML engine in Phase 3." />
}
