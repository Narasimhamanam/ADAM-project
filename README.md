# ADAM-1 Enhanced

**AI-Powered Alzheimer's Disease and Microbiome Research Platform**

[![Phase](https://img.shields.io/badge/Phase%204-AI%20%26%20Multi--Agent%20Complete-purple)](./docs/)
[![Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20PostgreSQL-green)](./docs/)
[![License](https://img.shields.io/badge/License-Research-orange)](./docs/)

---

## Overview

ADAM-1 Enhanced is a production-quality, full-stack research platform built on top of the original [ADAM-1 research framework](https://doi.org/10.1109/ACCESS.2025.3599857) (University of Massachusetts, 2025). It transforms the original Jupyter notebook-based pipeline into a modular, API-first web application for Alzheimer's Disease and microbiome data analysis with Explainable AI (TreeSHAP) and multi-agent reasoning (AIRA).

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
│   /api/health   /api/datasets   /api/ml/predict          │
│   /api/ml/shap  /api/ai/chat    /api/ai/agent/execute    │
└──────────────────────┬──────────────────────────────────┘
                       │ SQLAlchemy (asyncpg)
┌──────────────────────▼──────────────────────────────────┐
│          PostgreSQL 16 + pgvector extension              │
│                  localhost:5432                          │
└─────────────────────────────────────────────────────────┘
```

---

## Deployment with Render (Blueprint)

This repository includes a production-ready Render Blueprint specification ([`render.yaml`](./render.yaml)) to deploy the complete 3-tier architecture with a single click.

### Services Deployed by the Blueprint

1. **`adam-enhanced-backend`** (Web Service):
   - **Runtime:** Python 3.11
   - **Framework:** FastAPI + Uvicorn
   - **Health Check:** `/api/health`
   - **Auto-Initialization:** Auto-migrates database schemas, verifies extensions (`vector`, `pg_trgm`, `uuid-ossp`), and ingests the 335 cohort samples on first startup.

2. **`adam-enhanced-frontend`** (Static Site):
   - **Runtime:** Node.js 20 / Static
   - **Build Command:** `npm ci && npm run build`
   - **Publish Directory:** `./dist`
   - **Routing:** Automatic SPA fallback rewrite (`/* -> /index.html`)
   - **API Connection:** Dynamically connected to `adam-enhanced-backend` host.

3. **`adam-enhanced-db`** (Managed PostgreSQL 16):
   - **Version:** PostgreSQL 16
   - **Extensions:** `pgvector`, `pg_trgm`, `uuid-ossp`

### Step-by-Step Render Deployment Guide

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Configure Render Blueprint deployment"
   git push origin main
   ```

2. **Create a Blueprint Instance in Render:**
   - Log in to your [Render Dashboard](https://dashboard.render.com/).
   - Click **New +** → **Blueprint**.
   - Connect your GitHub repository (`ADAM-project` or `ADAM-Enhanced`).
   - Render will parse `render.yaml` and display the 3 resources to be provisioned.

3. **Configure Environment Secrets:**
   - When prompted for `GROQ_API_KEY`, paste your Groq API key (free tier available at [console.groq.com](https://console.groq.com)).
   - Click **Apply**.

4. **Automatic Deployment & Verification:**
   - Render provisions PostgreSQL, builds the FastAPI backend, and deploys the React frontend.
   - Once deployment completes, your frontend URL (`https://adam-enhanced-frontend.onrender.com`) is live!

---

## Local Development & Docker

### Run with Docker Compose (Recommended)

```bash
# 1. Clone and enter project
git clone https://github.com/Narasimhamanam/ADAM-project.git
cd ADAM-project

# 2. Set up environment
cp .env.example .env
# Edit .env and insert your GROQ_API_KEY

# 3. Start all 3 containers (Database, Backend, Frontend)
docker compose up -d

# 4. Verify health
curl http://localhost:8000/api/health

# 5. Open in browser
# Frontend: http://localhost:3000
# Backend Docs: http://localhost:8000/docs
```

### Local Manual Development

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

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health check (DB connectivity & uptime) |
| `GET` | `/api/system/info` | Runtime environment information |
| `GET` | `/api/datasets` | Paginated dataset metadata registry |
| `GET` | `/api/samples/{id}` | Single patient clinical microbiome record |
| `GET` | `/api/ml/benchmark` | 30-Seed cross-validation model benchmarks |
| `POST` | `/api/ml/predict` | Live Alzheimer's risk prediction (XGBoost) |
| `GET` | `/api/ml/shap/global` | Global Mean \|SHAP\| biomarker rankings |
| `GET` | `/api/ml/shap/sample/{id}` | Sample-level local TreeSHAP attribution forces |
| `POST` | `/api/ai/chat` | Interactive RAG research assistant chat (Groq LLM) |
| `GET` | `/api/ai/literature/search` | PubMed semantic vector search |
| `POST` | `/api/ai/agent/execute` | 3-Tier AIRA Multi-Agent execution workflow |

Full interactive API docs: `http://localhost:8000/docs` (Swagger UI)

---

## Application Pages & Phase Status

| Page | Route | Status | Phase |
|---|---|---|---|
| **Dashboard** | `/dashboard` | ✅ Complete | Phase 1 |
| **Settings** | `/settings` | ✅ Complete | Phase 1 |
| **Dataset Explorer** | `/datasets` | ✅ Complete | Phase 2 |
| **Alzheimer Analysis** | `/alzheimer` | ✅ Complete | Phase 3 |
| **ML Risk Prediction** | `/ml` | ✅ Complete | Phase 3 |
| **Model Comparison** | `/models` | ✅ Complete | Phase 3 |
| **SHAP Explainability** | `/shap` | ✅ Complete | Phase 3 |
| **Reports & PDF** | `/reports` | ✅ Complete | Phase 3 |
| **Research Assistant** | `/assistant` | ✅ Complete | Phase 4 |
| **Literature / RAG** | `/literature` | ✅ Complete | Phase 4 |
| **AI Agents** | `/agents` | ✅ Complete | Phase 4 |

---

## Research Integrity & Citation

This platform is inspired by and built upon:

> Huang, Z., Sekhon, V. K., Sadeghian, R., Vaida, M. L., Jo, C., McCormick, B. A., Ward, D. V., Bucci, V., & Haran, J. P. (2025). ADAM-1: An AI reasoning and bioinformatics model for Alzheimer's disease detection and microbiome-clinical data integration. *IEEE Access, 13*, 145953–145967. https://doi.org/10.1109/ACCESS.2025.3599857

---

© 2026 ADAM-1 Enhanced Project
