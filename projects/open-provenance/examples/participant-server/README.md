# Reference participant integration (upload handler)

A minimal, copy-paste example of how a **platform** becomes a provenance participant by
wiring two behaviours into its upload pipeline. Adapt it; don't deploy it as-is.

```bash
cd projects/open-provenance && npm install
node examples/participant-server/server.mjs        # listens on :8088
```

## Endpoints

### `POST /upload?id=<id>&ai=<bool>` — sign + register

The platform becomes the **originating signer**: it signs incoming content (starting the
chain of traceability at upload) and registers it for durable recovery. Returns the signed
bytes with an `X-Manifest-Id` header.

```bash
curl -X POST --data-binary @photo.jpg -H 'content-type: image/jpeg' \
  'http://localhost:8088/upload?id=urn:platform:123' -o signed.jpg
```

> Signing contacts a timestamp authority, so this path needs outbound network. Supply your
> real signer via env: `OP_CERT`, `OP_KEY`, `OP_GENERATOR`, `OP_TSA`.

### `POST /ingest?id=<id>` — preserve + register

For content that arrives **already signed**, the platform **preserves** the credentials
(instead of stripping them) and registers the fingerprint so provenance survives later
re-encoding. Runs anywhere — no signing.

```bash
curl -X POST --data-binary @signed.jpg -H 'content-type: image/jpeg' \
  'http://localhost:8088/ingest?id=urn:platform:123'
# -> { "status":"ingested", "verdict":"VERIFIED", "signer":"...", "tool":"...", ... }
```

Verified locally against the Content Authenticity team's third-party sample
(`test/fixtures/third-party-C.jpg`): it is ingested as `VERIFIED`, while an unsigned image is
`rejected` ("no credentials to preserve").

## Why both paths matter

- **`/upload`** seeds provenance for content created on the platform.
- **`/ingest`** is the antidote to the dominant real-world failure — platforms stripping
  C2PA. Preserving + registering received credentials is what makes verification work for
  *what users actually have*, not just what the platform produced.

## Configuration

| Env | Meaning | Default |
| --- | --- | --- |
| `PORT` | listen port | `8088` |
| `OP_CERT` / `OP_KEY` | signer certificate / private key (PEM) | test signer |
| `OP_GENERATOR` | claim generator string | `example-platform/1.0` |
| `OP_TSA` | timestamp authority URL | DigiCert |
| `OP_REGISTRY` | durable registry path | `./registry.json` |
