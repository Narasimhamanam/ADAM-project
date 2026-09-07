"""
Phase 2 Datasets Router
=======================
Full CRUD-lite and query endpoints for the Phase 2 dataset explorer.

Endpoints:
  GET /api/datasets                       — paginated dataset registry
  GET /api/datasets/{dataset_id}          — single dataset metadata
  GET /api/datasets/{dataset_id}/columns  — data dictionary (paginated)
  GET /api/datasets/{dataset_id}/validation — validation history
  GET /api/samples                        — paginated clinical samples
  GET /api/samples/{sample_id}            — single sample detail
  GET /api/species                        — paginated taxonomy list
  GET /api/alpha-diversity                — paginated Shannon index values
  POST /api/ingest                        — trigger ingestion pipeline (admin)
"""
from __future__ import annotations

import uuid
import numpy as np
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    Dataset,
    DatasetColumn,
    DatasetValidation,
    ClinicalMicrobiomeSample,
    MicrobiomeSpecies,
    AlphaDiversityMetric,
)
from app.schemas.dataset import (
    DatasetListResponse,
    DatasetResponse,
    ColumnListResponse,
    ColumnResponse,
    ValidationListResponse,
    ValidationResponse,
    SampleListResponse,
    SampleResponse,
    SpeciesListResponse,
    SpeciesResponse,
    AlphaDiversityListResponse,
    AlphaDiversityResponse,
    IngestionResponse,
)

router = APIRouter(tags=["datasets"])


# ── Dataset Registry ─────────────────────────────────────────────────────────

@router.get(
    "/datasets",
    response_model=DatasetListResponse,
    summary="List all registered datasets",
)
async def list_datasets(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    db: AsyncSession = Depends(get_db),
) -> DatasetListResponse:
    """Return paginated dataset registry metadata."""
    count_result = await db.execute(select(func.count(Dataset.id)))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Dataset).order_by(Dataset.created_at).offset(offset).limit(page_size)
    )
    datasets = result.scalars().all()

    return DatasetListResponse(
        total=total,
        page=page,
        page_size=page_size,
        datasets=[DatasetResponse.model_validate(d) for d in datasets],
    )


