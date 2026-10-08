"""
test_plain_text_formatting.py
=============================================================================
Comprehensive test suite validating Stage 6 and Stage 7 plain-text formatting,
Markdown sanitization, table normalization, and scientific preservation.
=============================================================================
"""

import pytest
from app.utils.plain_text_normalizer import (
    normalize_final_text,
    normalize_markdown_table,
    normalize_stage_headings,
    normalize_bullets,
    build_plain_text_ml_decision,
    validate_plain_text_output,
)
from app.agents.adam_workflow import run_adam_pipeline


def test_markdown_table_conversion():
    raw_table = """
| Marker | Value | Clinical Interpretation |
|---|---|---|
| CFS | 5/9 | Moderate frailty |
| MIS | 1 | Low-level risk |
"""
    converted = normalize_markdown_table(raw_table)
    assert "|" not in converted
    assert "|---" not in converted
    assert "CFS: 5/9 — Moderate frailty" in converted
    assert "MIS: 1 — Low-level risk" in converted


def test_prompt_section_15_deliberate_markdown_input():
    raw_input = """**Stage 6 – Descriptive Correlation**

- Shannon diversity: **2.67**
- Bray-Curtis: **0.9956**

---

| Marker | Value |
|---|---|
| CFS | 5/9 |
"""
    cleaned = normalize_final_text(raw_input)

    # Must contain expected information
    assert "Stage 6 – Descriptive Correlation" in cleaned
    assert "Shannon diversity: 2.67" in cleaned
    assert "Bray-Curtis: 0.9956" in cleaned
    assert "CFS: 5/9" in cleaned

    # Must NOT contain forbidden markdown syntax
    assert "**" not in cleaned
    assert "---" not in cleaned
    assert "|" not in cleaned
    assert "#" not in cleaned

    # Validate with validator
    is_valid, violations = validate_plain_text_output(cleaned, "Stage 6 Test")
    assert is_valid, f"Violations found: {violations}"


def test_stage_7_ml_decision_formatting():
    decision_ad = build_plain_text_ml_decision(
        prediction_decision="Alzheimer's Disease",
        probability_ad=0.873,
        risk_level="High Risk",
        model_name="XGBoost",
    )
    assert "**" not in decision_ad
    assert "Prediction Decision: Alzheimer's Disease" in decision_ad
    assert "Alzheimer's Disease Probability: 87.3%" in decision_ad
    assert "Risk Level: High Risk" in decision_ad
    assert "Model: XGBoost" in decision_ad
    assert "The model output represents an estimated probability" in decision_ad

    is_valid, violations = validate_plain_text_output(decision_ad, "Stage 7 AD Decision")
    assert is_valid, f"Violations found: {violations}"

    decision_cn = build_plain_text_ml_decision(
        prediction_decision="Control",
        probability_ad=0.124,
        risk_level="Low Risk",
        model_name="XGBoost",
    )
    assert "**" not in decision_cn
    assert "Prediction Decision: Control" in decision_cn
    assert "Alzheimer's Disease Probability: 12.4%" in decision_cn
    assert "Risk Level: Low Risk" in decision_cn
    assert "Model: XGBoost" in decision_cn

    is_valid, violations = validate_plain_text_output(decision_cn, "Stage 7 CN Decision")
    assert is_valid, f"Violations found: {violations}"


def test_scientific_integrity_preservation():
    text_with_science = """
### Stage 3: Gut Microbiome Profile
- Dominant taxa: *Alistipes onderdonkii* (2071.41%), *Phocaeicola coprocola* (1950.94%)
- Shannon H' = **2.67**, Simpson D = **0.89**, Bray-Curtis = **0.9956**
- Rockwood CFS score: **5/9** (moderate frailty), Malnutrition = **1**
- Literature grounding: **PMID 34567890** and **PMC8472911**
- Important Qualifier: This association does not establish causality.
"""
    cleaned = normalize_final_text(text_with_science)

    # Scientific taxa names must be intact without asterisks
    assert "Alistipes onderdonkii" in cleaned
    assert "Phocaeicola coprocola" in cleaned
    assert "*" not in cleaned

    # Values, notations, fractions, percentages
    assert "2071.41%" in cleaned
    assert "1950.94%" in cleaned
    assert "Shannon H' = 2.67" in cleaned
    assert "Simpson D = 0.89" in cleaned
    assert "Bray-Curtis = 0.9956" in cleaned
    assert "5/9" in cleaned
    assert "PMID 34567890" in cleaned
    assert "PMC8472911" in cleaned

    # Scientific qualifier must remain
    assert "This association does not establish causality." in cleaned

    is_valid, violations = validate_plain_text_output(cleaned, "Scientific Text")
    assert is_valid, f"Violations found: {violations}"


def test_bullet_normalization():
    bullets_text = """
- CFS: 5/9
- Malnutrition Score: 1
- PPI: No
"""
    cleaned = normalize_bullets(bullets_text)
    assert "- CFS" not in cleaned
    assert "CFS: 5/9" in cleaned
    assert "Malnutrition Score: 1" in cleaned
    assert "PPI: No" in cleaned


@pytest.mark.parametrize("sample_id", ["DC001", "FB100", "DC071"])
def test_real_cohort_samples_workflow_plain_text(sample_id):
    """Verifies that running the workflow on real patient samples returns 100% clean plain text for Stage 6 & 7."""
    res = run_adam_pipeline(sample_id)
    assert res is not None
    assert "summarization_agent" in res
    assert "classification_agent" in res
    assert "final_result" in res

    sum_agent = res["summarization_agent"]
    cls_agent = res["classification_agent"]
    final_res = res["final_result"]

    # 1. Stage 6 Summary text verification
    summary_text = sum_agent.get("summary_text", "")
    assert summary_text, f"summary_text is empty for {sample_id}"
    is_valid, violations = validate_plain_text_output(summary_text, f"Stage 6 {sample_id}")
    assert is_valid, f"Stage 6 summary contains raw markdown for {sample_id}: {violations}"

    # 2. Stage 6 Checkpoints verification
    for cp in sum_agent.get("checkpoints", []):
        content = cp.get("content", "")
        assert "**" not in content, f"Summarization checkpoint {cp.get('step')} has raw ** for {sample_id}"
        assert "---" not in content

    # 3. Stage 7 Final Decision verification
    final_decision = cls_agent.get("final_decision", "")
    assert final_decision, f"final_decision is empty for {sample_id}"
    is_valid, violations = validate_plain_text_output(final_decision, f"Stage 7 {sample_id}")
    assert is_valid, f"Stage 7 final decision contains raw markdown for {sample_id}: {violations}"
    assert "Prediction Decision:" in final_decision
    assert "Model: XGBoost" in final_decision
    assert "estimated probability" in final_decision

    # 4. Stage 7 Checkpoints verification
    for cp in cls_agent.get("checkpoints", []):
        content = cp.get("content", "")
        assert "**" not in content, f"Classification checkpoint {cp.get('step')} has raw ** for {sample_id}"
        assert "---" not in content

    # 5. Final result explanation verification
    explanation = final_res.get("explanation", "")
    assert "**" not in explanation, f"Final explanation has raw ** for {sample_id}"
