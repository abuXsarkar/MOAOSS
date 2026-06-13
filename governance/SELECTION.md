# Software Selection Criteria

Not everything deserves a reimplementation. A target enters MOAOSS only if it clears
these gates.

## 1. Genuine value gap

There must be a real reason an open alternative should exist:

- No adequate open-source option already exists, **or**
- Existing open options have a critical gap (interoperability, platform, license).

If a mature, well-licensed open-source equivalent already exists, **contribute to it
instead** of starting over.

## 2. Lawful specifiability

We must be able to specify the target's behavior from **public, lawful sources** —
documentation, standards, file formats, observable behavior. If the only way to
understand it is to read source we have no right to read, it is **rejected**.

## 3. Defined scope

"Reimplement all of Photoshop" is not a project. "Implement a PSD reader that round-trips
layers, masks, and common adjustment layers" is. Targets are decomposed into bounded,
testable capabilities.

## 4. Sustainable license

Output must ship under an OSI-approved license, compatible with any dependencies.

## Proposing a target

Open an issue using the target-proposal template covering: the value gap, the lawful
sources available to specify it, the proposed scope, and the intended license. A
maintainer reviews against the gates above before any `specs/` or `projects/` work
begins.

## On batches

We work in small, finishable batches. A batch is a list of **target names + scope**, not
a pile of source code. Source code of the originals never enters MOAOSS — see
[`docs/CLEANROOM.md`](../docs/CLEANROOM.md).
