import React from 'react'
import ComingSoon from '../components/ui/ComingSoon'
import { FileText } from 'lucide-react'
export default function Reports() {
  return <ComingSoon icon={FileText} title="Reports" phase="Coming in Phase 3"
    description="Automated research report generation summarizing ML experiment results, SHAP feature importance, and model performance across the 30 ADAM-1 experiments. Reports will be available after the ML pipeline is implemented in Phase 3." />
}
