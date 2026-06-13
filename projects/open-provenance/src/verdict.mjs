// Pure, dependency-free logic that turns a C2PA manifest-store read into an HONEST
// verdict. Kept separate from I/O so it can be unit-tested without the native binding.
//
// The three top-level verdicts are deliberately conservative. "VERIFIED" never means
// "this image is true" — only that a provenance chain is present and its signatures and
// content hashes check out. We surface trust separately, because a cryptographically
// valid signature from a signer nobody trusts tells you nothing about identity.

export const Verdict = Object.freeze({
  VERIFIED: 'VERIFIED',
  NO_CREDENTIALS: 'NO_CREDENTIALS',
  INVALID: 'INVALID',
});

// We classify C2PA validation-status codes by suffix/token rather than enumerating every
// code, so this keeps working as the upstream code list evolves across c2pa versions.
const FAILURE_TOKENS = [
  'mismatch', 'invalid', 'missing', 'notFound', 'outOfRange',
  'unknownProvenance', 'malformed', 'modified', 'revoked', 'error',
];
const TRUST_WARNING_TOKENS = ['untrusted'];

function matchesAny(code, tokens) {
  const c = String(code || '').toLowerCase();
  return tokens.some((t) => c.includes(t.toLowerCase()));
}

/**
 * @param {object|null} manifestStore  Result of c2pa read(): ResolvedManifestStore | null
 * @returns {{
 *   verdict: string,
 *   signer: string|null,
 *   tool: string|null,
 *   signedAt: string|null,
 *   edits: string[],
 *   failures: {code:string, explanation?:string}[],
 *   trustWarnings: {code:string, explanation?:string}[],
 * }}
 */
export function classify(manifestStore) {
  // read() returns null when the asset carries no Content Credentials at all.
  if (!manifestStore || (!manifestStore.active_manifest &&
      Object.keys(manifestStore.manifests || {}).length === 0)) {
    return base(Verdict.NO_CREDENTIALS);
  }

  const statuses = Array.isArray(manifestStore.validation_status)
    ? manifestStore.validation_status
    : [];

  const failures = statuses.filter((s) => matchesAny(s.code, FAILURE_TOKENS) &&
    !matchesAny(s.code, TRUST_WARNING_TOKENS));
  const trustWarnings = statuses.filter((s) => matchesAny(s.code, TRUST_WARNING_TOKENS));

  const m = manifestStore.active_manifest ||
    Object.values(manifestStore.manifests || {})[0] || {};

  const ai = detectAi(m);
  const details = {
    signer: m.signature_info?.issuer ?? null,
    tool: m.claim_generator ?? null,
    signedAt: m.signature_info?.time ?? m.signature_info?.timeObject?.toISOString?.() ?? null,
    edits: extractEdits(m),
    aiGenerated: ai.aiGenerated,
    aiSourceType: ai.aiSourceType,
    failures: failures.map(pick),
    trustWarnings: trustWarnings.map(pick),
  };

  // Any hard failure (hash mismatch, broken/invalid signature, etc.) means the content
  // was altered after signing or the chain is broken.
  if (failures.length > 0) {
    return { verdict: Verdict.INVALID, ...details };
  }
  return { verdict: Verdict.VERIFIED, ...details };
}

// Pull declared actions (edits) from the standard c2pa.actions assertion, in plain words.
function extractEdits(manifest) {
  const out = [];
  for (const a of manifest.assertions || []) {
    if (a.label === 'c2pa.actions' || a.label === 'c2pa.actions.v2') {
      const actions = a.data?.actions || [];
      for (const act of actions) {
        if (act.action) out.push(String(act.action).replace(/^c2pa\./, ''));
      }
    }
  }
  return out;
}

// Detect a declared AI-generation marker. C2PA carries the IPTC `digitalSourceType` URI
// on actions; a value ending in `trainedAlgorithmicMedia` (or the composite variant)
// means the content was made or partly made by a generative model. This is what lets us
// flag output from Nano Banana, GPT image models, Seedance, etc. — *when* their Content
// Credentials are still intact.
function detectAi(manifest) {
  const types = [];
  for (const a of manifest.assertions || []) {
    if (a.label === 'c2pa.actions' || a.label === 'c2pa.actions.v2') {
      for (const act of a.data?.actions || []) {
        if (act.digitalSourceType) types.push(String(act.digitalSourceType));
      }
      if (a.data?.digitalSourceType) types.push(String(a.data.digitalSourceType));
    }
  }
  const match = types.find((t) => /trainedAlgorithmicMedia/i.test(t)) || null;
  return {
    aiGenerated: Boolean(match),
    // Keep just the short IPTC code (e.g. "trainedAlgorithmicMedia"), not the full URI.
    aiSourceType: match ? match.split('/').pop() : null,
  };
}

function pick(s) {
  return s.explanation ? { code: s.code, explanation: s.explanation } : { code: s.code };
}

function base(verdict) {
  return {
    verdict, signer: null, tool: null, signedAt: null, edits: [],
    aiGenerated: false, aiSourceType: null, failures: [], trustWarnings: [],
  };
}
