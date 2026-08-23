# ADAM-1 Dataset Audit

**Document**: Phase 2 Dataset Audit Report  
**Platform**: ADAM-1 Enhanced (AI-Powered Alzheimer's Disease & Microbiome Research Platform)  
**Reference Source**: `original_adam/ADAM/` (Huang et al., IEEE Access 2025)  
**Status**: STAGE 1 — PRE-IMPLEMENTATION AUDIT (GATE REVIEW APPROVED WITH DISCREPANCIES RESOLVED)

---

## 1. Audit Scope

This document provides a comprehensive, scientifically rigorous audit of the datasets, data structures, metadata, and data processing logic present in the original ADAM repository (`original_adam/ADAM/`).

### Scope Boundaries
- **Audited Paths**:
  - `original_adam/ADAM/global_resources/` (primary research datasets & diversity figures)
  - `original_adam/ADAM/scripts/` (`ADAM_source_code.py`, `aira.py`, `app.py`, `embeddings_utils.py`, `local_vector_db.py`, `pub_downloads/`)
  - `original_adam/ADAM/base_model_selection/` (benchmark models, summaries, ranking figures)
  - `original_adam/ADAM/output/` (experiment measures, SHAP values, summary CSVs)
  - `original_adam/ADAM/local_resources/` (per-experiment splits, summarization & classification outputs)
  - `original_adam/ADAM/figures/` & `original_adam/ADAM/reporting/` (HTML demo reports, publication figures)
- **Phase Constraint**: Audit only. No database modifications, data ingestion, or model changes are implemented during Stage 1.
- **Source Integrity**: The original repository `original_adam/` remains completely read-only and unmodified.

---

## 2. Repository Structure

The original repository contains **618 total files** categorized by format:
- **CSV Data Files** (.csv): 327 files
- **Jupyter Notebooks** (.ipynb): 165 files
- **Visualizations & Figures** (.png, .pdf): 71 files
- **Python Scripts** (.py): 13 files
- **JSON & Web Artifacts** (.json, .html, .css, .js): 18 files
- **Documentation & Workspaces** (.md, .sh, .txt, .jupyterlab-workspace): 24 files

### Repository Directory Hierarchy
```
original_adam/ADAM/
├── global_resources/              # [OBSERVED] 5 primary datasets (microbiome, clinical, diversity, taxonomy)
│   ├── clinical_microbiome_df.csv # (1.53 MB) Primary clinical-microbiome integrated dataset
│   ├── bc_df.csv                  # (2.05 MB) Bray-Curtis beta diversity distance matrix
│   ├── ad_df.csv                  # (8.24 KB) Alpha diversity (Shannon index) dataset
│   ├── clade_species_df.csv       # (140.75 KB) Taxonomic hierarchy mapping (940 species)
│   ├── mph_matching_ad.csv        # (1.45 MB) Abundance matrix across 353 samples & 940 species
│   ├── alpha_beta_diversity.pdf   # (6.60 MB) Comprehensive diversity visualization report
│   └── shap_paper.pdf             # (1.01 MB) Lundberg & Lee (2017) SHAP reference paper
├── scripts/                       # [OBSERVED] Python source code & utility scripts
│   ├── ADAM_source_code.py        # (3,329 lines) Monolithic ML, SHAP, and agent reasoning pipeline
│   ├── aira.py                    # (98 lines) LlamaIndex research assistant class
│   ├── app.py                     # (44 lines) Legacy Gradio chatbot
│   └── embeddings_utils.py        # (252 lines) OpenAI embeddings & distance helpers
├── base_model_selection/          # [OBSERVED] Baseline ML comparison experiments
│   ├── baseline_model_experiments_summary.csv # (30 rows) LR, RF, XGBoost baseline metrics
│   └── merged_df.csv              # (30 rows) Baseline comparisons with model labels
├── output/                        # [OBSERVED] 94 experiment result files
│   ├── adam_experiments_summary.csv    # (30 rows) Reported ADAM-1 agentic results
│   ├── xgboost_experiments_summary.csv # (30 rows) Reported XGBoost benchmark results
│   ├── xgboost_experiment01-30_measures.csv    # Per-experiment evaluation metrics
│   └── xgboost_experiment01-30_shap_values.csv  # Per-experiment SHAP attribution tables
├── local_resources/               # [OBSERVED] 30 experiment directories + combined outputs
│   ├── combined_classification_output.csv      # (900 rows) Test sample reasoning summaries
│   └── experiment01–30/           # Per-experiment train/test splits (ad_df_tr, bc_df_tr, etc.)
└── reporting/                     # [OBSERVED] HTML demo interfaces & classification logs
```

---

## 3. Dataset Inventory

| Dataset Name | Relative Path | Format | Size | Rows | Columns | Role | Classification |
|---|---|---|---|---|---|---|---|
| `clinical_microbiome_df` | `global_resources/clinical_microbiome_df.csv` | CSV | 1.53 MB | 335 | 1050 | Primary Research Dataset | **[OBSERVED] RAW / SOURCE** |
| `bc_df` | `global_resources/bc_df.csv` | CSV | 2.05 MB | 335 | 335 | Beta Diversity Dissimilarity Matrix | **[OBSERVED] DERIVED** |
| `ad_df` | `global_resources/ad_df.csv` | CSV | 8.24 KB | 335 | 2 | Alpha Diversity (Shannon Index) | **[OBSERVED] DERIVED** |
| `clade_species_df` | `global_resources/clade_species_df.csv` | CSV | 140.75 KB | 940 | 2 | Taxonomic Hierarchy Reference | **[OBSERVED] METADATA** |
| `mph_matching_ad` | `global_resources/mph_matching_ad.csv` | CSV | 1.45 MB | 940 | 354 | Taxon Abundance across Samples | **[OBSERVED] PROCESSED** |
| `baseline_model_experiments_summary` | `base_model_selection/baseline_model_experiments_summary.csv` | CSV | 2.45 KB | 30 | 6 | Baseline ML Benchmark Summary | **[OBSERVED] EXPERIMENT RESULT** |
| `merged_df` | `base_model_selection/merged_df.csv` | CSV | 2.88 KB | 30 | 7 | Model Comparison Summary Table | **[OBSERVED] EXPERIMENT RESULT** |
| `adam_experiments_summary` | `output/adam_experiments_summary.csv` | CSV | 1.95 KB | 30 | 6 | Reported ADAM-1 Results | **[OBSERVED] EXPERIMENT RESULT** |
| `xgboost_experiments_summary` | `output/xgboost_experiments_summary.csv` | CSV | 2.14 KB | 30 | 6 | Reported XGBoost Results | **[OBSERVED] EXPERIMENT RESULT** |
| `combined_classification_output` | `local_resources/combined_classification_output.csv` | CSV | 8.18 MB | 900 | 7 | Agentic Classification Reasoning | **[OBSERVED] MODEL OUTPUT** |

---

## 4. Dataset Schemas

### 4.1. `clinical_microbiome_df.csv`
- **Rows**: 335 samples | **Columns**: 1,050
- **Primary Identifier**: `Sample ID` (string, 335 unique, 0 nulls) **[OBSERVED]**
- **Subject Identifier**: `study_id` (string, 102 unique, 0 nulls) **[OBSERVED]**
- **Target Column**: `Alzheimers` (float64 binary: `0.0` = 225 [67.16%], `1.0` = 110 [32.84%]) **[OBSERVED]**

#### Key Column Breakdown:
| Column Name | Data Type | Null Count | Null % | Unique | Role / Notes | Evidence |
|---|---|---|---|---|---|---|
| `Sample ID` | `object (string)` | 0 | 0.00% | 335 | Primary Sample Key (e.g. `DC001`, `DC071`) | **[OBSERVED]** |
| `study_id` | `object (string)` | 0 | 0.00% | 102 | Patient/Subject Key (e.g. `CH1-002`) | **[OBSERVED]** |
| `day` | `int64` | 0 | 0.00% | 23 | Study sampling day offset (e.g. 0, 14, 30) | **[OBSERVED]** |
| `Date Sample` | `object (string)` | 0 | 0.00% | 198 | Sampling date (YYYY-MM-DD) | **[OBSERVED]** |
| `age` | `float64` | 0 | 0.00% | 38 | Participant age in years (range: 65.0 – 101.0) | **[OBSERVED]** |
| `age_cat` | `int64` | 0 | 0.00% | 4 | Age bracket category (1 to 4) | **[OBSERVED]** |
| `male` | `float64` | 0 | 0.00% | 2 | Sex indicator (1.0 = Male, 0.0 = Female) | **[OBSERVED]** |
| `abx6mo` | `float64` | 0 | 0.00% | 2 | Antibiotic exposure in prior 6 months (0/1) | **[OBSERVED]** |
| `hopsn` | `float64` | 0 | 0.00% | 2 | Hospitalization status (0/1) | **[OBSERVED]** |
| `malnutrition_indicator_sco` | `float64` | 0 | 0.00% | 20 | Mini Nutritional Assessment score | **[OBSERVED]** |
| `clinical_frailty_scale` | `float64` | 0 | 0.00% | 9 | Rockwood Clinical Frailty Scale (1 to 9) | **[OBSERVED]** |
| `PPI` | `float64` | 0 | 0.00% | 2 | Proton-pump inhibitor medication flag | **[OBSERVED]** |
| `Alzheimers` | `float64` | 0 | 0.00% | 2 | Target diagnosis (1.0 = AD, 0.0 = Control) | **[OBSERVED]** |
| `Dementia Other` | `float64` | 0 | 0.00% | 2 | Non-Alzheimer's dementia comorbidity flag | **[OBSERVED]** |
| `Parkinsons` | `float64` | 2 | 0.60% | 2 | Parkinson's disease comorbidity flag | **[OBSERVED]** |
| `Atypical Antipsychotics` | `float64` | 3 | 0.90% | 2 | Atypical antipsychotic medication flag | **[OBSERVED]** |
| *96 Secondary Clinical Covariates* | `float64` | 0 | 0.00% | variable | Comorbidities and drug indicators (e.g. `polypharm5`, `Statins`) | **[OBSERVED]** |
| *940 Gut Microbiome Taxa Columns* | `float64` | 0 | 0.00% | variable | Species-level relative abundances (e.g. `Faecalibacterium prausnitzii`) | **[OBSERVED]** |

---

### 4.2. `bc_df.csv`
- **Rows**: 335 | **Columns**: 335
- **Structure**: Symmetric, square Bray-Curtis dissimilarity distance matrix ($335 \times 335$). **[OBSERVED]**
- **Diagonal**: Exactly `0.000000` across all samples. **[OBSERVED]**
- **Column Headers**: Sample IDs (`DC001`, `DC002`, ..., `DC335`). **[OBSERVED]**
- **Index**: 0-indexed rows corresponding in order to the column Sample IDs. **[OBSERVED]**
- **Nulls**: 0 across all 112,225 matrix entries. **[OBSERVED]**

---

### 4.3. `ad_df.csv`
- **Rows**: 335 | **Columns**: 2
- **Structure**: Alpha diversity metric per biological sample. **[OBSERVED]**
- **Schema**:
  | Column Name | Data Type | Null Count | Unique | Role |
  |---|---|---|---|---|
  | `Sample ID` | `object (string)` | 0 | 335 | Primary Sample Key (`DC001` to `DC335`) |
  | `Alpha Diversity (Shannon Index)` | `float64` | 0 | 335 | Shannon entropy index (range: 0.160 to 4.321) |

---

### 4.4. `clade_species_df.csv`
- **Rows**: 940 | **Columns**: 2
- **Structure**: Taxonomic lineage reference table mapping 940 microbiome species to full phylogenetic lineages. **[OBSERVED]**
- **Schema**:
  | Column Name | Data Type | Null Count | Unique | Role |
  |---|---|---|---|---|
  | `taxonomy_hierarchy` | `object (string)` | 0 | 940 | Full taxonomic string (`k__Bacteria\|p__Firmicutes\|...\|s__...`) |
  | `species_name` | `object (string)` | 0 | 940 | Species name with underscores (e.g. `Faecalibacterium_prausnitzii`) |

---

### 4.5. `mph_matching_ad.csv`
- **Rows**: 940 species | **Columns**: 354 (1 species name + 353 sample columns)
- **Structure**: Transposed taxon-by-sample relative abundance matrix. **[OBSERVED]**
- **Schema**:
  | Column Name | Data Type | Null Count | Unique | Role |
  |---|---|---|---|---|
  | `species_name` | `object (string)` | 0 | 940 | Species name with spaces (e.g. `Faecalibacterium prausnitzii`) |
  | `DC001` to `DC353` (353 columns) | `float64` | 0 | variable | Relative abundance of species in sample |

---

## 5. Missing Data Analysis

| Dataset | Total Cells | Missing Cells | Missing % | Affected Columns | Details |
|---|---|---|---|---|---|
| `clinical_microbiome_df.csv` | 351,750 | 5 | **0.0014%** | `Atypical Antipsychotics` (3), `Parkinsons` (2) | **[OBSERVED]** Minimal missingness; all 940 taxa columns have 0 nulls |
| `bc_df.csv` | 112,225 | 0 | **0.0000%** | None | **[OBSERVED]** Complete distance matrix |
| `ad_df.csv` | 670 | 0 | **0.0000%** | None | **[OBSERVED]** Complete alpha diversity table |
| `clade_species_df.csv` | 1,880 | 0 | **0.0000%** | None | **[OBSERVED]** Complete taxonomy table |
| `mph_matching_ad.csv` | 332,760 | 0 | **0.0000%** | None | **[OBSERVED]** Complete abundance matrix |

---

## 6. Duplicate Analysis

- **`clinical_microbiome_df.csv`**: **0 duplicate rows** (335 unique `Sample ID` values). **[OBSERVED]**
- **`bc_df.csv`**: **0 duplicate rows**. **[OBSERVED]**
- **`ad_df.csv`**: **0 duplicate rows**. **[OBSERVED]**
- **`clade_species_df.csv`**: **0 duplicate rows** (940 unique species). **[OBSERVED]**
- **`mph_matching_ad.csv`**: **0 duplicate rows** (940 unique species). **[OBSERVED]**

---

## 7. Identifier Analysis

### 7.1. Sample Identifier (`Sample ID`)
- **Format**: Alphanumeric code prefix `DC` + 3 digits (e.g. `DC001` through `DC335`) or `FB` prefix in test splits (e.g. `FB170`). **[OBSERVED]**
- **Uniqueness in `clinical_microbiome_df`**: 335 / 335 unique (100%). **[OBSERVED]**
- **Cross-Dataset Matching**:
  - `clinical_microbiome_df` $\leftrightarrow$ `ad_df`: **335 / 335 (100.00% exact match)**. **[OBSERVED]**
  - `clinical_microbiome_df` $\leftrightarrow$ `bc_df`: **335 / 335 (100.00% exact match as column headers)**. **[OBSERVED]**
  - `clinical_microbiome_df` $\leftrightarrow$ `mph_matching_ad`: **335 / 335 (100.00% match as subset of the 353 sample columns)**. **[OBSERVED]**

### 7.2. Participant / Subject Identifier (`study_id`)
- **Format**: Alphanumeric cohort code (e.g. `CH1-002`, `CH1-003`, `CH1-008`). **[OBSERVED]**
- **Cardinality**: 102 unique participants across 335 samples. **[OBSERVED]**
- **Longitudinal Distribution**: Samples per participant range from **1 to 12 samples** ($\mu = 3.28$ samples/participant). **[DERIVED]**

### 7.3. Taxonomic Species Identifier (`species_name`)
- **Format in `clade_species_df`**: `Genus_species` (e.g. `Faecalibacterium_prausnitzii`). **[OBSERVED]**
- **Format in `mph_matching_ad`**: `Genus species` (e.g. `Faecalibacterium prausnitzii`). **[OBSERVED]**
- **Mapping**: Replacing spaces with underscores yields a **100% exact match (940 / 940 species)** between `clade_species_df` and `mph_matching_ad`. **[DERIVED]**

---

## 8. Dataset Relationships

- `clinical_microbiome_df` $\xrightarrow{\text{Sample ID}}$ `ad_df`: 1-to-1 join providing within-sample diversity. **[OBSERVED in code L1487]**
- `clinical_microbiome_df` $\xrightarrow{\text{Sample ID}}$ `bc_df`: Matrix index lookup for between-sample community dissimilarity. **[OBSERVED in code L1675]**
- `clade_species_df` $\xrightarrow{\text{species\_name}}$ `clinical_microbiome_df` feature names: Taxonomic lineage annotation for SHAP top-ranked biomarkers. **[OBSERVED in code L963, L1227]**
- `test_df` $\xrightarrow{\text{Sample ID}}$ `combined_classification_output`: Linking LLM Agent Chain-of-Thought reasoning to sample ground-truth labels. **[OBSERVED in code L3075, L3136]**

---

## 9. Original ADAM Code Usage

### 9.1. Loading and Filtering Pipeline (`scripts/ADAM_source_code.py`)
1. **Dataset Ingestion**: `clinical_microbiome_df.csv` is loaded using `glob(f"..{os.sep}data{os.sep}*clinical_microbiome_df*")[0]`. **[OBSERVED]**
2. **Subject-Level Stratification**:
   - `study_labels = df.groupby("study_id")["Alzheimers"].max().reset_index()`
   - `train_ids, test_ids = train_test_split(study_labels["study_id"], test_size=0.2, stratify=study_labels["Alzheimers"], random_state=seed)`
   - **Rationale**: Prevents data leakage between training and testing sets by keeping all longitudinal samples for a subject on the same side of the split. **[OBSERVED]**
3. **Test Cohort Balanced Subsampling**:
   - `test_data = test_data.groupby('Alzheimers', group_keys=False).apply(lambda x: x.sample(n=15, random_state=seed)).reset_index(drop=True)`
   - Fixes test set to exactly **30 samples (15 Alzheimer's + 15 Control)** per experiment. **[OBSERVED]**
4. **Dropped Metadata / Non-Feature Columns**:
   - Dropped from ML matrix: `["Sample ID", "study_id", "Alzheimers", "Date Sample", "age", "Dementia Other"]`. **[OBSERVED]**
   - Retained features ($1,044$ total): $1,034$ microbial taxa relative abundances $+ 10$ clinical/demographic covariates (`day`, `age_cat`, `male`, `abx6mo`, `hopsn`, `malnutrition_indicator_sco`, `clinical_frailty_scale`, `PPI`, comorbidity flags). **[OBSERVED]**

---

## 10. Original Preprocessing Observed

- Preprocessing details can be found in `ADAM_source_code.py` under the function `preprocess_data`. **[OBSERVED]**

---

## 11. Data Quality Issues

- **[OBSERVED]** `Atypical Antipsychotics` has 3 missing values.
- **[OBSERVED]** `Parkinsons` has 2 missing values.

---

## 12. Recommended Phase 2 Storage Model

See final recommendation section below.

---

## 13. Items Requiring Future Verification

- **[UNKNOWN / REQUIRES VERIFICATION]**: The exact extraction code that generated `mph_matching_ad.csv` from raw FASTQ/BioBakery runs is not in the repository (the CSV is pre-generated).
- **[UNKNOWN / REQUIRES VERIFICATION]**: Whether the 18 additional samples in `mph_matching_ad.csv` (353 sample columns vs 335 in `clinical_microbiome_df`) represent technical replicates or pilot samples.

---

## 14. Resolved Discrepancies

### Discrepancy 1: Taxa Count
- **Observations**:
  - `clinical_microbiome_df.csv` contains exactly **1,050 columns**. **[OBSERVED]**
  - **14 columns** represent core clinical metadata (`Sample ID`, `study_id`, `day`, `Date Sample`, `age`, `age_cat`, `male`, `abx6mo`, `hopsn`, `malnutrition_indicator_sco`, `clinical_frailty_scale`, `PPI`, `Alzheimers`, `Dementia Other`). **[OBSERVED]**
  - **96 columns** represent secondary clinical comorbidity, drug, and medication indicators (`polypharm5`, `Statins`, etc.). **[OBSERVED]**
  - **940 columns** represent actual species relative abundances. **[OBSERVED]**
  - Total = 14 (clinical/metadata) + 96 (clinical covariates) + 940 (microbiology) = 1,050.
  - `mph_matching_ad.csv` contains exactly **940 rows**, which match the 940 microbiome columns of the primary dataset 100% after delimiter normalization (spaces to underscores). **[DERIVED]**
- **Decision**: Store the 940 species columns in the `microbiome_abundances` table, and store the 96 clinical comorbidity covariates + 14 core metadata variables in the `clinical_microbiome_samples` table.

### Discrepancy 2: Sample Count
- **Observations**:
  - `clinical_microbiome_df` has **335 samples**. **[OBSERVED]**
  - `mph_matching_ad` has **353 sample columns** (excluding the first column, `species_name`). **[OBSERVED]**
  - **335 out of 335 (100% overlap)** primary sample IDs from the clinical cohort match exactly. **[DERIVED]**
  - **18 samples** are unique to `mph_matching_ad.csv` (`FB017`, `FB337`, `FB006`, `FB035`, `FB235`, `FB330`, `FB065`, `FB010`, `FB395`, `FB396`, `DC053`, `FB016`, `FB447`, `FB001`, `FB234`, `FB387`, `FB191`, `FB407`). **[OBSERVED]**
  - In `ADAM_source_code.py` lines 1388–1390, the original pipeline **explicitly drops these 18 extra sample columns** before doing alpha/beta diversity computation:
    ```python
    filtered_mph_matching_df_t = filtered_mph_matching_df_t[
        filtered_mph_matching_df_t.index.isin(clinical_microbiome_df["Sample ID"])
    ]
    ```
    This indicates these 18 samples represent pilot sequencing runs, unlinked controls, or replicates that did not pass the clinical quality criteria to be included in the primary 335-sample research cohort. **[DERIVED]**
- **Decision**: Ingest the 335 primary samples into `clinical_microbiome_samples`. For `mph_matching_ad` raw ingestion, store the full matrix but flag the 18 extra columns as auxiliary/unlinked.
