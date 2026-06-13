#!/usr/bin/env node
// Dev utility: sign an image with the bundled C2PA test signer so the verifier can be
// exercised end-to-end. The test signer is NOT on any real trust list, so verifying its
// output should report VERIFIED *with a trust warning* — exactly the honest behavior we
// want to demonstrate.
//
// Usage: node tools/make-sample.mjs [input.jpg] [output.jpg]
import { readFile, writeFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { createC2pa, createTestSigner, ManifestBuilder } from 'c2pa-node';

const input = process.argv[2] || 'test/fixtures/plain.jpg';
const output = process.argv[3] || 'test/fixtures/signed.jpg';
const mime = extname(input).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

const buffer = await readFile(input);
// NOTE: signing here contacts an RFC-3161 timestamp authority (the bundled test signer
// defaults to timestamp.digicert.com). Run this where outbound HTTP to that host is
// allowed (e.g. a normal dev box / VM). Set TSA_URL to point at a different authority.
// This is a *signing*-time requirement only — verification is always fully offline.
const signer = await createTestSigner();
if (process.env.TSA_URL) signer.tsaUrl = process.env.TSA_URL;
const c2pa = createC2pa({ signer });

const manifest = new ManifestBuilder({
  claim_generator: 'open-provenance-sample/1.0',
  format: mime,
  title: 'open-provenance signed sample',
  assertions: [
    { label: 'c2pa.actions', data: { actions: [{ action: 'c2pa.created' }] } },
  ],
});

const { signedAsset } = await c2pa.sign({ asset: { buffer, mimeType: mime }, manifest });
await writeFile(output, signedAsset.buffer);
process.stdout.write(`wrote signed sample -> ${output} (${signedAsset.buffer.length} bytes)\n`);
