"""
Smoke Test for Groq API + openai/gpt-oss-120b in ADAM-1 Enhanced
================================================================
Validates Steps 2 through 8 of the migration protocol:
- Step 2: Verify GROQ_API_KEY exists without printing it.
- Step 3: Exactly 1 simple Groq request (Summarization Agent style).
- Step 4: Exactly 1 structured classification request (Pydantic schema).
- Step 5: 1 complete ADAM sample pipeline execution in strict_research_mode=True.
- Step 6: Paired test (No RAG vs With RAG) on 1 sample.
- Step 7: Verify SHA-256 prompt hash divergence.
- Step 8: Verify live failure propagation in a controlled invalid configuration test.
"""
import os
import sys
from dotenv import load_dotenv

# Ensure stdout uses UTF-8 on Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Load environment
backend_dir = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

dotenv_path = os.path.join(backend_dir, ".env")
load_dotenv(dotenv_path)

from app.config import get_settings
from app.rag.groq_client import get_groq_client, GroqClient
from app.rag.adam_llm import AdamClassificationResponse, resolve_llm_config
from app.agents.adam_workflow import run_adam_pipeline

def run_smoke_test():
    print("=" * 70)
    print("ADAM-1 ENHANCED — GROQ (openai/gpt-oss-120b) SMOKE TEST")
    print("=" * 70)

    # Step 2: Verify GROQ_API_KEY
    key = os.environ.get("GROQ_API_KEY") or get_settings().groq_api_key
    if not key:
        print("[FAIL] Step 2: GROQ_API_KEY is not set!")
        sys.exit(1)
    print(f"[PASS] Step 2: GROQ_API_KEY is loaded securely (length={len(key)} chars, prefix={key[:4]}...)")

    # Step 3: Simple Summarization Text Request
    print("\n--- Step 3: Single Summarization Text Request ---")
    groq = get_groq_client()
    prov, sum_model, cls_model, _ = resolve_llm_config()
    print(f"Resolved config: provider={prov}, sum_model={sum_model}, cls_model={cls_model}")
    assert prov == "groq", f"Expected provider 'groq', got '{prov}'"
    assert sum_model == "openai/gpt-oss-120b", f"Expected sum_model 'openai/gpt-oss-120b', got '{sum_model}'"

    res_sum = groq.generate_text(
        prompt="Synthesize clinical frailty (CFS 6/9) and reduced Shannon diversity (2.41) in an 82yo female patient in 2 concise sentences.",
        model=sum_model,
        system_instruction="You are a clinical bioinformatician. Provide objective, concise reasoning.",
        temperature=0.1,
        max_tokens=300,
    )
    print(f"Status: {res_sum.status}")
    print(f"Latency: {res_sum.latency_ms} ms")
    print(f"Prompt tokens: {res_sum.prompt_tokens}, Completion tokens: {res_sum.completion_tokens}, Total tokens: {res_sum.total_tokens}")
    print(f"Content:\n{res_sum.content}")
    assert res_sum.is_success, f"Step 3 failed: {res_sum.error}"
    assert len(res_sum.content or "") > 20, "Step 3 returned empty content"
    print("[PASS] Step 3: Summarization text request succeeded.")

    # Step 4: Structured Classification Request
    print("\n--- Step 4: Single Structured Classification Request ---")
    res_cls = groq.generate_structured(
        prompt="Patient is an 82yo female with CFS 6/9, Shannon diversity 2.41, base XGBoost probability 84.2%. Positive TreeSHAP drivers include Bacteroides_fragilis and Ruminococcus_torques.",
        schema_cls=AdamClassificationResponse,
        model=cls_model,
        system_instruction="You are the terminal diagnostic decision-maker. Output strict JSON matching the schema.",
        temperature=0.1,
        max_tokens=2500,
    )
    print(f"Status: {res_cls.status}")
    print(f"Latency: {res_cls.latency_ms} ms")
    print(f"Prompt tokens: {res_cls.prompt_tokens}, Completion tokens: {res_cls.completion_tokens}, Total tokens: {res_cls.total_tokens}")
    assert res_cls.is_success, f"Step 4 failed: {res_cls.error}"
    assert res_cls.parsed is not None, "Step 4 parsed object is None"
    parsed: AdamClassificationResponse = res_cls.parsed
    print(f"Prediction: {parsed.prediction} (binary_label={parsed.binary_label})")
    print(f"Probability: {parsed.probability}")
    print(f"Confidence: {parsed.confidence} ({parsed.confidence_score})")
    print(f"Agrees with XGBoost: {parsed.agrees_with_xgboost}")
    print(f"Reasoning: {parsed.reasoning}")
    print(f"Key Evidence: {parsed.key_evidence}")
    assert parsed.prediction in ("AD", "CN"), f"Invalid prediction: {parsed.prediction}"
    assert parsed.binary_label in (0, 1), f"Invalid binary label: {parsed.binary_label}"
    print("[PASS] Step 4: Structured classification request succeeded.")

    # Step 5: Full Live Pipeline Execution on 1 Sample (strict_research_mode=True)
    print("\n--- Step 5: Complete Live Pipeline Execution (DC036, strict_research_mode=True) ---")
    res_pipeline = run_adam_pipeline("DC036", use_rag=True, strict_research_mode=True)
    fin = res_pipeline["final_result"]
    print(f"Sample: {res_pipeline['sample_id']}, Actual Ground Truth: {res_pipeline['actual_diagnosis']}")
    print(f"ADAM Prediction: {fin['adam_prediction']}, Binary Label: {fin['adam_binary_label']}")
    print(f"ADAM Provider: {fin['adam_provider']}, Source Model: {fin['adam_source']}")
    print(f"Strict Mode Valid: {fin['strict_mode_valid']}, Fallback Used: {fin['fallback_used']}")
    assert fin["strict_mode_valid"] is True, f"Strict mode invalid: {fin.get('failure_reason')}"
    assert fin["fallback_used"] is False, "Fallback was used in strict mode!"
    assert fin["adam_binary_label"] in (0, 1), f"Invalid label: {fin['adam_binary_label']}"
    assert fin["adam_provider"] == "GroqCloud", f"Expected GroqCloud, got {fin['adam_provider']}"
    assert fin["adam_source"] == "openai/gpt-oss-120b", f"Expected openai/gpt-oss-120b, got {fin['adam_source']}"
    print("[PASS] Step 5: Full live pipeline execution succeeded.")

    # Step 6 & 7: Paired No RAG vs With RAG & SHA-256 Divergence
    print("\n--- Step 6 & 7: Paired No-RAG vs With-RAG Comparison on DC036 ---")
    res_norag = run_adam_pipeline("DC036", use_rag=False, strict_research_mode=True)
    res_withrag = run_adam_pipeline("DC036", use_rag=True, strict_research_mode=True)

    norag_sum_hash = res_norag["summarization_agent"]["prompt_hash"]
    withrag_sum_hash = res_withrag["summarization_agent"]["prompt_hash"]
    norag_cls_hash = res_norag["classification_agent"]["prompt_hash"]
    withrag_cls_hash = res_withrag["classification_agent"]["prompt_hash"]

    print(f"No-RAG Summarization Prompt SHA-256:   {norag_sum_hash}")
    print(f"With-RAG Summarization Prompt SHA-256: {withrag_sum_hash}")
    assert norag_sum_hash != withrag_sum_hash, "Summarization prompt SHA-256 MUST differ when RAG is enabled!"
    print("[PASS] Step 7A: Summarization prompt SHA-256 differed with RAG.")

    print(f"No-RAG Classification Prompt SHA-256:   {norag_cls_hash}")
    print(f"With-RAG Classification Prompt SHA-256: {withrag_cls_hash}")
    assert norag_cls_hash != withrag_cls_hash, "Classification prompt SHA-256 MUST differ when RAG is enabled!"
    print("[PASS] Step 7B: Classification prompt SHA-256 differed with RAG.")

    print(f"No-RAG prediction:   {res_norag['final_result']['adam_prediction']} (label={res_norag['final_result']['adam_binary_label']})")
    print(f"With-RAG prediction: {res_withrag['final_result']['adam_prediction']} (label={res_withrag['final_result']['adam_binary_label']})")

    # Step 8: Controlled Failure Propagation Test
    print("\n--- Step 8: Controlled Failure Propagation Test ---")
    from unittest.mock import patch
    bad_client = GroqClient(api_key="gsk_invalid_test_key_for_failure_propagation")
    with patch("app.rag.adam_llm.get_groq_client", return_value=bad_client):
        fail_res = run_adam_pipeline("DC036", use_rag=True, strict_research_mode=True)
        fail_fin = fail_res["final_result"]
        print(f"Fail test prediction: {fail_fin['adam_prediction']}")
        print(f"Fail test binary_label: {fail_fin['adam_binary_label']}")
        print(f"Fail test strict_mode_valid: {fail_fin['strict_mode_valid']}")
        print(f"Fail test failure_reason: {fail_fin['failure_reason']}")
        assert fail_fin["adam_binary_label"] == -1, f"Expected binary_label -1, got {fail_fin['adam_binary_label']}"
        assert fail_fin["adam_prediction"] == "FAILED", f"Expected prediction 'FAILED', got {fail_fin['adam_prediction']}"
        assert fail_fin["strict_mode_valid"] is False, "Expected strict_mode_valid False on live failure"
        assert fail_fin["fallback_used"] is False, "Fallback must NOT be used on failure in strict mode"
        print("[PASS] Step 8: Live failure propagation verified.")

    print("\n" + "=" * 70)
    print("ALL STEPS 2-8 PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    run_smoke_test()
