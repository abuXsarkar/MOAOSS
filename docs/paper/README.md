# Paper: open-provenance

A technical report on the open-provenance system, targeting an arXiv preprint and a
citable Zenodo DOI. Every quantitative claim is regenerated from the evaluation harness, so
the paper stays honest and reproducible.

## Files

- `main.tex` — the paper.
- `references.bib` — bibliography. **Verify each entry against its primary source before
  submission** (venues/years were filled from memory and should be confirmed).
- `tables/n1_watermark.tex`, `tables/n3_crop.tex`, `figures/nat_roc.png` — generated from
  the natural-image (Kodak) evaluation (do not hand-edit).
- `refresh-results.sh` — fetch the corpus, re-run the evaluation, and copy artifacts in.

## Reproduce the numbers, then build

```bash
# 1. Regenerate tables/figures from measurements
./refresh-results.sh

# 2. Build the PDF
pdflatex -interaction=nonstopmode main.tex
bibtex main
pdflatex -interaction=nonstopmode main.tex
pdflatex -interaction=nonstopmode main.tex
# (or simply: latexmk -pdf main.tex)
```

### Verified build recipe

This document was compiled successfully (7 pages, no undefined references or citations).
On Debian/Ubuntu the required TeX packages are:

```bash
sudo apt-get install -y --no-install-recommends \
  texlive-latex-base texlive-latex-recommended texlive-latex-extra \
  texlive-fonts-recommended texlive-bibtex-extra
```

On macOS, MacTeX provides everything; `tectonic main.tex` also works if its bundle host is
reachable. A prebuilt `main.pdf` is committed for convenience.

## Path to arXiv + Zenodo DOI

1. **Reconcile prose numbers** with `projects/open-provenance/eval/results/summary.csv`
   (the abstract/§Evaluation cite AUC and Hamming distances).
2. **Verify all citations** in `references.bib`.
3. **Natural-image evaluation** before claiming generality (the current corpus is
   synthetic; see the paper's Limitations).
4. **arXiv:** submit `main.tex` + `references.bib` + `tables/` + `figures/` (arXiv runs
   its own LaTeX; include the generated artifacts, not a Makefile dependency on Python).
5. **Zenodo DOI:** enable the GitHub–Zenodo integration, then publish a GitHub Release; the
   `CITATION.cff` at the repo root makes the citation machine-readable. Add the resulting
   DOI badge to the root README.

## Status

Draft. The evaluation runs on the Kodak natural-image suite ($24$ photographs). Fingerprint
recovery is robust to recompression and scaling (AUC $=1.0$). A global perceptual hash
collapses under cropping, so a crop-robust local-feature path (ORB + RANSAC) is added — it
sustains full recovery down to $50\%$ retained area and $0.75$ at $30\%$ retained, where the
hash recovers nothing. The lightweight watermark fails by JPEG quality $\approx 50$. Web-scale
collision analysis, rotation/warp robustness, and learned watermarks are the next steps.
