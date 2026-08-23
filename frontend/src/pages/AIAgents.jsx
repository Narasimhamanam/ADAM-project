import React from 'react'
import ComingSoon from '../components/ui/ComingSoon'
import { Bot } from 'lucide-react'
export default function AIAgents() {
  return <ComingSoon icon={Bot} title="AI Agents" phase="Coming in Phase 4"
    description="Multi-agent system implementing the three ADAM-1 agents: Computation Agent (ML analysis), Summarization Agent (Chain-of-Thought reasoning), and Classification Agent (Alzheimer's classification decisions). AI agents will be connected after the LLM and RAG layers in Phase 4." />
}
