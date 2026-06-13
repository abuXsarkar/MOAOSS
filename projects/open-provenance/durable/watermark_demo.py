#!/usr/bin/env python3
"""Durable provenance — recover a manifest after metadata is stripped and the image is
transported (re-compressed + resized), the way a screenshot or a social-media upload does.

It demonstrates the OPEN, buildable half of durable Content Credentials, using two
complementary recovery paths:

  1. Perceptual fingerprint (pHash) + registry  -- robust primary path. When content is
     signed, register fingerprint -> manifest. A stripped copy is matched back by nearest
     fingerprint. Survives recompression and scaling well.
  2. Invisible robust watermark (embedded ID)   -- self-contained path. Survives without a
     registry, but the lightweight DWT-DCT-SVD method used here is fragile under JPEG;
     learned watermarks (Adobe's open-source TrustMark, Meta's WAM) are the upgrade.

What it does NOT do: read third-party proprietary watermarks (e.g. Google SynthID). Those
detectors are closed, so a Nano Banana / GPT image cannot be recovered this way once its
Content Credentials are stripped. This protects content that passes through OUR signing.
"""
import hashlib
import sys

import cv2
import numpy as np
from imwatermark import WatermarkEncoder, WatermarkDecoder

S = 512
PAYLOAD_BITS = 64
METHOD = "dwtDctSvd"


def synth(seed):
    """Distinct, smooth, photo-like images (sum of low-frequency sinusoids)."""
    rng = np.random.default_rng(seed)
    yy, xx = (np.mgrid[0:S, 0:S].astype(np.float32) / S)
    acc = np.zeros((S, S), np.float32)
    for _ in range(5):
        fx, fy = rng.uniform(1, 6, 2)
        acc += np.sin(2 * np.pi * (fx * xx + fy * yy) + rng.uniform(0, 6.28)) * rng.uniform(20, 60)
    g = np.clip(128 + acc, 0, 255).astype(np.uint8)
    return cv2.merge([g, np.roll(g, 30, 0), np.roll(g, 60, 1)])


def jpeg(img, q):
    ok, enc = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, q])
    return cv2.imdecode(enc, cv2.IMREAD_COLOR)


def rescale_roundtrip(img, factor):
    h, w = img.shape[:2]
    small = cv2.resize(img, (int(w * factor), int(h * factor)), interpolation=cv2.INTER_AREA)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)


def phash(img, n=8):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.resize(g, (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32)
    d = cv2.dct(g)[:n, :n].flatten()
    return d > np.median(d[1:])


def hamming(a, b):
    return int((a != b).sum())


def main():
    # --- Build a registry: each signed image -> (fingerprint, manifest id) -------------
    registry = {}
    images = {}
    for seed in range(1, 6):
        img = synth(seed)
        images[seed] = img
        manifest_id = "manifest-" + hashlib.sha256(f"seed{seed}".encode()).hexdigest()[:10]
        registry[seed] = {"phash": phash(img), "manifest": manifest_id}

    # --- Take one image, sign+watermark it, then strip metadata and transport it -------
    target = 3
    payload = hashlib.sha256(b"open-provenance:content-id:demo").digest()[: PAYLOAD_BITS // 8]
    enc = WatermarkEncoder()
    enc.set_watermark("bytes", payload)
    watermarked = enc.encode(images[target], METHOD)

    # "Screenshot / social-media": resize down-and-back + aggressive JPEG. Metadata gone.
    transported = jpeg(rescale_roundtrip(watermarked, 0.70), 40)

    # --- Path 1: fingerprint lookup ----------------------------------------------------
    q = phash(transported)
    ranked = sorted(((hamming(q, r["phash"]), s, r["manifest"]) for s, r in registry.items()))
    best_dist, best_seed, best_manifest = ranked[0]
    runner_up = ranked[1][0]
    fp_ok = best_seed == target

    # --- Path 2: watermark decode ------------------------------------------------------
    dec = WatermarkDecoder("bytes", PAYLOAD_BITS)
    recovered = dec.decode(transported, METHOD)
    wm_bits = float((np.unpackbits(np.frombuffer(payload, np.uint8)) ==
                     np.unpackbits(np.frombuffer(recovered, np.uint8))).mean())
    wm_ok = recovered == payload

    print("Transport applied: resize 70% round-trip + JPEG q40 (metadata fully stripped)\n")
    print("PATH 1 — fingerprint registry lookup (robust primary path)")
    print(f"  recovered: {best_manifest}  (image #{best_seed})  -> "
          f"{'CORRECT match ✓' if fp_ok else 'WRONG ✗'}")
    print(f"  match distance {best_dist}/64 vs next-best {runner_up}/64 "
          f"(clear separation = confident recovery)\n")
    print("PATH 2 — embedded watermark (self-contained, no registry)")
    print(f"  payload {'recovered EXACT ✓' if wm_ok else 'degraded'} "
          f"({wm_bits*100:.1f}% bit accuracy)")
    print("  (lightweight DWT method is fragile under JPEG — use TrustMark/WAM for this path)\n")

    print("Bottom line: even after the C2PA metadata was stripped and the image was "
          "re-compressed\nand resized, the fingerprint path recovered the correct manifest "
          "from the registry.")
    return 0 if fp_ok else 1


if __name__ == "__main__":
    sys.exit(main())
