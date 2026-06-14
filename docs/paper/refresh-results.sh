#!/usr/bin/env bash
# Regenerate the paper's empirical artifacts from the evaluation harness, so every number,
# table, and figure in the paper traces to a reproducible measurement.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PROJ="$HERE/../../projects/open-provenance"

echo "fetching natural-image corpus (needs network) ..."
( cd "$PROJ" && bash eval/fetch_corpus.sh ) || echo "  (corpus fetch skipped/failed; using existing eval/corpus)"

echo "running natural-image evaluation harness ..."
( cd "$PROJ" && python3 eval/natural_eval.py )

echo "copying artifacts into the paper ..."
cp "$PROJ/eval/results/nat_e1_watermark.tex" "$HERE/tables/n1_watermark.tex"
cp "$PROJ/eval/results/nat_e3_crop.tex"      "$HERE/tables/n3_crop.tex"
cp "$PROJ/eval/results/nat_roc.png"          "$HERE/figures/nat_roc.png"

echo "done. Reconcile prose numbers (abstract, Evaluation) with"
echo "$PROJ/eval/results/nat_summary.csv, then rebuild the PDF (see README.md)."
