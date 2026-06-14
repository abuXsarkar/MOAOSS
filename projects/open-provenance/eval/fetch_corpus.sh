#!/usr/bin/env bash
# Fetch the Kodak natural-image test suite (24 royalty-free images released by Eastman
# Kodak for unrestricted use) into eval/corpus/. Used by natural_eval.py.
#
# On a machine with open egress this fetches all 24; the harness runs on whatever subset
# is present (>=4). For a larger benchmark, drop any natural images into eval/corpus/.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HERE/corpus"
BASE="https://raw.githubusercontent.com/lemire/kodakimagecollection/master"
ALT="https://raw.githubusercontent.com/girfa/ColorImageDatasets/master/Kodak-PCD0992"
mkdir -p "$DEST"

ok=0
for i in $(seq -w 1 24); do
  if curl -fsSL --retry 2 --max-time 40 -o "$DEST/kodim$i.png" "$BASE/kodim$i.png" 2>/dev/null \
       && [ -s "$DEST/kodim$i.png" ]; then
    ok=$((ok + 1))
  elif curl -fsSL --retry 2 --max-time 40 -o "$DEST/kodim$i.png" "$ALT/kodim$i.png" 2>/dev/null \
       && [ -s "$DEST/kodim$i.png" ]; then
    ok=$((ok + 1))   # fall back to alternate mirror
  else
    rm -f "$DEST/kodim$i.png"
    echo "  (skipped kodim$i)" >&2
  fi
done
echo "fetched $ok Kodak images into $DEST"
