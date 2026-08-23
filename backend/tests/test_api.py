"""
Extended API Tests
==================
Tests for datasets endpoint and CORS/middleware.
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

from app.main import app


@pytest.mark.asyncio
async def test_datasets_endpoint_returns_list():
    """Datasets endpoint returns paginated dataset list (unit-level)."""
    from unittest.mock import MagicMock
    from app.routers.datasets import list_datasets

    mock_session = AsyncMock()

    def make_ds(name, ds_type):
        import uuid
        from datetime import datetime, timezone
        m = MagicMock()
        m.id = uuid.uuid4()
        m.name = name
        m.description = f"Description of {name}"
        m.source_file = f"original_adam/ADAM/global_resources/{name}.csv"
        m.dataset_type = ds_type
        m.rows = 335
        m.columns = 1050
        m.size_bytes = 1_000_000
        m.status = "INGESTED"
        m.checksum = "abc123"
        now = datetime.now(timezone.utc)
        m.created_at = now
        m.updated_at = now
        return m

    datasets = [
        make_ds("clinical_microbiome_df", "clinical_microbiome"),
        make_ds("bc_df", "microbiome_diversity"),
        make_ds("ad_df", "microbiome_diversity"),
        make_ds("clade_species_df", "taxonomy"),
        make_ds("mph_matching_ad", "clinical_microbiome"),
    ]
    count_result = MagicMock()
    count_result.scalar_one.return_value = 5
    list_result = MagicMock()
    list_result.scalars.return_value.all.return_value = datasets

    mock_session.execute = AsyncMock(side_effect=[count_result, list_result])

    result = await list_datasets(page=1, page_size=20, db=mock_session)
    assert result.total == 5
    assert len(result.datasets) == 5
    names = [d.name for d in result.datasets]
    assert "clinical_microbiome_df" in names
    assert "bc_df" in names


@pytest.mark.asyncio
async def test_response_time_header():
    """Every response should include X-Process-Time header."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/system/info")

    assert response.status_code == 200
    assert "x-process-time" in response.headers
