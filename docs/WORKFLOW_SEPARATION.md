# ADAM-1: Architecture & Workflow Separation
## Original Research Paper vs. Enhanced Platform Implementation

This document establishes the formal, authoritative boundary between the original ADAM-1 research paper architecture and the full-stack engineering extensions implemented in the ADAM-1 Enhanced platform.

---

## 1. Flow 1: Original ADAM-1 Research Workflow

The original ADAM-1 framework was designed by Huang et al. (University of Massachusetts, 2025; *IEEE Access*, DOI: 10.1109/ACCESS.2025.3599857) as an agentic AI reasoning and bioinformatics model for Alzheimer's disease (AD) detection and microbiome-clinical data integration.

### Authoritative Paper Architecture

The original research system consists strictly of **three AI agents** operating in a linear, collaborative chain-of-thought pipeline:

```
User / Submitted Patient Multi-Omic & Laboratory Data
                         ↓
              [ Computational Agent ]
  - Machine learning & bioinformatics processing
  - Optuna hyperparameter tuning (50 trials)
  - Stratified 3-fold cross-validation
  - Model training: XGBoost, Random Forest, Logistic Regression
  - Diversity analysis (Shannon, Simpson, Berger-Parker, Bray-Curtis)
  - TreeSHAP feature importance (global violin plots, local attributions)
                         ↓
              [ Summarization Agent ]
  - Receives quantitative outputs from Computational Agent
  - Queries local vector database (ChromaDB / PubMed embeddings)
  - Synthesizes multi-modal findings via Base LLM (GPT-4o)
  - Produces 7-step Chain-of-Thought clinical & microbiological summary:
      * Step 1: Patient Overview (demographics, CFS, malnutrition, hospitalizations)
      * Step 2: Key Clinical Markers (frailty, polypharmacy, comorbidities)
      * Step 3: Gut Microbiome Profile (protective vs. pro-inflammatory abundances)
      * Step 4: Diversity Metrics Interpretation (alpha & beta diversity)
      * Step 5: Interactions and Mechanisms (gut-brain axis, frailty-microbiome loop)
      * Step 6: Machine Learning Analysis (prediction probability, SHAP values)
      * Step 7: Recommendations & Follow-Up considerations
                         ↓
             [ Semantic Literature Retrieval ]
  - Queries vector store for relevant biomedical citations (PMIDs/PMCs)
  - Injects contextual evidence into reasoning chain
                         ↓
              [ Classification Agent ]
  - Receives comprehensive summary from Summarization Agent
  - Evaluates multi-modal risk factors and contradictory signals
  - Assesses model prediction probability and feature attributions
  - Formulates diagnostic reasoning rationale and uncertainties
  - Renders final Alzheimer's disease classification (Yes/No) with confidence
                         ↓
Final Alzheimer's Classification & Scientific Report
```

### Research Scope Boundaries (What Was NOT in the Paper)
The original paper was an offline research study conducted across 30 experiment seeds on an Ubuntu workstation with GPUs. The paper did **NOT** include:
- A web application dashboard or graphical user interface
- A relational SQL database (PostgreSQL) or ORM
- Real-time client-server REST APIs or FastAPI endpoints
- Live user authentication or role-based access control
- Interactive dataset explorer or filtering tables
- Production cloud deployment infrastructure (Docker, Render, Vercel)
- Interactive model parameter sliders or on-the-fly retraining toggles

---

## 2. Flow 2: ADAM-1 Enhanced Platform User Workflow

The ADAM-1 Enhanced platform is an enterprise-grade full-stack web application designed to operationalize, scale, and provide interactive access to the ADAM-1 research findings and bioinformatics pipelines.

### Enhanced Platform Sequence

