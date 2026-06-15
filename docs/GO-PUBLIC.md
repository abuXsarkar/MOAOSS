# Go-public checklist

What it takes to turn this from a feature branch into a public, shareable project. Items
marked **(you)** are GitHub-settings actions I can't perform; the rest are prepared in-repo.

## 1. Make it real

- [ ] **(you) Rename the repository** to `open-provenance` (Settings → General → rename).
      GitHub auto-redirects old URLs.
- [ ] **(you) Set the default branch** to `main`: rename `claude/open-source-repo-setup-vz46n0`
      → `main` (Settings → Branches), or create `main` from it and set it default. (There is
      currently no separate `main`; this branch *is* the default, so a PR would be empty — a
      rename/set-default is the right move, not a PR.)
- [ ] **(you) Set the repo description and topics** (suggested below).
- [ ] **(you) Tag a release** `v0.1.0` (see `CHANGELOG.md`) — this also enables a Zenodo DOI
      if you connect the GitHub–Zenodo integration first.

### Suggested repository metadata

> **Description:** Open, offline, no-gatekeeper verifier for media provenance (C2PA Content
> Credentials), with durable recovery and an honest "unknown" for unsigned media.

> **Topics:** `c2pa`, `content-credentials`, `provenance`, `media-authenticity`,
> `deepfakes`, `ai-generated`, `watermarking`, `perceptual-hashing`, `offline`,
> `webassembly`, `open-source`

## 2. The live demo (highest-leverage)

- [ ] **(you) Enable GitHub Pages**: Settings → Pages → Source: **GitHub Actions**. The
      workflow (`.github/workflows/deploy-pages.yml`) builds the browser verifier and
      publishes it. Once a build runs on the default branch, the demo is live at
      `https://<owner>.github.io/open-provenance/`.
- [ ] Add the live URL to the README header and the repo "Website" field.

A one-click "drag an image, verify locally, offline" URL is the most shareable artifact —
prioritise it.

## 3. The paper

- [ ] arXiv (cs.CR / cs.CV): submit `docs/paper/` (main.tex + references.bib + tables/ +
      figures/). Note: cs.CR can require an endorsement for a first submission.
- [ ] Zenodo DOI via the GitHub release; add the DOI badge to the README.

## 4. Announce

- [ ] Publish the findings post (`docs/blog/findings.md`) — topical, links to the live demo.
- [ ] "Show HN" using `docs/blog/show-hn.md`.
- [ ] Reach out: the CAI / C2PA open-source community, WITNESS, Starling Lab, and
      journalism/deepfake-tech circles.

## Pre-flight (already done)

- [x] Apache-2.0 license, `CITATION.cff`, `CONTRIBUTING`, `CHANGELOG`.
- [x] Tests green (read-side interop proven; emit-side activates once `op-signed.jpg` is
      committed from a TSA-reachable host — see `evidence/`).
- [x] Paper compiles (9 pp), citations of the load-bearing works verified.
- [x] No secrets, no proprietary source, honest scope throughout.
