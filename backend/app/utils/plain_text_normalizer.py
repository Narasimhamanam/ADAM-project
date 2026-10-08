"""
plain_text_normalizer.py
=============================================================================
Reusable scientific plain-text normalizer for ADAM-1 Enhanced.

Transforms LLM-generated reasoning, summaries, and ML decisions from raw
Markdown syntax into clean, professional, human-readable plain text without
destroying numerical values, units, percentages, fractions, scientific taxa names,
citations, or scientific qualifiers.
=============================================================================
"""

import re
from typing import Dict, Any, List, Optional, Tuple


def normalize_markdown_table(table_text: str) -> str:
    """
    Converts a Markdown table block into readable plain-text rows.

    Example input:
        | Marker | Value | Clinical Interpretation |
        |---|---|---|
        | CFS | 5/9 | Moderate frailty |
        | MIS | 1 | Low-level risk |

    Example output:
        Clinical Markers
        CFS: 5/9 — Moderate frailty
        MIS: 1 — Low-level risk
    """
    lines = [line.strip() for line in table_text.strip().splitlines() if line.strip()]
    if not lines:
        return ""

    # Parse rows
    parsed_rows: List[List[str]] = []
    for line in lines:
        if not line.startswith("|"):
            continue
        # Check if separator row (e.g., |---|---| or |:---|:---|)
        inner = line.strip("|").strip()
        if re.match(r"^[\s\-:|]+$", inner):
            continue
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if cells and any(cells):
            parsed_rows.append(cells)

    if not parsed_rows:
        return ""

    header = parsed_rows[0]
    data_rows = parsed_rows[1:] if len(parsed_rows) > 1 else []

    output_lines: List[str] = []

    # If first row looks like a header description
    header_lower = [h.lower() for h in header]
    has_marker_hdr = any("marker" in h or "feature" in h or "metric" in h for h in header_lower)
    
    if has_marker_hdr and data_rows:
        output_lines.append("Clinical Markers\n")

    for row in (data_rows if data_rows else [header]):
        cleaned_cells = [c.replace("**", "").replace("*", "").strip() for c in row if c.strip()]
        if len(cleaned_cells) == 1:
            output_lines.append(cleaned_cells[0])
        elif len(cleaned_cells) == 2:
            output_lines.append(f"{cleaned_cells[0]}: {cleaned_cells[1]}")
        elif len(cleaned_cells) >= 3:
            output_lines.append(f"{cleaned_cells[0]}: {cleaned_cells[1]} — {cleaned_cells[2]}")

    return "\n".join(output_lines)


def normalize_stage_headings(text: str) -> str:
    """
    Normalizes multi-stage headings like:
        **Stage 1: Patient Overview**
        ### Stage 1: Patient Overview
        #### Step 1: Patient Overview
        **Stage 1 – Patient Overview**
    into standardized plain-text headings:
        Stage 1 – Patient Overview
    """
    # Pattern matching Stage/Step followed by number and title
    pattern = re.compile(
        r"(?m)^[#*\s]*(?:Stage|Step)\s*(\d+)[:–-]?\s*([^\n*#]+?)[#*\s]*$",
        re.IGNORECASE,
    )

    def _replace_heading(match: re.Match) -> str:
        num = match.group(1)
        title = match.group(2).strip().strip(":–-").strip()
        # Clean title from lingering markdown
        title = title.replace("**", "").replace("*", "").strip()
        return f"\n\nStage {num} – {title}\n"

    return pattern.sub(_replace_heading, text)


def normalize_bullets(text: str) -> str:
    """
    Converts Markdown bullets (- or *) into clean readable lines.
    - CFS: 5/9  ->  CFS: 5/9
    - General item  ->  General item
    """
    lines = text.splitlines()
    cleaned_lines = []

    for line in lines:
        stripped = line.strip()
        # Match '- Key: Value' or '* Key: Value'
        m_kv = re.match(r"^[-*+]\s+([A-Za-z0-9_'\s/().%–-]+:\s+.*)$", stripped)
        if m_kv:
            cleaned_lines.append(m_kv.group(1).strip())
            continue

        # Match '- Item'
        m_bullet = re.match(r"^[-*+]\s+(.*)$", stripped)
        if m_bullet:
            content = m_bullet.group(1).strip()
            cleaned_lines.append(content)
            continue

        cleaned_lines.append(line)

    return "\n".join(cleaned_lines)


