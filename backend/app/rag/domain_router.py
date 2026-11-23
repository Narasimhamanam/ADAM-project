"""
Domain scope router and vocabulary normalizer for AIRA.
Categorizes questions into:
- Category A: ADAM Platform, metrics, architecture, validation status
- Category B: Alzheimer's Disease, gut-brain axis, dementia, biomarkers, statistics
- Category C: Out of scope (cooking, sports, politics, etc.) -> polite redirection
"""
from __future__ import annotations
import re
import difflib
from typing import Dict, Any, List, Optional, Tuple

DOMAIN_VOCABULARY = [
    "alzheimer's", "alzheimers", "alzheimer", "dementia", "amyloid", "tau", "apoe", "mci",
    "microbiome", "microbiota", "butyrate", "acetate", "valerate", "faecalibacterium", "bacteroides",
    "bifidobacterium", "escherichia", "shigella", "eubacterium", "p-glycoprotein", "endothelial",
    "lipopolysaccharide", "lps", "scfa", "auroc", "auprc", "brier", "shap", "calibration",
    "conformal", "adam", "adam-1", "dataset", "cohort", "longitudinal", "frailty", "cognitive",
    "biomarker", "gut-brain", "dysbiosis", "sequencing", "16s", "metagenomics", "compositional",
    "clr", "pseudocount", "e4", "cerebrospinal", "csf", "pet", "synapse", "neuroinflammation"
]

PLATFORM_KEYWORDS = [
    "what is adam", "how does adam work", "adam platform", "adam-1", "read a metric",
    "what does this page show", "validation status", "rigor suite", "patient explorer",
    "explain adam", "who developed adam", "what does adam stand for", "digital twin"
]

OUT_OF_SCOPE_PATTERNS = [
    r"\b(cricket|football|soccer|baseball|basketball|nba|ipl|fifa|tennis|game score|match score)\b",
    r"\b(recipe|cooking|bake|cake|pasta|pizza|cocktail|dinner recipe|soup)\b",
    r"\b(politics|president|election|senate|prime minister|vote|campaign)\b",
    r"\b(horoscope|astrology|zodiac|crypto|bitcoin|ethereum|stock price)\b",
    r"\b(movie|cinema|actor|actress|hollywood|bollywood|song lyrics)\b"
]

GREETING_PATTERNS = [
    r"^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|howdy)\b"
]

EXAMPLE_CHIPS = [
    "What is the ADAM platform?",
    "How does the gut microbiome relate to amyloid pathology?",
    "What did Haran et al. find regarding butyrate-producing bacteria?"
]


def normalize_and_spellcheck(query: str) -> Tuple[str, Optional[str], Optional[List[str]]]:
    """
    Normalizes text and checks words against the domain vocabulary.
    Returns (cleaned_query, correction_notice, suggestion_choices).
    """
    clean = query.strip()
    words = re.findall(r"\b[A-Za-z'-]+\b", clean)
    corrected_words = []
    corrections_made = []
    weak_suggestions = []

    for w in words:
        w_lower = w.lower()
        if len(w_lower) < 4 or w_lower in DOMAIN_VOCABULARY:
            corrected_words.append(w)
            continue
        
        matches = difflib.get_close_matches(w_lower, DOMAIN_VOCABULARY, n=1, cutoff=0.78)
        if matches:
            matched = matches[0]
            if matched != w_lower:
                corrections_made.append(f"{w} → {matched}")
                corrected_words.append(matched)
            else:
                corrected_words.append(w)
        else:
            # Check weak match (cutoff 0.60)
            alt = difflib.get_close_matches(w_lower, DOMAIN_VOCABULARY, n=2, cutoff=0.60)
            if alt:
                weak_suggestions.extend(alt)
            corrected_words.append(w)

    reconstructed = " ".join(corrected_words)
    notice = None
    if corrections_made:
        notice = f"I read this as: {reconstructed}"

    return reconstructed, notice, list(set(weak_suggestions)) if weak_suggestions else None


def route_query_scope(query: str) -> Dict[str, Any]:
    """
    Routes query to Category A (Platform), Category B (Alzheimer's/Biology), or Category C (Out of scope).
    """
    q_clean = query.strip().lower()

    # Check Greetings first
    if any(re.search(pat, q_clean) for pat in GREETING_PATTERNS) and len(q_clean.split()) <= 4:
        return {
            "category": "greeting",
            "answer": "Hello! I am AIRA, the evidence and literature research assistant for ADAM-1.",
            "explanation": "I can help with questions about Alzheimer's disease pathophysiology, gut microbiome linkages, scientific literature, and navigating the ADAM platform.",
            "followups": EXAMPLE_CHIPS,
            "caveats": "Research use only, not a medical device.",
            "sources": []
        }

    # Check explicit out of scope
    if any(re.search(pat, q_clean) for pat in OUT_OF_SCOPE_PATTERNS):
        return {
            "category": "out_of_scope",
            "answer": "I can help with Alzheimer's disease, the gut microbiome and the ADAM platform.",
            "explanation": "Please re-enter your question about one of these topics, using the proper medical or scientific terms and correct spelling.",
            "followups": EXAMPLE_CHIPS,
            "caveats": "Research use only, not a medical device.",
            "sources": []
        }

    # Check Category A: ADAM Platform Knowledge Base
    if any(k in q_clean for k in PLATFORM_KEYWORDS) or q_clean in ["what is adam?", "what is adam", "what is adam-1", "adam"]:
        return {
            "category": "platform",
            "answer": "ADAM (Alzheimer's Disease Detection & Advanced Multimodal Reasoning) is an open-source AI platform integrating microbiome metagenomics, clinical frailty metrics, explainable TreeSHAP attributions, and evidence retrieval. In research literature, 'ADAM' also refers to the longitudinal nursing home study cohort (n=102) analyzed by Haran et al. and Huang et al.",
            "explanation": "The ADAM software system combines XGBoost/Random Forest predictive modeling with conformal prediction, digital-twin trajectory forecasting, and the AIRA evidence assistant. The underlying ADAM-1 nursing home dataset contains multi-timepoint microbiome 16S/metagenomic profiles and clinical assessments.",
            "caveats": "ADAM is designed strictly for biomedical research and cross-cohort benchmark exploration. It is not an FDA-cleared diagnostic device.",
            "followups": [
                "What do the ADAM validation metrics indicate?",
                "How does the ADAM digital twin forecast trajectories?",
                "Which machine learning models does ADAM compare?"
            ],
            "sources": []
        }

    # Category B: Alzheimer's / Gut-brain axis / General Biology
    # If question mentions AD or related terms
    return {
        "category": "biomedical_domain",
        "query": query
    }
