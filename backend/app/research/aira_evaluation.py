"""Evaluate the small curated evidence index. Questions are authored against this index."""
import hashlib
import json
from pathlib import Path

from app.rag.literature_store import get_all_articles, search_literature

ARTIFACTS = Path(__file__).parent / "artifacts"


def evaluate():
    questions = json.loads((ARTIFACTS / "aira_questions.json").read_text())
    corpus = get_all_articles()
    indexed = {doc["pmid"]: doc["title"] for doc in corpus}
    rows = []
    valid = retrieved = 0
    for query, expected in questions:
        if expected not in indexed:
            raise ValueError(f"Unknown expected PMID {expected}")
        hits = search_literature(query, top_k=3)
        valid += sum(indexed.get(hit["pmid"]) == hit["title"] for hit in hits)
        retrieved += len(hits)
        rows.append({"question": query, "expected": expected, "retrieved": [hit["pmid"] for hit in hits]})
    return {
        "design": "Authored known-item queries against the six-document development index",
        "corpus_sha256": hashlib.sha256(json.dumps(corpus, sort_keys=True).encode()).hexdigest(),
        "n_questions": len(rows),
        "recall_at_1": sum(row["expected"] in row["retrieved"][:1] for row in rows) / len(rows),
        "recall_at_3": sum(row["expected"] in row["retrieved"] for row in rows) / len(rows),
        "index_citation_identity": valid / retrieved if retrieved else None,
        "retrieved_citations": retrieved,
        "rows": rows,
    }


if __name__ == "__main__":
    result = evaluate()
    (ARTIFACTS / "aira_evaluation.json").write_text(json.dumps(result, indent=2) + "\n")
    print({key: value for key, value in result.items() if key != "rows"})
