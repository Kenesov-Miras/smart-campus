import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEM_INSTRUCTION, buildContext, VARIANT_A, VARIANT_B, VARIANT_C } from '../src/prompts.js';
import { REASONS } from '../src/constants.js';

const sampleResult = {
  label: 'Unavailable',
  available: false,
  reason: REASONS.OVERLAP,
  start: '2026-11-02T10:30:00Z',
  end: '2026-11-02T11:30:00Z',
};

test('P01 system instruction forbids deciding, inventing, and following user text', () => {
  assert.match(SYSTEM_INSTRUCTION, /only the supplied facts/i);
  assert.match(SYSTEM_INSTRUCTION, /never decide|do not decide|never.*change/i);
  assert.match(SYSTEM_INSTRUCTION, /do not invent/i);
  assert.match(SYSTEM_INSTRUCTION, /untrusted data/i);
  assert.match(SYSTEM_INSTRUCTION, /at most 2/i);
});

test('P02 buildContext maps result fields to structured JSON', () => {
  const ctx = buildContext(sampleResult);
  assert.deepEqual(ctx, {
    roomLabel: 'Unavailable', // falls back to label when no roomLabel given
    start: '2026-11-02T10:30:00Z',
    end: '2026-11-02T11:30:00Z',
    isAvailable: false,
    reasonCode: REASONS.OVERLAP,
  });
});

test('P03 buildContext prefers roomLabel when present', () => {
  const ctx = buildContext({ ...sampleResult, roomLabel: 'R1' });
  assert.equal(ctx.roomLabel, 'R1');
});

test('P04 buildContext isAvailable comes from available boolean', () => {
  const ctx = buildContext({ ...sampleResult, available: true, reason: REASONS.OK });
  assert.equal(ctx.isAvailable, true);
  assert.equal(ctx.reasonCode, REASONS.OK);
});

test('P05 variant A includes the structured context', () => {
  const p = VARIANT_A.prompt(buildContext(sampleResult));
  assert.match(p, /Explain this booking result to a student/);
  assert.match(p, /"reasonCode"\s*:\s*"OVERLAP"/);
  assert.match(p, /"isAvailable"\s*:\s*false/);
});

test('P06 variant B includes the structured context', () => {
  const p = VARIANT_B.prompt(buildContext(sampleResult));
  assert.match(p, /"reasonCode"\s*:\s*"OVERLAP"/);
  assert.match(p, /"isAvailable"\s*:\s*false/);
});

test('P07 variant C includes the structured context', () => {
  const p = VARIANT_C.prompt(buildContext(sampleResult));
  assert.match(p, /"reasonCode"\s*:\s*"OVERLAP"/);
  assert.match(p, /"isAvailable"\s*:\s*false/);
});

test('P08 variant B includes do-not-invent and do-not-change rules', () => {
  const p = VARIANT_B.prompt(buildContext(sampleResult));
  assert.match(p, /do not invent/i);
  assert.match(p, /do not change the decision/i);
});

test('P09 variant C includes do-not-invent and do-not-change rules', () => {
  const p = VARIANT_C.prompt(buildContext(sampleResult));
  assert.match(p, /do not invent/i);
  assert.match(p, /do not change the decision/i);
});

test('P10 variant C requires exact JSON output shape', () => {
  const p = VARIANT_C.prompt(buildContext(sampleResult));
  assert.match(p, /\{"explanation"\s*:\s*"..."\}/);
});

test('P11 variant A is minimal and omits explicit rules', () => {
  const p = VARIANT_A.prompt(buildContext(sampleResult));
  assert.doesNotMatch(p, /do not invent/i);
  assert.doesNotMatch(p, /do not change the decision/i);
});
