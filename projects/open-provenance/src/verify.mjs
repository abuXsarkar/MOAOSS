#!/usr/bin/env node
// open-provenance: offline Content Credentials verifier (v0.1)
//
// Reads a media file and reports an honest verdict about its provenance. Runs fully
// locally — no network calls are made by this tool during verification.

import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { createC2pa } from 'c2pa-node';
import { classify, Verdict } from './verdict.mjs';

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.tif': 'image/tiff',
  '.tiff': 'image/tiff', '.heic': 'image/heic', '.gif': 'image/gif',
};

function mimeFor(path) {
  return MIME_BY_EXT[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

async function main(argv) {
  const args = argv.slice(2);
  const json = args.includes('--json');
  const file = args.find((a) => !a.startsWith('-'));

  if (!file || args.includes('-h') || args.includes('--help')) {
    process.stderr.write(
      'Usage: open-provenance <file> [--json]\n\n' +
      'Verifies C2PA Content Credentials in a media file, fully offline.\n' +
      'Exit codes: 0 verified, 3 no credentials, 4 invalid, 2 error.\n');
    return file ? 0 : 2;
  }

  let buffer;
  try {
    buffer = await readFile(file);
  } catch (err) {
    process.stderr.write(`error: cannot read ${file}: ${err.message}\n`);
    return 2;
  }

  const c2pa = createC2pa();
  let store;
  try {
    store = await c2pa.read({ buffer, mimeType: mimeFor(file) });
  } catch (err) {
    process.stderr.write(`error: failed to parse provenance: ${err.message}\n`);
    return 2;
  }

  const result = classify(store);
  if (json) {
    process.stdout.write(JSON.stringify({ file: basename(file), ...result }, null, 2) + '\n');
  } else {
    process.stdout.write(render(basename(file), result));
  }
  return EXIT[result.verdict];
}

const EXIT = { [Verdict.VERIFIED]: 0, [Verdict.NO_CREDENTIALS]: 3, [Verdict.INVALID]: 4 };

function render(file, r) {
  const L = [];
  if (r.verdict === Verdict.VERIFIED) {
    L.push(`✅ VERIFIED  ${file}`);
    L.push('   The provenance chain is intact: signatures and content hashes check out.');
    if (r.aiGenerated) L.push(`   🤖 AI-GENERATED — the manifest declares this is ${r.aiSourceType}.`);
    if (r.signer) L.push(`   Signed by:    ${r.signer}`);
    if (r.tool) L.push(`   Produced by:  ${r.tool}`);
    if (r.signedAt) L.push(`   Signed at:    ${r.signedAt}`);
    if (r.edits.length) L.push(`   Declared edits: ${r.edits.join(', ')}`);
    if (r.trust.status === 'trusted') {
      L.push('   ✓ Trusted: the signer chains to an anchor on your trust list.');
    } else if (r.trust.status === 'untrusted') {
      L.push('   ⚠ NOT trusted: the signature is valid, but the signer is not on your trust list.');
    } else {
      L.push('   ⓘ Trust not evaluated here (the CLI library has no trust engine). The signer');
      L.push('     name is as claimed — confirm it with the web verifier and a trust list.');
    }
    L.push('   Note: "verified" means the chain is intact, NOT that the depicted events are true.');
  } else if (r.verdict === Verdict.NO_CREDENTIALS) {
    L.push(`⚠ NO CREDENTIALS  ${file}`);
    L.push('   No provenance data was found. This tells you NOTHING about authenticity —');
    L.push('   it is not evidence of fakery, and absence is not proof of anything.');
  } else {
    L.push(`❌ INVALID  ${file}`);
    L.push('   A manifest is present but failed validation. The content was altered after');
    L.push('   signing, or the provenance chain is broken. Do not trust the declared origin.');
    for (const f of r.failures) L.push(`   - ${f.code}${f.explanation ? `: ${f.explanation}` : ''}`);
  }
  return L.join('\n') + '\n';
}

process.exit(await main(process.argv));
