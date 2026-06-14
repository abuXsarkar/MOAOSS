# open-provenance

**An open, offline, user-governed system for verifiable media provenance — and for
recovering it after it has been stripped.**

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
&nbsp;Built on the open [C2PA](https://c2pa.org) standard.

> As the marginal cost of convincing synthetic media falls to zero, society loses its
> shared ability to ask *"did this actually happen?"* The tractable answer is not universal
> **detection** of fakes — which is brittle and adversarial — but verifiable
> **provenance**: signed, content-bound statements about how a piece of media came to be.
> open-provenance makes that verification a neutral public good: **offline, with no
> gatekeeper, and epistemically honest.**

📄 **Technical report / paper:** [`docs/paper/`](docs/paper/) (LaTeX, arXiv-bound). Please
[cite this repository](CITATION.cff) if you use it in research.

---

## Three principles

1. **Verification is a public good.** No account, no server, no network at verification
   time — the signer's certificate travels inside the file, so anyone can verify locally,
   even on an old phone in a browser.
2. **Trust is user-governed.** The verifier ships **no** default trust list. *You* decide
   whose signatures to trust by supplying your own anchors; the system validates the
   signer's certificate chain against them. A verifier that imposed a trust list would be a
   gatekeeper over what counts as "real."
3. **It is honest.** A verdict of *verified* asserts the provenance chain is intact — never
   that the depicted events are true. The **absence** of provenance is treated as
   uninformative, **never** as evidence of fakery (no "liar's dividend").

## The verdict model

| Verdict | Meaning |
| --- | --- |
| ✅ **Verified** | Manifest present; signatures and content hashes check out (chain integrity). |
| ⚠️ **No credentials** | No provenance found. Uninformative — *not* evidence of manipulation. |
| ❌ **Invalid** | Manifest present but altered after signing / chain broken. |

…reported **orthogonally** to trust — *trusted* / *untrusted* / *unchecked* — so a valid
signature from a party you don't trust is shown as a warning, never an endorsement.

## What's here

| Component | Path | What it does |
| --- | --- | --- |
| **CLI verifier** | [`projects/open-provenance`](projects/open-provenance) | Offline verdict on a file (`node src/verify.mjs <file>`). |
| **Browser verifier** | [`projects/open-provenance/web`](projects/open-provenance/web) | Zero-backend WASM page — drop a file, verify locally, fully offline. |
| **Signing** | `projects/open-provenance/tools/sign.mjs` | Sign an image; optionally tag it AI-generated. |
| **AI-generated detection** | shared classifier | Flags the IPTC `digitalSourceType` marker (Nano Banana, GPT-image, Seedance, …) when credentials are intact. |
| **User-governed trust lists** | [`projects/open-provenance/trust`](projects/open-provenance/trust) | Validate signers against anchors *you* choose. |
| **Durable recovery** | [`projects/open-provenance/durable`](projects/open-provenance/durable) | Recover provenance after metadata stripping (fingerprint registry + watermark). |
| **Evaluation harness** | `projects/open-provenance/eval` | Regenerates every number/figure in the paper. |

## Quick start

```bash
cd projects/open-provenance
npm install
node src/verify.mjs path/to/image.jpg     # offline verdict; --json for machine output
npm test                                   # verdict classifier unit tests

cd web && npm install && npm run dev       # offline browser verifier
```

## Honest scope

- **Signing is opt-in; verification is universal.** Only content someone chose to sign
  carries credentials, so "no credentials" is the common case in the wild.
- **We cannot read proprietary watermarks** (e.g. SynthID). Once a third-party AI image is
  stripped of its C2PA metadata, the open ecosystem cannot recover its provenance. Durable
  recovery protects content that passes through *participating* signers.
- **Durable results are on a synthetic corpus** so far (AUC = 1.0 for fingerprint recovery
  after resize + JPEG transport); natural-image benchmarks are future work. See the paper's
  Limitations.

## Reproducibility

```bash
cd projects/open-provenance && python3 eval/durable_eval.py   # writes eval/results/*
```

Every table and figure in the paper is regenerated from this harness; versions and seeds
are pinned.

## Project origin & methodology

This work began under a broader open-source effort; its governance and the clean-room /
honest-claims discipline that carries into this project live in
[`docs/`](docs/) and [`governance/`](governance/).

## License

[Apache-2.0](LICENSE). Built on the open C2PA standard; original work, no proprietary
source. Each component declares its license per [`governance/LICENSING.md`](governance/LICENSING.md).
