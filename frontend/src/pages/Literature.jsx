import React from 'react'
import ComingSoon from '../components/ui/ComingSoon'
import { BookOpen } from 'lucide-react'
export default function Literature() {
  return <ComingSoon icon={BookOpen} title="Literature / RAG" phase="Coming in Phase 4"
    description="PubMed literature retrieval, semantic search using pgvector embeddings, and Retrieval-Augmented Generation (RAG) for evidence-based Alzheimer's research synthesis. Literature retrieval will be connected in the RAG phase (Phase 4)." />
}
