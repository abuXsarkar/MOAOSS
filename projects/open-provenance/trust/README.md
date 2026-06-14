# Trust lists & trust anchors

A trust list is what turns "this signature is cryptographically valid" into "and the
signer is who they claim to be." This document explains where trust anchors come from and
how `open-provenance` uses them — **with the user, not us, in control of the list.**

## The model

A C2PA manifest is signed with an X.509 certificate that chains up to a Certificate
Authority (CA) — the same PKI model as HTTPS. *Validating* the signature proves the bytes
weren't altered. *Trusting* it requires that the signer's certificate chains to a **trust
anchor** (a root you have decided to trust).

`open-provenance` reports three states (see [`../docs/TRUST.md`](../docs/TRUST.md) if
present, and `src/verdict.mjs`):

- **trusted** — the signer chains to an anchor on your list.
- **untrusted** — a trust engine checked and the signer is *not* on your list.
- **unchecked** — no list configured (or the verifier has no trust engine, e.g. the CLI).

## Where anchors come from (no central gatekeeper)

There is deliberately **no built-in default trust list.** You choose, by adopting one or
more of:

1. **The C2PA / Content Authenticity Initiative published trust list.** The C2PA project
   publishes a list of known signer CAs (cameras, editing software, AI vendors). Adopting
   it is *your* opt-in choice — fetch it and load it (see `fetch-production-trustlist.sh`).
2. **Your own organizational roots.** E.g. a newsroom that trusts only its own issued
   certificates, or a specific set of vendors.
3. **Per-context curation.** Trust only the anchors relevant to a given investigation.

This is the point of the design: a verifier that *imposed* a trust list would be a
gatekeeper deciding whose content is "real." Here, the trust decision is yours.

## Files here

- `c2pa-test-anchor.pem` — the **C2PA test** intermediate CA. It validates images signed
  with the public c2pa test key (e.g. `tools/make-sample.mjs`). It exists so you can *see*
  the "Trusted ✓" path work in a demo. **It is not a production trust list** — the test
  signing key ships in every c2pa install, so trusting it trusts everyone. The web UI
  loads it only behind an explicit "testing only" control.
- `fetch-production-trustlist.sh` — downloads the official C2PA production trust anchors on
  a machine with open network access (this repo's build sandbox blocks the host). Review
  what you fetch before trusting it.

## Security notes

- Treat your trust list as security-critical configuration. Anything on it, you trust.
- Prefer pinning to **root** anchors and (optionally) an allow-list of end-entity
  certificate hashes for tighter control.
- Revocation (OCSP/CRL) is not yet handled offline; a revoked-but-still-chaining cert
  would currently read as trusted. This is on the roadmap and is stated as a known limit.
