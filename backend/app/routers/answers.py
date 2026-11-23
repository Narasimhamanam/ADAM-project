"""Extractive answers with evidence identity checked against the local corpus."""
import re
from typing import Literal
from pydantic import BaseModel, Field
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.ml.data_loader import load_dataset_df
import json

from app.rag.literature_store import get_all_articles, search_literature

router = APIRouter(prefix="/ai", tags=["Literature answers"])


class Question(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    sample_id: str | None = Field(default=None, max_length=80, pattern=r"^[A-Za-z0-9_-]+$")
    audience: Literal["patient", "clinician"] = "patient"


def answer_question(payload):
    q = payload.question.strip()
    result = {"answer": "The available evidence does not answer this clearly.", "sources": [],
              "explanation": "The indexed summaries do not establish an answer to that question.",
              "caveats": "The index is small. Conflicting findings have not been systematically assessed.",
              "followups": [], "disclaimer": "Research use only, not a medical device."}
    if re.search(r"diagnose|dosage|what dose|should I (take|stop)|prescribe|sudden confusion|face droop|slurred speech|chest pain|cannot breathe", q, re.I):
        result.update(answer="AIRA cannot assess symptoms or recommend treatment.",
                      explanation="Contact a healthcare professional. For sudden or severe symptoms, seek urgent medical care.")
        return result
    if re.search(r"\b(cure|treat|prevent|diagnosis for me|guarantee)\w*\b", q, re.I):
        return result
    index = {p["pmid"]: p for p in get_all_articles()}
    stop = set("what which where study paper about does there with that from show found find link between indexed reports evidence authors research their this have could results report".split())
    tokens = set(re.findall(r"[a-z0-9-]{3,}", q.lower())) - stop
    if not tokens:
        return result
    if re.search(r"\b(auroc|brier|accuracy|sensitivity|specificity|performance)\b",q,re.I):
        if re.search(r"alzbiom|external|transfer", q, re.I):
            from app.research.rigor import ARTIFACT_DIR, load_report
            from pathlib import Path
            ext = load_report(str(Path(ARTIFACT_DIR) / "alzbiom_summary.json"))
            status = load_report(str(Path(ARTIFACT_DIR) / "validation_status.json"))
            if ext and status:
                result.update(answer=f"The frozen genus model had AUROC {ext['auc']:.3f} (95% CI {ext['auc_ci95'][0]:.3f} to {ext['auc_ci95'][1]:.3f}) on {ext['external_records']} AlzBiom participants. Brier score was {ext['brier']:.5f} versus {ext['source_prior_brier']:.5f} for training prevalence.",
                              explanation=status["genus_model"]["interpretation"],
                              caveats=status["species_clinical"], project_source="/research?tab=benchmarks")
        else:
            result["explanation"] = "Specify the model, cohort and outcome. The saved benchmarks distinguish within-cohort evaluation from independent transfer."
        return result
    for hit in search_literature(q, top_k=3):
        source = index.get(hit["pmid"])
        if not source or source["title"] != hit["title"] or not hit["pmid"].isdigit():
            continue
        sentences = re.split(r"(?<=\.)\s+", source["abstract"])
        def overlap(sentence):
            return len(tokens & set(re.findall(r"[a-z0-9-]{3,}", sentence.lower())))
        claim = max(sentences, key=overlap)
        if overlap(claim) == 0:
            continue
        result["sources"].append({**{k: source[k] for k in ("pmid","title","authors","year")},
                                  "claim": claim, "sample_size": (int(match.group(1)) if (match := re.search(r"In (\d+) older adults", source["abstract"])) else None),
                                  "study_type": ("Observational" if "observational study" in source["abstract"].lower() else None)})
        if len(result["sources"]) == 2:
            break
    if result["sources"]:
        first = result["sources"][0]
        known_item = re.match(r"(which (study|paper|source|work|article|platform)|where (was|were|does))",q,re.I)
        result.update(answer=(first["title"] + "." if known_item else first["claim"]) + " [1]",
                      explanation=("This result describes people or samples studied in the cited research. It cannot tell you whether an individual has Alzheimer's disease."
                                   if payload.audience == "patient" else "Interpret this finding within the source population and study design. Individual predictive validity requires separate evaluation."),
                      followups=["Which study supports this finding about " + first["title"].rstrip(".") + "?"])
    return result


@router.post("/answers")
def evidence_answer(question: Question):
    return answer_question(question)

@router.post("/answers/stream")
def stream_answer(question: Question):
    def events():
        yield json.dumps({"phase": "Searching literature"}) + "\n"
        result = answer_question(question)
        if question.sample_id:
            frame = load_dataset_df()
            rows = frame.loc[frame["Sample ID"] == question.sample_id]
            result["context"] = ({"sample_id": question.sample_id,
                                  "study_id": str(rows.iloc[0]["study_id"]),
                                  "visit_day": int(rows.iloc[0]["day"])}
                                 if len(rows) and rows.iloc[0]["day"] == rows.iloc[0]["day"] else None)
        yield json.dumps({"phase": "Writing answer"}) + "\n"
        for word in result["answer"].split(" "):
            yield json.dumps({"text": word + " "}) + "\n"
        yield json.dumps({"result": result}) + "\n"
    return StreamingResponse(events(), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})

class Feedback(BaseModel):
    rating: Literal[-1, 1]
    audience: Literal["patient", "clinician"]
    pmids: list[str] = Field(max_length=3)


@router.post("/answers/feedback", status_code=204)
def save_feedback(feedback: Feedback):
    from fastapi import HTTPException, Response
    from app.core.logging import get_logger
    valid = {p["pmid"] for p in get_all_articles()}
    if not set(feedback.pmids).issubset(valid):
        raise HTTPException(status_code=422, detail="Unknown citation")
    get_logger(__name__).info("literature_answer_feedback", rating=feedback.rating,
                              audience=feedback.audience, pmids=feedback.pmids)
    return Response(status_code=204)
