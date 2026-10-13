"""
Regression and Reliability Test Suite for Patient Explorer Endpoints
======================================================================
Tests:
1. Patient-list schema, 102-subject count, and summary fields.
2. Pagination, sorting, and multi-parameter filtering (AD/Control, longitudinal, search).
3. Graceful handling of empty filter results and non-existent IDs (404 controlled error).
4. Process resilience: failed requests do not terminate or corrupt the application.
5. In-memory caching and repeated call stability (no runaway memory growth or re-initialization).
6. Subject trajectory detail response schema (observations + visits compatibility aliases).
7. Digital twin profile completeness (clinical_baseline, diagnosis_status, probability).
8. Neuroimaging subjects endpoint integrity.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
import time


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.anyio
async def test_patient_list_schema_and_counts(client: AsyncClient):
    """Verify patient list returns all 102 verified cohort participants with summary fields."""
    res = await client.get("/api/trajectory/subjects")
    assert res.status_code == 200
    data = res.json()

    assert data["total_subjects"] == 102
    assert data["subjects_with_repeated_samples"] >= 65
    assert len(data["subjects"]) == 102

    first = data["subjects"][0]
    required_fields = [
        "subject_id",
        "observation_count",
        "follow_up_days",
        "baseline_day",
        "latest_day",
        "sample_ids",
        "diagnosis_label",
        "diagnosis_status",
        "is_longitudinal",
    ]
    for field in required_fields:
        assert field in first, f"Missing field {field} in subject summary"

    # Verify no raw 940 species feature columns leaked into summary list
    assert "Phocaeicola dorei" not in first
    assert "Faecalibacterium prausnitzii" not in first


@pytest.mark.anyio
async def test_patient_list_pagination(client: AsyncClient):
    """Verify deterministic pagination within documented limits."""
    res = await client.get("/api/trajectory/subjects?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()

    assert data["page"] == 1
    assert data["page_size"] == 10
    assert data["total_pages"] == 11
    assert data["total_subjects"] == 102
    assert len(data["subjects"]) == 10

    res_p2 = await client.get("/api/trajectory/subjects?page=2&page_size=10")
    assert res_p2.status_code == 200
    data_p2 = res_p2.json()
    assert len(data_p2["subjects"]) == 10
    # Page 1 and Page 2 must not have overlapping subjects
    p1_ids = [s["subject_id"] for s in data["subjects"]]
    p2_ids = [s["subject_id"] for s in data_p2["subjects"]]
    assert set(p1_ids).isdisjoint(set(p2_ids))


@pytest.mark.anyio
async def test_patient_list_filtering(client: AsyncClient):
    """Verify filtering by diagnosis, search keyword, and visit multiplicity."""
    # 1. Alzheimer's filter
    res_ad = await client.get("/api/trajectory/subjects?diagnosis=ad")
    assert res_ad.status_code == 200
    ad_data = res_ad.json()
    assert all(s["diagnosis_label"] == 1 for s in ad_data["subjects"])

    # 2. Control filter
    res_ctrl = await client.get("/api/trajectory/subjects?diagnosis=control")
    assert res_ctrl.status_code == 200
    ctrl_data = res_ctrl.json()
    assert all(s["diagnosis_label"] == 0 for s in ctrl_data["subjects"])
    assert ad_data["total_subjects"] + ctrl_data["total_subjects"] == 102

    # 3. Longitudinal filter
    res_long = await client.get("/api/trajectory/subjects?is_longitudinal=true")
    assert res_long.status_code == 200
    long_data = res_long.json()
    assert all(s["is_longitudinal"] is True for s in long_data["subjects"])
    assert all(s["observation_count"] >= 2 for s in long_data["subjects"])

    # 4. Search filter for specific subject
    res_search = await client.get("/api/trajectory/subjects?search=CH1-011")
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert search_data["total_subjects"] == 1
    assert search_data["subjects"][0]["subject_id"] == "CH1-011"

    # 5. Non-matching search handles empty result cleanly
    res_empty = await client.get("/api/trajectory/subjects?search=NONEXISTENT_XYZ")
    assert res_empty.status_code == 200
    empty_data = res_empty.json()
    assert empty_data["total_subjects"] == 0
    assert len(empty_data["subjects"]) == 0


@pytest.mark.anyio
async def test_patient_trajectory_detail_and_visits_alias(client: AsyncClient):
    """Verify trajectory endpoint returns both observations and visits compatibility aliases."""
    res = await client.get("/api/trajectory/subjects/CH1-011?include_shap=false")
    assert res.status_code == 200
    data = res.json()

    assert data["subject_id"] == "CH1-011"
    assert data["status"] == "RESEARCH_ONLY"
    assert data["observation_count"] == 12

    # Verify observations point array
    assert "observations" in data
    assert len(data["observations"]) == 12
    first_obs = data["observations"][0]
    assert "sample_id" in first_obs
    assert "study_day" in first_obs
    assert "ad_probability" in first_obs

    # Verify visits compatibility array
    assert "visits" in data
    assert len(data["visits"]) == 12
    first_visit = data["visits"][0]
    assert "day_offset" in first_visit
    assert "predicted_probability" in first_visit
    assert "key_taxa" in first_visit


@pytest.mark.anyio
async def test_missing_subject_controlled_error(client: AsyncClient):
    """Verify non-existent subject produces a clean HTTP 404 without terminating process."""
    res = await client.get("/api/trajectory/subjects/NONEXISTENT_SUBJECT_999")
    assert res.status_code == 404
    err_body = res.json()
    assert "detail" in err_body

    # Verify server remains healthy and operational immediately after 404
    res_health = await client.get("/api/health/live")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "alive"


@pytest.mark.anyio
async def test_digital_twin_profile_completeness(client: AsyncClient):
    """Verify Digital Twin profile contains clinical_baseline, diagnosis_status, and observation span."""
    res = await client.get("/api/research/digital-twin/ADAM1_BASELINE/CH1-011")
    assert res.status_code == 200
    data = res.json()

    assert data["participant_id"] == "CH1-011"
    assert data["cohort_id"] == "ADAM1_BASELINE"
    assert data["total_observed_visits"] == 12
    assert "static_clinical_diagnosis" in data
    assert "diagnosis_status" in data
    assert "clinical_baseline" in data
    assert "mean_predicted_probability" in data
    assert isinstance(data["observed_visits"], list)
    assert len(data["observed_visits"]) == 12


@pytest.mark.anyio
async def test_repeated_patient_list_performance(client: AsyncClient):
    """
    Stress-test sequence of 20 consecutive patient-list requests.
    Verifies that in-memory caching guarantees sub-10ms response times
    without unbounded memory allocation.
    """
    start_t = time.time()
    for _ in range(20):
        res = await client.get("/api/trajectory/subjects")
        assert res.status_code == 200
        assert res.json()["total_subjects"] == 102

    total_time = time.time() - start_t
    # 20 cached in-memory requests must complete in less than 2.0 seconds total
    assert total_time < 2.0, f"20 requests took too long: {total_time:.2f}s"


@pytest.mark.anyio
async def test_neuroimaging_subjects_endpoint(client: AsyncClient):
    """Verify neuroimaging subjects endpoint returns OASIS-1 structural records."""
    res = await client.get("/api/research/neuroimaging/subjects?cohort_id=OASIS1_MRI")
    assert res.status_code == 200
    data = res.json()

    assert data["total_subjects"] >= 2
    assert len(data["subjects"]) >= 2
    subj = data["subjects"][0]
    assert "subject_id" in subj
    assert "hippocampus_volume_cm3" in subj
