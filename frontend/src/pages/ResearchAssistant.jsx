import React from 'react'
import ComingSoon from '../components/ui/ComingSoon'
import { MessageSquare } from 'lucide-react'
export default function ResearchAssistant() {
  return <ComingSoon icon={MessageSquare} title="Research Assistant (AIRA)" phase="Coming in Phase 4"
    description="AIRA — Artificial Intelligence Research Assistant — is a conversational agent powered by LangChain and a large language model. It synthesizes microbiome and Alzheimer's research findings from the ADAM-1 experimental results. AIRA will be connected after the LLM and RAG layers are implemented in Phase 4." />
}
