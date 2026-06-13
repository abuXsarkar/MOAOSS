# Contributing to MOAOSS

Thanks for wanting to help build legitimate open-source alternatives to important
software. Two rules matter more than all the others:

1. **Read [`docs/CLEANROOM.md`](docs/CLEANROOM.md) first.** It is what keeps this project
   legal.
2. **Never commit proprietary or leaked source code, decompiler output, or vendor assets
   — anywhere, including issues and git history.**

## Ways to contribute

- **Propose a target** — open a target-proposal issue (see
  [`governance/SELECTION.md`](governance/SELECTION.md)).
- **Write specifications** — turn lawful, public sources into behavioral specs in
  `specs/`.
- **Implement** — build from an approved spec, having never seen the original source.
  Sign the attestation in [`docs/ATTESTATION.md`](docs/ATTESTATION.md).
- **Review** — help with provenance, license, and engineering review
  ([`governance/REVIEW.md`](governance/REVIEW.md)).

## Project structure

Each reimplementation lives under `projects/<name>/` and contains at minimum:

```
projects/<name>/
├── README.md        # What it is, scope, build/usage, license
├── PROVENANCE.md    # Contributors + team assignment + attestations
└── LICENSE          # OSI-approved
```

## Commit hygiene

- Small, focused commits with clear messages.
- No secrets, credentials, or infrastructure access in the repo.
- CI must pass before merge.
