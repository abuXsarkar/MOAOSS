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

## Trust list (user-controlled, v0.4)

Open the **⚙ Trust list** panel and paste the PEM certificate(s) of the root authorities
*you* choose to trust. The toolkit then cryptographically validates each signer's
certificate chain against **your** anchors — there is no central gatekeeper — and the
result shows one of:

- **✓ Trusted signer** — chains to an anchor on your list.
- **⚠ Not trusted** — signature valid, but the signer is not on your list.
- **ⓘ Trust not checked** — no list configured; the signer name is shown as claimed.

The list is stored only in this browser (`localStorage`) and trust validation runs fully
offline — no network fetching is enabled.

## Recovery registry — the front door, in the browser

When an image has **no** credentials, the app can still try to recover provenance from a
registry *you* load (the **🧬 Recovery registry** panel). The perceptual fingerprint is
computed in your browser and matched locally — **fully offline, nothing uploaded**. The JS
fingerprint matches the Python/OpenCV one **bit-for-bit** (regression-tested in
`test/phash.test.mjs`), so a registry produced by the durable tools works here directly:

```bash
# build a registry with the CLI/server, then paste registry.json into the panel
python3 durable/registry.py register signed.jpg --id urn:example:1
```

This browser path covers re-compression and scaling. Crop-robust ORB recovery is heavier and
stays in the CLI/`verify_any.py`/server. A no-credentials image with no registry match reads
as an honest **unknown** — never "fake."

## Honest limits (this version)

- **A trust list is only as good as what you put in it.** With no list configured, the
  signer name is *as claimed*, not confirmed.
- **Images first.** Video/audio containers are a later milestone.

## Deploy (GitHub Pages)

A workflow at [`.github/workflows/deploy-pages.yml`](../../../.github/workflows/deploy-pages.yml)
builds this app and publishes it to GitHub Pages on pushes to `main` (or manually via the
Actions tab). **One-time setup:** in the repo, go to **Settings → Pages → Source: "GitHub
Actions"**. After that, the verifier is live at `https://<owner>.github.io/<repo>/`. The
build uses a relative base, so it works correctly under the Pages subpath and stays fully
offline once loaded.

## Stack

[`c2pa`](https://www.npmjs.com/package/c2pa) (the CAI's WASM JS SDK) + Vite. The WASM and
worker are emitted into the build so the page is self-contained.
