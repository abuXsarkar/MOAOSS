#!/usr/bin/env node
// open-provenance: sign an image with C2PA Content Credentials (v0.3).
//
// Embeds a signed provenance manifest into an image. Use your own certificate + private
// key, or fall back to the bundled C2PA *test* signer for experimentation.
//
//   node tools/sign.mjs <input> --out <output> [options]
//
// Options:
//   --cert <pem>        signer certificate chain (PEM). Omit to use the test signer.
//   --key  <pem>        signer private key (PEM). Required with --cert.
//   --generator <str>   claim generator string (default: open-provenance/0.3)
//   --action <name>     add a declared action (repeatable), e.g. c2pa.color_adjustments
//   --ai                mark the content as AI-generated (digitalSourceType=trainedAlgorithmicMedia)
//   --tsa <url>         RFC-3161 timestamp authority (default: http://timestamp.digicert.com)
//
// NOTE: signing contacts the timestamp authority, so it needs outbound network. Run it on
// a machine with open egress. Verification (verify.mjs) never needs the network.
import { readFile, writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import { createC2pa, createTestSigner, ManifestBuilder, SigningAlgorithm } from 'c2pa-node';

const AI_SOURCE = 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia';
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

function parseArgs(argv) {
  const a = { actions: [] };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i];
    if (t === '--out') a.out = rest[++i];
    else if (t === '--cert') a.cert = rest[++i];
    else if (t === '--key') a.key = rest[++i];
    else if (t === '--generator') a.generator = rest[++i];
    else if (t === '--action') a.actions.push(rest[++i]);
    else if (t === '--ai') a.ai = true;
    else if (t === '--tsa') a.tsa = rest[++i];
    else if (t === '-h' || t === '--help') a.help = true;
    else if (!t.startsWith('-') && !a.input) a.input = t;
  }
  return a;
}

async function main(argv) {
  const a = parseArgs(argv);
  if (a.help || !a.input || !a.out) {
    process.stderr.write('Usage: node tools/sign.mjs <input> --out <output> ' +
      '[--cert pem --key pem] [--generator str] [--action name]... [--ai] [--tsa url]\n');
    return a.input && a.out ? 0 : 2;
  }

  const mime = MIME[extname(a.input).toLowerCase()] ?? 'image/jpeg';
  const buffer = await readFile(a.input);

  let signer;
  if (a.cert) {
    if (!a.key) { process.stderr.write('error: --cert requires --key\n'); return 2; }
    signer = {
      type: 'local',
      certificate: await readFile(a.cert),
      privateKey: await readFile(a.key),
      algorithm: SigningAlgorithm.ES256,
      tsaUrl: a.tsa ?? 'http://timestamp.digicert.com',
    };
  } else {
    signer = await createTestSigner();
    if (a.tsa) signer.tsaUrl = a.tsa;
    process.stderr.write('note: using the C2PA TEST signer (not on any production trust list).\n');
  }

  // Build the actions assertion. The first action is the creation; --ai tags it as
  // generative, which is exactly what verify.mjs surfaces as an AI-generated badge.
  const created = { action: 'c2pa.created' };
  if (a.ai) created.digitalSourceType = AI_SOURCE;
  const actions = [created, ...a.actions.map((name) => ({ action: name }))];

  const manifest = new ManifestBuilder({
    claim_generator: a.generator ?? 'open-provenance/0.3',
    format: mime,
    title: basename(a.input),
    assertions: [{ label: 'c2pa.actions', data: { actions } }],
  });

  const c2pa = createC2pa({ signer });
  try {
    const { signedAsset } = await c2pa.sign({ asset: { buffer, mimeType: mime }, manifest });
    await writeFile(a.out, signedAsset.buffer);
    process.stdout.write(`signed -> ${a.out} (${signedAsset.buffer.length} bytes)` +
      `${a.ai ? ' [marked AI-generated]' : ''}\n`);
    return 0;
  } catch (err) {
    const msg = String(err?.message ?? err);
    if (/TimeStamp|HttpConnection|timestamp/i.test(msg)) {
      process.stderr.write('error: could not reach the timestamp authority. Signing needs ' +
        'outbound network — run on a machine with open egress, or pass --tsa <reachable-url>.\n');
    } else {
      process.stderr.write(`error: signing failed: ${msg}\n`);
    }
    return 2;
  }
}

process.exit(await main(process.argv));
