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

- **v0.1** — Offline image verifier (engine + CLI), honest verdict model. *(current)*
- **v0.2** — WASM build + a zero-backend "drop a file, verify locally" web page.
- **v0.3** — Signing at point of capture.
- **v0.4** — User-controlled trust lists & revocation, no central authority.
- **v0.5** — Video/audio; decentralized provenance anchoring.

## Proposed stack

**Rust** core (the reference `c2pa` implementation is Rust; clean path to WASM and to a
single static CLI binary), with a thin CLI first and a WASM target in v0.2. Open to
revisiting — if a different stack better serves "runs on the oldest possible devices,"
say so before we commit.

## License

[Apache-2.0](LICENSE). Original work building on the open C2PA standard.
