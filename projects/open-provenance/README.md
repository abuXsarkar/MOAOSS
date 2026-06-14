# open-provenance

> Make digital authenticity **verifiable by anyone, anywhere, offline** — so humanity
> keeps the ability to ask "did this actually happen?" as synthetic media becomes
> indistinguishable from real.

**Track:** Open Source — **Apache-2.0** (see [`../../governance/LICENSING.md`](../../governance/LICENSING.md))
**Status:** 🚧 v0.x — scoping the first capability

---

## The problem

Generative AI is erasing the line between captured reality and fabrication — for images,
audio, video, and documents. That line is load-bearing for journalism, courts, elections,
science, and ordinary trust. A verification layer for "what is real" **must be a neutral
public good**: a single company or government owning the arbiter of truth is a
contradiction. That is exactly why this has to be open source.

## What already exists (and what we will NOT reinvent)

The standard is largely solved:

- **C2PA** (Coalition for Content Provenance and Authenticity) — the open technical
  standard for cryptographically-signed content provenance ("Content Credentials").
- **Content Authenticity Initiative (CAI)** and the open-source **`c2pa` Rust library**,
  which implements signing and verification of the C2PA manifest format.

We build **on** this. We do not reinvent the cryptography or the manifest format.

> NOTE: confirm the current version and license of the upstream `c2pa` library before
> taking a dependency, and pin it. (Egress to package registries from this environment
> may need allowlisting — see the repo network notes.)

## The actual gap: reach and trust-without-a-gatekeeper

Verification today is rare, often online-only, and tends to route through vendor servers.
The public good that's missing is **ubiquitous, offline, self-contained verification** —
something a journalist in the field, a court clerk, or a person on an old phone can run
with no network and no trusted third party watching.

## First capability (v0.1): the offline verifier

A small, dependency-light tool/library that, fully offline, takes a media file and
returns an **honest, human-readable verdict**:

| Verdict | Meaning |
| --- | --- |
| ✅ **Verified** | A valid Content Credentials manifest is present; signature and content hashes check out. Shows *who* signed it, *what tool* produced it, and *what edits* are declared — in plain language. |
| ⚠️ **No credentials** | No provenance data found. Stated honestly: this means we know **nothing** about authenticity — it is **not** evidence of fakery, and absence is not proof. |
| ❌ **Invalid** | A manifest is present but signature or hashes fail. The content was altered after signing, or the chain is broken. |

### Design constraints (these are the point)

1. **Fully offline.** No network calls during verification. Ever.
2. **No gatekeeper.** Trust anchors (which signers to trust) are user-inspectable and
   user-controllable, not hardcoded to one vendor.
3. **Universal reach.** Target a core engine that compiles to **WASM**, so the same
   verifier runs in a browser, on the edge, and on old/low-power devices.
4. **Honest about limits.** "Verified" means *the provenance chain is intact and signed by
   X* — it does **not** mean the depicted events are true. The UI must never overclaim.

### Out of scope for v0.1

Signing/capture, revocation & trust-list distribution, video/audio containers,
decentralized provenance anchoring, browser-extension packaging. These are the roadmap
below, deliberately deferred so v0.1 is finishable.

## Roadmap

- **v0.1** — Offline image verifier (engine + CLI), honest verdict model. ✅ done
- **v0.2** — WASM build + a zero-backend "drop a file, verify locally" web page. ✅ done
  (see [`web/`](web/README.md))
- **AI-generated detection** — flag the IPTC `digitalSourceType` marker (Nano Banana,
  GPT image, Seedance, etc.) in CLI and web. ✅ done
- **v0.3** — Signing (`tools/sign.mjs`): embed a signed manifest with your cert/key (or
  the test signer), declare actions, optionally mark content AI-generated. ✅ done
  (signing needs timestamp-authority egress; verification never does).
- **v0.4** — User-controlled trust lists, no central authority. ✅ done in the web verifier
  (paste your own trust anchors; the toolkit validates the signer chain against them,
  offline). The CLI library (c2pa-node) exposes no trust engine, so the CLI reports trust
  as *unchecked*; revocation handling remains future work.
- **v0.5** — Video/audio; decentralized provenance anchoring.
- **Durable credentials** — recover provenance after metadata is stripped, via a
  perceptual-fingerprint registry + robust watermark. 🧪 prototype in
  [`durable/`](durable/README.md).

## Stack

**Node.js + the Content Authenticity Initiative's C2PA libraries.** v0.1 uses
[`c2pa-node`](https://www.npmjs.com/package/c2pa-node) for the CLI verifier; v0.2 will
use the WASM-based [`c2pa`](https://www.npmjs.com/package/c2pa) JS SDK, which is built
precisely for client-side, offline, in-browser verification — exactly our reach goal.
(The Rust reference crate would also work, but `crates.io` is unreachable from the
current build environment; the JS/WASM path is both buildable here and a better fit for
"runs in any browser on old devices.")

## Try it

```bash
cd projects/open-provenance
npm install

# Verify a file (fully offline, no network calls):
node src/verify.mjs path/to/image.jpg          # human-readable verdict
node src/verify.mjs path/to/image.jpg --json    # machine-readable

# Run the unit tests (no native binding needed):
npm test
```

Exit codes: `0` verified, `3` no credentials, `4` invalid, `2` error.

### Or verify in the browser (v0.2, fully offline)

```bash
cd projects/open-provenance/web
npm install && npm run dev      # then open the printed URL and drop in an image
```

A zero-backend page that verifies locally with WebAssembly — nothing is uploaded. See
[`web/README.md`](web/README.md).

### Sign an image (v0.3)

```bash
node tools/sign.mjs input.jpg --out signed.jpg --generator "MyCamera/1.0"
node tools/sign.mjs input.jpg --out ai.jpg --ai      # mark as AI-generated
```

Use `--cert <pem> --key <pem>` for your own signer (omit to use the C2PA test signer).
Signing contacts a timestamp authority, so run it where outbound network is allowed.

### Generating a signed sample for testing

`tools/make-sample.mjs` signs an image with the bundled C2PA **test** certificate so you
can exercise the VERIFIED path:

```bash
node tools/make-sample.mjs test/fixtures/plain.jpg test/fixtures/signed.jpg
node src/verify.mjs test/fixtures/signed.jpg   # -> VERIFIED, with an "untrusted signer" warning
```

> **Signing needs network; verifying never does.** The test signer requests an RFC-3161
> timestamp from a timestamp authority, so `make-sample` must run where outbound HTTP to
> that host is allowed (a normal dev box, or the project VM). Point `TSA_URL` at your own
> authority if needed. This requirement is *signing*-only — `verify.mjs` makes no network
> calls. The test certificate is intentionally not on any trust list, which is why
> verifying its output correctly reports VERIFIED **with a trust warning**.

## License

[Apache-2.0](LICENSE). Original work building on the open C2PA standard.
