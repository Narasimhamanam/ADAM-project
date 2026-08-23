"""
SQLAlchemy Models for ADAM-1 Enhanced
=====================================
Contains the metadata registry (datasets, dataset_columns, dataset_validations)
and the biological domain models (participants, clinical_microbiome_samples,
microbiome_species, microbiome_abundances, alpha_diversity_metrics,
bray_curtis_distances, raw_matching_abundance).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
    Date,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ── METADATA REGISTRY MODELS ───────────────────────────────────────────────

class Dataset(Base):
    """Catalog of registered datasets."""
    __tablename__ = "datasets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_file: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    dataset_type: Mapped[str] = mapped_column(
        String(100), nullable=False, default="clinical_microbiome"
    )
    rows: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    columns: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    size_bytes: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="DISCOVERED"
    )
    checksum: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    column_defs: Mapped[list[DatasetColumn]] = relationship(
        "DatasetColumn", back_populates="dataset", cascade="all, delete-orphan"
    )
    validation_runs: Mapped[list[DatasetValidation]] = relationship(
        "DatasetValidation", back_populates="dataset", cascade="all, delete-orphan"
    )


class DatasetColumn(Base):
    """Metadata dict representing columns of a dataset."""
    __tablename__ = "dataset_columns"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    datatype: Mapped[str] = mapped_column(String(100), nullable=False)
    null_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unique_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    classification: Mapped[str] = mapped_column(
        String(100), nullable=False, default="feature"
    )
    is_derived: Mapped[bool] = mapped_column(nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    dataset: Mapped[Dataset] = relationship("Dataset", back_populates="column_defs")


class DatasetValidation(Base):
    """Validation report summary per dataset ingestion run."""
    __tablename__ = "dataset_validations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
    )
    run_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    checks_passed: Mapped[bool] = mapped_column(nullable=False, default=False)
    error_log: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metrics_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    dataset: Mapped[Dataset] = relationship("Dataset", back_populates="validation_runs")


# ── BIOLOGICAL DOMAIN MODELS ────────────────────────────────────────────────

class Participant(Base):
    """Subject/Participant registry (linked to study_id)."""
    __tablename__ = "participants"

    study_id: Mapped[str] = mapped_column(String(100), primary_key=True)

    samples: Mapped[list[ClinicalMicrobiomeSample]] = relationship(
        "ClinicalMicrobiomeSample", back_populates="participant", cascade="all, delete-orphan"
    )


class ClinicalMicrobiomeSample(Base):
    """Active cohort clinical microbiome sample (335 rows)."""
    __tablename__ = "clinical_microbiome_samples"

    sample_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    study_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("participants.study_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    date_sample: Mapped[Optional[datetime.date]] = mapped_column(Date, nullable=True)
    age: Mapped[float] = mapped_column(Float, nullable=False)
    age_cat: Mapped[int] = mapped_column(Integer, nullable=False)
    male: Mapped[float] = mapped_column(Float, nullable=False)
    abx6mo: Mapped[float] = mapped_column(Float, nullable=False)
    hopsn: Mapped[float] = mapped_column(Float, nullable=False)
    malnutrition_indicator_sco: Mapped[float] = mapped_column(Float, nullable=False)
    clinical_frailty_scale: Mapped[float] = mapped_column(Float, nullable=False)
    ppi: Mapped[float] = mapped_column(Float, nullable=False)
    alzheimers: Mapped[float] = mapped_column(Float, nullable=False)
    dementia_other: Mapped[float] = mapped_column(Float, nullable=False)

    # Secondary clinical comorbidity indicators stored as a queryable JSONB dictionary
    secondary_covariates: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    participant: Mapped[Participant] = relationship("Participant", back_populates="samples")
    alpha_diversity: Mapped[Optional[AlphaDiversityMetric]] = relationship(
        "AlphaDiversityMetric", uselist=False, back_populates="sample", cascade="all, delete-orphan"
    )


class AlphaDiversityMetric(Base):
    """Shannon alpha-diversity per sample."""
    __tablename__ = "alpha_diversity_metrics"

    sample_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("clinical_microbiome_samples.sample_id", ondelete="CASCADE"),
        primary_key=True,
    )
    shannon_index: Mapped[float] = mapped_column(Float, nullable=False)

    sample: Mapped[ClinicalMicrobiomeSample] = relationship("ClinicalMicrobiomeSample", back_populates="alpha_diversity")


class BrayCurtisDistance(Base):
    """Pairwise beta diversity distance between samples."""
    __tablename__ = "bray_curtis_distances"

    sample_id_a: Mapped[str] = mapped_column(
        String(100), ForeignKey("clinical_microbiome_samples.sample_id", ondelete="CASCADE"), primary_key=True
    )
    sample_id_b: Mapped[str] = mapped_column(
        String(100), ForeignKey("clinical_microbiome_samples.sample_id", ondelete="CASCADE"), primary_key=True
    )
    distance: Mapped[float] = mapped_column(Float, nullable=False)


class MicrobiomeSpecies(Base):
    """Microbial reference taxonomy species list."""
    __tablename__ = "microbiome_species"

    species_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    species_name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    taxonomy_hierarchy: Mapped[str] = mapped_column(Text, nullable=False)

    abundances: Mapped[list[MicrobiomeAbundance]] = relationship(
        "MicrobiomeAbundance", back_populates="species", cascade="all, delete-orphan"
    )


class MicrobiomeAbundance(Base):
    """Canonical normalized species abundance values."""
    __tablename__ = "microbiome_abundances"

    sample_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("clinical_microbiome_samples.sample_id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    species_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("microbiome_species.species_id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    relative_abundance: Mapped[float] = mapped_column(Float, nullable=False)

    species: Mapped[MicrobiomeSpecies] = relationship("MicrobiomeSpecies", back_populates="abundances")


class RawMatchingAbundance(Base):
    """Raw landing/abundance representation from mph_matching_ad.csv (940 rows x 353 sample columns)."""
    __tablename__ = "raw_matching_abundance"

    species_name: Mapped[str] = mapped_column(String(255), primary_key=True)
    sample_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    abundance: Mapped[float] = mapped_column(Float, nullable=False)
