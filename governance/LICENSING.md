# Licensing Policy

MOAOSS hosts two kinds of projects, on two licensing tracks. Every project declares its
track in its `README.md`.

## Track A — Open Source (OSI-approved)

For public-good infrastructure that benefits from the widest possible adoption — things
the whole world should be able to embed freely.

- **License:** an OSI-approved license. Default: **Apache-2.0** (permissive, patent grant,
  maximal embedding). Use a copyleft license (e.g. **AGPL-3.0**) instead when preventing
  proprietary capture matters more than reach.
- **What it means:** anyone may use, modify, redistribute, **and sell**. This is the real
  definition of "open source."
- **Examples in MOAOSS:** the authenticity/provenance tooling (`projects/open-provenance`).

## Track B — Source-Available / Non-Commercial

For projects with an intended commercial product, where the author sells finished goods
but wants the source public so people can run it themselves on their own hardware.

- **License:** **PolyForm Noncommercial 1.0.0** (clean, widely understood non-commercial
  source-available license).
- **What it means:** anyone may read, run, and modify the code for **non-commercial**
  purposes (including on old/personal devices). **Selling** it, or using it to run a
  commercial product/service, requires a separate commercial license from the author.
- **Honest labeling:** this is **NOT** "open source" by the OSI definition, because it
  restricts commercial use. We call it **source-available** / **non-commercial**, never
  "open source," to avoid misleading anyone.
- **Optional dual-licensing:** the author may additionally sell a commercial license to
  specific parties. That is compatible with this track.
- **Examples in MOAOSS:** the offline knowledge/tutor appliance (planned).

## Why we are strict about the label

Calling a non-commercial license "open source" causes real harm: it gets the project
rejected from package registries and Linux distributions, draws community backlash, and
misleads users about their rights. Accurate labeling protects both the project and the
people who rely on it.
