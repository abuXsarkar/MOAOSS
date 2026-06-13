# open-provenance — web verifier (v0.2)

A zero-backend, **fully offline** browser page that verifies the Content Credentials
(C2PA provenance) of an image. Drop in a file and it tells you, in plain language, whether
the provenance chain is intact — using a local WebAssembly engine.

**Your file never leaves the device.** Verification runs entirely in the browser; the SDK
is configured with `fetchRemoteManifests: false` and OCSP/remote fetching disabled, so no
network calls are made during verification.

It reuses the exact same honest-verdict logic as the CLI ([`../src/verdict.mjs`](../src/verdict.mjs)),
via a small adapter ([`src/adapt.js`](src/adapt.js)) that normalizes the web SDK's manifest
store into the shared shape.

## Run it

```bash
cd projects/open-provenance/web
npm install

npm run dev        # local dev server with hot reload
# or, a production build that is self-contained and offline-capable:
npm run build      # outputs dist/ (includes the WASM engine + worker locally)
npm run preview    # serve the built dist/ over HTTP
```

The built `dist/` is a static folder: copy it onto any machine and serve it with any
static file server (workers + WASM require http(s), not `file://`). Once loaded, it works
with no network.

## Honest limits (this version)

- **Identity-trust is not yet enforced.** A VERIFIED result means the provenance chain is
  cryptographically intact — the signer name is shown **as claimed**, not confirmed
  against a trust list. User-controlled trust lists are roadmap v0.4. The UI states this
  explicitly so no one over-trusts a self-signed manifest.
- **Images first.** Video/audio containers are a later milestone.

## Stack

[`c2pa`](https://www.npmjs.com/package/c2pa) (the CAI's WASM JS SDK) + Vite. The WASM and
worker are emitted into the build so the page is self-contained.
