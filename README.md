# MOAOSS — Mother of All Open Source Software

> A curated effort to build **legitimate, clean-room open-source alternatives** to the
> most useful software in the world — and to do it in a way that is legally defensible,
> well-documented, and genuinely reusable.

## What this project is

MOAOSS develops two kinds of software the world needs:

1. **Original public-good infrastructure** — profound projects that should exist as
   neutral commons (e.g. [`projects/open-provenance`](projects/open-provenance), an
   offline-first digital-authenticity verifier).
2. **Clean-room open alternatives** to widely-used proprietary software — built from
   public specifications and observable behavior, **never** from a competitor's source
   code, the same way **Wine**, **ReactOS**, **GIMP**, and **LibreOffice** were built.

The constant across both is **legal soundness**: every line we publish, we have the right
to publish. Licensing follows [`governance/LICENSING.md`](governance/LICENSING.md), which
defines an open-source track and an honestly-labeled source-available / non-commercial
track.

## What this project is **not**

- ❌ It is **not** a place to upload proprietary/leaked source code.
- ❌ It is **not** "read the original source and rewrite it." Reproducing functionality
  from someone else's source — no matter how much you paraphrase — creates a
  **derivative work**. Open-sourcing a derivative work does not remove the original
  copyright; it just republishes the infringement.

If you want a rewrite to be a true clean-room implementation, the engineers writing the
code **must not have seen the original source.** See [`docs/CLEANROOM.md`](docs/CLEANROOM.md).

## Repository layout

```
.
├── docs/         # Methodology, legal guardrails, contributor process
├── governance/   # How software is selected, reviewed, and accepted
├── specs/        # Behavioral specifications (the "clean" side of the wall)
└── projects/     # Individual reimplementations, each self-contained
```

## How a reimplementation gets built (the short version)

1. **Select** a target and confirm there is genuine value in an open alternative
   (`governance/SELECTION.md`).
2. **Specify** its observable behavior from public, lawful sources — docs, standards,
   file formats, UI behavior, network protocols. Written by the *specification team*.
3. **Implement** purely from that spec, by an *implementation team* that has never seen
   the original source (`docs/CLEANROOM.md`).
4. **Review** for provenance, licensing, and a passing test suite
   (`governance/REVIEW.md`).
5. **Publish** under an OSI-approved license.

## Status

🚧 Early scaffolding. The methodology and governance are being established first, on
purpose — they are what make the rest of the project defensible.

## License

Project scaffolding and documentation are licensed under [Apache-2.0](LICENSE). Each
project under `projects/` declares its own license and track per
[`governance/LICENSING.md`](governance/LICENSING.md).
