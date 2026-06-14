// open-provenance — Participant SDK.
//
// The minimal path for ANY entity (a person, an app, a camera, a platform like a social
// network or an AI generator) to become a provenance *participant*: sign content at your
// point in the pipeline so a chain of traceability starts there. Output is standard C2PA,
// readable by any C2PA verifier; and our verifier reads any standard C2PA, no matter who
// signed it. That two-way interoperability is what makes the architecture universally
// adoptable rather than a private format.
//
// Usage:
//   import { createParticipant } from './participant.mjs';
//   const p = await createParticipant({ certPath, keyPath, generator: 'MyApp/2.0' });
//   const signed = await p.sign(buffer, { mimeType: 'image/jpeg', ai: false });
import { readFile } from 'node:fs/promises';
import { createC2pa, createTestSigner, ManifestBuilder, SigningAlgorithm } from 'c2pa-node';

export const AI_SOURCE_TYPE = 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia';

/**
 * Create a participant (a signer) that can stamp content with Content Credentials.
 * Provide your own certificate + key (cert/key buffers or certPath/keyPath), or omit them
 * to use the bundled C2PA TEST signer for experimentation (not on any production trust list).
 */
export async function createParticipant(opts = {}) {
  const {
    cert, key, certPath, keyPath,
    generator = 'open-provenance-participant/0.1',
    tsaUrl = 'http://timestamp.digicert.com',
    algorithm = SigningAlgorithm.ES256,
  } = opts;

  let signer;
  if (cert && key) {
    signer = { type: 'local', certificate: cert, privateKey: key, algorithm, tsaUrl };
  } else if (certPath && keyPath) {
    signer = {
      type: 'local',
      certificate: await readFile(certPath),
      privateKey: await readFile(keyPath),
      algorithm, tsaUrl,
    };
  } else {
    signer = await createTestSigner();
    if (tsaUrl) signer.tsaUrl = tsaUrl;
  }

  const c2pa = createC2pa({ signer });
  const usingTestSigner = !(cert && key) && !(certPath && keyPath);

  return {
    usingTestSigner,
    /**
     * Sign an asset buffer, returning the signed bytes (standard C2PA).
     * @param {Buffer} asset
     * @param {{mimeType?:string, title?:string, ai?:boolean, actions?:Array}} [o]
     */
    async sign(asset, o = {}) {
      const { mimeType = 'image/jpeg', title, ai = false, actions = [] } = o;
      const created = { action: 'c2pa.created' };
      if (ai) created.digitalSourceType = AI_SOURCE_TYPE;
      const allActions = [created, ...actions.map((a) => (typeof a === 'string' ? { action: a } : a))];
      const manifest = new ManifestBuilder({
        claim_generator: generator,
        format: mimeType,
        title,
        assertions: [{ label: 'c2pa.actions', data: { actions: allActions } }],
      });
      const { signedAsset } = await c2pa.sign({ asset: { buffer: asset, mimeType }, manifest });
      return signedAsset.buffer;
    },
  };
}
