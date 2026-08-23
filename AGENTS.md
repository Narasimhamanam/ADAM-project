# ADAM-1 Enhanced — Agent Instructions

## Project Identity

This project is an enhanced full-stack implementation inspired by the
ADAM-1 research paper and the original ADAM GitHub repository.

The original ADAM repository is research/reference material.

Do NOT treat the original repository as the production application.

---

## Critical Rule

Before implementing any feature, inspect the relevant original ADAM
code, notebooks, datasets, scripts, and documentation.

Do not guess dataset schemas, model behavior, preprocessing logic,
or research methodology.

---

## Original Repository

The original ADAM repository is located at:

original_adam/ADAM-main/

Treat this directory as READ-ONLY unless explicitly instructed otherwise.

Never modify original ADAM research files unnecessarily.

---

## Technology Stack

Frontend:
- React
- Vite
- Tailwind CSS

Backend:
- Python
- FastAPI

Database:
- PostgreSQL
- pgvector

RAG:
- ChromaDB

Machine Learning:
- XGBoost
- Random Forest
- Logistic Regression
- Optuna
- SHAP

LLM:
- Provider-independent architecture
- Groq as the initial preferred provider
- Ollama/local models as optional
- OpenAI as optional

Deployment:
- Docker
- Vercel / Render / Railway where appropriate

---

## Development Philosophy

Build production-quality software.

Prefer:
- modular architecture
- type safety where practical
- reusable services
- clear API contracts
- tests
- logging
- error handling
- documentation
- environment-based configuration

Avoid:
- hard-coded credentials
- fake ML results
- fake dataset values
- unnecessary dependencies
- duplicated code
- giant monolithic files
- modifying original research code unnecessarily

---

## Research Integrity

Never claim that an experiment has been reproduced unless it
has actually been reproduced.

Never fabricate:
- accuracy
- F1
- ROC-AUC
- predictions
- SHAP values
- research results
- literature citations

If something is not implemented yet, clearly mark it as not implemented.

---

## Secrets

Never commit:
- API keys
- passwords
- tokens
- credentials
- .env files

Use .env and .env.example.

---

## Phase-Based Development

The project will be implemented in phases.

Do not skip phases.

Do not implement future functionality using fake placeholders
that appear to be real functionality.

Each phase must:
1. Be implemented.
2. Be tested.
3. Be integrated.
4. Be verified.
5. Be documented.

Only then proceed to the next phase.

---

## Current Phase

The current task is PHASE 1.

Do not implement the complete ML/RAG/agent system yet.

PHASE 1 focuses on:
- project foundation
- frontend foundation
- backend foundation
- PostgreSQL connection
- Docker setup
- API foundation
- frontend/backend integration
- professional ADAM-1 dashboard shell

---

## Verification

Never report a task as complete merely because files were created.

Run the appropriate:
- frontend build
- backend tests
- API checks
- database connectivity checks
- lint/type checks where configured

Fix errors before declaring the phase complete.

---

## Communication

At the end of each phase provide:

1. What was implemented
2. Files created
3. Files modified
4. Tests executed
5. Test results
6. Known issues
7. Architecture decisions
8. What remains for the next phase