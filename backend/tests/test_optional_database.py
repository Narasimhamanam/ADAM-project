"""Availability failures are non-fatal only when storage is optional."""
import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from app import database
from app.routers import health


@pytest.mark.asyncio
async def test_required_database_remains_degraded(monkeypatch):
    monkeypatch.setattr(health.get_settings(), 'database_optional', False)
    monkeypatch.setattr(health, 'check_db_connection', AsyncMock(return_value={'status': 'disconnected'}))
    assert (await health.health_check()).status == 'degraded'


@pytest.mark.asyncio
@pytest.mark.parametrize('error', [TimeoutError(), OSError(-2, 'Name or service not known')])
async def test_optional_health_handles_timeout_and_dns(monkeypatch, error):
    monkeypatch.setattr(health.get_settings(), 'database_optional', True)
    monkeypatch.setattr(health, 'check_db_connection', AsyncMock(side_effect=error))
    response = await health.health_check()
    assert response.status == 'healthy'
    assert response.database == 'unavailable (optional)'


def test_logs_only_state_changes(monkeypatch):
    log = MagicMock()
    monkeypatch.setattr(database, 'logger', log)
    monkeypatch.setattr(database, '_db_available', None)
    for state in [False, False, False, True, True, False]:
        database.record_db_state(state)
    assert log.warning.call_count == 2
    assert log.info.call_count == 1


@pytest.mark.asyncio
async def test_startup_backoff_recovers(monkeypatch):
    monkeypatch.setattr(database.settings, 'database_startup_attempts', 4)
    monkeypatch.setattr(database.settings, 'database_retry_seconds', 1)
    init = AsyncMock(side_effect=[False, False, True])
    sleep = AsyncMock()
    monkeypatch.setattr(database, 'init_db', init)
    monkeypatch.setattr(database.asyncio, 'sleep', sleep)
    assert await database.initialize_with_backoff()
    assert [c.args[0] for c in sleep.await_args_list] == [1, 2]
    assert init.await_count == 3


@pytest.mark.asyncio
async def test_startup_exhaustion_and_cancellation(monkeypatch):
    monkeypatch.setattr(database.settings, 'database_startup_attempts', 2)
    monkeypatch.setattr(database.asyncio, 'sleep', AsyncMock())
    monkeypatch.setattr(database, 'init_db', AsyncMock(return_value=False))
    assert not await database.initialize_with_backoff()
    monkeypatch.setattr(database, 'init_db', AsyncMock(side_effect=asyncio.CancelledError()))
    with pytest.raises(asyncio.CancelledError):
        await database.initialize_with_backoff()


@pytest.mark.asyncio
async def test_failed_initialization_never_ingests(monkeypatch):
    from app import main
    ingestion = AsyncMock()
    monkeypatch.setattr(main, 'initialize_with_backoff', AsyncMock(return_value=False))
    monkeypatch.setattr(main, 'run_background_ingestion', ingestion)
    await main._initialize_and_ingest()
    ingestion.assert_not_awaited()
