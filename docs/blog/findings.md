# What AI image tools actually stamp into your pictures — and what survives a screenshot

*A field guide to content provenance, the gap nobody talks about, and a free way to check —
in your browser, offline.*

> Draft post for the open-provenance launch. Replace `DEMO_URL` with the live Pages URL and
> `REPO_URL` before publishing.

As of 2026, the big AI image generators don't just produce pictures — they *mark* them. The
question is whether those marks mean anything by the time the picture reaches you. The short
answer: sometimes, and less often than you'd hope. Here's the honest picture.

## Two kinds of mark, and they are not the same

Modern AI images carry up to two independent signals:

1. **C2PA Content Credentials** — signed metadata describing how the image was made (which
   model/tool, when, what edits). It's an open standard backed by Adobe, Google, OpenAI,
   Microsoft, and others. Anyone can verify it; the cryptographic certificate travels inside
   the file.
2. **Invisible pixel watermarks** — e.g. Google's **SynthID**, baked into the pixels
   themselves. Robust to re-compression and resizing.

The crucial difference: **C2PA is easy to read but easy to strip; SynthID survives but you
can't read it.** SynthID's detector is proprietary and gated. So for a stripped third-party
image, the open ecosystem genuinely cannot recover provenance — that gap is real, and we say
so plainly.

## What today's generators embed

- **Google "Nano Banana" (Gemini image)** — C2PA **and** SynthID.
- **OpenAI image models (GPT-image, Sora)** — C2PA **and** SynthID.
- **ByteDance Seedance** — visible watermark **and** C2PA, under China's AI-labeling law.

The good news: the industry converged on **C2PA** for the readable layer. The catch:

## The metadata gets stripped

Take a screenshot, or upload to most social platforms, and the C2PA manifest is usually
**gone**. That's why a verifier "only works for what we want, not what we have" — not because
signing is rare, but because credentials are destroyed in transit. The single most useful
thing a platform can do is *preserve* the credentials it receives instead of stripping them.

## So what can you actually do?

We built **open-provenance**, an open-source verifier with three principles:

- **Offline and gatekeeper-free.** Verify any image locally in your browser — no upload, no
  account, no server deciding what's "real." Try it: `DEMO_URL`.
- **Honest.** A green check means *the provenance chain is intact* — **not** that the events
  are real. And **"no credentials" never means "fake."** Absence is uninformative; treating
  it as proof of fakery is the "liar's dividend," and we refuse to do it.
- **You control trust.** Decide which signers you trust by loading your own anchors. We ship
  no default "list of legitimate signers," because that would make us the gatekeeper.

It also flags AI-generated content when the standard `digitalSourceType` marker is present —
so a still-intact Nano Banana / GPT-image / Seedance file is recognized as AI.

## Surviving the screenshot

For content that passes through *our* signing, we add a **durable** layer: a perceptual
fingerprint plus crop-robust keypoint matching, so provenance can be recovered after metadata
is stripped. On the Kodak benchmark it recovers content after re-compression and scaling, and
— with keypoint matching — after cropping away up to half the image. It does **not** read
SynthID; nothing open does. It protects participating signers' content. (Details and numbers:
the technical report in the repo.)

## The honest bottom line

A genuine tool should give *a* result for any image — and ours does: *verified*, *invalid*,
*AI-generated*, *recovered*, or an honest *unknown*. What no tool can do is manufacture a
provenance verdict for media nobody ever signed. Universal coverage comes from universal
*signing*, not from a verifier guessing. That's why the project is built to be adopted by
anyone — person, app, camera, or platform — using the same open standard, no private format.

Code, the browser demo, and the paper: `REPO_URL`. Apache-2.0. Contributions and signing
participants welcome.
