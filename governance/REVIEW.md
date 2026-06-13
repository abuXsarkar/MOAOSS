# Review & Acceptance

Before any reimplementation is published it must pass these reviews.

## Provenance review

- [ ] All contributors listed in the project's `PROVENANCE.md` with team assignment.
- [ ] Implementation-team members have signed the attestation (`docs/ATTESTATION.md`).
- [ ] No original/proprietary source, decompiler output, or vendor assets present
      anywhere in the project or its git history.
- [ ] Specs cite public, lawful sources.

## License review

- [ ] Project declares an OSI-approved license.
- [ ] All dependencies are license-compatible and recorded.
- [ ] No vendor trademarks used in a way that implies endorsement or origin.

## Engineering review

- [ ] Behavior matches the spec; deviations are documented.
- [ ] Test suite passes in CI.
- [ ] Build and usage are documented.

## Heavy compute / test infrastructure

Large reimplementations may need real compute for test suites, fuzzing, or interop
testing. Record any external infrastructure used (CI runners, VMs, hosted services) in
the project README so results are reproducible. Credentials and infrastructure access are
never committed to the repository.
