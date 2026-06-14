"""Shared primitives for durable provenance: perceptual fingerprint, transport
transforms, and robust watermark embed/extract. Pure functions, no I/O of registries."""
import cv2
import numpy as np
from imwatermark import WatermarkEncoder, WatermarkDecoder

PAYLOAD_BITS = 64
METHOD = "dwtDctSvd"
PHASH_BITS = 64


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
