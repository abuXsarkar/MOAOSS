// Adapter: the c2pa web SDK exposes a camelCase manifest store; our shared verdict
// classifier (../../src/verdict.mjs, reused unchanged from the CLI) reads the snake_case
// shape produced by c2pa-node. This converts the former into the latter so there is a
// single source of truth for the honest-verdict logic across CLI and browser.

export function adaptWebManifestStore(ms) {
  if (!ms) return null; // read() returns null when the asset carries no Content Credentials
  const am = ms.activeManifest ?? null;

  return {
    active_manifest: am
      ? {
          claim_generator: am.claimGenerator ?? null,
          signature_info: am.signatureInfo
            ? { issuer: am.signatureInfo.issuer ?? null, time: am.signatureInfo.time ?? null }
            : null,
          // Re-shape c2pa.actions into the node-style assertion list verdict.mjs expects.
          assertions: collectActionAssertions(am),
        }
      : null,
    manifests: ms.manifests ?? {},
    validation_status: ms.validationStatus ?? [],
  };
}

function collectActionAssertions(manifest) {
  const out = [];
  for (const label of ['c2pa.actions', 'c2pa.actions.v2']) {
    for (const a of safeGet(manifest, label)) {
      if (a?.data) out.push({ label: 'c2pa.actions', data: a.data });
    }
  }
  return out;
}

function safeGet(manifest, label) {
  try {
    const r = manifest.assertions?.get?.(label);
    return Array.isArray(r) ? r : r ? [r] : [];
  } catch {
    return [];
  }
}
