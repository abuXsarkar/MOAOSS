# Changelog

All notable changes to open-provenance are recorded here.

## v0.1.0 — first public release

The first coherent release: an open, offline, user-governed system for verifiable media
provenance, built on the C2PA standard, plus a durable recovery layer and a finalized
technical report.

### Verification
- **Offline CLI verifier** (`src/verify.mjs`) with an honest three-state verdict
  (verified / no-credentials / invalid) and a separate trust state.
- **Zero-backend browser verifier** (`web/`): drag-and-drop, verifies locally in WebAssembly,
  no upload, fully offline; combined verdict + trust + AI at-a-glance view.
- **Unified "verify any image" front door** (`verify_any.py`): C2PA → AI marker → durable
  recovery → honest *unknown*.

### Trust & participation
- **User-governed trust lists** (`trust/`): validate signers against anchors *you* choose;
  no built-in default. Cryptographic chain validation in the browser.
- **Participant SDK** (`src/participant.mjs`) + signing CLI: the minimal path for anyone to
  sign and join the chain. Emits standard C2PA.
- **Reference participant integration** (`examples/participant-server/`): sign-and-register,
  or preserve-and-register received credentials.
- **Interoperability**: reads any standard C2PA (proven against a third-party-signed asset);
  emits standard C2PA (round-trip conformance).

### AI & durability
- **AI-generated detection** via the IPTC `digitalSourceType` marker.
- **Durable recovery** (`durable/`): recover provenance after metadata stripping — perceptual
  fingerprint (recompression/scaling) + crop-robust ORB keypoint matching, with a registry.
- Browser recovery reuses a perceptual hash that matches the Python one **bit-for-bit**.

### Research artifact
- **Technical report** (`docs/paper/`, LaTeX → PDF): threat model, formal verdict/trust
  definitions, natural-image (Kodak) evaluation, adoption model, conclusion.
- **Reproducible evaluation** (`eval/`): regenerates every table and figure.

### Honest scope
- Verification is universal; signing is opt-in — "no credentials" is the common case and is
  never treated as evidence of fakery.
- Cannot read proprietary watermarks (e.g. SynthID); durable recovery protects participating
  signers' content.
- Evaluation is on 24 Kodak images; web-scale and adversarial benchmarks are future work.

Licensed under Apache-2.0.
