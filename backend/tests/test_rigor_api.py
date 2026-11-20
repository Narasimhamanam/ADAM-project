from unittest.mock import patch
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_missing_rigor_report_is_explicit_404():
    with patch('app.routers.research.load_rigor_report', return_value=None):
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
            assert (await client.get('/api/research/rigor')).status_code == 404


@pytest.mark.asyncio
async def test_repeated_summary_is_served_without_subject_identifiers():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        response = await client.get('/api/research/rigor')
    assert response.status_code == 200
    data = response.json()['repeated']
    assert data['config']['seeds'] >= 30
    assert 'fold_selection_audit' not in data
    assert data['summary']['always_both']['covered']['estimate'] == 1
