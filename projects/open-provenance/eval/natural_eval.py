#!/usr/bin/env python3
"""Natural-image evaluation of the durable-provenance layer.

This is the realistic counterpart to the synthetic harness, addressing the (correct)
criticism that smooth sinusoids flatter perceptual hashing. It runs on the Kodak natural
images and adds the transform the synthetic study omitted: center cropping, which is where
perceptual hashing and frequency-domain watermarking genuinely degrade.

Experiments:
  N1  Watermark robustness on natural images: BER + exact-recovery vs JPEG quality & scale.
  N2  Durable recovery ROC under social-media transport (resize 0.7 + JPEG 40), using a
      rigorous leave-one-out mated/impostor split (no synthetic 'stranger' population).
  N3  Crop sensitivity: recovery rate vs center-crop fraction -- the honest stress test.

Corpus: eval/corpus/*.png  (fetch with eval/fetch_corpus.sh).
Outputs: eval/results/nat_*.{csv,tex}, eval/results/nat_roc.png.
Run: python3 eval/natural_eval.py   (from projects/open-provenance)
"""
import csv
import glob
import hashlib
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "durable"))
from lib import (PAYLOAD_BITS, embed_watermark, extract_watermark, hamming, jpeg,  # noqa: E402
                 phash_bits, rescale_roundtrip)

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.join(HERE, "corpus")
OUT = os.path.join(HERE, "results")
os.makedirs(OUT, exist_ok=True)

JPEG_QUALITIES = [90, 70, 50, 30]
SCALES = [1.0, 0.70]
CROP_KEEP = [1.00, 0.90, 0.80, 0.70, 0.60, 0.50, 0.40, 0.30]


def load_corpus():
    paths = sorted(glob.glob(os.path.join(CORPUS, "*.png")) + glob.glob(os.path.join(CORPUS, "*.jpg")))
    if len(paths) < 4:
        sys.exit(f"error: need >=4 images in {CORPUS}; run eval/fetch_corpus.sh "
                 f"(found {len(paths)}).")
    return [cv2.imread(p) for p in paths]


# Crop-robust recovery via ORB keypoints + RANSAC geometric verification. Unlike a global
# perceptual hash, local features survive cropping: a crop still contains many of the
# original keypoints, and a homography consensus confirms the match.
_ORB = cv2.ORB_create(nfeatures=1500)
_BF = cv2.BFMatcher(cv2.NORM_HAMMING)
ORB_MIN_INLIERS = 12


