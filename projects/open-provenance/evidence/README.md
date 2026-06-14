# Conformance evidence

Captured, reproducible evidence that the system does what it claims.

## Read-side (R2) — committed, runs in CI

Our verifier reads a **third-party**-signed C2PA image (`test/fixtures/third-party-C.jpg`,
signed by `c2pa-rs`, not us) as VERIFIED. Asserted by `test/interop.test.mjs`; no network
needed.

## Emit-side (R1) — captured on a TSA-reachable host

Signing requires a timestamp authority, which the development sandbox blocks. To capture
emit-side evidence, run on a networked machine (e.g. the project VM):

```bash
cd projects/open-provenance
bash scripts/capture-emit-evidence.sh
git add test/fixtures/op-signed.jpg evidence/emit-evidence.md && git commit -m "R1 evidence"
```

This writes `emit-evidence.md` here (test output + the verification of a sample signed by
this project) and a signed fixture that activates `test/emit.test.mjs` in CI thereafter.
