"""
Literature Store & PubMed Corpus Manager
========================================
Maintains curated scientific publications on Alzheimer's Disease, Gut Microbiome,
Clinical Frailty, and Biomarkers with semantic vector retrieval.
"""
from __future__ import annotations

import os
from typing import List, Dict, Any, Optional
from app.rag.embeddings import SemanticSearchEngine
from app.core.logging import get_logger

logger = get_logger(__name__)

# Curated benchmark literature database matching original ADAM research domains
PUBMED_CORPUS_RAW: List[Dict[str, Any]] = [
    {'pmid': '41036149', 'title': 'ADAM-1: An AI Reasoning and Bioinformatics Model for Alzheimer’s Disease Detection and Microbiome-Clinical Data Integration', 'authors': 'Huang Z et al.', 'journal': 'IEEE Access', 'year': 2025, 'abstract': 'ADAM-1 combines microbiome and clinical data with machine learning, literature retrieval and language-model agents. The nursing-home dataset includes repeated observations. This implementation must distinguish held-out evaluation from retrospective displays.', 'keywords': 'microbiome XGBoost SHAP longitudinal frailty', 'key_taxa': [], 'source_url': 'https://pubmed.ncbi.nlm.nih.gov/41036149/', 'content_type': 'authored_summary', 'verification_status': 'METADATA_AND_SUMMARY_CHECKED', 'verified_on': '2026-11-15'},
    {'pmid': '31064831', 'title': 'Alzheimer’s Disease Microbiome Is Associated with Dysregulation of the Anti-Inflammatory P-Glycoprotein Pathway', 'authors': 'Haran JP et al.', 'journal': 'mBio', 'year': 2019, 'abstract': 'Longitudinal nursing-home metagenomics and intestinal epithelial assays linked Alzheimer-associated microbiomes to lower P-glycoprotein expression. Butyrate-producing bacteria were less prevalent in the AD group. Associations and in-vitro effects do not establish individual diagnosis.', 'keywords': 'microbiome butyrate Faecalibacterium P-glycoprotein', 'key_taxa': ['Faecalibacterium prausnitzii'], 'source_url': 'https://pubmed.ncbi.nlm.nih.gov/31064831/', 'content_type': 'authored_summary', 'verification_status': 'METADATA_AND_SUMMARY_CHECKED', 'verified_on': '2026-11-15'},
    {'pmid': '29051531', 'title': 'Gut microbiome alterations in Alzheimer’s disease', 'authors': 'Vogt NM et al.', 'journal': 'Scientific Reports', 'year': 2017, 'abstract': 'Fecal microbial communities differed between participants with Alzheimer dementia and matched controls. Lower diversity and associations with cerebrospinal-fluid biomarkers were reported. This observational study does not establish a causal microbiome treatment effect.', 'keywords': 'gut microbiome alpha diversity Bifidobacterium', 'key_taxa': ['Bifidobacterium'], 'source_url': 'https://pubmed.ncbi.nlm.nih.gov/29051531/', 'content_type': 'authored_summary', 'verification_status': 'METADATA_AND_SUMMARY_CHECKED', 'verified_on': '2026-11-15'},
    {'pmid': '27776263', 'title': 'Association of brain amyloidosis with pro-inflammatory gut bacterial taxa and peripheral inflammation markers in cognitively impaired elderly', 'authors': 'Cattaneo A et al.', 'journal': 'Neurobiology of Aging', 'year': 2017, 'abstract': 'Amyloid-positive cognitive impairment was associated with higher Escherichia/Shigella and lower Eubacterium rectale abundance and peripheral inflammation. The study also measured Faecalibacterium prausnitzii and Bacteroides fragilis. Causality remains unresolved.', 'keywords': 'amyloid inflammation butyrate Faecalibacterium Eubacterium', 'key_taxa': ['Eubacterium rectale', 'Faecalibacterium prausnitzii', 'Bacteroides fragilis'], 'source_url': 'https://pubmed.ncbi.nlm.nih.gov/27776263/', 'content_type': 'authored_summary', 'verification_status': 'METADATA_AND_SUMMARY_CHECKED', 'verified_on': '2026-11-15'},
    {'pmid': '33074224', 'title': 'Short-Chain Fatty Acids and Lipopolysaccharide as Mediators Between Gut Dysbiosis and Amyloid Pathology in Alzheimer’s Disease', 'authors': 'Marizzoni M et al.', 'journal': 'Journal of Alzheimer’s Disease', 'year': 2020, 'abstract': 'In 89 older adults, amyloid PET burden was associated with circulating bacterial products, inflammatory markers and endothelial dysfunction. Butyrate showed a negative association with amyloid burden. These correlations motivate mechanistic studies rather than patient-specific causal claims.', 'keywords': 'gut brain axis butyrate short chain fatty acids LPS amyloid', 'key_taxa': [], 'source_url': 'https://pubmed.ncbi.nlm.nih.gov/33074224/', 'content_type': 'authored_summary', 'verification_status': 'METADATA_AND_SUMMARY_CHECKED', 'verified_on': '2026-11-15'},
    {'pmid': '29187837', 'title': 'Microbiome Datasets Are Compositional: And This Is Not Optional', 'authors': 'Gloor GB et al.', 'journal': 'Frontiers in Microbiology', 'year': 2017, 'abstract': 'Sequencing abundances describe relative composition. Analyses that ignore this constraint can be misleading. Log-ratio transformations provide a framework for studying relative microbial changes, with explicit handling of zeros.', 'keywords': 'compositional microbiome log ratio CLR sequencing', 'key_taxa': [], 'source_url': 'https://pubmed.ncbi.nlm.nih.gov/29187837/', 'content_type': 'authored_summary', 'verification_status': 'METADATA_AND_SUMMARY_CHECKED', 'verified_on': '2026-11-15'},
]

PUBMED_CORPUS: List[Dict[str, Any]] = []
for doc in PUBMED_CORPUS_RAW:
    d = doc.copy()
    abst = d.get("abstract", "")
    d["content"] = abst
    d["snippet"] = abst[:250] + ("..." if len(abst) > 250 else "")
    PUBMED_CORPUS.append(d)

_SEARCH_ENGINE = SemanticSearchEngine()
_SEARCH_ENGINE.index_documents(PUBMED_CORPUS)


def get_literature_engine() -> SemanticSearchEngine:
    """Return initialized semantic literature engine."""
    return _SEARCH_ENGINE


def search_literature(query: str, top_k: int = 5, min_threshold: float = 0.05) -> List[Dict[str, Any]]:
    """Query the indexed scientific literature corpus with optional minimum relevance threshold."""
    engine = get_literature_engine()
    return engine.search(query, top_k=top_k, min_threshold=min_threshold)


def get_all_articles() -> List[Dict[str, Any]]:
    """Return all indexed scientific articles."""
    return PUBMED_CORPUS
