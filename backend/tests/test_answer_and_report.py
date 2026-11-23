import json
from io import BytesIO
from pathlib import Path
import httpx
import pytest
from app.main import app
from app.ml.data_loader import load_dataset_df
from app.rag.literature_store import get_all_articles
from app.routers.answers import Question, answer_question
from app.routers.reports import record_report, render_pdf


def test_answer_cites_only_indexed_claims():
    index = {p["pmid"]: p for p in get_all_articles()}
    questions = json.loads((Path(__file__).parents[1] / "app/research/artifacts/aira_questions.json").read_text())
    for query, expected in questions:
        result = answer_question(Question(question=query))
        for paper in result["sources"]:
            assert paper["title"] == index[paper["pmid"]]["title"]
            assert paper["claim"] in index[paper["pmid"]]["abstract"]
        assert result["disclaimer"]


@pytest.mark.asyncio
async def test_report_identity_and_export_stays_record_scoped():
    from matplotlib.backends.backend_pdf import PdfPages
    ids = load_dataset_df().drop_duplicates("study_id")["Sample ID"].head(2).tolist()
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url="http://test") as client:
        reports = []
        for sid in ids:
            response = await client.get("/api/reports/" + sid)
            assert response.status_code == 200
            report = response.json()
            assert report["record_id"] == sid
            assert 0 <= report["probability"] <= 1
            assert report["validation"]["external"]["auc_ci95"]
            pdf = await client.get("/api/reports/" + sid, params={"format":"pdf"})
            assert pdf.content.startswith(b"%PDF")
            assert sid in pdf.headers["content-disposition"]
            reports.append(report)
        assert reports[0]["study_id"] != reports[1]["study_id"]
        assert (await client.get("/api/reports/unknown-record")).status_code == 404


@pytest.mark.asyncio
async def test_stream_evidence_abstention_and_feedback():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app),base_url="http://test") as client:
        for query, supported in [("butyrate and amyloid burden",True),("interstellar spaceship propulsion",False),("what dose should I take",False)]:
            response = await client.post("/api/ai/answers/stream",json={"question":query})
            assert response.status_code == 200
            events = [json.loads(line) for line in response.text.splitlines()]
            answer = events[-1]["result"]
            assert bool(answer["sources"]) == supported
            assert "".join(e.get("text","") for e in events).strip() == answer["answer"]
            assert answer["disclaimer"]
        assert (await client.post("/api/ai/answers/feedback",json={"pmids":["unknown"],"rating":1,"audience":"patient"})).status_code == 422
