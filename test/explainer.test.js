import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainAvailability } from '../src/explainer.js';
import { REASONS, DEMO_NOW } from '../src/constants.js';

const t = (hm) => `2026-11-02T${hm}:00Z`;
const fact = (over = {}) => ({
  roomLabel: 'R1',
  start: t('11:00'),
  end: t('12:00'),
  isAvailable: true,
  reasonCode: REASONS.OK,
  ...over,
});

test('E01 available -> explanation mentions available and agrees', async () => {
  const r = await explainAvailability(fact());
  assert.equal(r.ok, true);
  assert.match(r.explanation, /available/i);
  assert.ok(!/unavailable/i.test(r.explanation));
  assert.ok(r.explanation.length <= 300);
});

test('E02 overlap -> explanation says unavailable with overlap reason', async () => {
  const r = await explainAvailability(fact({ isAvailable: false, reasonCode: REASONS.OVERLAP }));
  assert.equal(r.ok, true);
  assert.match(r.explanation, /unavailable/i);
  assert.match(r.explanation, /overlap/i);
});

test('E03 blocked room -> explanation says unavailable and mentions blocked', async () => {
  const r = await explainAvailability(fact({ isAvailable: false, reasonCode: REASONS.ROOM_BLOCKED }));
  assert.equal(r.ok, true);
  assert.match(r.explanation, /unavailable/i);
  assert.match(r.explanation, /blocked/i);
});

test('E04 invalid time -> explanation says unavailable', async () => {
  const r = await explainAvailability(fact({ isAvailable: false, reasonCode: REASONS.INVALID_RANGE }));
  assert.equal(r.ok, true);
  assert.match(r.explanation, /unavailable/i);
});

test('E05 past time -> explanation says unavailable', async () => {
  const r = await explainAvailability(fact({ isAvailable: false, reasonCode: REASONS.IN_THE_PAST }));
  assert.equal(r.ok, true);
  assert.match(r.explanation, /unavailable/i);
});

test('E06 empty input -> safe fallback, ok false', async () => {
  const r = await explainAvailability(fact({ roomLabel: '' }));
  assert.equal(r.ok, false);
  assert.ok(r.explanation.length > 0);
  assert.notEqual(r.explanation, '');
});

test('E07 overly long input -> safe fallback, ok false', async () => {
  const r = await explainAvailability(fact({ roomLabel: 'R'.repeat(501) }));
  assert.equal(r.ok, false);
  assert.ok(r.explanation.length > 0);
});

test('E08 timeout -> safe fallback and timeout error', async () => {
  const r = await explainAvailability(fact(), { timeoutMs: 5, latencyMs: 5000 });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'timeout');
  assert.ok(r.explanation.length > 0);
});

test('E09 invalid model output -> fallback used, ok false', async () => {
  const fakeModel = async () => 'Definitely available for you!! Even though it is not.';
  const r = await explainAvailability(fact({ isAvailable: false, reasonCode: REASONS.OVERLAP }), { model: fakeModel });
  assert.equal(r.ok, false);
  assert.ok(r.explanation.length > 0);
});

test('E10 decision source of truth untouched: mock cannot flip result', async () => {
  const factFalse = fact({ isAvailable: false, reasonCode: REASONS.OVERLAP });
  const r = await explainAvailability(factFalse);
  assert.equal(r.ok, true);
  assert.doesNotMatch(r.explanation, /\bis available\b/i);
});
