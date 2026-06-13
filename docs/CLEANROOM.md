# Clean-Room Methodology

A clean-room (or "Chinese wall") reimplementation is legally defensible **only** when the
people who write the new code never had access to the original code. This document is the
contract that keeps MOAOSS on the right side of that line.

## Why this is strict

Copyright protects the *expression* of software (its source code), not the *ideas,
functions, or behaviors* it implements. You may lawfully reproduce behavior. You may not
lawfully copy or adapt the original expression. The only reliable way to prove your
expression is independent is to ensure the implementers **never saw the original**.

Famous precedent: Phoenix Technologies clean-roomed the IBM PC BIOS this way, which is
what made the PC-clone industry legal.

## The two-team firewall

### Specification team ("dirty" side — only if a lawful original is studied at all)

- May study the target **only through lawful means**: published documentation,
  standards, public APIs, file formats, observable input/output behavior, and legally
  purchased/licensed copies used within their license terms.
- May **not** decompile, disassemble, or read source code obtained without a license to
  do so.
- Produces a **behavioral specification**: what the software does, not how its code is
  written. No code snippets, no copied comments, no structural mirroring.

### Implementation team ("clean" side)

- Works **only** from the approved specification in `specs/`.
- Must attest (`docs/ATTESTATION.md`) that they have not seen the original source.
- If they have prior exposure to the original source, they are disqualified from that
  project.

A document only crosses the wall after a reviewer confirms it contains specification,
not expression.

## Hard rules

1. **No proprietary or leaked source code enters this repository — ever.** Not in
   history, not in branches, not in issues, not in `specs/`.
2. **No decompiler/disassembler output** of software you lack the right to reverse
   engineer.
3. Specs cite **public, lawful sources** for every non-obvious behavioral claim.
4. Every project records who was on which team (`PROVENANCE.md` per project).
5. When in doubt, it does not cross the wall.

## What is fair game

- Public standards (RFCs, ECMA, ISO, W3C, POSIX, etc.)
- Vendor-published documentation and SDK reference material
- File-format and protocol descriptions
- Black-box observation of a lawfully obtained copy
- Existing permissively-licensed open-source code (with attribution and license
  compatibility)

## What is never fair game

- Source code you don't have a license to copy from
- Decompiled/disassembled binaries you lack reverse-engineering rights to
- "Rewriting" or "paraphrasing" someone else's source
- Assets (icons, sounds, trademarks) owned by the original vendor
