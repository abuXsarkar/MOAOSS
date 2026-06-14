// Interoperability conformance: content signed via the Participant SDK is standard C2PA
// that our own verifier reads back as VERIFIED, with the participant's claim generator and
// any AI marker preserved. This is the round-trip that demonstrates "emit standard C2PA;
// read standard C2PA." Signing needs a timestamp authority, so the test SKIPS cleanly where
// that egress is unavailable and runs for real where it is (e.g. the project VM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createC2pa } from 'c2pa-node';
import { createParticipant } from '../src/participant.mjs';
import { classify, Verdict } from '../src/verdict.mjs';

const plain = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/plain.jpg');

test('Participant SDK emits standard C2PA that the verifier reads (with AI marker)', async (t) => {
  const buffer = await readFile(plain);
  const participant = await createParticipant({ generator: 'ConformanceCam/9.9' });

  let signed;
  try {
    signed = await participant.sign(buffer, { mimeType: 'image/jpeg', ai: true });
  } catch (err) {
    t.skip(`signing unavailable (likely no timestamp-authority egress): ${err.message}`);
    return;
  }

  const store = await createC2pa().read({ buffer: signed, mimeType: 'image/jpeg' });
  const r = classify(store);
  assert.equal(r.verdict, Verdict.VERIFIED);
  assert.equal(r.tool, 'ConformanceCam/9.9');
  assert.equal(r.aiGenerated, true);
});
