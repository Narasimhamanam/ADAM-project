"""Record-scoped research exports. Only deidentified fields are included."""
import asyncio
import hashlib
from datetime import datetime, timezone
from io import BytesIO
from textwrap import wrap
from threading import Lock
from typing import Literal

import pandas as pd
from fastapi import APIRouter, Path
from fastapi.responses import JSONResponse, Response
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.figure import Figure

from app.ml.data_loader import load_dataset_df
from app.ml.predict_service import get_cached_split, get_or_load_model, get_sample_prediction_details
from app.research.digital_twin import clinical_matches
from app.rag.literature_store import get_all_articles
from app.routers.research import get_rigor_report

router = APIRouter(prefix="/reports", tags=["Research reports"])
PDF_LOCK = Lock()
NOTICE = "Research use only, not a medical device."


async def record_report(sample_id):
    prediction = await get_sample_prediction_details(sample_id, "xgboost")
    frame = load_dataset_df()
    row = frame.loc[frame["Sample ID"] == prediction.sample_id].iloc[0]
    rigor = await get_rigor_report()
    split = get_cached_split()
    model = await asyncio.to_thread(get_or_load_model, "xgboost", split)
    version = hashlib.sha256(model.get_booster().save_raw()).hexdigest()
    features = [item.model_dump() for item in prediction.feature_contributions[:10]]
    names = {f["feature"].casefold().replace("_", " ") for f in features}
    papers = [{"title": d["title"], "authors": d["authors"], "year": d["year"], "pmid": d["pmid"]}
              for d in get_all_articles() if any(t.casefold() in names for t in d.get("key_taxa", []))]
    clinical = {key: float(row[key]) if key in row and pd.notna(row[key]) else None
                for key in ("age", "clinical_frailty_scale", "malnutrition_indicator_sco", "abx6mo", "ppi")}
    return {"record_id": prediction.sample_id, "study_id": prediction.subject_id,
            "generated_at": datetime.now(timezone.utc).isoformat(), "cohort": "ADAM1_BASELINE",
            "visit_day": int(row["day"]) if pd.notna(row["day"]) else None,
            "clinical_covariates": clinical, "model": prediction.model_name,
            "probability": prediction.alzheimers_risk_probability, "individual_interval": None,
            "calibration_note": "Individual probability intervals are unavailable. Cohort calibration does not quantify individual uncertainty.",
            "features": features, "literature": papers,
            "matches": clinical_matches(frame, prediction.subject_id),
            "validation": {"internal": {k: v for k,v in rigor.get("repeated", {}).get("summary", {}).get("full_subject", {}).items()
                                        if k in ("brier", "subject_auc_repeat_averaged_probability")},
                           "internal_subjects": rigor["provenance"]["n_subjects"],
                           "external": rigor.get("alzbiom"), "status": rigor.get("validation_status")},
            "model_version": version, "design_matrix_sha256": rigor["provenance"].get("design_matrix_sha256"),
            "seed": int(split["seed"]), "disclaimer": NOTICE}


def render_pdf(r):
    v = r["validation"]
    lines = [("Record", [f"Subject {r['study_id']} | {r['cohort']} | Visit day {r['visit_day']}",
                         *[f"{k}: {number if number is not None else 'Unavailable'}" for k,number in r["clinical_covariates"].items()]]),
             ("Prediction", [f"{r['model']} model probability: {r['probability']:.1%}", r["calibration_note"]]),
             ("Contributing features", [f"{f['feature']}: {f['shap_value']:+.4f} ({f['impact']})" for f in r["features"]]),
             ("Literature linked by taxon", [f"{p['authors']} ({p['year']}). {p['title']}. https://pubmed.ncbi.nlm.nih.gov/{p['pmid']}/" for p in r["literature"]]),
             ("Clinical matches", [f"{m['participant_id']} / {m['sample_id']} | Similarity {m['similarity']:.3f}" for m in r["matches"]])]
    validation = [f"{k}: {m['estimate']:.3f} (95% CI {m['ci95'][0]:.3f} to {m['ci95'][1]:.3f}; n={v['internal_subjects']})" for k,m in v["internal"].items()]
    e = v["external"]
    if e and v["status"]:
        validation.extend([f"AlzBiom (n={e['external_records']}): AUROC {e['auc']:.3f} (95% CI {e['auc_ci95'][0]:.3f} to {e['auc_ci95'][1]:.3f}); Brier {e['brier']:.5f} vs {e['source_prior_brier']:.5f}.",
                           v["status"]["genus_model"]["interpretation"], v["status"]["species_clinical"]])
    lines.extend([("Validation", validation), ("Provenance", [f"Seed {r['seed']}", "Model SHA-256: " + r["model_version"],
                    "Design matrix SHA-256: " + str(r["design_matrix_sha256"])])])
    buffer = BytesIO()
    with PDF_LOCK, PdfPages(buffer) as pdf:
        for page, sections in enumerate((lines[:3], lines[3:]), 1):
            fig = Figure(figsize=(8.27,11.69))
            fig.text(.08,.94,"ADAM research report",fontsize=21,color="#14575b")
            fig.text(.08,.90,f"{r['record_id']}  |  {r['generated_at'][:10]}  |  {page}/2",fontsize=11)
            y = .85
            for heading, items in sections:
                fig.text(.08,y,heading,fontsize=13,weight="bold"); y -= .028
                for item in items or ["Unavailable for this record."]:
                    for line in wrap(item, 88):
                        fig.text(.08,y,line,fontsize=9); y -= .019
                y -= .017
            fig.text(.08,.045,NOTICE,fontsize=9)
            pdf.savefig(fig)
    return buffer.getvalue()


@router.get("/{sample_id}")
async def download_report(sample_id: str = Path(min_length=1, max_length=80, pattern=r"^[A-Za-z0-9_-]+$"),
                          format: Literal["json", "pdf"] = "json"):
    report = await record_report(sample_id)
    filename = f"ADAM_report_{report['record_id']}_{report['generated_at'][:10]}.{format}"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"', "Cache-Control": "no-store"}
    if format == "json":
        return JSONResponse(report, headers=headers)
    return Response(await asyncio.to_thread(render_pdf, report), media_type="application/pdf", headers=headers)
