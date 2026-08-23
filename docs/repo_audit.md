# Repository Audit — ADAM-1 Enhanced

**Date**: 2026-08-20  
**Auditor**: Phase 1 Architecture Review

---

## Repository Overview

The original ADAM-1 repository (`original_adam/ADAM/`) is a research codebase from the
University of Massachusetts implementing an AI reasoning framework for Alzheimer's Disease
detection through microbiome-clinical data integration.

**Citation**: Huang, Z. et al. (2025). ADAM-1: An AI reasoning and bioinformatics model for 
Alzheimer's disease detection and microbiome-clinical data integration. *IEEE Access, 13*, 145953–145967.

---

## Directory Structure

```
original_adam/ADAM/
├── ADAM_experiment01–30.ipynb     # 30 ML experiment notebooks
├── ADAM_summarization.ipynb       # LLM summarization notebook
├── README.md                      # Paper description
├── scripts/
│   ├── ADAM_source_code.py        # 3,330-line monolithic pipeline
│   ├── app.py                     ⚠️ HARDCODED API KEY
│   ├── aira.py                    # AIRA chatbot class
│   ├── embeddings_utils.py        # OpenAI embedding helpers
│   └── keys.py                    ⚠️ HARDCODED API KEYS
├── global_resources/
│   ├── clinical_microbiome_df.csv # Primary dataset (1.5 MB)
│   ├── bc_df.csv                  # Beta diversity (2 MB)
│   ├── ad_df.csv                  # Alpha diversity (8 KB)
│   ├── clade_species_df.csv       # Species taxonomy (141 KB)
│   └── mph_matching_ad.csv        # Matched patient data (1.4 MB)
├── base_model_selection/          # Baseline ML experiments
├── local_resources/               # Per-experiment outputs (30 × 3 types)
├── llm_test/                      # LLM loading/testing
├── pub_downloads/                 # PubMed download scripts
└── reporting/                     # Classification/summarization outputs
```

---

## 🔴 Critical Security Issues

### Issue 1: Hardcoded API Keys
**Files affected**:
- `scripts/keys.py` — Contains live OpenAI and AI21 API keys
- `scripts/app.py` — Contains a live OpenAI API key in source code

**Risk**: HIGH — Keys are committed to source control
**Action taken**: 
- NOT copied to ADAM-Enhanced project
- `.gitignore` excludes all `keys.py` patterns and `.env` files  
- Owners should **rotate these keys immediately**

---

## Reuse Plan

### Phase 2 — Will Reuse
- Dataset schemas from `clinical_microbiome_df.csv` → database models
- `global_resources/*.csv` → reference data for Phase 2 ingestion

### Phase 3 — Will Reuse/Refactor
- XGBoost training logic from `ADAM_source_code.py` → modular ML service
- SHAP computation patterns → explainability service
- `base_model_selection/` experiment results → model comparison baseline

### Phase 4 — Will Reuse/Refactor
- `embeddings_utils.py` → embedding service (OpenAI replaced by env var key)
- `aira.py` AIRA class patterns → Research Assistant agent
- `local_vector_db.py` → replaced by pgvector RAG pipeline
- `pub_downloader.py` → Literature retrieval service

### NOT Used
- Jupyter notebook format → replaced by API-first backend
- Gradio UI (`app.py`) → replaced by React frontend
- Hardcoded paths/seeds → replaced by configuration
- Direct API key usage → replaced by environment variables

---

## Dependency Analysis

| Library | Version (original) | Status |
|---------|-------------------|--------|
| XGBoost | 2.1.3 | Phase 3 |
| scikit-learn | 1.5.2 | Phase 3 |
| Optuna | 4.1.0 | Phase 3 |
| SHAP | 0.46.0 | Phase 3 |
| OpenAI | 1.55.1 | Phase 4 |
| LangChain | 0.3.8 | Phase 4 |
| PandasAI | 2.4.2 | Phase 4 (evaluate) |
| pandas | 1.5.3 | Phase 2 |
| numpy | 1.26.4 | Phase 2 |
| scikit-bio | 0.6.2 | Phase 2 |
| matplotlib/seaborn | latest | Phase 3 |

---

## Important Datasets

| File | Size | Description | Status |
|------|------|-------------|--------|
| `clinical_microbiome_df.csv` | 1.5 MB | Primary: clinical + microbiome + AD labels | Phase 2 ingestion |
| `bc_df.csv` | 2.0 MB | Bray-Curtis beta diversity matrix | Phase 2 |
| `ad_df.csv` | 8 KB | Alpha diversity metrics | Phase 2 |
| `clade_species_df.csv` | 141 KB | Species-level taxonomy | Phase 2 |
| `mph_matching_ad.csv` | 1.4 MB | Matched patient/control data | Phase 2 |
