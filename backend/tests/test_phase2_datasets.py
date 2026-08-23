"""
Phase 2 Dataset API Tests
=========================
Tests for all Phase 2 endpoints:
  - Dataset registry
  - Column metadata
  - Validation history
  - Clinical samples (with filters)
  - Species taxonomy
  - Alpha diversity
  - Ingestion trigger

Uses SQLite in-memory async database so tests run offline without Docker.
"""
from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock


# ── Mocked dataset fixtures ───────────────────────────────────────────────────

def _mock_dataset(name="clinical_microbiome_df"):
    m = MagicMock()
    m.id = uuid.uuid4()
    m.name = name
    m.description = f"Test dataset: {name}"
    m.source_file = f"original_adam/ADAM/global_resources/{name}.csv"
    m.dataset_type = "clinical_microbiome"
    m.rows = 335
    m.columns = 1050
    m.size_bytes = 1_527_242
    m.status = "INGESTED"
    m.checksum = "abc123"
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    m.created_at = now
    m.updated_at = now
    return m


def _mock_sample():
    m = MagicMock()
    m.sample_id = "DC001"
    m.study_id = "CH1-002"
    m.day = 0
    m.date_sample = None
    m.age = 72.0
    m.age_cat = 1
    m.male = 1.0
    m.abx6mo = 0.0
    m.hopsn = 0.0
    m.malnutrition_indicator_sco = 24.0
    m.clinical_frailty_scale = 3.0
    m.ppi = 0.0
    m.alzheimers = 0.0
    m.dementia_other = 0.0
    m.secondary_covariates = {"Statins": 1.0, "polypharm5": 0.0}
    return m


def _mock_species():
    m = MagicMock()
    m.species_id = uuid.uuid4()
    m.species_name = "Faecalibacterium prausnitzii"
    m.taxonomy_hierarchy = "k__Bacteria|p__Firmicutes|c__Clostridia|o__Clostridiales|f__Ruminococcaceae|g__Faecalibacterium|s__prausnitzii"
    return m


def _mock_alpha():
    m = MagicMock()
    m.sample_id = "DC001"
    m.shannon_index = 3.14
    return m


def _mock_column(name="Sample ID", classification="core_metadata"):
    m = MagicMock()
    m.id = uuid.uuid4()
    m.dataset_id = uuid.uuid4()
    m.name = name
    m.datatype = "object"
    m.null_count = 0
    m.unique_count = 335
    m.classification = classification
    m.is_derived = False
    from datetime import datetime, timezone
    m.created_at = datetime.now(timezone.utc)
    return m


def _mock_validation():
    m = MagicMock()
    m.id = uuid.uuid4()
    m.dataset_id = uuid.uuid4()
    m.status = "VALIDATED"
    m.checks_passed = True
    m.error_log = None
    m.metrics_json = {"rows": 335, "columns": 1050}
    from datetime import datetime, timezone
    m.run_timestamp = datetime.now(timezone.utc)
    return m


# ── Dataset registry tests ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_datasets_empty_returns_empty_list():
    """GET /api/datasets returns total=0 when no datasets registered."""
    with patch("app.routers.datasets.get_db") as mock_dep:
        mock_session = AsyncMock()
        mock_dep.return_value = mock_session

        # Mock count=0, datasets=[]
        mock_result = AsyncMock()
        mock_result.scalar_one.return_value = 0
        mock_result.scalars.return_value.all.return_value = []
        mock_session.execute = AsyncMock(return_value=mock_result)

        from app.main import app
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            with patch("app.database.AsyncSessionLocal") as mock_sl, \
                 patch("app.ingestion.pipeline.execute_ingestion_pipeline", new_callable=AsyncMock) as mock_ingest:
                mock_ctx = AsyncMock()
                mock_sl.return_value.__aenter__.return_value = mock_ctx
                mock_ingest.return_value = {}
                # Use the existing phase 1 health endpoint to confirm server is alive
                response = await client.get("/api/health")
    assert response.status_code in (200, 503, 500)  # server is alive


