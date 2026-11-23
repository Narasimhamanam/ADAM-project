from app.ml.data_loader import load_dataset_df
from app.research.digital_twin import clinical_matches


def test_real_cohort_matches_exclude_all_visits_of_selected_subject():
    frame = load_dataset_df()
    subject = frame["study_id"].iloc[0]
    matches = clinical_matches(frame, subject)
    assert len(matches) == len({m["participant_id"] for m in matches}) == 3
    assert matches == clinical_matches(frame.sample(frac=1, random_state=7), subject)
    for match in matches:
        assert match["participant_id"] != subject
        assert 0 <= match["similarity"] <= 1
        assert frame.loc[frame["Sample ID"] == match["sample_id"], "study_id"].item() == match["participant_id"]

import httpx
import pytest
from app.main import app


@pytest.mark.asyncio
async def test_report_identity_and_integrity_api():
    frame = load_dataset_df()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        records = frame.drop_duplicates("study_id").head(2)
        for _, row in records.iterrows():
            response = await client.get("/api/samples/" + row["Sample ID"])
            assert response.status_code == 200
            assert response.json()["sample_id"] == row["Sample ID"]
            assert response.json()["study_id"] == row["study_id"]
        assert (await client.get("/api/samples/unknown-record")).status_code == 404
        audit = await client.get("/api/research/integrity")
        assert audit.status_code == 200
        assert audit.json()["samples"] == len(frame)
        assert audit.json()["checks"]["Duplicate sample ID rows"] == int(frame["Sample ID"].duplicated(keep=False).sum())

@pytest.mark.asyncio
async def test_served_validation_status_matches_external_artifact():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        report = (await client.get("/api/research/rigor")).json()
    cohort = report["validation_status"]["genus_model"]
    assert cohort["cases"] + cohort["controls"] == report["alzbiom"]["external_records"]
    assert cohort["cases"] / report["alzbiom"]["external_records"] == pytest.approx(report["alzbiom"]["external_prevalence"])
    assert sum(row["n"] for row in report["calibration"]["reliability_bins_raw_last_repeat"]) == report["provenance"]["n_samples"]
