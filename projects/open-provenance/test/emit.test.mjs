// Emit-side conformance (CONFORMANCE.md R1): a sample signed by THIS project reads VERIFIED,
// with our claim generator and AI marker preserved. The fixture is produced on a
// TSA-reachable machine via scripts/capture-emit-evidence.sh and committed; until then this
// skips. Verification itself needs no network, so once the fixture exists this runs in CI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createC2pa } from 'c2pa-node';
import { classify, Verdict } from '../src/verdict.mjs';

const f = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/op-signed.jpg');

test('our signed sample reads VERIFIED with AI marker (emit-side R1)', async (t) => {
  if (!existsSync(f)) {
    return t.skip('run scripts/capture-emit-evidence.sh on a TSA-reachable host, commit fixtures/op-signed.jpg');
  }
  const store = await createC2pa().read({ buffer: await readFile(f), mimeType: 'image/jpeg' });
  const r = classify(store);
  assert.equal(r.verdict, Verdict.VERIFIED);
  assert.equal(r.tool, 'open-provenance-evidence/1.0');
  assert.equal(r.aiGenerated, true);
});