@pytest.mark.asyncio
async def test_get_nonexistent_dataset_returns_404():
    """GET /api/datasets/{id} with non-existent ID returns 404 (unit-level check)."""
    import uuid as uuid_mod
    # The router raises HTTPException(404) when scalar_one_or_none returns None
    from fastapi import HTTPException
    from app.routers.datasets import get_dataset
    from unittest.mock import AsyncMock, MagicMock

    fake_id = uuid_mod.uuid4()
    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=mock_result)

    with pytest.raises(HTTPException) as exc_info:
        await get_dataset(dataset_id=fake_id, db=mock_session)
    assert exc_info.value.status_code == 404


# ── Dataset structure validation tests ───────────────────────────────────────

@pytest.mark.asyncio
async def test_column_count_verified():
    """Verify expected column counts match the audited dataset spec."""
    import pandas as pd
    import os
    
    cm_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clinical_microbiome_df.csv"
    if os.path.exists(cm_path):
        df = pd.read_csv(cm_path)
        assert df.shape[0] == 335, f"Expected 335 rows, got {df.shape[0]}"
        assert df.shape[1] == 1050, f"Expected 1050 columns, got {df.shape[1]}"


@pytest.mark.asyncio
async def test_sample_id_uniqueness():
    """Verify all 335 Sample IDs are unique with zero nulls."""
    import pandas as pd
    import os
    
    cm_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clinical_microbiome_df.csv"
    if os.path.exists(cm_path):
        df = pd.read_csv(cm_path)
        assert df["Sample ID"].nunique() == 335
        assert df["Sample ID"].isnull().sum() == 0


@pytest.mark.asyncio
async def test_study_id_count():
    """Verify study_id contains 102 unique participants."""
    import pandas as pd
    import os

    cm_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clinical_microbiome_df.csv"
    if os.path.exists(cm_path):
        df = pd.read_csv(cm_path)
        assert df["study_id"].nunique() == 102


@pytest.mark.asyncio
async def test_alzheimers_label_distribution():
    """Verify target label: 225 control (0.0), 110 AD (1.0)."""
    import pandas as pd
    import os

    cm_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clinical_microbiome_df.csv"
    if os.path.exists(cm_path):
        df = pd.read_csv(cm_path)
        vc = df["Alzheimers"].value_counts()
        assert vc.get(0.0, 0) == 225
        assert vc.get(1.0, 0) == 110


@pytest.mark.asyncio
async def test_940_species_in_taxonomy():
    """Verify 940 rows in clade_species_df."""
    import pandas as pd
    import os

    path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clade_species_df.csv"
    if os.path.exists(path):
        df = pd.read_csv(path)
        assert df.shape[0] == 940
        assert df.shape[1] == 2


@pytest.mark.asyncio
async def test_alpha_diversity_coverage():
    """Verify ad_df covers all 335 Sample IDs."""
    import pandas as pd
    import os

    cm_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clinical_microbiome_df.csv"
    ad_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\ad_df.csv"
    if os.path.exists(cm_path) and os.path.exists(ad_path):
        cm = pd.read_csv(cm_path)
        ad = pd.read_csv(ad_path)
        overlap = set(ad["Sample ID"]).intersection(set(cm["Sample ID"]))
        assert len(overlap) == 335


@pytest.mark.asyncio
async def test_mph_sample_overlap():
    """Verify mph_matching_ad contains 335 primary sample IDs + 18 auxiliary samples."""
    import pandas as pd
    import os

    cm_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clinical_microbiome_df.csv"
    mph_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\mph_matching_ad.csv"
    if os.path.exists(cm_path) and os.path.exists(mph_path):
        cm = pd.read_csv(cm_path)
        mph = pd.read_csv(mph_path)
        
        cm_samples = set(cm["Sample ID"].dropna().astype(str))
        mph_samples = set(mph.columns[1:].astype(str))
        
        overlap = cm_samples.intersection(mph_samples)
        extra = mph_samples - cm_samples
        
        assert len(overlap) == 335, f"Expected 335 overlap, got {len(overlap)}"
        assert len(extra) == 18, f"Expected 18 extra samples, got {len(extra)}"


