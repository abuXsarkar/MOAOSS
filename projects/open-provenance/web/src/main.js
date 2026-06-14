// open-provenance web verifier (v0.2)
// Verifies C2PA Content Credentials entirely in the browser. Nothing is uploaded; no
// remote manifests, OCSP, or trust lists are fetched — verification is fully local.
import { createC2pa } from 'c2pa';
import wasmSrc from 'c2pa/dist/assets/wasm/toolkit_bg.wasm?url';
import workerSrc from 'c2pa/dist/c2pa.worker.min.js?url';
import { classify, Verdict } from '../../src/verdict.mjs';
import { phashBits, grayResize32, hexToBits, hamming } from '../../src/phash.mjs';
import { adaptWebManifestStore } from './adapt.js';

let c2paPromise = null;
function getC2pa() {
  if (!c2paPromise) {
    c2paPromise = createC2pa({
      wasmSrc,
      workerSrc,
      // Hard guarantees of offline operation: never reach out for anything.
      fetchRemoteManifests: false,
      settings: { verify: { ocspFetch: false, remoteManifestFetch: false } },
    });
  }
  return c2paPromise;
}

const TRUST_KEY = 'open-provenance:trust-anchors';
const getTrustAnchors = () => (localStorage.getItem(TRUST_KEY) || '').trim();

// Durable recovery (front-door layer): when no credentials are present, optionally match the
// image's perceptual fingerprint against a registry the user loads. Fully offline — the
// registry is local and the fingerprint is computed in-browser, identical to the Python tools
// (so a registry built by durable/registry.py works here directly). Covers recompression and
// scaling; crop-robust ORB recovery is heavier and stays in the CLI/server.
const RECOVERY_KEY = 'open-provenance:recovery-registry';
const RECOVERY_THRESHOLD = 10;
const getRecoveryRegistry = () => {
  try { return JSON.parse(localStorage.getItem(RECOVERY_KEY) || 'null'); } catch { return null; }
};

async function phashOfFile(file) {
  const bmp = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width; canvas.height = bmp.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, bmp.width, bmp.height);
  return phashBits(grayResize32(data, width, height, 4));
}

async function tryRecover(file) {
  const reg = getRecoveryRegistry();
  const entries = reg?.entries;
  if (!Array.isArray(entries) || entries.length === 0) return null;
  let bits;
  try { bits = await phashOfFile(file); } catch { return null; }
  let best = { dist: 65, id: null };
  for (const e of entries) {
    if (!e.phash) continue;
    const d = hamming(bits, hexToBits(e.phash));
    if (d < best.dist) best = { dist: d, id: e.manifest_id };
  }
  return { match: best.dist <= RECOVERY_THRESHOLD, manifestId: best.id, distance: best.dist };
}

async function verify(file) {
  const c2pa = await getC2pa();
  const anchors = getTrustAnchors();
  // User-controlled trust: if the user supplied trust anchors, the toolkit cryptographically
  // validates the signer's certificate chain against THEM (no central gatekeeper). All
  // network fetching stays off, so this is still fully offline.
  const settings = {
    verify: { verifyTrust: Boolean(anchors), ocspFetch: false, remoteManifestFetch: false },
    ...(anchors ? { trust: { trustAnchors: anchors } } : {}),
  };
  const { manifestStore } = await c2pa.read(file, { settings });
  return classify(adaptWebManifestStore(manifestStore));
}

// ---- UI wiring -------------------------------------------------------------

const els = {
  drop: document.getElementById('drop'),
  input: document.getElementById('file'),
  result: document.getElementById('result'),
};

function setBusy(name) {
  els.result.className = 'card busy';
  els.result.innerHTML = `<p>Verifying <strong>${escapeHtml(name)}</strong> locally…</p>`;
}

