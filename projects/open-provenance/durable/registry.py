#!/usr/bin/env python3
"""Durable provenance registry — register signed content, then recover its manifest from a
stripped / transported copy.

When content is signed, we record its perceptual fingerprint (and optionally embed a
robust watermark) mapped to a manifest ID. If the file later loses its C2PA metadata (a
screenshot, a social-media upload), we recover the manifest by matching the fingerprint
back against the registry.

  register: image + manifest-id  ->  registry entry (fingerprint), optional watermarked copy
  recover:  stripped image       ->  nearest manifest-id within a distance threshold

This is the OPEN half of durable Content Credentials. It cannot read third-party
proprietary watermarks (e.g. SynthID); it protects content registered through this tool.
"""
import argparse
import datetime
import hashlib
import json
import os
import sys

import cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import (ORB_MIN_INLIERS, PAYLOAD_BITS, bits_to_hex, embed_watermark,
                 extract_watermark, hamming, hex_to_bits, orb_features, orb_from_blob,
                 orb_inliers, orb_to_blob, phash_bits)

DEFAULT_REGISTRY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "registry.json")
DEFAULT_THRESHOLD = 10  # max perceptual-hash Hamming distance (of 64) to call a match


def _load(path):
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {"version": 1, "entries": []}


def _save(path, reg):
    with open(path, "w") as f:
        json.dump(reg, f, indent=2)


def _read(image):
    img = cv2.imread(image)
    if img is None:
        raise SystemExit(f"error: cannot read image {image}")
    return img


def register(image, manifest_id, registry_path=DEFAULT_REGISTRY, watermark_out=None):
    img = _read(image)
    reg = _load(registry_path)
    reg["entries"] = [e for e in reg["entries"] if e["manifest_id"] != manifest_id]
    reg["entries"].append({
        "manifest_id": manifest_id,
        "phash": bits_to_hex(phash_bits(img)),          # robust to recompression/scaling
        "orb": orb_to_blob(orb_features(img)),          # robust to cropping
        "registered": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
    _save(registry_path, reg)
    if watermark_out:
        payload = hashlib.sha256(manifest_id.encode()).digest()[: PAYLOAD_BITS // 8]
        cv2.imwrite(watermark_out, embed_watermark(img, payload))
    return reg["entries"][-1]


def recover(image, registry_path=DEFAULT_REGISTRY, threshold=DEFAULT_THRESHOLD):
    """Recover a manifest id from a stripped/transported image. Tries the global perceptual
    hash first (robust to recompression/scaling); if that is not confident, falls back to
    crop-robust ORB keypoint matching."""
    img = _read(image)
    reg = _load(registry_path)
    if not reg["entries"]:
        return {"match": None, "reason": "empty registry"}

    # Path 1: perceptual hash nearest neighbour.
    q = phash_bits(img)
    ranked = sorted((hamming(q, hex_to_bits(e["phash"])), e["manifest_id"]) for e in reg["entries"])
    dist, mid = ranked[0]
    if dist <= threshold:
        return {"match": mid, "method": "phash", "distance": dist,
                "next_best_distance": ranked[1][0] if len(ranked) > 1 else None,
                "confident": True, "threshold": threshold}

    # Path 2: crop-robust ORB keypoint matching.
    qf = orb_features(img)
    scored = sorted(((orb_inliers(qf, orb_from_blob(e["orb"])), e["manifest_id"])
                     for e in reg["entries"] if e.get("orb")), reverse=True)
    if scored and scored[0][0] >= ORB_MIN_INLIERS:
        return {"match": scored[0][1], "method": "orb", "inliers": scored[0][0],
                "phash_distance": dist, "confident": True}

    return {"match": None, "method": None, "best_manifest_id": mid,
            "phash_distance": dist, "orb_inliers": scored[0][0] if scored else 0,
            "confident": False, "threshold": threshold}


def _main(argv=None):
    p = argparse.ArgumentParser(description="Durable provenance registry")
    p.add_argument("--registry", default=DEFAULT_REGISTRY)
    sub = p.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("register", help="register an image -> manifest id")
    r.add_argument("image")
    r.add_argument("--id", required=True, dest="manifest_id")
    r.add_argument("--watermark-out", help="also write a watermarked copy to this path")

    v = sub.add_parser("recover", help="recover the manifest id of a stripped image")
    v.add_argument("image")
    v.add_argument("--threshold", type=int, default=DEFAULT_THRESHOLD)

    a = p.parse_args(argv)
    if a.cmd == "register":
        e = register(a.image, a.manifest_id, a.registry, a.watermark_out)
        print(f"registered {e['manifest_id']}  phash={e['phash']}")
    else:
        res = recover(a.image, a.registry, a.threshold)
        if res["match"] and res.get("method") == "phash":
            print(f"RECOVERED: {res['match']}  (phash, distance {res['distance']}/64, "
                  f"next-best {res['next_best_distance']}/64)")
        elif res["match"]:
            print(f"RECOVERED: {res['match']}  (orb, {res['inliers']} geometric inliers)")
        else:
            print(f"NO CONFIDENT MATCH (best phash distance {res.get('phash_distance')}/64, "
                  f"orb inliers {res.get('orb_inliers')})")
    return 0


if __name__ == "__main__":
    sys.exit(_main())
