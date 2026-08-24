"""
Pydantic Schemas for AI, RAG & Multi-Agent APIs
===============================================
"""
from __future__ import annotations

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', 'system'")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User question or research prompt")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Previous conversation messages")
    include_literature: bool = Field(default=True, description="Whether to include PubMed RAG search")


class Citation(BaseModel):
    pmid: Optional[str] = None
    title: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    provider: str
    citations: List[Citation] = []
    timestamp: str


class LiteratureArticle(BaseModel):
    pmid: str
    title: str
    authors: str
    journal: str
    year: int
    abstract: str
    keywords: str
    key_taxa: List[str] = []
    similarity_score: Optional[float] = None


class LiteratureSearchResponse(BaseModel):
    total: int
    query: str
    articles: List[LiteratureArticle]


class AgentExecuteRequest(BaseModel):
    agent_type: str = Field(
        default="all",
        description="'computation', 'summarization', 'classification', or 'all'",
    )
    query: str = Field(default="Analyze biomarker importance of Phocaeicola dorei")
    sample_id: Optional[str] = Field(default="DC001", description="Patient sample ID for clinical reasoning")


class ThoughtStep(BaseModel):
    step: int
    agent: str
    action: str
    status: str
    result: Optional[str] = None


class AgentExecuteResponse(BaseModel):
    task_type: str
    query: str
    timestamp: str
    thought_trace: List[ThoughtStep]
    final_synthesis: str
    computation: Optional[Dict[str, Any]] = None
    literature_synthesis: Optional[str] = None
    diagnostic_assessment: Optional[str] = None
    sample_id: Optional[str] = None
    actual_diagnosis: Optional[int] = None
    citations: List[Citation] = []


class AIStatusResponse(BaseModel):
    status: str
    active_provider: str
    indexed_articles: int
    agents_available: List[str]
