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
        # 1. Performance comparison endpoint (default full cohort)
        resp_perf = await ac.get("/api/ml/performance/comparison")
        assert resp_perf.status_code == 200
        p_json = resp_perf.json()
        assert "published_benchmark" in p_json
        assert "current_evaluation" in p_json
        assert "comparisons" in p_json["current_evaluation"]
        assert "f1_score" in p_json["current_evaluation"]["comparisons"]

        # 2. Performance comparison with paper-reconstructed balanced protocol
        resp_paper = await ac.get("/api/ml/performance/comparison?protocol=paper_reconstructed&seed=42")
        assert resp_paper.status_code == 200
        paper_json = resp_paper.json()
        assert paper_json["current_evaluation"]["sample_count"] == 30
        assert paper_json["current_evaluation"]["positive_cases"] == 15
        assert paper_json["current_evaluation"]["control_cases"] == 15

        # 3. 7-Condition Ablation Study endpoint
        resp_abl = await ac.get("/api/ml/performance/ablation?protocol=full_cohort")
        assert resp_abl.status_code == 200
        abl_json = resp_abl.json()
        assert "results" in abl_json
        assert len(abl_json["results"]) == 7
        condition_ids = [c["condition_id"] for c in abl_json["results"]]
        assert "xgboost_baseline" in condition_ids
        assert "adam_full_multiagent" in condition_ids
        assert "adam_with_diversity" in condition_ids

        # 4. Computational Efficiency Profiling endpoint
        resp_eff = await ac.get("/api/ml/performance/efficiency?sample_count=2")
        assert resp_eff.status_code == 200
        eff_json = resp_eff.json()
        assert "metrics" in eff_json
        assert "avg_inference_latency_ms" in eff_json["metrics"]
        assert "memory_usage_mb" in eff_json["metrics"]
        assert "agent_call_count" in eff_json["metrics"]
        
        # 5. Workflow execute endpoint
        resp_wf = await ac.post("/api/ml/workflow/execute", json={"sample_id": "DC001"})
        assert resp_wf.status_code == 200
        wf_json = resp_wf.json()
        assert wf_json["sample_id"] == "DC001"
        assert len(wf_json["summarization_agent"]["checkpoints"]) == 10
        assert len(wf_json["classification_agent"]["checkpoints"]) == 10
        assert "adam_source" in wf_json["final_result"]
        assert "is_fallback" in wf_json["final_result"]


@pytest.mark.asyncio
async def test_adam_llm_agent_classification_mocked():
    """Verify Classification Agent correctly parses JSON completion and handles overrides."""
    from unittest.mock import patch
    from app.rag.adam_llm import call_classification_agent, call_summarization_agent, resolve_llm_config

    mock_llm_json = """
    ```json
    {
      "prediction": "AD",
      "probability": 0.88,
      "confidence": "high",
      "decision_basis": "Severe frailty (CFS 8) and restricted Shannon entropy indicate severe colonic dysbiosis elevating AD risk.",
      "key_factors": ["Shannon entropy collapse", "Rockwood CFS 8"],
      "agrees_with_xgboost": false
    }
    ```
    """

    comp_input = {
        "ml_prediction": {"probability": 0.42, "label": 0, "confidence": 0.58, "risk_level": "Moderate Risk"},
        "shap_explanation": {
            "positive_drivers": [{"feature": "Phocaeicola dorei", "shap_value": 0.45}],
            "protective_drivers": [{"feature": "Bacteroides uniformis", "shap_value": -0.15}],
        },
        "alpha_diversity": {"shannon_index": 2.65, "simpson_index": 0.18, "berger_parker_dominance": 0.35},
        "beta_diversity": {"bray_curtis_distance": 0.82, "jaccard_distance": 0.88, "canberra_distance": 210.0},
    }

    sample_ctx = {
        "sample_id": "TEST_SAMPLE_001",
        "study_id": "CH1-999",
        "age": 82.0,
        "sex": "Female",
        "clinical_frailty_scale": 8.0,
        "malnutrition_score": 2.0,
    }

    from unittest.mock import MagicMock
    from app.rag.openrouter_client import OpenRouterCompletionResult

    mock_client = MagicMock()
    mock_client.is_available = True
    mock_client.chat_completion.return_value = OpenRouterCompletionResult(
        content=mock_llm_json,
        model="openai/gpt-4o-mini",
        elapsed_ms=150.0,
        prompt_tokens=220,
        completion_tokens=65,
        total_tokens=285,
    )

    with patch("app.rag.adam_llm.resolve_llm_config", return_value=("openrouter", "openai/gpt-4o", "openai/gpt-4o-mini", "mock_key")):
        with patch("app.rag.adam_llm.get_openrouter_client", return_value=mock_client):
            res = call_classification_agent(
                comp_agent_output=comp_input,
                summary_text="Patient presents with significant frailty and mucosal dysbiosis.",
                rag_docs=[],
                sample_context=sample_ctx,
                sample_id="TEST_SAMPLE_MOCK",
            )

            assert res.prediction == "AD"
            assert res.probability == 0.88
            assert res.confidence == "high"
            assert res.agrees_with_xgboost is False
            assert res.is_fallback is False
            assert res.llm_model == "openai/gpt-4o-mini"
            assert res.llm_provider == "openrouter"
            assert "Shannon entropy collapse" in res.key_factors
            assert res.token_usage["total_tokens"] == 285


@pytest.mark.asyncio
async def test_error_correction_matrix_and_traceability():
    """Verify Error-Correction Matrix counts and sample traceability breakdown."""
    perf = get_full_performance_comparison(protocol="paper_reconstructed", seed=42)
    curr = perf["current_evaluation"]

    assert "error_correction_matrix" in curr
    matrix = curr["error_correction_matrix"]
    assert "category_a_both_correct" in matrix
    assert "category_b_adam_correct_xgb_wrong" in matrix
    assert "category_c_xgb_correct_adam_wrong" in matrix
    assert "category_d_both_wrong" in matrix
    assert "agreement_rate_pct" in matrix
    assert 0.0 <= matrix["agreement_rate_pct"] <= 100.0

    # Total must equal sample count
    total_quadrants = (
        matrix["category_a_both_correct"]
        + matrix["category_b_adam_correct_xgb_wrong"]
        + matrix["category_c_xgb_correct_adam_wrong"]
        + matrix["category_d_both_wrong"]
    )
    assert total_quadrants == curr["sample_count"]

    # Traceability
    assert "sample_traceability" in curr
    assert len(curr["sample_traceability"]) == curr["sample_count"]
    sample_0 = curr["sample_traceability"][0]
    assert "sample_id" in sample_0
    assert "category" in sample_0
    assert sample_0["category"] in ("A", "B", "C", "D")
    assert "is_corrected" in sample_0

