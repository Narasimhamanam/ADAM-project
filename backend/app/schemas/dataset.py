"""
Phase 2 Pydantic Schemas
========================
Request/response schemas for all Phase 2 API endpoints:
  - Dataset registry
  - Dataset columns (data dictionary)
  - Dataset validations
  - Clinical samples (with pagination)
  - Species / taxonomy
  - Alpha diversity metrics
  - Ingestion control
"""
from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import Optional, Any

from pydantic import BaseModel, ConfigDict


# ── Dataset Registry ────────────────────────────────────────────────────────

class DatasetBase(BaseModel):
    name: str
    description: Optional[str] = None
    source_file: Optional[str] = None
    dataset_type: str = "clinical_microbiome"
    rows: Optional[int] = None
    columns: Optional[int] = None
    size_bytes: Optional[int] = None
    status: str = "DISCOVERED"
    checksum: Optional[str] = None


class DatasetCreate(DatasetBase):
    pass


class DatasetResponse(DatasetBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class DatasetListResponse(BaseModel):
    total: int
    page: int = 1
    page_size: int = 50
    datasets: list[DatasetResponse]


# ── Dataset Columns (Data Dictionary) ───────────────────────────────────────

class ColumnResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    dataset_id: uuid.UUID
    name: str
    datatype: str
    null_count: int
    unique_count: int
    classification: str
    is_derived: bool
    created_at: datetime


class ColumnListResponse(BaseModel):
    dataset_id: uuid.UUID
    total: int
    page: int
    page_size: int
    columns: list[ColumnResponse]


# ── Dataset Validations ──────────────────────────────────────────────────────

class ValidationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    dataset_id: uuid.UUID
    run_timestamp: datetime
    status: str
    checks_passed: bool
    error_log: Optional[str] = None
    metrics_json: Optional[dict[str, Any]] = None


class ValidationListResponse(BaseModel):
    dataset_id: uuid.UUID
    total: int
    validations: list[ValidationResponse]


# ── Clinical Samples ─────────────────────────────────────────────────────────

class SampleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sample_id: str
    study_id: str
    day: int
    date_sample: Optional[date] = None
    age: float
    age_cat: int
    male: float
    abx6mo: float
    hopsn: float
    malnutrition_indicator_sco: float
    clinical_frailty_scale: float
    ppi: float
    alzheimers: float
    dementia_other: float
    secondary_covariates: Optional[dict[str, Any]] = None


class SampleListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    samples: list[SampleResponse]


# ── Species / Taxonomy ────────────────────────────────────────────────────────

class SpeciesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    species_id: uuid.UUID
    species_name: str
    taxonomy_hierarchy: str


class SpeciesListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    species: list[SpeciesResponse]


# ── Alpha Diversity ───────────────────────────────────────────────────────────

class AlphaDiversityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sample_id: str
    shannon_index: float


class AlphaDiversityListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    metrics: list[AlphaDiversityResponse]


# ── Ingestion Control ─────────────────────────────────────────────────────────

class IngestionResponse(BaseModel):
    started_at: datetime
    results: dict[str, str]
    message: str
