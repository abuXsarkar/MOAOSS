#!/usr/bin/env bash
# Capture emit-side (R1) conformance evidence on a machine with outbound network reachable
# (a timestamp authority is required to sign), e.g. the project VM. Verification never needs
# the network; only signing does.
#
# Produces:
#   test/fixtures/op-signed.jpg   a sample signed by THIS project (AI-tagged)
#   evidence/emit-evidence.md     the captured test + verification output
#
# Then commit both; test/emit.test.mjs activates and proves R1 in CI thereafter.
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)"   # projects/open-provenance

SAMPLE=test/fixtures/plain.jpg
OUT=test/fixtures/op-signed.jpg
GEN="open-provenance-evidence/1.0"
TSA="${OP_TSA:-http://timestamp.digicert.com}"
mkdir -p evidence

[ -d node_modules ] || npm install

echo "==> 1/3 conformance + integration tests"
node --test test/conformance.test.mjs test/sign-verify.integration.test.mjs 2>&1 | tee evidence/_tests.txt || true

echo "==> 2/3 sign a sample (AI-tagged) via the participant CLI"
node tools/sign.mjs "$SAMPLE" --out "$OUT" --ai --generator "$GEN" --tsa "$TSA"

echo "==> 3/3 verify the signed sample (offline)"
node src/verify.mjs "$OUT" --json 2>&1 | tee evidence/_verify.json

{
  echo "# Emit-side conformance evidence (R1)"
  echo
  echo "- captured: $(date -u +%FT%TZ)"
  echo "- node: $(node --version)"
  echo "- timestamp authority: $TSA"
  echo
  echo "## Conformance + integration tests"
  echo '```'; cat evidence/_tests.txt; echo '```'
  echo
  echo "## Our signed sample, verified"
  echo '```json'; cat evidence/_verify.json; echo '```'
} > evidence/emit-evidence.md
rm -f evidence/_tests.txt evidence/_verify.json

echo
echo "DONE. Review evidence/emit-evidence.md, then commit:"
echo "  git add test/fixtures/op-signed.jpg evidence/emit-evidence.md"
echo "  git commit -m 'Emit-side (R1) evidence captured on a TSA-reachable host'"
echo "test/emit.test.mjs activates once op-signed.jpg is committed."