function render(name, r) {
  const blocks = [];
  if (r.verdict === Verdict.VERIFIED) {
    blocks.push(row('✅', 'Verified', 'verdict-ok'));
    blocks.push(`<p class="lead">The provenance chain is intact — signatures and content hashes check out.</p>`);
    if (r.aiGenerated) {
      blocks.push(`<p class="ai-badge">🤖 AI-generated — the manifest declares this is <strong>${escapeHtml(r.aiSourceType)}</strong>${r.tool ? ` (${escapeHtml(r.tool)})` : ''}.</p>`);
    }
    blocks.push(defList([
      r.signer && ['Signed by', r.signer],
      r.tool && ['Produced by', r.tool],
      r.signedAt && ['Signed at', r.signedAt],
      r.edits.length && ['Declared edits', r.edits.join(', ')],
    ]));
    blocks.push(trustNote(r.trust));
    blocks.push(
      `<p class="note">“Verified” means the provenance chain is intact — <strong>not</strong> that the depicted events are true.</p>`,
    );
  } else if (r.verdict === Verdict.NO_CREDENTIALS && r.recovery?.match) {
    blocks.push(row('🧬', 'Recovered', 'verdict-ok'));
    blocks.push(
      `<p class="lead">No embedded credentials, but this content matches a registered manifest in your recovery registry (<code>${escapeHtml(r.recovery.manifestId)}</code>, fingerprint distance ${r.recovery.distance}/64).</p>`,
    );
    blocks.push(`<p class="note">Re-verify the referenced manifest for full assurance. Recovery matched offline by perceptual fingerprint.</p>`);
  } else if (r.verdict === Verdict.NO_CREDENTIALS) {
    blocks.push(row('⚠️', 'No Credentials', 'verdict-warn'));
    blocks.push(
      `<p class="lead">No provenance data was found. This tells you <strong>nothing</strong> about authenticity — it is not evidence of fakery, and absence is not proof.</p>`,
    );
    if (r.recovery) {
      blocks.push(`<p class="note">Not found in your recovery registry either (nearest fingerprint ${r.recovery.distance}/64). Cropping can defeat fingerprint recovery — try the CLI/server (crop-robust ORB).</p>`);
    } else {
      blocks.push(`<p class="note">Tip: load a recovery registry below to check whether stripped content matches known signed media — fully offline.</p>`);
    }
  } else {
    blocks.push(row('❌', 'Invalid', 'verdict-bad'));
    blocks.push(
      `<p class="lead">A manifest is present but failed validation. The content was altered after signing, or the chain is broken. Do not trust the declared origin.</p>`,
    );
    if (r.failures.length) {
      blocks.push(
        '<ul class="codes">' +
          r.failures.map((f) => `<li><code>${escapeHtml(f.code)}</code>${f.explanation ? ` — ${escapeHtml(f.explanation)}` : ''}</li>`).join('') +
          '</ul>',
      );
    }
  }
  els.result.className = 'card shown';
  els.result.innerHTML = `<p class="filename">${escapeHtml(name)}</p>` + blocks.join('');
}

async function handle(file) {
  if (!file) return;
  setBusy(file.name);
  try {
    const result = await verify(file);
    if (result.verdict === Verdict.NO_CREDENTIALS) {
      result.recovery = await tryRecover(file);   // null unless a registry is loaded
    }
    render(file.name, result);
  } catch (err) {
    els.result.className = 'card shown verdict-bad';
    els.result.innerHTML = `<p class="filename">${escapeHtml(file.name)}</p><p class="lead">Could not read this file: ${escapeHtml(err.message ?? String(err))}</p>`;
  }
}

els.input.addEventListener('change', (e) => handle(e.target.files?.[0]));
els.drop.addEventListener('click', () => els.input.click());
els.drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.input.click(); }
});
['dragenter', 'dragover'].forEach((ev) =>
  els.drop.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) =>
  els.drop.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.remove('over'); }));
els.drop.addEventListener('drop', (e) => handle(e.dataTransfer?.files?.[0]));

// ---- tiny helpers ----------------------------------------------------------

function trustNote(trust) {
  if (trust.status === 'trusted') {
    return `<p class="trust trust-ok">✓ <strong>Trusted signer</strong> — the certificate chains to an anchor on your trust list.</p>`;
  }
  if (trust.status === 'untrusted') {
    return `<p class="trust trust-bad">⚠ <strong>Not trusted</strong> — the signature is valid, but the signer is <strong>not</strong> on your trust list. Treat the signer name as unconfirmed.</p>`;
  }
  return `<p class="trust trust-neutral">ⓘ <strong>Trust not checked.</strong> The signer name is <strong>as claimed</strong>. Add a trust list below to confirm the signer cryptographically.</p>`;
}

