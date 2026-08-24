"""
ADAM-1 Dataset Ingestion & Validation Pipeline
=============================================
Reads raw research datasets from original_adam/ADAM/global_resources/,
runs rigorous structure & validation checks, and saves them to PostgreSQL.
"""
from __future__ import annotations

import os
import hashlib
import uuid
import json
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models import (
    Dataset,
    DatasetColumn,
    DatasetValidation,
    Participant,
    ClinicalMicrobiomeSample,
    AlphaDiversityMetric,
    BrayCurtisDistance,
    MicrobiomeSpecies,
    MicrobiomeAbundance,
    RawMatchingAbundance,
)

logger = get_logger(__name__)


def get_global_resources_dir() -> str:
    """Resolve global_resources path across local Windows, relative dev, packaged backend/data, and Docker environments."""
    env_dir = os.environ.get("ORIGINAL_ADAM_DIR")
    if env_dir and os.path.exists(env_dir):
        return env_dir
    # Check backend/data/global_resources (packaged with repo)
    pkg_data = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "data", "global_resources")
    )
    if os.path.exists(pkg_data) and os.path.exists(os.path.join(pkg_data, "clinical_microbiome_df.csv")):
        return pkg_data
    docker_mount = "/original_adam/ADAM/global_resources"
    if os.path.exists(docker_mount):
        return docker_mount
    rel_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "original_adam", "ADAM", "global_resources")
    )
    if os.path.exists(rel_path):
        return rel_path
    return r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources"

DATASET_CONFIGS = {
    "clinical_microbiome_df": {
        "filename": "clinical_microbiome_df.csv",
        "category": "clinical_microbiome",
        "description": "Primary dataset combining clinical variables, demographics, comorbidity flags, medication indicators, and 940 species-level taxa relative abundances.",
        "expected_rows": 335,
        "expected_cols": 1050,
        "primary_id": "Sample ID",
    },
    "bc_df": {
        "filename": "bc_df.csv",
        "category": "microbiome_diversity",
        "description": "Symmetric Bray-Curtis dissimilarity distance matrix between all 335 samples.",
        "expected_rows": 335,
        "expected_cols": 335,
        "primary_id": "Sample ID",  # Treated as a distance matrix index
    },
    "ad_df": {
        "filename": "ad_df.csv",
        "category": "microbiome_diversity",
        "description": " Shannon alpha diversity indices calculated across 335 clinical samples.",
        "expected_rows": 335,
        "expected_cols": 2,
        "primary_id": "Sample ID",
    },
    "clade_species_df": {
        "filename": "clade_species_df.csv",
        "category": "taxonomy",
        "description": "Microbiome taxonomy hierarchy mapping for 940 species.",
        "expected_rows": 940,
        "expected_cols": 2,
        "primary_id": "species_name",
    },
    "mph_matching_ad": {
        "filename": "mph_matching_ad.csv",
        "category": "clinical_microbiome",
        "description": "Transposed species abundance matrix (940 species as rows, 353 sample columns).",
        "expected_rows": 940,
        "expected_cols": 354,
        "primary_id": "species_name",
    },
}


