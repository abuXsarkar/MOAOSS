#!/usr/bin/env node
// Reference participant integration — a minimal upload handler a platform can adapt.
//
// It shows the two behaviours that make a platform a good provenance citizen:
//   POST /upload  -> SIGN incoming content (become the originating participant) AND register
//                    it for durable recovery. (Signing needs a timestamp authority.)
//   POST /ingest  -> for content that ARRIVES already signed: VERIFY it and register its
//                    fingerprint, i.e. PRESERVE credentials instead of stripping them.
//                    (No signing; runs anywhere.)
//
// Body is the raw image bytes (Content-Type: image/jpeg|png). This is intentionally
// dependency-light; a real service would slot this into its existing upload pipeline.
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createC2pa } from 'c2pa-node';
import { createParticipant } from '../../src/participant.mjs';
import { classify, Verdict } from '../../src/verdict.mjs';

const execFileP = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const PROJ = resolve(HERE, '..', '..');
const REGISTRY_PY = join(PROJ, 'durable', 'registry.py');
const REGISTRY_FILE = process.env.OP_REGISTRY || join(HERE, 'registry.json');
const PORT = Number(process.env.PORT || 8088);

const participantP = createParticipant({
  certPath: process.env.OP_CERT,     // your real signer in production
  keyPath: process.env.OP_KEY,
  generator: process.env.OP_GENERATOR || 'example-platform/1.0',
  tsaUrl: process.env.OP_TSA || 'http://timestamp.digicert.com',
});

const extFor = (m) => (m === 'image/png' ? '.png' : '.jpg');

async function register(buffer, mimeType, id) {
  const dir = await mkdtemp(join(tmpdir(), 'op-'));
  const f = join(dir, 'asset' + extFor(mimeType));
  try {
    await writeFile(f, buffer);
    await execFileP('python3', [REGISTRY_PY, '--registry', REGISTRY_FILE, 'register', f, '--id', id]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function readBody(req) {
  return new Promise((res, rej) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => res(Buffer.concat(chunks)));
    req.on('error', rej);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const mimeType = req.headers['content-type'] || 'image/jpeg';
  const json = (code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj, null, 2)); };

  if (req.method === 'GET' && url.pathname === '/') {
    return json(200, {
      service: 'open-provenance participant-server (reference)',
      endpoints: {
        'POST /upload?id=&ai=': 'sign incoming image and register it (needs a timestamp authority)',
        'POST /ingest?id=': 'verify already-signed image and register it (preserve credentials)',
      },
    });
  }

  if (req.method === 'POST' && url.pathname === '/upload') {
    const id = url.searchParams.get('id') || `urn:op:${Date.now()}`;
    const ai = url.searchParams.get('ai') === 'true';
    try {
      const participant = await participantP;
      const signed = await participant.sign(await readBody(req), { mimeType, ai });
      await register(signed, mimeType, id);
      res.writeHead(200, { 'content-type': mimeType, 'x-manifest-id': id });
      return res.end(signed);
    } catch (err) {
      return json(502, { error: 'sign failed', detail: String(err.message ?? err),
        hint: 'signing needs outbound network to a timestamp authority' });
    }
  }

  if (req.method === 'POST' && url.pathname === '/ingest') {
    const id = url.searchParams.get('id') || `urn:op:${Date.now()}`;
    try {
      const buffer = await readBody(req);
      const store = await createC2pa().read({ buffer, mimeType });
      const r = classify(store);
      if (r.verdict === Verdict.NO_CREDENTIALS) {
        return json(422, { status: 'rejected', reason: 'no credentials to preserve' });
      }
      await register(buffer, mimeType, id);   // preserve: remember it for durable recovery
      return json(200, { status: 'ingested', registered_as: id, verdict: r.verdict,
        signer: r.signer, tool: r.tool, aiGenerated: r.aiGenerated });
    } catch (err) {
      return json(500, { error: 'ingest failed', detail: String(err.message ?? err) });
    }
  }

  return json(404, { error: 'not found' });
});

server.listen(PORT, () => process.stdout.write(`participant-server listening on :${PORT}\n`));