def orb_features(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return _ORB.detectAndCompute(g, None)  # (keypoints, descriptors)


def orb_inliers(qf, df):
    (qk, qd), (dk, dd) = qf, df
    if qd is None or dd is None or len(qd) < 4 or len(dd) < 4:
        return 0
    good = []
    for pair in _BF.knnMatch(qd, dd, k=2):
        if len(pair) == 2 and pair[0].distance < 0.75 * pair[1].distance:
            good.append(pair[0])
    if len(good) < 4:
        return len(good)
    src = np.float32([qk[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([dk[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    return int(mask.sum()) if mask is not None else 0


def center_crop_rescale(img, keep):
    if keep >= 1.0:
        return img
    h, w = img.shape[:2]
    ch, cw = int(h * keep), int(w * keep)
    y0, x0 = (h - ch) // 2, (w - cw) // 2
    return cv2.resize(img[y0:y0 + ch, x0:x0 + cw], (w, h), interpolation=cv2.INTER_LINEAR)


def ber(a, b):
    ba = np.unpackbits(np.frombuffer(a, np.uint8))
    bb = np.unpackbits(np.frombuffer(b, np.uint8))
    n = min(len(ba), len(bb))
    return float((ba[:n] != bb[:n]).mean())


def payload_for(i):
    return hashlib.sha256(f"nat-{i}".encode()).digest()[: PAYLOAD_BITS // 8]


def write_csv(path, rows):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)


def n1_watermark(imgs):
    rows = []
    for q in JPEG_QUALITIES:
        for s in SCALES:
            bers, exact = [], 0
            for i, img in enumerate(imgs):
                wm = embed_watermark(img, payload_for(i))
                t = jpeg(wm if s == 1.0 else rescale_roundtrip(wm, s), q)
                rec = extract_watermark(t)
                bers.append(ber(payload_for(i), rec)); exact += int(rec == payload_for(i))
            rows.append({"jpeg_q": q, "scale": s,
                         "mean_ber": round(float(np.mean(bers)), 4),
                         "exact_rate": round(exact / len(imgs), 4)})
    return rows


def n2_roc(imgs):
    reg = [phash_bits(img) for img in imgs]
    # social-media transport
    queries = [phash_bits(jpeg(rescale_roundtrip(img, 0.70), 40)) for img in imgs]
    mated, impostor = [], []
    for i, q in enumerate(queries):
        mated.append(hamming(q, reg[i]))
        impostor.append(min(hamming(q, reg[j]) for j in range(len(reg)) if j != i))
    roc = []
    for thr in range(0, 33):
        tpr = float(np.mean([d <= thr for d in mated]))
        fpr = float(np.mean([d <= thr for d in impostor]))
        roc.append({"threshold": thr, "tpr": round(tpr, 4), "fpr": round(fpr, 4)})
    pts = sorted({(r["fpr"], r["tpr"]) for r in roc})
    xs = [p[0] for p in pts] + [1.0]; ys = [p[1] for p in pts] + [1.0]
    trapz = getattr(np, "trapezoid", None) or np.trapz
    auc = float(trapz(ys, xs))
    # Equal-error rate
    eer = min(roc, key=lambda r: abs(r["tpr"] - (1 - r["fpr"])))
    return roc, auc, mated, impostor, eer


def n3_crop(imgs):
    """Crop sensitivity, comparing the global perceptual hash against crop-robust ORB
    keypoint matching. Crop severity is expressed as the RETAINED center fraction r."""
    reg_ph = [phash_bits(img) for img in imgs]
    reg_orb = [orb_features(img) for img in imgs]
    rows = []
    for keep in CROP_KEEP:
        ph_correct, orb_correct = 0, 0
        for i, img in enumerate(imgs):
            # crop, then mild recompression (a crop in the wild is also re-encoded)
            t = jpeg(center_crop_rescale(img, keep), 70)
            # pHash nearest neighbour
            qph = phash_bits(t)
            ph_correct += int(min(range(len(reg_ph)), key=lambda j: hamming(qph, reg_ph[j])) == i)
            # ORB nearest neighbour with an inlier floor
            qf = orb_features(t)
            scores = [orb_inliers(qf, reg_orb[j]) for j in range(len(reg_orb))]
            best = int(np.argmax(scores))
            orb_correct += int(best == i and scores[best] >= ORB_MIN_INLIERS)
        rows.append({"retained": keep,
                     "phash_recovery": round(ph_correct / len(imgs), 4),
                     "orb_recovery": round(orb_correct / len(imgs), 4)})
    return rows


def latex_table(rows, cols, headers, path, fmt):
    spec = "r" * len(cols)
    lines = [r"\begin{tabular}{" + spec + "}", r"\toprule",
             " & ".join(headers) + r" \\", r"\midrule"]
    for r in rows:
        lines.append(" & ".join(fmt[c](r[c]) for c in cols) + r" \\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    open(path, "w").write("\n".join(lines) + "\n")


def plot_roc(roc, auc):
    try:
        import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
    except Exception:
        return False
    plt.figure(figsize=(4, 4))
    plt.plot([0, 1], [0, 1], "--", color="#bbb")
    plt.plot([r["fpr"] for r in roc], [r["tpr"] for r in roc], "-o", ms=3,
             color="#b42318", label=f"AUC = {auc:.3f}")
    plt.xlabel("False-match rate (impostor)"); plt.ylabel("Recovery rate (mated)")
    plt.title("Durable recovery ROC — Kodak (resize 0.7 + JPEG 40)")
    plt.legend(loc="lower right"); plt.tight_layout()
    plt.savefig(os.path.join(OUT, "nat_roc.png"), dpi=150); return True


def main():
    imgs = load_corpus()
    print(f"corpus: {len(imgs)} natural images")

    n1 = n1_watermark(imgs); write_csv(os.path.join(OUT, "nat_e1_watermark.csv"), n1)
    latex_table(n1, ["jpeg_q", "scale", "mean_ber", "exact_rate"],
                ["JPEG $q$", "scale", "mean BER", "exact-rec."],
                os.path.join(OUT, "nat_e1_watermark.tex"),
                {"jpeg_q": lambda v: f"{v}", "scale": lambda v: f"{v:.2f}",
                 "mean_ber": lambda v: f"{v:.3f}", "exact_rate": lambda v: f"{v:.2f}"})

    roc, auc, mated, impostor, eer = n2_roc(imgs)
    write_csv(os.path.join(OUT, "nat_e2_roc.csv"), roc)
    figured = plot_roc(roc, auc)

    n3 = n3_crop(imgs); write_csv(os.path.join(OUT, "nat_e3_crop.csv"), n3)
    latex_table(n3, ["retained", "phash_recovery", "orb_recovery"],
                ["retained $r$", "pHash recovery", "ORB recovery"],
                os.path.join(OUT, "nat_e3_crop.tex"),
                {"retained": lambda v: f"{v:.2f}", "phash_recovery": lambda v: f"{v:.2f}",
                 "orb_recovery": lambda v: f"{v:.2f}"})

    summary = {
        "n_images": len(imgs), "auc": round(auc, 4),
        "eer_threshold": eer["threshold"], "eer_tpr": eer["tpr"], "eer_fpr": eer["fpr"],
        "mean_mated_distance": round(float(np.mean(mated)), 2),
        "mean_impostor_distance": round(float(np.mean(impostor)), 2),
        "phash_recovery_r70": next(r["phash_recovery"] for r in n3 if r["retained"] == 0.70),
        "orb_recovery_r70": next(r["orb_recovery"] for r in n3 if r["retained"] == 0.70),
        "phash_recovery_r80": next(r["phash_recovery"] for r in n3 if r["retained"] == 0.80),
        "orb_recovery_r80": next(r["orb_recovery"] for r in n3 if r["retained"] == 0.80),
    }
    write_csv(os.path.join(OUT, "nat_summary.csv"), [summary])
    print("\n--- natural-image summary ---")
    for k, v in summary.items():
        print(f"  {k}: {v}")
    print(f"\nWatermark exact-recovery at q=50,scale=1.0: "
          f"{next(r['exact_rate'] for r in n1 if r['jpeg_q']==50 and r['scale']==1.0)}")
    print(f"ROC figure: {figured} -> {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
