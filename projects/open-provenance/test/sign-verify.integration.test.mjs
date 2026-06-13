// End-to-end integration test for the VERIFIED path: sign a real image with the bundled
// C2PA test certificate, then verify it. Signing needs outbound HTTP to a timestamp
// authority, so this test SKIPS cleanly where that egress is unavailable (e.g. the
// sandboxed CI box) and runs for real where it is (e.g. the project VM). Verification
// itself never needs the network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createC2pa, createTestSigner, ManifestBuilder } from 'c2pa-node';
import { classify, Verdict } from '../src/verdict.mjs';

const plain = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/plain.jpg');

test('sign then verify -> VERIFIED with an untrusted-signer warning', async (t) => {
  const buffer = await readFile(plain);

  const signer = await createTestSigner();
  if (process.env.TSA_URL) signer.tsaUrl = process.env.TSA_URL;
  const c2pa = createC2pa({ signer });

  const manifest = new ManifestBuilder({
    claim_generator: 'open-provenance-test/1.0',
    format: 'image/jpeg',
    title: 'integration sample',
    assertions: [{ label: 'c2pa.actions', data: { actions: [{ action: 'c2pa.created' }] } }],
  });

  let signed;
  try {
    signed = await c2pa.sign({ asset: { buffer, mimeType: 'image/jpeg' }, manifest });
  } catch (err) {
    t.skip(`signing unavailable here (likely no timestamp-authority egress): ${err.message}`);
    return;
  }

  // Verification is fully offline.
  const store = await c2pa.read({ buffer: signed.signedAsset.buffer, mimeType: 'image/jpeg' });
  const r = classify(store);

  assert.equal(r.verdict, Verdict.VERIFIED);
  assert.equal(r.tool, 'open-provenance-test/1.0');
  assert.ok(r.trustWarnings.length >= 1, 'the test certificate must be flagged as untrusted');
});
