#!/usr/bin/env bash
# Regenerate the paper's empirical artifacts from the evaluation harness, so every number,
# table, and figure in the paper traces to a reproducible measurement.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PROJ="$HERE/../../projects/open-provenance"

echo "running evaluation harness ..."
( cd "$PROJ" && python3 eval/durable_eval.py )

echo "copying artifacts into the paper ..."
cp "$PROJ/eval/results/e1_watermark.tex" "$HERE/tables/e1_watermark.tex"
cp "$PROJ/eval/results/roc.png"          "$HERE/figures/roc.png"

echo "done. Review $HERE/tables and $HERE/figures, then rebuild the PDF (see README.md)."
echo "Note: numbers in the prose (AUC, distances) should be reconciled with eval/results/summary.csv."
