#!/usr/bin/env bash
# Fetch the official C2PA / Content Authenticity Initiative production trust anchors.
#
# Run this on a machine with open outbound network access (this repo's build sandbox
# blocks the host). ALWAYS review what you fetch before trusting it — a trust list is
# security-critical configuration.
#
# Usage: ./fetch-production-trustlist.sh [output-dir]
set -euo pipefail

OUT="${1:-./production}"
mkdir -p "$OUT"

# Official C2PA trust-list distribution. Verify these URLs against current C2PA
# documentation (https://c2pa.org / https://contentcredentials.org/trust) before use;
# the project occasionally relocates the files.
BASE="https://contentcredentials.org/trust"
FILES=(
  "anchors.pem"        # trusted root CAs
  "allowed.pem"        # allowed end-entity certificates
  "store.cfg"          # EKU / configuration
)

for f in "${FILES[@]}"; do
  echo "fetching $BASE/$f ..."
  if curl -fSL --retry 3 -o "$OUT/$f" "$BASE/$f"; then
    echo "  saved $OUT/$f ($(wc -c <"$OUT/$f") bytes)"
  else
    echo "  WARNING: could not fetch $f — check the current C2PA trust-list URL." >&2
  fi
done

echo
echo "Done. Review $OUT/anchors.pem, then load it as your trust list in the verifier."
echo "Reminder: adopting this list is your choice; it is not imposed by open-provenance."
