// open-provenance web verifier (v0.2)
// Verifies C2PA Content Credentials entirely in the browser. Nothing is uploaded; no
// remote manifests, OCSP, or trust lists are fetched — verification is fully local.
import { createC2pa } from 'c2pa';
import wasmSrc from 'c2pa/dist/assets/wasm/toolkit_bg.wasm?url';
import workerSrc from 'c2pa/dist/c2pa.worker.min.js?url';
import { classify, Verdict } from '../../src/verdict.mjs';
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

async function verify(file) {
  const c2pa = await getC2pa();
  const { manifestStore } = await c2pa.read(file);
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
    blocks.push(
      `<p class="note">“Verified” means the provenance chain is intact — <strong>not</strong> that the depicted events are true.</p>`,
    );
    blocks.push(
      `<p class="note warn">Identity-trust is not yet enforced in this version: the signer name above is <strong>as claimed</strong>, not confirmed against a trust list. User-controlled trust lists are on the roadmap.</p>`,
    );
  } else if (r.verdict === Verdict.NO_CREDENTIALS) {
    blocks.push(row('⚠️', 'No Credentials', 'verdict-warn'));
    blocks.push(
      `<p class="lead">No provenance data was found. This tells you <strong>nothing</strong> about authenticity — it is not evidence of fakery, and absence is not proof.</p>`,
    );
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
    render(file.name, await verify(file));
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

function row(icon, label, cls) {
  return `<div class="verdict ${cls}"><span class="icon">${icon}</span><span>${label}</span></div>`;
}
function defList(pairs) {
  const rows = pairs.filter(Boolean).map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('');
  return rows ? `<dl>${rows}</dl>` : '';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
