#!/usr/bin/env python3
"""Reproducible evaluation harness for the durable-provenance layer.

Generates the quantitative results used in the paper, from measurements (no hand-typed
numbers). Two experiments:

  E1  Watermark robustness: bit-error-rate and exact-recovery rate of the embedded
      content ID across JPEG quality and rescale factors.
  E2  Durable recovery: true-positive recovery rate of registered content after transport,
      and a threshold sweep giving an ROC (genuine vs. stranger queries) with AUC.

Outputs CSV (machine-readable) and LaTeX tables (\\input-able by the paper) under
eval/results/, plus an ROC figure if matplotlib is available.

Run: python3 eval/durable_eval.py   (from projects/open-provenance)
"""
import csv
import os
import sys

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "durable"))
from lib import (PAYLOAD_BITS, embed_watermark, extract_watermark, hamming, jpeg,  # noqa: E402
                 phash_bits, rescale_roundtrip, synth)

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
os.makedirs(OUT, exist_ok=True)

N_IMAGES = 24          # registry / genuine population
N_STRANGERS = 24       # unregistered population for false-match estimation
JPEG_QUALITIES = [95, 85, 70, 50, 30]
SCALES = [1.0, 0.85, 0.70, 0.60]
import hashlib


def payload_for(seed):
    return hashlib.sha256(f"id-{seed}".encode()).digest()[: PAYLOAD_BITS // 8]


def ber(a: bytes, b: bytes) -> float:
    ba = np.unpackbits(np.frombuffer(a, np.uint8))
    bb = np.unpackbits(np.frombuffer(b, np.uint8))
    n = min(len(ba), len(bb))
    return float((ba[:n] != bb[:n]).mean())


def e1_watermark_robustness():
    rows = []
    for q in JPEG_QUALITIES:
        for s in SCALES:
            bers, exact = [], 0
            for seed in range(1, N_IMAGES + 1):
                img = synth(seed)
                wm = embed_watermark(img, payload_for(seed))
                t = wm if s == 1.0 else rescale_roundtrip(wm, s)
                t = jpeg(t, q)
                rec = extract_watermark(t)
                bers.append(ber(payload_for(seed), rec))
                exact += int(rec == payload_for(seed))
            rows.append({"jpeg_q": q, "scale": s,
                         "mean_ber": round(float(np.mean(bers)), 4),
                         "exact_rate": round(exact / N_IMAGES, 4)})
    return rows


def e2_recovery_and_roc():
    # Register genuine population.
    registry = {seed: phash_bits(synth(seed)) for seed in range(1, N_IMAGES + 1)}

    # Genuine queries: each registered image, transported (resize 0.7 + JPEG 40).
    genuine = []  # (min_distance, correct_id_bool)
    for seed, _ in registry.items():
        t = jpeg(rescale_roundtrip(synth(seed), 0.70), 40)
        q = phash_bits(t)
        ranked = sorted((hamming(q, h), s) for s, h in registry.items())
        genuine.append((ranked[0][0], ranked[0][1] == seed))

    # Stranger queries: unregistered images, transported the same way.
    stranger = []  # min_distance to ANY registry entry
    for seed in range(1000, 1000 + N_STRANGERS):
        t = jpeg(rescale_roundtrip(synth(seed), 0.70), 40)
        q = phash_bits(t)
        stranger.append(min(hamming(q, h) for h in registry.values()))

    # Threshold sweep -> ROC.
    roc = []
    for thr in range(0, 33):
        tpr = float(np.mean([d <= thr and ok for d, ok in genuine]))
        fpr = float(np.mean([d <= thr for d in stranger]))
        roc.append({"threshold": thr, "tpr": round(tpr, 4), "fpr": round(fpr, 4)})

    # AUC via trapezoid over (fpr, tpr) sorted by fpr.
    pts = sorted({(r["fpr"], r["tpr"]) for r in roc})
    xs = [p[0] for p in pts] + [1.0]
    ys = [p[1] for p in pts] + [1.0]
    trapz = getattr(np, "trapezoid", None) or np.trapz
    auc = float(trapz(ys, xs))
    return roc, auc, genuine, stranger


def write_csv(path, rows):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def write_latex_e1(rows):
    lines = [r"\begin{tabular}{rrrr}", r"\toprule",
             r"JPEG $q$ & scale & mean BER & exact-recovery rate \\", r"\midrule"]
    for r in rows:
        lines.append(f"{r['jpeg_q']} & {r['scale']:.2f} & {r['mean_ber']:.3f} & {r['exact_rate']:.2f} \\\\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    open(os.path.join(OUT, "e1_watermark.tex"), "w").write("\n".join(lines) + "\n")


def maybe_plot_roc(roc, auc):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception:
        return False
    fpr = [r["fpr"] for r in roc]
    tpr = [r["tpr"] for r in roc]
    plt.figure(figsize=(4, 4))
    plt.plot([0, 1], [0, 1], "--", color="#bbb")
    plt.plot(fpr, tpr, "-o", ms=3, color="#1a56db", label=f"AUC = {auc:.3f}")
    plt.xlabel("False-match rate (strangers)")
    plt.ylabel("Recovery rate (genuine)")
    plt.title("Durable recovery ROC (resize 0.7 + JPEG 40)")
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(os.path.join(OUT, "roc.png"), dpi=150)
    return True


def main():
    print(f"E1: watermark robustness over {N_IMAGES} images, "
          f"{len(JPEG_QUALITIES)}x{len(SCALES)} conditions ...")
    e1 = e1_watermark_robustness()
    write_csv(os.path.join(OUT, "e1_watermark.csv"), e1)
    write_latex_e1(e1)

    print(f"E2: durable recovery + ROC ({N_IMAGES} genuine, {N_STRANGERS} strangers) ...")
    roc, auc, genuine, stranger = e2_recovery_and_roc()
    write_csv(os.path.join(OUT, "e2_roc.csv"), roc)

    tpr10 = next(r for r in roc if r["threshold"] == 10)
    g_correct = float(np.mean([ok for _, ok in genuine]))
    g_dist = np.mean([d for d, _ in genuine])
    s_dist = np.mean(stranger)
    figured = maybe_plot_roc(roc, auc)

    summary = {
        "n_images": N_IMAGES, "n_strangers": N_STRANGERS,
        "auc": round(auc, 4),
        "tpr_at_thr10": tpr10["tpr"], "fpr_at_thr10": tpr10["fpr"],
        "genuine_correct_nn": round(g_correct, 4),
        "mean_genuine_distance": round(float(g_dist), 2),
        "mean_stranger_distance": round(float(s_dist), 2),
    }
    write_csv(os.path.join(OUT, "summary.csv"), [summary])

    print("\n--- summary ---")
    for k, v in summary.items():
        print(f"  {k}: {v}")
    print(f"\nWatermark BER at (q=50, scale=0.85): "
          f"{next(r for r in e1 if r['jpeg_q']==50 and r['scale']==0.85)['mean_ber']}")
    print(f"ROC figure written: {figured}  ->  {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
