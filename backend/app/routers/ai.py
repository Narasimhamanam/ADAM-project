"""
FastAPI Endpoints for AI Research Assistant, Literature RAG, and AIRA Multi-Agent System
======================================================================================
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException, status

from app.core.logging import get_logger
from app.rag.llm_client import get_llm_client
from app.rag.literature_store import search_literature, get_all_articles
from app.agents.aira_agents import get_aira_coordinator, ComputationAgent, SummarizationAgent, ClassificationAgent
from app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    LiteratureSearchResponse,
    LiteratureArticle,
    AgentExecuteRequest,
    AgentExecuteResponse,
    AIStatusResponse,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/ai", tags=["AI & Literature Layer"])


@router.get(
    "/status",
    response_model=AIStatusResponse,
    summary="Get status of AI layer, LLM provider, and indexed literature",
)
async def get_ai_status() -> AIStatusResponse:
    llm = get_llm_client()
    articles = get_all_articles()
    return AIStatusResponse(
        status="healthy",
        active_provider=llm.get_active_provider(),
        indexed_articles=len(articles),
        agents_available=["Computation Agent", "Summarization Agent", "Classification Agent"],
    )


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Chat with ADAM-1 AI Research Assistant",
    description="Interactive conversational interface augmented with PubMed literature RAG context.",
)
async def chat_research_assistant(payload: ChatRequest) -> ChatResponse:
    try:
        llm = get_llm_client()
        docs = []
        if payload.include_literature:
            docs = search_literature(payload.query, top_k=3)

        res = await llm.generate_completion(
            prompt=payload.query,
            context_docs=docs,
        )

        return ChatResponse(
            response=res["response"],
            provider=res["provider"],
            citations=res["citations"],
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as e:
        logger.error("AI Chat failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat generation failed: {str(e)}",
        )


@router.get(
    "/literature/search",
    response_model=LiteratureSearchResponse,
    summary="Semantic vector search over PubMed literature corpus",
)
async def query_literature(
    q: str = Query(..., min_length=1, description="Search query or keyword"),
    top_k: int = Query(5, ge=1, le=20),
) -> LiteratureSearchResponse:
    try:
        results = search_literature(q, top_k=top_k)
        articles = [LiteratureArticle.model_validate(d) for d in results]
        return LiteratureSearchResponse(
            total=len(articles),
            query=q,
            articles=articles,
        )
    except Exception as e:
        logger.error("Literature search failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )


@router.get(
    "/literature/articles",
    response_model=List[LiteratureArticle],
    summary="Browse all indexed PubMed scientific publications",
)
async def list_literature_articles() -> List[LiteratureArticle]:
    articles = get_all_articles()
    return [LiteratureArticle.model_validate(d) for d in articles]


@router.post(
    "/agent/execute",
    response_model=AgentExecuteResponse,
    summary="Execute AIRA Multi-Agent task workflow",
)
async def execute_agent_task(payload: AgentExecuteRequest) -> AgentExecuteResponse:
    try:
        agent_type = (payload.agent_type or "all").lower()
        context = {"sample_id": payload.sample_id}

        if agent_type == "computation":
            comp = ComputationAgent()
            res = await comp.execute(payload.query, context)
            return AgentExecuteResponse(
                task_type="computation",
                query=payload.query,
                timestamp=datetime.now(timezone.utc).isoformat(),
                thought_trace=[{
                    "step": 1,
                    "agent": comp.name,
                    "action": "Running quantitative metric extraction...",
                    "status": "completed",
                    "result": res["output"],
                }],
                final_synthesis=res["output"],
                citations=[],
            )

        elif agent_type == "summarization":
            summ = SummarizationAgent()
            res = await summ.execute(payload.query, context)
            return AgentExecuteResponse(
                task_type="summarization",
                query=payload.query,
                timestamp=datetime.now(timezone.utc).isoformat(),
                thought_trace=[{
                    "step": 1,
                    "agent": summ.name,
                    "action": "Synthesizing literature evidence...",
                    "status": "completed",
                    "result": res["output"],
                }],
                final_synthesis=res["output"],
                citations=res.get("citations", []),
            )

        elif agent_type == "classification":
            cl = ClassificationAgent()
            res = await cl.execute(payload.query, context)
            return AgentExecuteResponse(
                task_type="classification",
                query=payload.query,
                timestamp=datetime.now(timezone.utc).isoformat(),
                thought_trace=[{
                    "step": 1,
                    "agent": cl.name,
                    "action": "Synthesizing patient multi-modal diagnostic reasoning...",
                    "status": "completed",
                    "result": res["output"],
                }],
                final_synthesis=res["output"],
                citations=[],
            )

        else:
            # Full multi-agent coordinator workflow
            coord = get_aira_coordinator()
            res = await coord.run_workflow(
                task_type="multi_agent_workflow",
                query=payload.query,
                context=context,
            )
            return AgentExecuteResponse.model_validate(res)

    except Exception as e:
        logger.error("Agent execution failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent workflow failed: {str(e)}",
        )
