import pytest
import httpx
from app.main import app


@pytest.mark.asyncio
async def test_nested_benchmark_serves_saved_cohort_comparison():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/research/nested-comparison")
    assert response.status_code == 200
    run = response.json()
    assert run["subjects"] == 102 and run["visits"] == 335
    for model in run["models"].values():
        assert len(model["selected_by_fold"]) == run["outer_folds"]
        for name in ("AUROC", "AUPRC", "Brier", "Sensitivity at specificity >= 90%"):
            assert model["metrics"][name]["valid_bootstraps"] == run["bootstrap_subjects"]
            lower, upper = model["metrics"][name]["ci95"]
            assert 0 <= lower <= upper <= 1