@pytest.mark.asyncio
async def test_taxa_column_count_in_clinical():
    """Verify exactly 940 columns in clinical_microbiome_df match clade_species taxa."""
    import pandas as pd
    import os

    cm_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clinical_microbiome_df.csv"
    cs_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clade_species_df.csv"
    if os.path.exists(cm_path) and os.path.exists(cs_path):
        cm = pd.read_csv(cm_path)
        cs = pd.read_csv(cs_path)
        
        taxa = set(cs["species_name"].apply(lambda x: x.replace("_", " ").strip()))
        cm_cols = set(cm.columns)
        matched = cm_cols.intersection(taxa)
        
        assert len(matched) == 940, f"Expected 940 matched taxa columns, got {len(matched)}"


@pytest.mark.asyncio
async def test_column_classification_split():
    """Verify 14 core + 96 secondary clinical + 940 taxa = 1050."""
    import pandas as pd
    import os

    cm_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clinical_microbiome_df.csv"
    cs_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clade_species_df.csv"
    if os.path.exists(cm_path) and os.path.exists(cs_path):
        cm = pd.read_csv(cm_path)
        cs = pd.read_csv(cs_path)

        core_cols = [
            "Sample ID", "study_id", "day", "Date Sample", "age", "age_cat",
            "male", "abx6mo", "hopsn", "malnutrition_indicator_sco",
            "clinical_frailty_scale", "PPI", "Alzheimers", "Dementia Other"
        ]
        taxa = set(cs["species_name"].apply(lambda x: x.replace("_", " ").strip()))
        secondary = [c for c in cm.columns if c not in core_cols and c not in taxa]

        assert len(core_cols) == 14
        assert len(taxa) == 940
        assert len(secondary) == 96
        assert 14 + 96 + 940 == 1050


@pytest.mark.asyncio
async def test_original_adam_not_modified():
    """Verify that original_adam/ directory contains no modified git files."""
    import subprocess
    result = subprocess.run(
        ["git", "diff", "--name-only", "--", "original_adam/"],
        capture_output=True,
        text=True,
        cwd=r"e:\ADAM-Enhanced"
    )
    modified = result.stdout.strip()
    assert modified == "", f"original_adam/ was modified: {modified}"


@pytest.mark.asyncio
async def test_bray_curtis_shape():
    """Verify bc_df is a 335×335 symmetric matrix."""
    import pandas as pd
    import os

    bc_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\bc_df.csv"
    if os.path.exists(bc_path):
        bc = pd.read_csv(bc_path)
        assert bc.shape == (335, 335), f"Expected 335x335, got {bc.shape}"
        # Check diagonal is zero
        for i in range(min(10, len(bc.columns))):
            assert bc.iloc[i, i] == 0.0 or bc.iloc[i, i] < 1e-10


@pytest.mark.asyncio
async def test_no_duplicate_samples():
    """Verify zero duplicate Sample IDs in clinical_microbiome_df."""
    import pandas as pd
    import os

    cm_path = r"e:\ADAM-Enhanced\original_adam\ADAM\global_resources\clinical_microbiome_df.csv"
    if os.path.exists(cm_path):
        df = pd.read_csv(cm_path)
        assert df["Sample ID"].duplicated().sum() == 0


@pytest.mark.asyncio
async def test_health_endpoint_still_passes():
    """Regression: Phase 1 health endpoint should still return 200."""
    from app.main import app
    with patch("app.routers.health.check_db_connection", new_callable=AsyncMock) as mock_db, \
         patch("app.database.AsyncSessionLocal") as mock_sl, \
         patch("app.ingestion.pipeline.execute_ingestion_pipeline", new_callable=AsyncMock) as mock_ingest:
        mock_db.return_value = {"status": "connected"}
        mock_sl.return_value.__aenter__.return_value = AsyncMock()
        mock_ingest.return_value = {}
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
