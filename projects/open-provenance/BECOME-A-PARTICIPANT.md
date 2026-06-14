# Become a provenance participant

Verification is only as useful as the breadth of *signing*. This is the minimal path for
**any** entity to become a participant — to start a chain of traceability at your point in
the pipeline. The output is **standard C2PA**, so it is verifiable by *any* C2PA tool, not
just this one. There is no membership, no gatekeeper, and no proprietary format.

## Who can participate

Anyone who produces, captures, or transforms media:

- **People** — sign your own photos/exports.
- **Apps & cameras** — sign at capture or on export.
- **AI generators** — sign output and mark it AI-generated (`ai: true`), so downstream
  verifiers can flag it (this is what Nano Banana, GPT-image, Seedance already do).
- **Platforms** (social networks, hosts, CDNs) — the highest-leverage participants: sign
  on ingest/transcode, and **preserve** credentials you receive instead of stripping them.

## How (SDK)

```js
import { createParticipant } from 'open-provenance/src/participant.mjs';

const p = await createParticipant({
  certPath: 'my-signer.pem',   // your X.509 cert chain
  keyPath:  'my-signer.key',   // your private key
  generator: 'MyApp/2.0',      // identifies you in the manifest
});

const signed = await p.sign(originalBytes, {
  mimeType: 'image/jpeg',
  ai: false,                   // true for generative output
  actions: ['c2pa.color_adjustments'],  // optional declared edits
});
// `signed` is standard C2PA — ship it. Any C2PA verifier can read it.
```

Or via CLI: `node tools/sign.mjs in.jpg --out signed.jpg --generator "MyApp/2.0" [--ai]`.
Omit a cert/key to experiment with the bundled **test** signer (not for production).

## Two responsibilities of a good participant

1. **Sign with a real certificate.** Obtain a signing certificate from a CA whose root
   others can choose to trust (see [`trust/README.md`](trust/README.md)). Self-signed works
   cryptographically but will read as *untrusted* until your anchor is on a verifier's list.
2. **Make it durable.** Metadata gets stripped in transit. Register your signed content with
   the durable registry so provenance can be recovered after stripping:
   ```bash
   python3 durable/registry.py register signed.jpg --id <manifest-id>
   ```
   See [`durable/README.md`](durable/README.md).

## What you get back

Your content now carries a verifiable statement of *who produced it, with what tool, when,
and what was declared* — checkable offline by anyone, and recoverable even after a platform
strips the metadata. The verifier reports your signature as **trusted** to any user who has
your anchor on their trust list, and **verified-but-untrusted** to others (never an
endorsement, never a forgery claim).

## The boundary (honest)

Participation covers *your* content from *your* point onward. It cannot retroactively prove
anything about media nobody signed — for which the only honest verdict is *no credentials /
unknown*. Universal coverage comes from universal signing, not from the verifier guessing.
