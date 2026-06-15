# Show HN draft

> Post when the live demo (Pages) and repo rename are done. Fill `DEMO_URL` / `REPO_URL`.
> Post from your own account; engage in the comments honestly (the honesty framing is the
> whole point — don't oversell).

## Title (pick one; ≤ 80 chars, no "Show HN:" hype)

- `Show HN: Open, offline verifier for media provenance (C2PA), no gatekeeper`
- `Show HN: Verify image provenance locally in your browser (C2PA, offline)`

## URL

`DEMO_URL`  (the live browser verifier — link the demo, not the repo, as the primary URL)

## Text

I built an open-source verifier for media provenance (C2PA / Content Credentials) with three
goals the big implementations underemphasize:

- **Offline, no gatekeeper.** It runs entirely in your browser (WebAssembly) — nothing is
  uploaded, and there's no built-in "list of legitimate signers." You choose which trust
  anchors to load. Verifying a provenance chain shouldn't require trusting a third party.

- **Honest about what it can't say.** A green check means the chain is intact, *not* that the
  image is true. And "no credentials" is shown as **unknown**, never as evidence of fakery —
  I really wanted to avoid the "absence = fake" trap.

- **Durable recovery.** Platforms strip C2PA metadata on upload, which is why verification
  feels useless in practice. For content that passes through a participating signer, I added a
  fingerprint + crop-robust keypoint registry that recovers provenance after the metadata is
  gone (survives re-compression, scaling, and cropping up to ~50% on the Kodak benchmark).

Honest limits, up front: it can't read proprietary watermarks like SynthID (those detectors
are closed), so it can't recover a stripped *third-party* AI image — nothing open can. And the
evaluation is on 24 images; web-scale and adversarial benchmarks are future work. It's
standard C2PA both ways (reads anyone's, emits standard), so it interoperates rather than
forking the standard.

There's a technical report in the repo with the threat model and numbers. Feedback —
especially on the trust model and the durable-recovery approach — very welcome.

Repo: `REPO_URL`