@router.get(
    "/datasets/{dataset_id}",
    response_model=DatasetResponse,
    summary="Get a single dataset",
)
async def get_dataset(
    dataset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> DatasetResponse:
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return DatasetResponse.model_validate(dataset)


@router.get(
    "/datasets/{dataset_id}/columns",
    response_model=ColumnListResponse,
    summary="Get data dictionary (column metadata) for a dataset",
)
async def get_dataset_columns(
    dataset_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    search: Optional[str] = Query(None, description="Filter columns by name"),
    db: AsyncSession = Depends(get_db),
) -> ColumnListResponse:
    q = select(DatasetColumn).where(DatasetColumn.dataset_id == dataset_id)
    if search:
        q = q.where(DatasetColumn.name.ilike(f"%{search}%"))

    count_result = await db.execute(
        select(func.count(DatasetColumn.id)).where(DatasetColumn.dataset_id == dataset_id)
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(q.order_by(DatasetColumn.name).offset(offset).limit(page_size))
    columns = result.scalars().all()

    return ColumnListResponse(
        dataset_id=dataset_id,
        total=total,
        page=page,
        page_size=page_size,
        columns=[ColumnResponse.model_validate(c) for c in columns],
    )


@router.get(
    "/datasets/{dataset_id}/validation",
    response_model=ValidationListResponse,
    summary="Get validation history for a dataset",
)
async def get_dataset_validation(
    dataset_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ValidationListResponse:
    result = await db.execute(
        select(DatasetValidation)
        .where(DatasetValidation.dataset_id == dataset_id)
        .order_by(DatasetValidation.run_timestamp.desc())
        .limit(20)
    )
    validations = result.scalars().all()

    count_result = await db.execute(
        select(func.count(DatasetValidation.id)).where(DatasetValidation.dataset_id == dataset_id)
    )
    total = count_result.scalar_one()

    return ValidationListResponse(
        dataset_id=dataset_id,
        total=total,
        validations=[ValidationResponse.model_validate(v) for v in validations],
    )


# ── Samples ──────────────────────────────────────────────────────────────────

@router.get(
    "/samples",
    response_model=SampleListResponse,
    summary="List clinical microbiome samples (validated 335-sample cohort)",
)
async def list_samples(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    study_id: Optional[str] = Query(None, description="Filter by study_id"),
    alzheimers: Optional[float] = Query(None, description="Filter by Alzheimers label (0.0 or 1.0)"),
    search: Optional[str] = Query(None, description="Search by sample_id prefix"),
    db: AsyncSession = Depends(get_db),
) -> SampleListResponse:
    q = select(ClinicalMicrobiomeSample)
    if study_id:
        q = q.where(ClinicalMicrobiomeSample.study_id == study_id)
    if alzheimers is not None:
        q = q.where(ClinicalMicrobiomeSample.alzheimers == alzheimers)
    if search:
        q = q.where(ClinicalMicrobiomeSample.sample_id.ilike(f"{search}%"))

    count_q = select(func.count(ClinicalMicrobiomeSample.sample_id))
    if study_id:
        count_q = count_q.where(ClinicalMicrobiomeSample.study_id == study_id)
    if alzheimers is not None:
        count_q = count_q.where(ClinicalMicrobiomeSample.alzheimers == alzheimers)
    if search:
        count_q = count_q.where(ClinicalMicrobiomeSample.sample_id.ilike(f"{search}%"))

    count_result = await db.execute(count_q)
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        q.order_by(ClinicalMicrobiomeSample.sample_id).offset(offset).limit(page_size)
    )
    samples = result.scalars().all()

    return SampleListResponse(
        total=total,
        page=page,
        page_size=page_size,
        samples=[SampleResponse.model_validate(s) for s in samples],
    )


@router.get(
    "/samples/{sample_id}",
    response_model=SampleResponse,
    summary="Get a single clinical sample",
)
async def get_sample(
    sample_id: str,
    db: AsyncSession = Depends(get_db),
) -> SampleResponse:
    clean_id = sample_id.strip().upper()
    try:
        result = await db.execute(
            select(ClinicalMicrobiomeSample).where(ClinicalMicrobiomeSample.sample_id == clean_id)
        )
        sample = result.scalar_one_or_none()
        if sample:
            return SampleResponse.model_validate(sample)
    except Exception:
        pass

    # Read verified real research dataframe directly
    from app.ml.data_loader import load_dataset_df
    import pandas as pd
    df = load_dataset_df()
    matching = df[df["Sample ID"] == clean_id]
    if matching.empty:
        raise HTTPException(status_code=404, detail=f"Sample '{clean_id}' not found in cohort")

    row = matching.iloc[0]

    # Extract notable species abundance values from raw columns
    secondary: dict = {}
    for taxon in ["Phocaeicola dorei", "Neglecta timonensis", "Eubacterium rectale", "Faecalibacterium prausnitzii", "Roseburia faecis"]:
        val = row.get(taxon)
        if val is not None and not pd.isna(val):
            secondary[taxon] = float(val)

    # Compute Shannon diversity if relative abundances exist
    taxa_cols = [c for c in df.columns if c not in ["Sample ID", "study_id", "day", "age", "age_cat", "male", "abx6mo", "hopsn", "malnutrition_indicator_sco", "clinical_frailty_scale", "ppi", "Alzheimers", "dementia_other"]]
    if taxa_cols:
        vals = pd.to_numeric(row[taxa_cols], errors="coerce").fillna(0.0).values
        pos_vals = vals[vals > 0]
        if len(pos_vals) > 0:
            total = np.sum(pos_vals)
            if total > 0:
                p = pos_vals / total
                secondary["shannon_diversity"] = float(-np.sum(p * np.log(p)))

    return SampleResponse(
        sample_id=clean_id,
        study_id=str(row.get("study_id", clean_id)),
        day=int(row.get("day", 0)) if not pd.isna(row.get("day", 0)) else 0,
        age=float(row.get("age", 75.0)) if not pd.isna(row.get("age", 75.0)) else 75.0,
        age_cat=int(row.get("age_cat", 1)) if not pd.isna(row.get("age_cat", 1)) else 1,
        male=float(row.get("male", 0.0)) if not pd.isna(row.get("male", 0.0)) else 0.0,
        abx6mo=float(row.get("abx6mo", 0.0)) if not pd.isna(row.get("abx6mo", 0.0)) else 0.0,
        hopsn=float(row.get("hopsn", 0.0)) if not pd.isna(row.get("hopsn", 0.0)) else 0.0,
        malnutrition_indicator_sco=float(row.get("malnutrition_indicator_sco", 0.0)) if not pd.isna(row.get("malnutrition_indicator_sco", 0.0)) else 0.0,
        clinical_frailty_scale=float(row.get("clinical_frailty_scale", 1.0)) if not pd.isna(row.get("clinical_frailty_scale", 1.0)) else 1.0,
        ppi=float(row.get("ppi", 0.0)) if not pd.isna(row.get("ppi", 0.0)) else 0.0,
        alzheimers=float(row.get("Alzheimers", 0.0)) if not pd.isna(row.get("Alzheimers", 0.0)) else 0.0,
        dementia_other=float(row.get("dementia_other", 0.0)) if not pd.isna(row.get("dementia_other", 0.0)) else 0.0,
        secondary_covariates=secondary,
    )


# ── Species ───────────────────────────────────────────────────────────────────

@router.get(
    "/species",
    response_model=SpeciesListResponse,
    summary="List microbiome species taxonomy (940 validated species)",
)
async def list_species(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Search by species name"),
    db: AsyncSession = Depends(get_db),
) -> SpeciesListResponse:
    q = select(MicrobiomeSpecies)
    count_q = select(func.count(MicrobiomeSpecies.species_id))
    if search:
        q = q.where(MicrobiomeSpecies.species_name.ilike(f"%{search}%"))
        count_q = count_q.where(MicrobiomeSpecies.species_name.ilike(f"%{search}%"))

    count_result = await db.execute(count_q)
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        q.order_by(MicrobiomeSpecies.species_name).offset(offset).limit(page_size)
    )
    species_list = result.scalars().all()

    return SpeciesListResponse(
        total=total,
        page=page,
        page_size=page_size,
        species=[SpeciesResponse.model_validate(s) for s in species_list],
    )


# ── Alpha Diversity ────────────────────────────────────────────────────────────

@router.get(
    "/alpha-diversity",
    response_model=AlphaDiversityListResponse,
    summary="List Shannon alpha diversity metrics",
)
async def list_alpha_diversity(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
) -> AlphaDiversityListResponse:
    count_result = await db.execute(select(func.count(AlphaDiversityMetric.sample_id)))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(AlphaDiversityMetric)
        .order_by(AlphaDiversityMetric.sample_id)
        .offset(offset)
        .limit(page_size)
    )
    metrics = result.scalars().all()

    return AlphaDiversityListResponse(
        total=total,
        page=page,
        page_size=page_size,
        metrics=[AlphaDiversityResponse.model_validate(m) for m in metrics],
    )


# ── Ingestion Trigger ─────────────────────────────────────────────────────────

@router.post(
    "/ingest",
    response_model=IngestionResponse,
    summary="Trigger dataset ingestion pipeline",
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_ingestion(
    db: AsyncSession = Depends(get_db),
) -> IngestionResponse:
    """Runs the full ingestion pipeline (idempotent). Suitable for admin use."""
    from app.ingestion.pipeline import execute_ingestion_pipeline
    started = datetime.now(timezone.utc)
    results = await execute_ingestion_pipeline(db)
    return IngestionResponse(
        started_at=started,
        results=results,
        message="Ingestion pipeline completed",
    )
