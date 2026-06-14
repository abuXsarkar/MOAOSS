# Interoperability & conformance

The architecture is universally adoptable only if it is genuinely interoperable with the
open standard, not a private dialect. Two requirements, both testable:

## R1 — Emit standard C2PA

Content produced by the Participant SDK / `tools/sign.mjs` is a standard C2PA asset readable
by **any** C2PA verifier (ours, Adobe's, the `c2pa` CLI, etc.). We do not invent a tag.

Conformance test (round-trips sign → verify):

```bash
node --test test/conformance.test.mjs
```

It signs with the SDK and reads the result back with the C2PA toolkit, asserting the verdict
is VERIFIED with the participant's claim generator and AI marker preserved. (Signing needs a
timestamp authority; the test skips where that egress is blocked and runs on a networked
machine.)

To capture **committable** R1 evidence on a TSA-reachable host (e.g. the project VM):

```bash
bash scripts/capture-emit-evidence.sh   # signs a sample, verifies it, writes evidence/
```

This produces `evidence/emit-evidence.md` and a signed fixture that activates
`test/emit.test.mjs` (which then proves R1 in CI without network). See [`evidence/`](evidence/).

## R2 — Read any standard C2PA

The verifier (`src/verify.mjs`, web app) runs the C2PA **reference toolkit**, so it reads any
valid C2PA manifest regardless of the signer — Adobe, OpenAI, Google, a camera, or another
open-provenance participant. This is architectural: we do not special-case signers.

**Evidence (in-repo):** `test/fixtures/third-party-C.jpg` is the Content Authenticity team's
published sample (`c2patool/sample/C.jpg`), signed by `c2pa-rs` in 2022 — i.e. *not by us*.
Our verifier reports it `VERIFIED` (signer `C2PA Test Signing Cert`, tool
`make_test_images/0.12.0 c2pa-rs/0.12.0`). The interop test asserts this and needs no network:

```bash
node --test test/interop.test.mjs
node src/verify.mjs test/fixtures/third-party-C.jpg --json   # or: python3 verify_any.py ...
```

## R3 — Credential preservation (for platforms)

The dominant real-world failure is not missing signatures but **stripping**: platforms
discard C2PA metadata on upload/transcode. A conformant platform participant should either
**preserve** received Content Credentials, or **re-sign** on egress and chain the original as
an ingredient. Where preservation is out of a participant's control, the durable layer
(fingerprint + keypoint + watermark registry) is the recovery path of last resort. Verifying
that credentials survive a given platform is a manual round-trip: sign, upload, download,
re-verify.

## Non-goals

We do not certify or gatekeep participants. Conformance here means *technical*
interoperability with C2PA, not membership in any program.
