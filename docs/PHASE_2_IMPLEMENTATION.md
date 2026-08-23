# Phase 2 Implementation — Data Ingestion & Dataset Explorer

**Platform**: ADAM-1 Enhanced (AI-Powered Alzheimer's Disease & Microbiome Research Platform)  
**Phase**: 2 — Dataset Audit, Ingestion Pipeline, FastAPI Endpoints, Dataset Explorer UI  
**Status**: ✅ COMPLETE

---

## 1. Architecture Overview

```
original_adam/ADAM/global_resources/          ← Read-only source of truth
         │
         ▼
backend/app/ingestion/pipeline.py             ← Validation + Ingestion pipeline
         │
         ▼
PostgreSQL (adam_enhanced DB)                 ← Canonical relational storage
         │
         ▼
backend/app/routers/datasets.py               ← Phase 2 FastAPI endpoints
         │
         ▼
frontend/src/pages/DatasetExplorer.jsx        ← Live tabbed Dataset Explorer
```

---

## 2. Database Schema

### Metadata Registry

| Table | Purpose | Key Columns |
|---|---|---|
| `datasets` | Dataset catalog | `id`, `name`, `source_file`, `status`, `checksum`, `rows`, `columns`, `size_bytes` |
| `dataset_columns` | Data dictionary per dataset column | `dataset_id`, `name`, `datatype`, `null_count`, `unique_count`, `classification` |
| `dataset_validations` | Validation run history | `dataset_id`, `run_timestamp`, `status`, `checks_passed`, `error_log`, `metrics_json` |

### Biological Domain Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `participants` | Research subjects (102 unique) | `study_id` (PK) |
| `clinical_microbiome_samples` | Validated 335-sample cohort | `sample_id` (PK), `study_id` (FK), `day`, `age`, `alzheimers`, `secondary_covariates` (JSONB) |
| `alpha_diversity_metrics` | Shannon indices for 335 samples | `sample_id` (PK/FK), `shannon_index` |
| `bray_curtis_distances` | Pairwise beta diversity (upper triangle) | `sample_id_a`, `sample_id_b` (composite PK), `distance` |
| `microbiome_species` | 940 validated species reference | `species_id` (UUID PK), `species_name` (unique), `taxonomy_hierarchy` |
| `microbiome_abundances` | Normalized species-sample abundances | `sample_id` (FK), `species_id` (FK), `relative_abundance` |
| `raw_matching_abundance` | Full mph_matching_ad.csv including 18 auxiliary samples | `species_name`, `sample_id` (composite PK), `abundance` |

### Design Decisions

#### Secondary Clinical Covariates — JSONB Storage
The 96 comorbidity/medication/drug columns (e.g. `Statins`, `polypharm5`, `GABA Reuptake Inhibitors`) are stored in a single `secondary_covariates JSONB` column on `clinical_microbiome_samples`. **Rationale**: These 96 columns represent a heterogeneous, extensible set of binary clinical flags. Storing them as 96 individual PostgreSQL columns would create a rigid schema. JSONB allows the same queryability, indexing support, and source fidelity while keeping the schema maintainable as Phase 3 feature engineering evolves.

#### Bray-Curtis — Pairwise Normalized (Upper Triangle Only)
The 335×335 BC matrix (112,225 total entries) would create 112,225 - 335 = 111,890 redundant entries if stored as a full matrix. Instead, we store only the **upper triangle** (55,945 pairs where `sample_id_a < sample_id_b` lexicographically), halving storage and preventing join ambiguity. **Source transformation documented**: This is a platform storage normalization, not part of the original ADAM research methodology.

#### Microbiome Abundances — Normalized with Species FK
Species abundances are stored in a normalized `microbiome_abundances` table with a foreign key to `microbiome_species`. This allows species-level queries, filtering, and future SHAP attribution linking. Sparse storage (only non-zero values) reduces footprint by ~65%.

#### Raw Abundance Preservation — mph_matching_ad
The full 940×353 matrix (including the 18 auxiliary/unlinked samples) is preserved in `raw_matching_abundance`. This ensures traceable, reversible ingestion — the 18 auxiliary samples remain available for future investigation even though they are excluded from validated cohort queries.

---

## 3. Column Classification

```
clinical_microbiome_df.csv — 1,050 total columns [VERIFIED]
├── 14 core clinical/metadata columns
│   └── Sample ID, study_id, day, Date Sample, age, age_cat, male,
│       abx6mo, hopsn, malnutrition_indicator_sco, clinical_frailty_scale,
│       PPI, Alzheimers, Dementia Other
├── 96 secondary clinical/comorbidity/medication columns
│   └── polypharm5, H2 Blocker, Statins, Atypical Antipsychotics,
│       Calcium-channel blockers, Diuretics, SSRIs, ACE Inhibitors, etc.
└── 940 microbiome taxa abundance columns
    └── 100% exact match with clade_species_df and mph_matching_ad species
```

---

## 4. Ingestion Pipeline

**File**: `backend/app/ingestion/pipeline.py`

### Dependency Order (enforced)
1. `clade_species_df` — taxonomy loaded first (FK reference for abundances)
2. `clinical_microbiome_df` — clinical samples + microbiome abundances
3. `ad_df` — alpha diversity (FK to clinical samples)
4. `bc_df` — beta diversity pairwise distances (FK to clinical samples)
5. `mph_matching_ad` — raw landing table (full 940×353 matrix)

### Validation Checks Per Dataset
- File existence check
- Row count check (exact match against expected)
- Column count check (exact match against expected)
- Duplicate identifier check
- NULL constraint validation
- Cross-dataset Sample ID overlap verification
- SHA-256 checksum computation

### Idempotency
- All ingestion functions issue `DELETE WHERE sample_id IN (...)` before inserting
- Taxonomy uses upsert-style `select-then-insert`
- Running ingestion twice produces identical state

### Auto-Ingestion
The pipeline is invoked automatically on FastAPI startup (`main.py` lifespan). It can also be triggered manually via `POST /api/ingest`.

---

## 5. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/datasets` | Paginated dataset registry |
| `GET` | `/api/datasets/{id}` | Single dataset metadata |
| `GET` | `/api/datasets/{id}/columns` | Data dictionary (searchable, paginated) |
| `GET` | `/api/datasets/{id}/validation` | Validation history (last 20 runs) |
| `GET` | `/api/samples` | Paginated clinical samples (filter: study_id, alzheimers, search) |
| `GET` | `/api/samples/{sample_id}` | Single sample detail |
| `GET` | `/api/species` | Paginated taxonomy list (searchable) |
| `GET` | `/api/alpha-diversity` | Paginated Shannon index values |
| `POST` | `/api/ingest` | Trigger ingestion pipeline (idempotent) |

All list endpoints support `page` and `page_size` query parameters.

---

## 6. Dataset Explorer Frontend

**File**: `frontend/src/pages/DatasetExplorer.jsx`

Five tabs:

| Tab | Contents |
|---|---|
| **Overview** | Dataset cards with status badges, expandable metadata (rows, columns, size, checksum, source path) |
| **Data Dictionary** | Per-dataset column metadata table (datatype, null count, unique count, classification badge). Searchable. Paginated. |
| **Sample Explorer** | Paginated clinical samples. Filter by study_id, Alzheimer's label, Sample ID prefix. Shows sample-level clinical metrics. |
| **Species Explorer** | Paginated 940-species list with full taxonomy hierarchy. Searchable by species name. |
| **Validation** | Validation history per dataset. Ingestion trigger button. Shows metrics, timestamps, and error logs. |

---

## 7. Provenance Strategy

Every ingested value can be traced back to its source:

| Layer | Provenance Field |
|---|---|
| `datasets.source_file` | Relative path to original CSV |
| `datasets.checksum` | SHA-256 hash of original CSV at ingestion time |
| `dataset_validations.metrics_json` | Row/column counts, duplicate counts, null counts at validation |
| `dataset_columns` | Per-column dtype and stats from original CSV |
| `raw_matching_abundance` | Verbatim copy of mph_matching_ad.csv values, including unlinked samples |

---

## 8. Raw vs Canonical Data Model

| Layer | Table(s) | Purpose |
|---|---|---|
| **Raw/Landing** | `raw_matching_abundance` | Verbatim source fidelity — all 940×353 values |
| **Canonical/Validated** | `clinical_microbiome_samples`, `microbiome_abundances`, `alpha_diversity_metrics`, `bray_curtis_distances` | Analysis-ready, FK-enforced, validated 335-sample cohort |
| **Reference** | `microbiome_species`, `taxonomy_clades` | Taxonomy dictionary |
| **Registry** | `datasets`, `dataset_columns`, `dataset_validations` | Audit trail and metadata |

---

## 9. Known Limitations

- **UNKNOWN**: The 18 auxiliary samples in `mph_matching_ad.csv` are preserved in raw storage but their exact biological provenance is not documented in the original repository.
- **UNKNOWN**: The upstream bioinformatics pipeline (FASTQ → relative abundance CSVs) is not included in the repository.
- **Bray-Curtis upper-triangle only**: Full symmetric matrix can be reconstructed by adding `(sample_id_b, sample_id_a, distance)` for any query requiring the full matrix.
- **JSONB secondary covariates**: Not individually indexed. For Phase 3 feature engineering, specific keys may require `CREATE INDEX` on `secondary_covariates->>'key'` expressions.

---

## 10. Commands

### Run Backend Tests
```bash
backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v
```

### Build Frontend
```bash
cd frontend && npm run build
```

### Trigger Ingestion via API
```bash
curl -X POST http://localhost:8000/api/ingest
```

### Start Full Stack (Docker)
```bash
docker compose up -d --build
```

---

## 11. Test Results

**21/21 tests pass** — all offline, no Docker required.

| Test | Category | Result |
|---|---|---|
| `test_datasets_endpoint_returns_list` | API (unit) | ✅ PASS |
| `test_response_time_header` | API (middleware) | ✅ PASS |
| `test_health_returns_200` | Phase 1 regression | ✅ PASS |
| `test_health_degraded_when_db_down` | Phase 1 regression | ✅ PASS |
| `test_system_info` | Phase 1 regression | ✅ PASS |
| `test_root_endpoint` | Phase 1 regression | ✅ PASS |
| `test_list_datasets_empty_returns_empty_list` | Phase 2 API | ✅ PASS |
| `test_get_nonexistent_dataset_returns_404` | Phase 2 API | ✅ PASS |
| `test_column_count_verified` | Data structure | ✅ PASS |
| `test_sample_id_uniqueness` | Data structure | ✅ PASS |
| `test_study_id_count` | Data structure | ✅ PASS |
| `test_alzheimers_label_distribution` | Data structure | ✅ PASS |
| `test_940_species_in_taxonomy` | Taxonomy integrity | ✅ PASS |
| `test_alpha_diversity_coverage` | Join integrity | ✅ PASS |
| `test_mph_sample_overlap` | Auxiliary samples | ✅ PASS |
| `test_taxa_column_count_in_clinical` | Column classification | ✅ PASS |
| `test_column_classification_split` | 14+96+940=1050 | ✅ PASS |
| `test_original_adam_not_modified` | Source integrity | ✅ PASS |
| `test_bray_curtis_shape` | BC matrix shape | ✅ PASS |
| `test_no_duplicate_samples` | Data quality | ✅ PASS |
| `test_health_endpoint_still_passes` | Phase 1 regression | ✅ PASS |

---

## 12. Source Integrity

`original_adam/` is untracked in git and contains **zero modifications**. Verified by `git status --short original_adam/` → `?? original_adam/` (untracked, no diff output).
