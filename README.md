# ADAM-1 Enhanced

**AI-Powered Alzheimer's Disease and Microbiome Research Platform**

[![Phase](https://img.shields.io/badge/Phase-2%20Data%20Ingestion-blue)](./docs/)
[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20PostgreSQL-green)](./docs/)
[![License](https://img.shields.io/badge/License-Research-orange)](./docs/)

---

## Overview

ADAM-1 Enhanced is a production-quality, full-stack research platform built on top of the original [ADAM-1 research framework](https://doi.org/10.1109/ACCESS.2025.3599857) (University of Massachusetts, 2025). It transforms the original Jupyter notebook-based pipeline into a modular, API-first web application for Alzheimer's Disease and microbiome data analysis.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│              (Vite + Tailwind CSS)                       │
│           http://localhost:5173 (dev)                    │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│                  FastAPI Backend                          │
│              http://localhost:8000                       │
│   /api/health  /api/system/info  /api/datasets           │
│   /api/samples  /api/species  /api/alpha-diversity        │
└──────────────────────┬──────────────────────────────────┘
                       │ SQLAlchemy (async)
┌──────────────────────▼──────────────────────────────────┐
│          PostgreSQL 16 + pgvector extension              │
│                  localhost:5432                          │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
ADAM-Enhanced/
├── original_adam/          # Original research repo (reference only, do not modify)
│   └── ADAM/
├── backend/                # FastAPI Python backend
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── ingestion/         # Phase 2: ingestion pipeline
│   │   ├── routers/
│   │   ├── models/
│   │   └── schemas/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   └── pages/
│   ├── package.json
│   └── Dockerfile
├── data/                   # Local data files (git-ignored)
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── tests/                  # Integration tests
├── .env.example            # Environment variable template
├── .gitignore
├── docker-compose.yml
└── README.md
```

---

## Quickstart

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local frontend dev)
- Python 3.10+ (for local backend dev)

### Run with Docker Compose (Recommended)

```bash
# 1. Clone and enter project
cd ADAM-Enhanced

# 2. Download the original ADAM research repository (reference data / required for ingestion)
#    ⚠️ This is NOT included in git (it contains API keys from the original research).
#    Clone it into the project root:
git clone https://github.com/rkaunismaki/ADAM.git original_adam/ADAM

# 3. Set up environment
cp .env.example .env
# Edit .env if needed (defaults work for local development)

# 4. Start all services (auto-ingests datasets on startup)
docker compose up -d

# 5. Verify
curl http://localhost:8000/api/health
# → {"status": "healthy", "database": "connected", ...}

# 6. Open frontend
# http://localhost:3000
```

### Local Development

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

**Database only (for backend dev):**
```bash
docker compose up db -d
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | System health check (DB connectivity) |
| GET | `/api/system/info` | Runtime environment information |
| GET | `/api/datasets` | Dataset metadata listing |

Full interactive docs: http://localhost:8000/docs (Swagger UI)

---

## Application Pages

| Page | Status | Phase |
|------|--------|-------|
| Dashboard | ✅ Active | 1 |
| Dataset Explorer | ✅ Foundation | 1 |
| Alzheimer Analysis | 🔜 Coming | 2 |
| ML Prediction | 🔜 Coming | 3 |
| Model Comparison | 🔜 Coming | 3 |
| SHAP Explainability | 🔜 Coming | 3 |
| Research Assistant | 🔜 Coming | 4 |
| Literature / RAG | 🔜 Coming | 4 |
| AI Agents | 🔜 Coming | 4 |
| Reports | 🔜 Coming | 3 |
| Settings | ✅ Foundation | 1 |

---

## Original Research

This platform is inspired by and built upon:

> Huang, Z., Sekhon, V. K., Sadeghian, R., Vaida, M. L., Jo, C., McCormick, B. A., Ward, D. V., Bucci, V., & Haran, J. P. (2025). ADAM-1: An AI reasoning and bioinformatics model for Alzheimer's disease detection and microbiome-clinical data integration. *IEEE Access, 13*, 145953–145967. https://doi.org/10.1109/ACCESS.2025.3599857

The original research code is preserved in `original_adam/` for reference.

---

## Security

- API keys are **never** hardcoded
- All secrets managed via `.env` (gitignored)
- See `.env.example` for required variables
- Original research code (`original_adam/`) is reference-only; its credentials are **not** used

---

## Phase Roadmap

| Phase | Description |
|-------|-------------|
| **Phase 1** | ✅ Foundation: FastAPI + React + PostgreSQL + Docker |
| **Phase 2** | Data pipeline: CSV ingestion, dataset management |
| **Phase 3** | ML pipeline: XGBoost, SHAP, model comparison |
| **Phase 4** | RAG + LLM agents: literature retrieval, AIRA assistant |

---

© 2025 ADAM-1 Enhanced Project
