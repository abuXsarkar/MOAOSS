// Unit tests for the verdict classifier. These exercise the honest-verdict logic with
// synthetic manifest stores, so they need no native binding and run anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, Verdict, TrustStatus } from '../src/verdict.mjs';

test('null store -> NO_CREDENTIALS', () => {
  assert.equal(classify(null).verdict, Verdict.NO_CREDENTIALS);
});

test('empty store -> NO_CREDENTIALS', () => {
  assert.equal(classify({ active_manifest: null, manifests: {} }).verdict, Verdict.NO_CREDENTIALS);
});

test('clean active manifest -> VERIFIED with signer/tool/edits', () => {
  const r = classify({
    active_manifest: {
      claim_generator: 'AcmeCam/1.0',
      signature_info: { issuer: 'Acme Imaging CA', time: '2026-01-02T03:04:05Z' },
      assertions: [{ label: 'c2pa.actions', data: { actions: [{ action: 'c2pa.created' }, { action: 'c2pa.color_adjustments' }] } }],
    },
    manifests: { m1: {} },
    validation_status: [],
  });
  assert.equal(r.verdict, Verdict.VERIFIED);
  assert.equal(r.signer, 'Acme Imaging CA');
  assert.equal(r.tool, 'AcmeCam/1.0');
  assert.deepEqual(r.edits, ['created', 'color_adjustments']);
  assert.equal(r.trustWarnings.length, 0);
});

test('AI-generated marker on an action is detected', () => {
  const r = classify({
    active_manifest: {
      claim_generator: 'NanoBananaPro/1.0',
      signature_info: { issuer: 'Google' },
      assertions: [{
        label: 'c2pa.actions',
        data: { actions: [{
          action: 'c2pa.created',
          digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
        }] },
      }],
    },
    manifests: { m1: {} },
    validation_status: [],
  });
  assert.equal(r.verdict, Verdict.VERIFIED);
  assert.equal(r.aiGenerated, true);
  assert.equal(r.aiSourceType, 'trainedAlgorithmicMedia');
});

test('no AI marker -> aiGenerated false', () => {
  const r = classify({
    active_manifest: {
      assertions: [{ label: 'c2pa.actions', data: { actions: [{ action: 'c2pa.created', digitalSourceType: 'http://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture' }] } }],
    },
    manifests: { m1: {} },
    validation_status: [],
  });
  assert.equal(r.aiGenerated, false);
  assert.equal(r.aiSourceType, null);
});

test('hash mismatch -> INVALID', () => {
  const r = classify({
    active_manifest: { signature_info: { issuer: 'X' } },
    manifests: { m1: {} },
    validation_status: [{ code: 'assertion.dataHash.mismatch', explanation: 'content changed' }],
  });
  assert.equal(r.verdict, Verdict.INVALID);
  assert.equal(r.failures[0].code, 'assertion.dataHash.mismatch');
});

test('untrusted signer is a WARNING, not a failure -> VERIFIED + trust untrusted', () => {
  const r = classify({
    active_manifest: { signature_info: { issuer: 'self-signed' } },
    manifests: { m1: {} },
    validation_status: [{ code: 'signingCredential.untrusted' }],
  });
  assert.equal(r.verdict, Verdict.VERIFIED);
  assert.equal(r.trust.status, TrustStatus.UNTRUSTED);
  assert.equal(r.failures.length, 0);
});

test('trusted signer -> trust trusted', () => {
  const r = classify({
    active_manifest: { signature_info: { issuer: 'Leica Camera AG' } },
    manifests: { m1: {} },
    validation_status: [{ code: 'signingCredential.trusted' }],
  });
  assert.equal(r.verdict, Verdict.VERIFIED);
  assert.equal(r.trust.status, TrustStatus.TRUSTED);
});

test('no trust statuses -> trust unchecked', () => {
  const r = classify({
    active_manifest: { signature_info: { issuer: 'X' } },
    manifests: { m1: {} },
    validation_status: [],
  });
  assert.equal(r.trust.status, TrustStatus.UNCHECKED);
});

test('invalid signature -> INVALID', () => {
  const r = classify({
    active_manifest: {},
    manifests: { m1: {} },
    validation_status: [{ code: 'claimSignature.invalid' }],
  });
  assert.equal(r.verdict, Verdict.INVALID);
});