def calculate_sha256(filepath: str) -> str:
    """Calculate the SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


async def register_dataset_metadata(
    db: AsyncSession, key: str, fpath: str, df: pd.DataFrame
) -> Dataset:
    """Idempotently register or fetch dataset metadata records."""
    cfg = DATASET_CONFIGS[key]
    checksum = calculate_sha256(fpath)
    fsize = os.path.getsize(fpath)
    nrows, ncols = df.shape

    # Find existing
    result = await db.execute(select(Dataset).where(Dataset.name == key))
    dataset = result.scalar_one_or_none()

    if not dataset:
        dataset = Dataset(
            name=key,
            description=cfg["description"],
            source_file=f"original_adam/ADAM/global_resources/{cfg['filename']}",
            dataset_type=cfg["category"],
            rows=nrows,
            columns=ncols,
            size_bytes=fsize,
            status="REGISTERED",
            checksum=checksum,
        )
        db.add(dataset)
        await db.flush()
        logger.info("Registered new dataset metadata", dataset_name=key)
    else:
        # Update metadata properties
        dataset.rows = nrows
        dataset.columns = ncols
        dataset.size_bytes = fsize
        dataset.checksum = checksum
        dataset.status = "REGISTERED"
        logger.info("Updated existing dataset metadata", dataset_name=key)

    return dataset


async def ingest_clinical_microbiome(db: AsyncSession, df: pd.DataFrame, dataset_id: uuid.UUID):
    """Ingest clinical_microbiome_df into structured relational tables."""
    logger.info("Ingesting clinical microbiome samples...")

    # Identify core clinical metadata columns (14 core columns)
    core_cols = [
        "Sample ID", "study_id", "day", "Date Sample", "age", "age_cat", 
        "male", "abx6mo", "hopsn", "malnutrition_indicator_sco", 
        "clinical_frailty_scale", "PPI", "Alzheimers", "Dementia Other"
    ]
    
    # 940 taxonomy list from clade_species_df
    taxa_result = await db.execute(select(MicrobiomeSpecies.species_name))
    known_taxa = set(taxa_result.scalars().all())

    # Build maps for species names
    # Spaces in CM columns, spaces or underscores in clade_species
    # Let's map normalized names
    def norm(s):
        return s.replace("_", " ").strip().lower()

    taxa_map = {norm(t): t for t in known_taxa}

    # Identify categories
    all_cols = df.columns.tolist()
    
    # Ingest participants first (participants table study_id PK)
    unique_studies = df["study_id"].dropna().unique()
    for study_id in unique_studies:
        # Upsert participant
        p_res = await db.execute(select(Participant).where(Participant.study_id == study_id))
        if not p_res.scalar_one_or_none():
            db.add(Participant(study_id=study_id))
    await db.flush()

    # Clear previous sample records (cascade delete cascades to abundances & alpha diversity)
    sample_ids = df["Sample ID"].dropna().unique().tolist()
    await db.execute(delete(ClinicalMicrobiomeSample).where(ClinicalMicrobiomeSample.sample_id.in_(sample_ids)))
    await db.flush()

    for _, row in df.iterrows():
        sample_id = str(row["Sample ID"])
        study_id = str(row["study_id"])
        
        # Convert date sample
        date_str = row.get("Date Sample")
        date_sample = None
        if pd.notnull(date_str):
            try:
                date_sample = datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
            except ValueError:
                pass

        # 96 Secondary clinical/covariates list
        secondary_covs = {}
        for col in all_cols:
            if col in core_cols:
                continue
            normalized_col = norm(col)
            if normalized_col in taxa_map:
                continue  # This is a microbiome species feature
            # It's a clinical drug/medication/comorbidity indicator
            val = row[col]
            secondary_covs[col] = float(val) if pd.notnull(val) else 0.0

        # Construct Sample record
        sample = ClinicalMicrobiomeSample(
            sample_id=sample_id,
            study_id=study_id,
            day=int(row["day"]),
            date_sample=date_sample,
            age=float(row["age"]),
            age_cat=int(row["age_cat"]),
            male=float(row["male"]),
            abx6mo=float(row["abx6mo"]),
            hopsn=float(row["hopsn"]),
            malnutrition_indicator_sco=float(row["malnutrition_indicator_sco"]),
            clinical_frailty_scale=float(row["clinical_frailty_scale"]),
            ppi=float(row["PPI"]),
            alzheimers=float(row["Alzheimers"]),
            dementia_other=float(row["Dementia Other"]),
            secondary_covariates=secondary_covs,
        )
        db.add(sample)
    
    await db.flush()
    logger.info("Successfully ingested 335 clinical samples.")


async def ingest_taxonomy(db: AsyncSession, df: pd.DataFrame):
    """Ingest clade_species taxonomy reference data."""
    logger.info("Ingesting taxonomy mappings...")
    for _, row in df.iterrows():
        hierarchy = str(row["taxonomy_hierarchy"])
        raw_name = str(row["species_name"])
        # Normalize species name: underscores to spaces
        normalized_name = raw_name.replace("_", " ").strip()
        
        # Upsert taxonomy reference
        t_res = await db.execute(select(MicrobiomeSpecies).where(MicrobiomeSpecies.species_name == normalized_name))
        species = t_res.scalar_one_or_none()
        if not species:
            species = MicrobiomeSpecies(
                species_name=normalized_name,
                taxonomy_hierarchy=hierarchy
            )
            db.add(species)
        else:
            species.taxonomy_hierarchy = hierarchy
            
    await db.flush()
    logger.info("Successfully ingested 940 taxonomic lineages.")


async def ingest_abundances(db: AsyncSession, df: pd.DataFrame):
    """Normalize and ingest microbiome abundances from clinical_microbiome_df."""
    logger.info("Ingesting species relative abundance links...")

    # Identify which columns represent species
    taxa_result = await db.execute(select(MicrobiomeSpecies))
    species_records = taxa_result.scalars().all()
    
    # Map normalized names to UUIDs
    def norm(s):
        return s.replace("_", " ").strip().lower()
    
    species_map = {norm(sp.species_name): sp.species_id for sp in species_records}

    # Fetch samples list to verify FKEYs
    samples_result = await db.execute(select(ClinicalMicrobiomeSample.sample_id))
    valid_samples = set(samples_result.scalars().all())

    # Bulk insert list
    abundances_to_insert = []
    
    # We clear old records first
    sample_ids = df["Sample ID"].dropna().unique().tolist()
    await db.execute(delete(MicrobiomeAbundance).where(MicrobiomeAbundance.sample_id.in_(sample_ids)))
    await db.flush()

    for _, row in df.iterrows():
        sample_id = str(row["Sample ID"])
        if sample_id not in valid_samples:
            continue
            
        for col in df.columns:
            col_norm = norm(col)
            if col_norm in species_map:
                abundance_val = float(row[col])
                if abundance_val > 0.0:  # Sparse storage optimization
                    abundances_to_insert.append(
                        MicrobiomeAbundance(
                            sample_id=sample_id,
                            species_id=species_map[col_norm],
                            relative_abundance=abundance_val
                        )
                    )

    # Chunk database insertions
    chunk_size = 5000
    for i in range(0, len(abundances_to_insert), chunk_size):
        db.add_all(abundances_to_insert[i : i + chunk_size])
        await db.flush()

    logger.info(f"Successfully ingested {len(abundances_to_insert)} abundance values.")


async def ingest_alpha_diversity(db: AsyncSession, df: pd.DataFrame):
    """Ingest alpha diversity indices."""
    logger.info("Ingesting alpha diversity Shannon metrics...")
    
    # Clear old records
    sample_ids = df["Sample ID"].dropna().unique().tolist()
    await db.execute(delete(AlphaDiversityMetric).where(AlphaDiversityMetric.sample_id.in_(sample_ids)))
    await db.flush()

    for _, row in df.iterrows():
        sample_id = str(row["Sample ID"])
        shannon = float(row["Alpha Diversity (Shannon Index)"])
        
        db.add(AlphaDiversityMetric(sample_id=sample_id, shannon_index=shannon))
        
    await db.flush()
    logger.info("Successfully ingested 335 Shannon index values.")


async def ingest_beta_diversity(db: AsyncSession, df: pd.DataFrame):
    """Ingest Bray-Curtis pairwise distances.
    
    bc_df layout: 335 rows × 335 columns.
    Columns = Sample IDs. Row i corresponds to column i (symmetric matrix).
    We store only the upper-triangle (A < B lexicographically) to avoid redundancy.
    """
    logger.info("Ingesting beta diversity pairwise distances...")

    sample_ids = list(df.columns)  # ['DC001', 'DC002', ...]
    
    # Clear old records
    await db.execute(delete(BrayCurtisDistance).where(
        BrayCurtisDistance.sample_id_a.in_(sample_ids)
    ))
    await db.flush()

    distances_to_insert = []
    for row_idx, sample_id_a in enumerate(sample_ids):
        row = df.iloc[row_idx]
        for col_idx, sample_id_b in enumerate(sample_ids):
            if sample_id_a < sample_id_b:  # upper triangle only
                dist = float(row.iloc[col_idx])
                distances_to_insert.append(
                    BrayCurtisDistance(
                        sample_id_a=sample_id_a,
                        sample_id_b=sample_id_b,
                        distance=dist
                    )
                )

    chunk_size = 5000
    for i in range(0, len(distances_to_insert), chunk_size):
        db.add_all(distances_to_insert[i : i + chunk_size])
        await db.flush()

    logger.info(f"Successfully ingested {len(distances_to_insert)} unique pairwise distances.")


async def ingest_raw_abundances(db: AsyncSession, df: pd.DataFrame):
    """Ingest raw species-by-sample abundances including the 18 unlinked/auxiliary samples."""
    logger.info("Ingesting raw abundance matrix...")
    
    # Clear old records
    await db.execute(delete(RawMatchingAbundance))
    await db.flush()

    raw_inserts = []
    for _, row in df.iterrows():
        species_name = str(row["species_name"])
        for col in df.columns:
            if col == "species_name":
                continue
            abundance_val = float(row[col])
            raw_inserts.append(
                RawMatchingAbundance(
                    species_name=species_name,
                    sample_id=str(col),
                    abundance=abundance_val
                )
            )
            
    chunk_size = 5000
    for i in range(0, len(raw_inserts), chunk_size):
        db.add_all(raw_inserts[i : i + chunk_size])
        await db.flush()
        
    logger.info(f"Successfully ingested {len(raw_inserts)} raw abundances.")


async def create_dataset_columns(db: AsyncSession, dataset_id: uuid.UUID, df: pd.DataFrame, key: str):
    """Build and save column-level data dictionary metadata for dataset explorer."""
    # Delete old column definitions
    await db.execute(delete(DatasetColumn).where(DatasetColumn.dataset_id == dataset_id))
    await db.flush()

    core_cols = [
        "Sample ID", "study_id", "day", "Date Sample", "age", "age_cat", 
        "male", "abx6mo", "hopsn", "malnutrition_indicator_sco", 
        "clinical_frailty_scale", "PPI", "Alzheimers", "Dementia Other"
    ]

    columns_to_add = []
    for col in df.columns:
        s = df[col]
        null_count = int(s.isnull().sum())
        unique_count = int(s.nunique(dropna=True))
        
        # Classification
        classification = "feature"
        if col in core_cols:
            classification = "core_metadata"
        elif col == "Alzheimers":
            classification = "target_label"
        elif key == "clinical_microbiome_df":
            # Is it taxonomy or clinical comorbidity?
            if col not in core_cols:
                # We can check if it represents a bacteria
                # E.g. checks taxonomy names
                classification = "microbiome" if unique_count > 2 or col.count(" ") >= 1 else "clinical_covariate"

        dtype_str = str(s.dtype)
        columns_to_add.append(
            DatasetColumn(
                dataset_id=dataset_id,
                name=col,
                datatype=dtype_str,
                null_count=null_count,
                unique_count=unique_count,
                classification=classification,
                is_derived=False
            )
        )
        
    db.add_all(columns_to_add)
    await db.flush()


async def execute_ingestion_pipeline(db: AsyncSession) -> dict[str, str]:
    """Execute validation and ingestion for all 5 target research files."""
    results = {}
    
    # Ensure tables are created
    from app.database import init_db
    await init_db()

    # DEPENDENCY ORDER: taxonomy must be ingested before clinical samples & abundances
    ordered_keys = ["clade_species_df", "clinical_microbiome_df", "ad_df", "bc_df", "mph_matching_ad"]
    global_res_dir = get_global_resources_dir()

    for key in ordered_keys:
        cfg = DATASET_CONFIGS[key]
        fpath = os.path.join(global_res_dir, cfg["filename"])
        
        # 1. Validation checks
        if not os.path.exists(fpath):
            results[key] = f"FAILED: File {cfg['filename']} not found"
            continue
            
        try:
            df = pd.read_csv(fpath)
            nrows, ncols = df.shape
            
            # Row/col structure check
            if nrows != cfg["expected_rows"] or ncols != cfg["expected_cols"]:
                error_msg = f"Structure mismatch: expected {cfg['expected_rows']}x{cfg['expected_cols']}, got {nrows}x{ncols}"
                results[key] = f"FAILED: {error_msg}"
                # Create validation record
                dataset = await register_dataset_metadata(db, key, fpath, df)
                validation = DatasetValidation(
                    dataset_id=dataset.id,
                    status="FAILED",
                    checks_passed=False,
                    error_log=error_msg,
                    metrics_json={"rows": nrows, "columns": ncols}
                )
                db.add(validation)
                await db.commit()
                continue
                
            # Primary metadata record creation
            dataset = await register_dataset_metadata(db, key, fpath, df)
            dataset.status = "INGESTING"
            await db.flush()

            # Execute specific loaders (Dependency Order: Ingest taxonomy first!)
            if key == "clade_species_df":
                await ingest_taxonomy(db, df)
            elif key == "clinical_microbiome_df":
                # Depend on taxonomy reference
                await ingest_clinical_microbiome(db, df, dataset.id)
                await ingest_abundances(db, df)
            elif key == "ad_df":
                await ingest_alpha_diversity(db, df)
            elif key == "bc_df":
                await ingest_beta_diversity(db, df)
            elif key == "mph_matching_ad":
                await ingest_raw_abundances(db, df)

            # Create data dictionary columns defs
            await create_dataset_columns(db, dataset.id, df, key)

            # Mark successful
            dataset.status = "INGESTED"
            validation = DatasetValidation(
                dataset_id=dataset.id,
                status="VALIDATED",
                checks_passed=True,
                error_log=None,
                metrics_json={
                    "rows": nrows,
                    "columns": ncols,
                    "duplicate_rows": int(df.duplicated().sum()),
                    "total_missing": int(df.isnull().sum().sum()),
                }
            )
            db.add(validation)
            await db.commit()
            results[key] = "INGESTED & VALIDATED"
            logger.info("Successfully completed ingestion pipeline run", dataset_name=key)
            
        except Exception as e:
            await db.rollback()
            logger.error("Ingestion failed", dataset_name=key, error=str(e))
            results[key] = f"FAILED: {str(e)}"
            # Update metadata status
            try:
                res = await db.execute(select(Dataset).where(Dataset.name == key))
                dataset = res.scalar_one_or_none()
                if dataset:
                    dataset.status = "FAILED"
                    validation = DatasetValidation(
                        dataset_id=dataset.id,
                        status="FAILED",
                        checks_passed=False,
                        error_log=str(e),
                    )
                    db.add(validation)
                    await db.commit()
            except Exception:
                pass
                
    return results
