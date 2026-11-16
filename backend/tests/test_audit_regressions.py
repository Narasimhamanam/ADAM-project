"""Regression tests for concrete repository audit findings."""
import json
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pandas as pd
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.main import app
from app.ml.data_loader import load_dataset_df, preprocess_and_split
from app.ml.diversity import get_taxa_columns, get_control_centroid
from app.ml.models import evaluate_model, normalize_model_name, training_fingerprint
from app.research.benchmark_engine import compute_binary_metrics_with_ci
from app.schemas.ml import TrainRequest, PredictRequest


def test_taxonomy_excludes_numeric_medication_and_comorbidity_columns():
    taxa = get_taxa_columns(load_dataset_df())
    assert len(taxa) == 940
    assert 'Statins' not in taxa
    assert 'Parkinsons' not in taxa
    assert 'Faecalibacterium prausnitzii' in taxa


def test_control_centroid_is_not_reused_across_datasets():
    first = pd.DataFrame({'Alzheimers': [0], 'Faecalibacterium prausnitzii': [1.], 'Bacteroides fragilis': [0.]})
    second = first.copy()
    second[['Faecalibacterium prausnitzii', 'Bacteroides fragilis']] = [0., 1.]
    np.testing.assert_array_equal(get_control_centroid(first), [1, 0])
    np.testing.assert_array_equal(get_control_centroid(second), [0, 1])


@pytest.mark.parametrize('name', ['../../xgboost', 'xgboost/../../../tmp', 'unknown', 'rf_evil'])
def test_model_names_cannot_escape_artifact_directory(name):
    with pytest.raises(ValueError):
        normalize_model_name(name)


def test_training_provenance_covers_order_seed_labels_and_data():
    X, y = np.array([[1., 2.], [3., 4.]]), np.array([0, 1])
    base = training_fingerprint(X, y, ['a', 'b'])
    assert base != training_fingerprint(X, y, ['b', 'a'])
    assert base != training_fingerprint(X, y, ['a', 'b'], 43)
    assert base != training_fingerprint(X + 1, y, ['a', 'b'])
    assert base != training_fingerprint(X, 1-y, ['a', 'b'])


def test_single_class_metrics_are_json_safe_and_auc_is_unavailable():
    model = MagicMock()
    model.predict_proba.return_value = np.array([[.9, .1], [.8, .2]])
    metrics = evaluate_model(model, np.ones((2, 1)), np.zeros(2))
    assert metrics['auc'] is None
    assert metrics['roc_curve'] == []
    assert metrics['confusion_matrix'] == [[2, 0], [0, 0]]
    json.dumps(metrics, allow_nan=False)


def test_insufficient_bootstrap_evidence_does_not_invent_intervals():
    result = compute_binary_metrics_with_ci([0, 1], [.2, .8], ['a', 'b'], n_bootstrap=0).to_dict()
    assert all(v is None for v in result['confidence_intervals_95'].values())
    json.dumps(result, allow_nan=False)


@pytest.mark.parametrize('mutation', ['label', 'duplicate', 'missing_subject', 'protocol'])
def test_invalid_dataset_or_protocol_fails_before_training(mutation):
    frame = load_dataset_df().copy()
    if mutation == 'label': frame.loc[0, 'Alzheimers'] = 2
    if mutation == 'duplicate': frame.loc[0, 'Sample ID'] = frame.loc[1, 'Sample ID']
    if mutation == 'missing_subject': frame.loc[0, 'study_id'] = None
    with pytest.raises(ValueError):
        preprocess_and_split(frame, protocol='../../bad' if mutation == 'protocol' else 'full_cohort')


def test_request_schema_rejects_invalid_split_and_nonfinite_features():
    with pytest.raises(ValidationError): TrainRequest(test_size=0.99)
    with pytest.raises(ValidationError): TrainRequest(model_name='../xgboost')
    with pytest.raises(ValidationError): PredictRequest(features={'x': float('inf')})


@pytest.mark.asyncio
async def test_cors_does_not_trust_arbitrary_render_tenants():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        response = await client.options('/api/health', headers={
            'Origin': 'https://untrusted-tenant.onrender.com', 'Access-Control-Request-Method': 'GET'})
    assert 'access-control-allow-origin' not in response.headers


@pytest.mark.asyncio
async def test_taxonomic_audit_uses_local_data_and_blocks_missing_external_data():
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        response = await client.post('/api/research/datasets/ADAM1_BASELINE/audit')
        assert response.status_code == 200
        assert response.json()['harmonization_audit']['direct_matching_features'] == 940
        response = await client.post('/api/research/datasets/OASIS1_MRI/audit')
        assert response.status_code == 409


@pytest.mark.asyncio
async def test_optional_extension_failure_rolls_back_savepoint_not_schema():
    from app import database
    connection = AsyncMock()
    connection.begin_nested = MagicMock(return_value=AsyncMock())
    async def execute(statement):
        if 'vector' in str(statement): raise RuntimeError('optional extension unavailable')
    connection.execute.side_effect = execute
    engine = MagicMock()
    engine.begin.return_value.__aenter__ = AsyncMock(return_value=connection)
    engine.begin.return_value.__aexit__ = AsyncMock(return_value=False)
    with patch.object(database, 'engine', engine), patch.object(database, '_verify_pgvector', AsyncMock()):
        await database.init_db()
    assert connection.begin_nested.call_count == 3
    connection.run_sync.assert_awaited_once()


def test_literature_has_verified_identifiers_and_explicit_summary_provenance():
    from app.rag.literature_store import get_all_articles
    for article in get_all_articles():
        assert article['pmid'].isdigit()
        assert article['source_url'].endswith('/'+article['pmid']+'/')
        assert article['content_type'] == 'authored_summary'


def test_twin_predictions_do_not_use_held_out_subject_label():
    from app.ml.subject_predictions import subject_held_out_predictions
    frame = load_dataset_df().copy()
    original = subject_held_out_predictions(frame)
    subject = frame['study_id'].iloc[0]
    mask = frame['study_id'] == subject
    frame.loc[mask, 'Alzheimers'] = 1 - frame.loc[mask, 'Alzheimers']
    flipped = subject_held_out_predictions(frame)
    for sample in frame.loc[mask, 'Sample ID']:
        assert original[sample] == flipped[sample]