```
User Entry
    ↓
Platform Authentication / Session Initialization
    ↓
Research Dashboard & Telemetry
  - Real-time server liveness & database connection monitoring
  - Multi-phase milestone progression tracker (Phases 1–4)
  - Active provider status (Groq / PubMed corpus telemetry)
    ↓
Dataset & Cohort Explorer
  - PostgreSQL 16 + pgvector database backend
  - 335 longitudinal metagenomic samples across 102 subjects
  - 940 microbiome species relative abundances
  - Shannon alpha diversity index calculations
  - Cohort filtering, search, and distribution charts
    ↓
Patient / Research Sample Selection
  - Real sample lookup by Patient/Sample ID (e.g., DC001, FB085)
  - Ground-truth cohort diagnosis & clinical covariate profile
    ↓
ML Risk Prediction Studio
  - Multi-model real-time inference (XGBoost, Random Forest, Logistic Regression)
  - Calibrated Alzheimer's risk probability, binary label, and confidence level
  - 30-seed cross-validation benchmark comparisons (ROC-AUC, F1, Accuracy)
    ↓
SHAP Explainability Studio
  - Local sample-level waterfall feature attributions (TreeSHAP & Linear SHAP)
  - Global cohort biomarker importance rankings (Top 50 species & clinical scores)
    ↓
PubMed Semantic Literature RAG
  - Vector embeddings store with pgvector cosine similarity search
  - Live query retrieval with clickable PubMed / PMC citation badges
    ↓
AIRA Conversational Research Assistant
  - High-throughput Groq LLM integration (Llama 3.3 70B / Llama 3.1 8B)
  - Dynamic query-aware biomedical reasoning & literature synthesis
    ↓
AIRA Multi-Agent Collaborative Workspace
  - 3-tier vertical agent execution trace:
      1. Computational Agent (quantitative cohort & model statistics)
      2. Summarization Agent (literature RAG evidence & pathway synthesis)
      3. Classification Agent (clinical reasoning & multi-modal diagnosis)
      4. Final AIRA Prediction (integrated multi-agent consensus)
    ↓
Results Visualization & Comparative Outcome Matrix
  - Ground Truth vs. Model Prediction discordance analysis
    ↓
Multimodal Alzheimer's Analysis Report
  - 13-section structured clinical/research analytical dossier
  - Live patient profile, real bacterial abundances, and diversity metrics
  - Multi-model probability comparison & SHAP impact badges
  - Distinguishes Observed Data vs. Prediction vs. AI Interpretation vs. Evidence
  - Evidence-based modifiable factors & non-prescriptive health considerations
  - Research system disclaimer
  - Interactive report preview, Markdown export, and one-click PDF print
```

---

## 3. Systematic Differences Matrix

| Dimension | Original ADAM-1 Research Paper | ADAM-1 Enhanced Platform |
| :--- | :--- | :--- |
| **System Identity** | Research methodology & experiment code | Full-stack production research platform |
| **User Interface** | Jupyter Notebooks (`.ipynb`) & raw CSV exports | React 18 + Vite + Tailwind CSS dashboard |
| **Backend Architecture** | Standalone Python scripts & local execution | Python 3.11 + FastAPI async REST API |
| **Data Storage** | Static CSV files (`global_resources/`) | PostgreSQL 16 + pgvector relational DB |
| **LLM Inference** | OpenAI API (GPT-4o / GPT-3.5) in scripts | Provider-independent (Groq Llama 3.3 70B, OpenAI, local RAG) |
| **RAG Implementation** | Local ChromaDB vector database | Semantic vector retrieval with literature store |
| **ML Models** | 30 static Optuna experiment runs | Persistent Model Registry + real-time inference across 3 architectures |
| **SHAP Engine** | Static SHAP summary plots saved to disk | Native TreeSHAP + Linear SHAP interactive waterfall & global rankings |
| **Reporting** | Static HTML table viewer (`reporting/*.html`) | 13-section multimodal dossier with Markdown & PDF export |
| **Deployment** | Local Ubuntu workstation (4x RTX 3090) | Docker Compose & Render cloud infrastructure |
| **Phase System** | Single research study | 4-phase staged architecture with central configuration |

---

## 4. Scientific Language Guidelines

To maintain complete biomedical integrity and prevent misleading medical claims:
- **Never state**: *"This bacterium causes Alzheimer's disease."*
- **Always state**: *"Observed relative abundance is associated with..."*, *"Reported in literature to correlate with pro-inflammatory states..."*, or *"Identified as a risk-elevating feature in model attributions."*
- **Distinguish clearly**:
  1. *Observed Metagenomic Data* (raw relative abundances, clinical covariates)
  2. *Machine Learning Predictions* (probabilistic statistical outputs)
  3. *AI Reasoning Synthesis* (LLM/agent multi-modal summaries)
  4. *Published Literature Evidence* (peer-reviewed citations)
- **Mandatory Disclaimer**: ADAM-1 is an artificial intelligence research platform intended for scientific exploration and hypothesis generation. It is not an FDA/CE-approved clinical diagnostic device.
