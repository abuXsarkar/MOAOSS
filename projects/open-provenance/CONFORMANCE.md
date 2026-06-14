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

## R2 — Read any standard C2PA

The verifier (`src/verify.mjs`, web app) runs the C2PA **reference toolkit**, so it reads any
valid C2PA manifest regardless of the signer — Adobe, OpenAI, Google, a camera, or another
open-provenance participant. This is architectural: we do not special-case signers.

To confirm against third-party content, verify a Content-Credentials image from any public
source (e.g. an Adobe Firefly or camera sample):

```bash
node src/verify.mjs third-party-signed.jpg --json
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
