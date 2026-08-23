import React from 'react'
import ComingSoon from '../components/ui/ComingSoon'
import { Brain } from 'lucide-react'
export default function AlzheimerAnalysis() {
  return <ComingSoon icon={Brain} title="Alzheimer Analysis" phase="Coming in Phase 2"
    description="Comprehensive Alzheimer's Disease biomarker analysis including alpha/beta diversity visualizations, clinical variable correlation matrices, and microbiome composition heatmaps. Full data ingestion pipeline will be implemented in Phase 2." />
}
