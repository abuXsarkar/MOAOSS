# Provenance

This project is **original work**, not a reimplementation of any proprietary software. It
builds on the **open C2PA standard** and the open-source `c2pa` reference library. As
such, the clean-room firewall in [`../../docs/CLEANROOM.md`](../../docs/CLEANROOM.md) is
not engaged here — there is no proprietary original to wall off.

We still record contributions for transparency.

| Contributor | Role |
| --- | --- |
| Abu Sufian Sarkar <abu@cyberdude.com> | Maintainer / author |

All dependencies must be license-compatible with Apache-2.0 and recorded here as they are
added.

| Dependency | Purpose | License | Pinned version |
| --- | --- | --- | --- |
| [`c2pa-node`](https://www.npmjs.com/package/c2pa-node) | C2PA manifest parsing & validation (CLI verifier) | Apache-2.0 / MIT (CAI) | 0.5.26 |
| [`c2pa`](https://www.npmjs.com/package/c2pa) | WASM C2PA SDK for in-browser offline verification (v0.2 web) | Apache-2.0 / MIT (CAI) | 0.30.17 |
| [`vite`](https://www.npmjs.com/package/vite) | Build tooling for the web verifier (dev dependency) | MIT | ^5.4.0 |
