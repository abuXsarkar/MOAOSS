// Guards the claim that the browser's JS perceptual hash matches the Python/OpenCV one
// bit-for-bit, so a registry built by durable/registry.py is usable directly in the web app.
// Skips where the Kodak corpus (eval/fetch_corpus.sh) or sharp is unavailable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { grayResize32, phashBits, bitsToHex, hexToBits, hamming } from '../src/phash.mjs';

const PROJ = dirname(dirname(fileURLToPath(import.meta.url)));
const imgs = ['kodim01.png', 'kodim05.png', 'kodim10.png'].map((f) => join(PROJ, 'eval/corpus', f));

test('JS pHash matches Python/OpenCV pHash bit-for-bit on natural images', async (t) => {
  let sharp;
  try { sharp = (await import('sharp')).default; } catch { return t.skip('sharp unavailable'); }
  const present = imgs.filter(existsSync);
  if (present.length === 0) return t.skip('corpus not fetched (run eval/fetch_corpus.sh)');

  for (const f of present) {
    const { data, info } = await sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const jsBits = phashBits(grayResize32(data, info.width, info.height, info.channels));
    const pyHex = execFileSync('python3', ['-c',
      `import sys;sys.path.insert(0,'durable');import cv2;from lib import phash_bits,bits_to_hex;` +
      `print(bits_to_hex(phash_bits(cv2.imread(${JSON.stringify(f)}))))`],
      { cwd: PROJ }).toString().trim();
    assert.equal(hamming(jsBits, hexToBits(pyHex)), 0, `${f}: js ${bitsToHex(jsBits)} vs py ${pyHex}`);
  }
});
