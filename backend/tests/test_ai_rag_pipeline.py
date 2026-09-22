"""
Tests for Phase 4: AI Layer, Literature RAG, and AIRA Multi-Agent System
========================================================================
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.rag.embeddings import SemanticSearchEngine
from app.rag.literature_store import search_literature, get_all_articles
from app.rag.llm_client import get_llm_client
from app.agents.aira_agents import (
    ComputationAgent,
    SummarizationAgent,
    ClassificationAgent,
    get_aira_coordinator,
)


@pytest.mark.asyncio
async def test_semantic_search_engine():
    docs = [
        {"pmid": "1", "title": "Microbiome in Alzheimer", "abstract": "Gut dysbiosis and Phocaeicola dorei.", "keywords": "AD"},
        {"pmid": "2", "title": "Cardiovascular Health", "abstract": "Hypertension and statin usage.", "keywords": "heart"},
    ]
    engine = SemanticSearchEngine()
    engine.index_documents(docs)
    results = engine.search("Phocaeicola microbiome", top_k=1)
    assert len(results) == 1
    assert results[0]["pmid"] == "1"
    assert results[0]["similarity_score"] > 0


@pytest.mark.asyncio
async def test_literature_store():
    articles = get_all_articles()
    assert len(articles) >= 6
    search_res = search_literature("butyrate Faecalibacterium", top_k=2)
    assert len(search_res) == 2
    assert "pmid" in search_res[0]


@pytest.mark.asyncio
async def test_llm_client_synthesis():
    llm = get_llm_client()
    res = await llm.generate_completion(prompt="What is Phocaeicola dorei?")
    assert "response" in res
    assert "Phocaeicola" in res["response"]
    assert "provider" in res


@pytest.mark.asyncio
async def test_computation_agent():
    agent = ComputationAgent()
    res = await agent.execute("What are the model benchmarks?")
    assert res["agent"] == "Computation Agent"
    assert "metrics" in res
    assert res["metrics"]["cohort_total_samples"] == 335


@pytest.mark.asyncio
async def test_summarization_agent():
    agent = SummarizationAgent()
    res = await agent.execute("Explain the gut-brain axis in Alzheimer's disease.")
    assert res["agent"] == "Summarization Agent"
    assert len(res["output"]) > 50


@pytest.mark.asyncio
async def test_classification_agent():
    agent = ClassificationAgent()
    res = await agent.execute("Analyze sample DC001", context={"sample_id": "DC001"})
    assert res["agent"] == "Classification Agent"
    assert res["sample_id"] == "DC001"
    assert "output" in res


@pytest.mark.asyncio
async def test_aira_coordinator_workflow():
    coord = get_aira_coordinator()
    res = await coord.run_workflow("test", "Evaluate Phocaeicola dorei risk", {"sample_id": "DC001"})
    assert len(res["thought_trace"]) == 3
    assert "final_synthesis" in res


@pytest.mark.asyncio
async def test_ai_status_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/ai/status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["indexed_articles"] >= 6
        assert len(data["agents_available"]) == 3


@pytest.mark.asyncio
async def test_ai_chat_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/ai/chat", json={"query": "What is the role of Eubacterium rectale?"})
        assert resp.status_code == 200
        data = resp.json()
        assert "response" in data
        assert "citations" in data


@pytest.mark.asyncio
async def test_ai_literature_search_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/api/ai/literature/search?q=microbiome")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] > 0
        assert len(data["articles"]) > 0


@pytest.mark.asyncio
async def test_ai_agent_execute_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/ai/agent/execute", json={
            "agent_type": "all",
            "query": "Assess biomarker profiles",
            "sample_id": "DC001",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["thought_trace"]) == 3
        assert "final_synthesis" in data


@pytest.mark.asyncio
async def test_dynamic_query_responses_across_distinct_questions():
    """Verify that different user queries produce meaningfully distinct, dynamic responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. What is cancer?
        res_cancer = await ac.post("/api/ai/chat", json={"query": "What is cancer?", "include_literature": True})
        assert res_cancer.status_code == 200
        d_cancer = res_cancer.json()
        assert "uncontrolled proliferation" in d_cancer["response"].lower() or "hallmark" in d_cancer["response"].lower()
        assert "In the context of the ADAM-1 multi-modal framework" not in d_cancer["response"]
        assert len(d_cancer["citations"]) == 0

        # 2. What is the gut microbiome?
        res_gut = await ac.post("/api/ai/chat", json={"query": "What is the gut microbiome?", "include_literature": True})
        assert res_gut.status_code == 200
        d_gut = res_gut.json()
        assert "100 trillion" in d_gut["response"] or "bacillota" in d_gut["response"].lower()
        assert "cancer" not in d_gut["response"].lower()

        # 3. Explain Shannon diversity
        res_shannon = await ac.post("/api/ai/chat", json={"query": "Explain Shannon diversity.", "include_literature": True})
        assert res_shannon.status_code == 200
        d_shannon = res_shannon.json()
        assert "shannon" in d_shannon["response"].lower()
        assert "evenness" in d_shannon["response"].lower()

        # 4. What does ROC-AUC mean?
        res_auc = await ac.post("/api/ai/chat", json={"query": "What does ROC-AUC mean?", "include_literature": True})
        assert res_auc.status_code == 200
        d_auc = res_auc.json()
        assert "receiver operating characteristic" in d_auc["response"].lower()

        # 5. Patient sample prediction
        res_patient = await ac.post("/api/ai/chat", json={"query": "Analyze this patient's prediction: sample DC001", "include_literature": True})
        assert res_patient.status_code == 200
        d_patient = res_patient.json()
        assert "DC001" in d_patient["response"]
        assert "SHAP" in d_patient["response"] or "XGBoost" in d_patient["response"]