def normalize_final_text(text: Optional[str]) -> str:
    """
    Main normalizer transforming Markdown text into clean, professional plain text.

    Preserves:
    - Decimal numbers, percentages, fractions (CFS 5/9, 87.3%, 0.9956)
    - Mathematical notations (H' = 2.67, Shannon entropy)
    - Scientific names (Alistipes onderdonkii, Phocaeicola coprocola)
    - Citations (PMID 34567890, PMC8472911)
    - Scientific qualifiers ('association does not establish causality')
    """
    if not text or not str(text).strip():
        return ""

    out = str(text)

    # 1. Standardize line endings
    out = out.replace("\r\n", "\n").replace("\r", "\n")

    # 2. Remove code fences
    out = re.sub(r"```[a-zA-Z0-9_-]*\n?", "", out)
    out = out.replace("```", "")

    # 3. Remove inline code backticks
    out = re.sub(r"`([^`]+)`", r"\1", out)

    # 4. Remove horizontal rules
    out = re.sub(r"(?m)^[\s]*[-*_]{3,}[\s]*$", "\n", out)

    # 5. Convert Markdown tables
    # Find contiguous table blocks: lines starting and ending with |
    table_pattern = re.compile(r"(?m)((?:^\|[^\n]+\|\s*$\n?)+)")

    def _table_sub(match: re.Match) -> str:
        table_block = match.group(1)
        converted = normalize_markdown_table(table_block)
        return f"\n{converted}\n" if converted else ""

    out = table_pattern.sub(_table_sub, out)

    # 6. Normalize Stage/Step headings
    out = normalize_stage_headings(out)

    # 7. Remove remaining Markdown heading hashes (#, ##, ###)
    out = re.sub(r"(?m)^[ \t]*#{1,6}[ \t]*", "", out)

    # 8. Remove bold markers (**text**)
    out = re.sub(r"\*\*([^*]+)\*\*", r"\1", out)

    # 9. Remove italic markers (*text* or _text_) without affecting internal characters
    # Only standalone *word* or *several words*
    out = re.sub(r"(?<![A-Za-z0-9])\*([^*\n]+)\*(?![A-Za-z0-9])", r"\1", out)
    # Underscores wrapping words: _word_
    out = re.sub(r"(?<![A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])", r"\1", out)

    # 10. Clean bullets
    out = normalize_bullets(out)

    # 11. Remove any stray standalone table pipes
    out = re.sub(r"(?m)^\|[ \t]*", "", out)
    out = re.sub(r"(?m)[ \t]*\|$", "", out)

    # 12. Normalize blank lines: maximum 2 consecutive newlines
    out = re.sub(r"\n{3,}", "\n\n", out)

    return out.strip()


def build_plain_text_ml_decision(
    prediction_decision: str,
    probability_ad: float,
    risk_level: str,
    model_name: str = "XGBoost",
    qualifier: Optional[str] = None,
) -> str:
    """
    Constructs the canonical plain-text Stage 7 ML prediction decision:

    Prediction Decision: Control
    Alzheimer's Disease Probability: 12.4%
    Risk Level: Low Risk
    Model: XGBoost

    The model output represents an estimated probability based on the available
    dataset and should not be interpreted as a clinical diagnosis.
    """
    prob_str = f"{probability_ad * 100:.1f}%" if probability_ad <= 1.0 else f"{probability_ad:.1f}%"
    default_qualifier = (
        "The model output represents an estimated probability based on the available dataset "
        "and should not be interpreted as a clinical diagnosis."
    )
    selected_qualifier = qualifier or default_qualifier

    lines = [
        f"Prediction Decision: {prediction_decision}",
        f"Alzheimer's Disease Probability: {prob_str}",
        f"Risk Level: {risk_level}",
        f"Model: {model_name}",
        "",
        selected_qualifier,
    ]
    return "\n".join(lines)


def validate_plain_text_output(text: str, stage_name: str = "Stage") -> Tuple[bool, List[str]]:
    """
    Validates that a generated string contains no raw Markdown formatting.
    Returns (is_valid, list_of_violations).
    """
    violations = []
    if not text or not text.strip():
        violations.append(f"{stage_name} text is empty")
        return False, violations

    # Check for raw ** bold markers
    if "**" in text:
        violations.append("Contains raw '**' bold markers")

    # Check for Markdown horizontal rules
    if re.search(r"(?m)^[\s]*[-*_]{3,}[\s]*$", text):
        violations.append("Contains raw horizontal rule ('---')")

    # Check for Markdown table syntax
    if re.search(r"(?m)^\|.*\|$", text):
        violations.append("Contains raw Markdown table syntax ('|')")
    if "|---" in text or "|:---" in text:
        violations.append("Contains raw Markdown table separator ('|---')")

    # Check for Markdown heading hashes
    if re.search(r"(?m)^#{1,6}\s+", text):
        violations.append("Contains raw Markdown heading ('#')")

    # Check for code fences
    if "```" in text:
        violations.append("Contains raw code fences ('```')")

    return (len(violations) == 0, violations)
