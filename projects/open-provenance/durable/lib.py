"""Shared primitives for durable provenance: perceptual fingerprint, transport
transforms, robust watermark embed/extract, and crop-robust ORB keypoint matching."""
import base64

import cv2
import numpy as np
from imwatermark import WatermarkEncoder, WatermarkDecoder

PAYLOAD_BITS = 64
METHOD = "dwtDctSvd"
PHASH_BITS = 64
ORB_MIN_INLIERS = 12

_ORB = cv2.ORB_create(nfeatures=1500)
_BF = cv2.BFMatcher(cv2.NORM_HAMMING)


def phash_bits(img, n=8):
    """64-bit DCT perceptual hash as a boolean array (low-frequency structure)."""
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.resize(g, (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32)
    d = cv2.dct(g)[:n, :n].flatten()
    return d > np.median(d[1:])


def bits_to_hex(bits):
    return int("".join("1" if b else "0" for b in bits), 2).to_bytes(len(bits) // 8, "big").hex()


def hex_to_bits(h):
    return np.unpackbits(np.frombuffer(bytes.fromhex(h), np.uint8)).astype(bool)


def hamming(a, b):
    return int((a != b).sum())


def jpeg(img, q):
    ok, enc = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, q])
    return cv2.imdecode(enc, cv2.IMREAD_COLOR)


def rescale_roundtrip(img, factor):
    h, w = img.shape[:2]
    small = cv2.resize(img, (int(w * factor), int(h * factor)), interpolation=cv2.INTER_AREA)
    return cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)


def embed_watermark(img, payload: bytes):
    enc = WatermarkEncoder()
    enc.set_watermark("bytes", payload)
    return enc.encode(img, METHOD)


def extract_watermark(img, nbits=PAYLOAD_BITS):
    return WatermarkDecoder("bytes", nbits).decode(img, METHOD)


# --- crop-robust local features (ORB + RANSAC) -------------------------------------------
# Returned as (pts, des): pts is an Nx2 float32 array of keypoint coordinates, des the ORB
# descriptors. This plain form serializes cleanly into a registry (unlike cv2.KeyPoint).

def orb_features(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    kp, des = _ORB.detectAndCompute(g, None)
    pts = np.float32([k.pt for k in kp]) if kp else np.zeros((0, 2), np.float32)
    return pts, des


def orb_inliers(q, d):
    """Number of geometrically consistent (RANSAC homography) matches between two
    (pts, des) feature sets. Robust to cropping: a crop keeps many original keypoints."""
    (qp, qd), (dp, dd) = q, d
    if qd is None or dd is None or len(qd) < 4 or len(dd) < 4:
        return 0
    good = []
    for pair in _BF.knnMatch(qd, dd, k=2):
        if len(pair) == 2 and pair[0].distance < 0.75 * pair[1].distance:
            good.append(pair[0])
    if len(good) < 4:
        return len(good)
    src = qp[[m.queryIdx for m in good]].reshape(-1, 1, 2)
    dst = dp[[m.trainIdx for m in good]].reshape(-1, 1, 2)
    _, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    return int(mask.sum()) if mask is not None else 0


def orb_to_blob(feat):
    pts, des = feat
    return {
        "pts": pts.tolist(),
        "des": base64.b64encode(des.tobytes()).decode() if des is not None else None,
        "dcols": int(des.shape[1]) if des is not None else 0,
    }


def orb_from_blob(b):
    pts = np.float32(b["pts"]) if b.get("pts") else np.zeros((0, 2), np.float32)
    des = (np.frombuffer(base64.b64decode(b["des"]), np.uint8).reshape(-1, b["dcols"])
           if b.get("des") else None)
    return pts, des


def synth(seed, size=512):
    """Distinct, smooth, photo-like images (sum of low-frequency sinusoids)."""
    rng = np.random.default_rng(seed)
    yy, xx = (np.mgrid[0:size, 0:size].astype(np.float32) / size)
    acc = np.zeros((size, size), np.float32)
    for _ in range(5):
        fx, fy = rng.uniform(1, 6, 2)
        acc += np.sin(2 * np.pi * (fx * xx + fy * yy) + rng.uniform(0, 6.28)) * rng.uniform(20, 60)
    g = np.clip(128 + acc, 0, 255).astype(np.uint8)
    return cv2.merge([g, np.roll(g, 30, 0), np.roll(g, 60, 1)])
