import React from 'react'
import ComingSoon from '../components/ui/ComingSoon'
import { BarChart3 } from 'lucide-react'
export default function ModelComparison() {
  return <ComingSoon icon={BarChart3} title="Model Comparison" phase="Coming in Phase 3"
    description="Side-by-side comparison of XGBoost, Logistic Regression, and Random Forest models across 30 experiments. Includes F1 scores, AUC-ROC curves, precision-recall analysis, and ranked model performance tables. Will be connected after the ML engine in Phase 3." />
}
