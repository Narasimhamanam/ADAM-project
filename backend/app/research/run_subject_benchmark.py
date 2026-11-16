"""Write aggregate results. Run from backend with python -m app.research.run_subject_benchmark."""
import argparse
import hashlib
import json
import platform
from pathlib import Path

import numpy
import pandas
import sklearn
import xgboost

from app.ingestion.pipeline import get_global_resources_dir
from app.research.subject_conformal import MODES, run_subject_benchmark


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mode", choices=MODES)
    parser.add_argument("--output", type=Path, default=Path("research-benchmark.json"))
    args = parser.parse_args()
    directory = Path(get_global_resources_dir())
    source = directory / "clinical_microbiome_df.csv"
    result = run_subject_benchmark(pandas.read_csv(source), (args.mode,) if args.mode else MODES)
    result["source_sha256"] = hashlib.sha256(source.read_bytes()).hexdigest()
    result["taxonomy_sha256"] = hashlib.sha256((directory / "clade_species_df.csv").read_bytes()).hexdigest()
    result["runtime"] = {
        "platform": platform.platform(), "python": platform.python_version(),
        "xgboost": xgboost.__version__, "numpy": numpy.__version__,
        "pandas": pandas.__version__, "scikit_learn": sklearn.__version__,
    }
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
