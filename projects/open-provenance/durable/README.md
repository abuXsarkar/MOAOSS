# Durable provenance (experimental)

> Recover an image's provenance **even after its C2PA metadata has been stripped** by a
> screenshot or a social-media upload.

C2PA Content Credentials live in file metadata, which most platforms (and every
screenshot) discard. This module prototypes the open, buildable way to make provenance
survive that — the "durable Content Credentials" idea — and is honest about where the
open tooling currently falls short.

## The hard truth first

There are two kinds of pixel marks, and they are **not** equivalent:

- **Other vendors' proprietary watermarks** — e.g. Google **SynthID**. The detectors are
  closed / key-gated. **We cannot read them.** Once a Nano Banana / GPT-image / Seedance
  file is stripped of its C2PA metadata, *we have no open way to recover its provenance.*
  This is an unsolved problem in the open ecosystem, not a gap in this code.
- **Marks we add ourselves.** For content that passes through *our* signing, we can embed
  recovery signals so it survives transport. That is what this module does.

So this protects participating creators' content. It is not a universal "detect any AI
image after it's been screenshotted" tool — nothing open is.

## Two recovery paths

### 1. Perceptual fingerprint + registry  (robust, primary)

When content is signed, store `fingerprint(image) -> manifest` in a registry. A stripped,
transported copy is matched back by nearest fingerprint (perceptual hash). This survives
re-compression and scaling well, because the fingerprint is computed from low-frequency
image structure that those transforms preserve.

### 2. Invisible robust watermark  (self-contained, no registry)

Embed a short content ID directly in the pixels so the image carries its own pointer back
to the manifest. The lightweight DWT-DCT-SVD method in this demo is **fragile under JPEG**;
learned watermarks — Adobe's open-source **TrustMark** (built for C2PA soft binding) or
Meta's **WAM** — are the upgrade path for screenshot/crop robustness. (Those need model
weights downloaded at first run, which the current sandbox's egress blocks; run them on a
machine with open network access.)

## Demo & measured results

```bash
cd projects/open-provenance/durable
pip install -r requirements.txt
python3 watermark_demo.py
```

The demo registers 5 signed images, then takes one, **strips its metadata and transports
it (resize to 70% and back + JPEG quality 40)**, and recovers it. Representative result:

```
PATH 1 — fingerprint registry lookup (robust primary path)
  recovered: manifest-…  (image #3)  -> CORRECT match ✓
  match distance 0/64 vs next-best 26/64   (clear separation = confident recovery)

PATH 2 — embedded watermark (self-contained, no registry)
  payload degraded (62.5% bit accuracy)
  (lightweight DWT method is fragile under JPEG — use TrustMark/WAM for this path)
```

Takeaway that shaped the design: the **fingerprint path is the robust primary recovery
mechanism**; the embedded watermark is a complementary, self-contained pointer that needs
a *learned* method to be JPEG/screenshot-robust.

## Registry CLI (register / recover)

`registry.py` turns the recovery flow into a usable tool. Register signed content, then
recover its manifest from a stripped, transported copy:

```bash
cd projects/open-provenance/durable
pip install -r requirements.txt

# Register an image against a manifest id (optionally write a watermarked copy):
python3 registry.py register photo.jpg --id manifest-abc123 --watermark-out photo.wm.jpg

# Later, recover a screenshot/re-uploaded copy whose C2PA metadata is gone:
python3 registry.py recover screenshot.jpg
#   -> RECOVERED: manifest-abc123  (distance 2/64, next-best 26/64)
```

A match is only reported within a Hamming-distance threshold (default 10/64), so an
unregistered image is rejected rather than mis-attributed. Tests: `python3 -m unittest
test_registry`.

## How this fits the verifier

```
sign:    image ──► C2PA manifest (metadata)
                └─► fingerprint + (optional) watermark ──► registry: fp/ID → manifest

verify:  has C2PA metadata?  ──► verify normally (offline, the CLI/web tool)
         metadata stripped?  ──► fingerprint / watermark ──► registry lookup
                                   ──► retrieve original manifest ──► verify it
```

## Honest limitations

- **No third-party recovery.** Cannot read SynthID or other closed watermarks.
- **Registry required for Path 1.** Fingerprint recovery only works for content that was
  registered; it is a fuzzy match, so a distance threshold and collision handling are
  needed at scale. A decentralized, non-gatekeeper registry is the open design question.
- **Geometry.** Both paths tolerate recompression and scaling; heavy cropping, rotation,
  and large edits remain hard and need learned methods.
- **Prototype.** This is a proof of the recovery flow, not a production library yet.
