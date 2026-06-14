# Paper: open-provenance

A technical report on the open-provenance system, targeting an arXiv preprint and a
citable Zenodo DOI. Every quantitative claim is regenerated from the evaluation harness, so
the paper stays honest and reproducible.

## Files

- `main.tex` — the paper.
- `references.bib` — bibliography. **Verify each entry against its primary source before
  submission** (venues/years were filled from memory and should be confirmed).
- `tables/e1_watermark.tex`, `figures/roc.png` — generated artifacts (do not hand-edit).
- `refresh-results.sh` — re-run the evaluation and copy artifacts back in.

## Reproduce the numbers, then build

```bash
# 1. Regenerate tables/figures from measurements
./refresh-results.sh

# 2. Build the PDF (needs a TeX distribution: texlive, MacTeX, or tectonic)
latexmk -pdf main.tex        # or: pdflatex main && bibtex main && pdflatex main && pdflatex main
# or, single binary:
tectonic main.tex
```

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

Draft. The evaluation is real but on a synthetic corpus; treat quantitative claims as
indicative pending natural-image benchmarks.