function row(icon, label, cls) {
  return `<div class="verdict ${cls}"><span class="icon">${icon}</span><span>${label}</span></div>`;
}

// ---- trust-list management (stored locally, applied offline) ----------------

const trustEls = {
  toggle: document.getElementById('trust-toggle'),
  panel: document.getElementById('trust-panel'),
  text: document.getElementById('trust-anchors'),
  save: document.getElementById('trust-save'),
  loadTest: document.getElementById('trust-load-test'),
  clear: document.getElementById('trust-clear'),
  status: document.getElementById('trust-status'),
};

function refreshTrustStatus() {
  const anchors = getTrustAnchors();
  const count = (anchors.match(/-----BEGIN CERTIFICATE-----/g) || []).length;
  trustEls.status.textContent = count
    ? `${count} trust anchor${count === 1 ? '' : 's'} configured — signers will be validated against your list.`
    : 'No trust list configured — signer identity is shown as claimed, not confirmed.';
}

if (trustEls.toggle) {
  trustEls.text.value = getTrustAnchors();
  refreshTrustStatus();
  trustEls.toggle.addEventListener('click', () => {
    const open = trustEls.panel.hasAttribute('hidden');
    if (open) trustEls.panel.removeAttribute('hidden'); else trustEls.panel.setAttribute('hidden', '');
  });
  trustEls.save.addEventListener('click', () => {
    localStorage.setItem(TRUST_KEY, trustEls.text.value.trim());
    refreshTrustStatus();
  });
  trustEls.clear.addEventListener('click', () => {
    localStorage.removeItem(TRUST_KEY);
    trustEls.text.value = '';
    refreshTrustStatus();
  });
  trustEls.loadTest.addEventListener('click', async () => {
    try {
      const pem = await (await fetch('./trust/c2pa-test-anchor.pem')).text();
      trustEls.text.value = (trustEls.text.value.trim() + '\n' + pem).trim();
      localStorage.setItem(TRUST_KEY, trustEls.text.value);
      refreshTrustStatus();
    } catch {
      trustEls.status.textContent = 'Could not load the bundled test anchor.';
    }
  });
}

// ---- recovery-registry management (stored locally, matched offline) ---------

const recEls = {
  toggle: document.getElementById('recovery-toggle'),
  panel: document.getElementById('recovery-panel'),
  text: document.getElementById('recovery-json'),
  save: document.getElementById('recovery-save'),
  clear: document.getElementById('recovery-clear'),
  status: document.getElementById('recovery-status'),
};

function refreshRecoveryStatus() {
  const reg = getRecoveryRegistry();
  const n = Array.isArray(reg?.entries) ? reg.entries.length : 0;
  recEls.status.textContent = n
    ? `${n} registered item${n === 1 ? '' : 's'} — stripped content will be matched by fingerprint.`
    : 'No recovery registry loaded — stripped content reads as unknown.';
}

if (recEls.toggle) {
  recEls.text.value = localStorage.getItem(RECOVERY_KEY) || '';
  refreshRecoveryStatus();
  recEls.toggle.addEventListener('click', () => {
    if (recEls.panel.hasAttribute('hidden')) recEls.panel.removeAttribute('hidden');
    else recEls.panel.setAttribute('hidden', '');
  });
  recEls.save.addEventListener('click', () => {
    const v = recEls.text.value.trim();
    try {
      JSON.parse(v);            // validate before storing
      localStorage.setItem(RECOVERY_KEY, v);
      refreshRecoveryStatus();
    } catch {
      recEls.status.textContent = 'Invalid JSON — expected {"entries":[{manifest_id, phash}]}.';
    }
  });
  recEls.clear.addEventListener('click', () => {
    localStorage.removeItem(RECOVERY_KEY);
    recEls.text.value = '';
    refreshRecoveryStatus();
  });
}
function defList(pairs) {
  const rows = pairs.filter(Boolean).map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('');
  return rows ? `<dl>${rows}</dl>` : '';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
