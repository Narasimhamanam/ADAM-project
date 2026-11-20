"""Compare the enhanced agent with and without retrieval on identical held-out samples."""
import argparse
import json
from pathlib import Path

from app.agents.adam_workflow import run_adam_pipeline
from app.ml.data_loader import load_dataset_df, preprocess_and_split


def evaluate(split, limit=None, execute=run_adam_pipeline):
    train, test = split["train_df"], split["test_df"]
    if set(train["study_id"]) & set(test["study_id"]):
        raise ValueError("Evaluation subjects overlap training subjects")
    if limit is not None and limit < 1:
        raise ValueError("Sample limit must be positive")
    rows = []
    for _, sample in test.sort_values("Sample ID").head(limit or len(test)).iterrows():
        row = {"sample": str(sample["Sample ID"]), "subject": str(sample["study_id"]),
               "label": int(sample["Alzheimers"])}
        for mode, retrieval in (("without_retrieval", False), ("with_retrieval", True)):
            result = execute(row["sample"], use_rag=retrieval, strict_research_mode=True,
                             evaluation_split=split)["final_result"]
            valid = bool(result["strict_mode_valid"] and not result["fallback_used"])
            row[mode] = {"valid": valid, "prediction": result["adam_binary_label"] if valid else None,
                         "model": result["adam_source"], "provider": result["adam_provider"],
                         "prompts": result["prompt_verification"],
                         "documents": result["rag_details"]["document_ids"]}
            baseline = result["xgboost_prediction"]
            if "baseline" in row and row["baseline"] != baseline:
                raise ValueError("Paired arms produced inconsistent baseline predictions")
            row["baseline"] = baseline
        rows.append(row)
    paired = [r for r in rows if r["without_retrieval"]["valid"] and r["with_retrieval"]["valid"]]
    accuracy = {arm: sum((r[arm] if arm == "baseline" else r[arm]["prediction"]) == r["label"]
                         for r in paired) / len(paired) if paired else None
                for arm in ("baseline", "without_retrieval", "with_retrieval")}
    return {"attempted_samples": len(rows), "complete_pairs": len(paired),
            "visit_accuracy_on_complete_pairs": accuracy, "records": rows}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    split = preprocess_and_split(load_dataset_df(), seed=args.seed)
    report = evaluate(split, args.limit)
    args.output.write_text(json.dumps(report | {"seed": args.seed}, indent=2), encoding="utf-8")
