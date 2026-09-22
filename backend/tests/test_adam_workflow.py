"""
Tests for ADAM-1 Enhanced Workflow, Dynamic Performance Comparison, Diversity Math, and AIRA Intent Handling
=============================================================================================================
"""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.ml.diversity import compute_sample_diversity_profile
from app.ml.data_loader import load_dataset_df
from app.agents.adam_workflow import run_adam_pipeline
from app.ml.performance import get_full_performance_comparison, calc_improvement
from app.rag.intent import classify_query_intent
from app.rag.llm_client import get_llm_client


@pytest.mark.asyncio
async def test_diversity_math_exactness():
    """Verify ecological diversity math on real dataset sample."""
    df = load_dataset_df()
    prof = compute_sample_diversity_profile(df, "DC001")
    
    alpha = prof["alpha_diversity"]
    beta = prof["beta_diversity"]
    
    # Mathematical sanity checks
    assert 0.0 < alpha["shannon_index"] < 10.0
    assert 0.0 < alpha["simpson_index"] < 1.0
    assert 0.0 < alpha["berger_parker_dominance"] <= 1.0
    assert 0.0 <= beta["bray_curtis_distance"] <= 1.0
    assert 0.0 <= beta["jaccard_distance"] <= 1.0
    assert beta["canberra_distance"] > 0.0
    assert prof["species_present_count"] > 0
    assert prof["total_species_profiled"] >= 940


@pytest.mark.asyncio
async def test_adam_workflow_execution_dc001_and_dc071():
    """Verify end-to-end execution of the multi-agent pipeline on real patient records."""
    for sid in ["DC001", "DC071"]:
        res = run_adam_pipeline(sid)
        
        assert res["sample_id"] == sid
        assert "computational_agent" in res
        assert "summarization_agent" in res
        assert "classification_agent" in res
        assert "final_result" in res
        
        # 10 Summarization Checkpoints labeled as ADAM-1 Enhanced reasoning workflow
        summ = res["summarization_agent"]
        assert summ["workflow_name"] == "ADAM-1 Enhanced Reasoning Workflow"
        assert len(summ["checkpoints"]) == 10
        for i, cp in enumerate(summ["checkpoints"], 1):
            assert cp["step"] == i
            assert len(cp["title"]) > 0
            assert len(cp["content"]) > 0
            
        # 10 Classification Checkpoints labeled as Enhanced implementation
        cls_agent = res["classification_agent"]
        assert cls_agent["workflow_name"] == "ADAM-1 Enhanced Classification Implementation"
        assert len(cls_agent["checkpoints"]) == 10
        for i, cp in enumerate(cls_agent["checkpoints"], 1):
            assert cp["step"] == i
            assert len(cp["title"]) > 0
            assert len(cp["content"]) > 0

        # Final ADAM consensus
        fin = res["final_result"]
        assert fin["adam_binary_label"] in (0, 1)
        assert 0.0 <= fin["adam_confidence"] <= 1.0
        assert 0.0 <= fin["ml_model_probability"] <= 1.0
        assert "explanation" in fin
        expl_lower = fin["explanation"].lower()
        assert "do not assert direct clinical causation" in expl_lower


@pytest.mark.asyncio
async def test_performance_comparison_logic():
    """Verify dynamic calculation of Absolute and Relative Improvements."""
    perf = get_full_performance_comparison(seed=42)
    
    # Published benchmark verification
    pub = perf["published_benchmark"]
    assert pub["title"] == "Published ADAM-1 Paper Benchmark"
    assert "adam" in pub["models"]
    assert "xgboost" in pub["models"]
    assert pub["models"]["adam"]["experiment_count"] == 30
    assert pub["models"]["xgboost"]["experiment_count"] == 30
    assert pub["models"]["adam"]["f1_score"] == pytest.approx(0.7263, abs=0.001)
    assert pub["models"]["xgboost"]["f1_score"] == pytest.approx(0.6774, abs=0.001)
    
    # Published improvement: Absolute and Relative %
    f1_imp = pub["improvements"]["f1_score"]
    assert f1_imp["absolute_improvement"] == pytest.approx(0.0489, abs=0.001)
    assert f1_imp["relative_improvement_pct"] == pytest.approx(7.22, abs=0.1)
    
    # Unrecorded metrics in paper must be marked 'Not evaluated'
    assert pub["improvements"]["precision"]["status"] == "Not evaluated"
    assert pub["improvements"]["recall"]["status"] == "Not evaluated"

    # Current cohort verification
    curr = perf["current_evaluation"]
    assert curr["title"] == "Current ADAM-1 Enhanced Results"
    assert "adam" in curr["models"]
    assert "xgboost" in curr["models"]
    assert curr["models"]["adam"]["f1_score"] is not None
    assert curr["models"]["xgboost"]["f1_score"] is not None
    assert curr["improvements"]["f1_score"]["absolute_improvement"] is not None


@pytest.mark.asyncio
async def test_aira_intent_classifier():
    """Verify intent detection across all 10 query scenarios."""
    queries = {
        "Hello": "general_conversation",
        "How can you help me?": "general_conversation",
        "What is AD?": "general_knowledge",
        "What is XGBoost?": "general_knowledge",
        "How does SHAP work?": "general_knowledge",
        "What microbiome changes are associated with AD?": "biomedical_research",
        "How does ADAM use RAG?": "adam_platform",
        "Explain alpha diversity": "biomedical_research",
        "Analyze this selected patient": "data_record",
        "What is the capital of France?": "unrelated_general",
    }
    for q, expected in queries.items():
        assert classify_query_intent(q) == expected, f"Failed on query: {q}"


@pytest.mark.asyncio
async def test_aira_chat_response_quality_and_no_hallucinated_templates():
    """Verify responses do not output fixed synthesis templates for conversational queries."""
    llm = get_llm_client()
    
    # 1. Hello
    res_hello = await llm.generate_completion("Hello")
    assert "gut microbial dysbiosis" not in res_hello["response"].lower()
    assert len(res_hello["citations"]) == 0
    
    # 2. What is AD?
    res_ad = await llm.generate_completion("What is AD?")
    assert "relationship between what" not in res_ad["response"].lower()
    assert "amyloid-beta" in res_ad["response"].lower()
    
    # 3. What is the capital of France?
    res_france = await llm.generate_completion("What is the capital of France?")
    assert "paris" in res_france["response"].lower()
    assert "phocaeicola" not in res_france["response"].lower()


@pytest.mark.asyncio
async def test_api_performance_and_workflow_endpoints():
    """Verify HTTP endpoints for performance comparison and workflow execution."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Performance comparison endpoint
        resp_perf = await ac.get("/api/ml/performance/comparison")
        assert resp_perf.status_code == 200
        p_json = resp_perf.json()
        assert "published_benchmark" in p_json
        assert "current_evaluation" in p_json
        
        # 2. Workflow execute endpoint
        resp_wf = await ac.post("/api/ml/workflow/execute", json={"sample_id": "DC001"})
        assert resp_wf.status_code == 200
        wf_json = resp_wf.json()
        assert wf_json["sample_id"] == "DC001"
        assert len(wf_json["summarization_agent"]["checkpoints"]) == 10
        assert len(wf_json["classification_agent"]["checkpoints"]) == 10
