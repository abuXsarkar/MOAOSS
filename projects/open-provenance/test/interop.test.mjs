// Interoperability evidence (CONFORMANCE.md R2): our verifier reads STANDARD C2PA signed by
// a THIRD PARTY, not us. The fixture third-party-C.jpg is the Content Authenticity team's
// published sample (c2patool/sample/C.jpg), signed by c2pa-rs in 2022. Verification needs no
// network, so this runs everywhere and is permanent proof of "read any C2PA."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createC2pa } from 'c2pa-node';
import { classify, Verdict } from '../src/verdict.mjs';

const img = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/third-party-C.jpg');

test('reads a third-party-signed C2PA image as VERIFIED', async () => {
  const buffer = await readFile(img);
  const store = await createC2pa().read({ buffer, mimeType: 'image/jpeg' });
  const r = classify(store);
  assert.equal(r.verdict, Verdict.VERIFIED);
  // Signed by someone other than open-provenance: the c2pa-rs reference tooling.
  assert.match(r.tool ?? '', /c2pa-rs/);
  assert.equal(r.failures.length, 0);
});
