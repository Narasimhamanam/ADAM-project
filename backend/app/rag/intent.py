"""
Query Intent Classifier for AIRA (ADAM Intelligent Research Assistant)
======================================================================
Identifies intent to route user inquiries to:
1. general_conversation: greetings, conversational remarks, asking for capabilities
2. general_knowledge: direct definitions/explanations for general biomedical/ML concepts
3. adam_platform: queries concerning ADAM architecture, multi-agent workflow, models
4. biomedical_research: deep microbiome, metabolomics, gut-brain axis, biomarkers (triggers RAG)
5. data_record: requests to analyze or inspect patient/sample records
6. unrelated_general: questions unrelated to medicine or ADAM (answered cleanly without hallucinated lectures)
"""
from __future__ import annotations

import re
from typing import Tuple


def classify_query_intent(query: str) -> str:
    """Classify user prompt into one of the 6 canonical intent categories."""
    q = query.strip().lower()
    clean = re.sub(r"[^\w\s]", " ", q)
    words = clean.split()
    
    # 1. General Conversation
    greetings = {
        "hello", "hi", "hey", "greetings", "good morning", "good afternoon",
        "good evening", "goodbye", "bye", "thanks", "thank you", "thx",
    }
    if clean in greetings or any(clean == g for g in greetings):
        return "general_conversation"

    # Conversational questions about capabilities or well-being
    if any(phrase in clean for phrase in [
        "how are you", "who are you", "how can you help me", "how can you help",
        "what can you do", "what do you do", "help me", "can you help",
    ]):
        return "general_conversation"

    if any(g in words for g in ["hello", "hi", "hey"]) and len(words) <= 3:
        return "general_conversation"

    # 2. Data Record / Patient Analysis
    if any(k in clean for k in [
        "analyze this patient", "analyze this selected", "selected patient",
        "selected record", "analyze patient", "analyze sample", "inspect record",
        "patient record", "patient dc", "sample fb", "patient data", "cohort data",
    ]):
        return "data_record"

    # 3. ADAM Platform Architecture & Methodology
    if any(k in clean for k in [
        "how does adam work", "what is adam", "about adam", "adam framework",
        "adam use rag", "adam use r a g", "adam agents", "what models does adam",
        "adam pipeline", "adam architecture", "adam workflow", "computational agent",
        "summarization agent", "classification agent", "adam enhanced",
    ]):
        return "adam_platform"

    # 4. Deep Biomedical Research / Multi-Omics (RAG Candidate)
    bio_terms = [
        "microbiome", "gut", "taxa", "bacterial", "dysbiosis", "phocaeicola",
        "dorei", "eubacterium", "rectale", "faecalibacterium", "prausnitzii",
        "butyrate", "scfa", "short chain fatty", "alpha diversity", "beta diversity",
        "shannon", "simpson", "berger parker", "bray curtis", "jaccard", "canberra",
        "lps", "lipopolysaccharide", "endotoxemia", "microbiota", "pathobiont",
        "gut brain", "gut brain axis", "dysbiotic", "endotoxin", "metagenomic",
    ]
    if any(t in clean for t in bio_terms):
        return "biomedical_research"

    # 5. General Knowledge (Biomedical or Machine Learning concepts)
    gk_terms = [
        "what is ad", "what is alzheimer", "what is dementia", "what is xgboost",
        "how does shap work", "what is shap", "what is random forest",
        "what is logistic regression", "explain shap", "explain xgboost",
        "explain ad", "explain dementia", "roc auc", "f1 score",
        "explain precision", "explain recall", "clinical frailty scale",
    ]
    if any(t in clean for t in gk_terms):
        return "general_knowledge"

    if clean.startswith("what is") and any(w in words for w in ["ad", "alzheimers", "alzheimer", "dementia", "xgboost", "shap", "auc", "f1"]):
        return "general_knowledge"

    # 6. Unrelated General or Fallback
    # Check if query contains any domain terms
    domain_terms = [
        "alzheimer", "ad", "dementia", "cognitive", "microbiome", "bacteria",
        "patient", "clinical", "model", "shap", "xgboost", "diversity",
        "frailty", "prediction", "adam", "biomarker", "metabolite", "sample",
    ]
    if not any(dt in clean for dt in domain_terms):
        return "unrelated_general"

    return "general_knowledge"
