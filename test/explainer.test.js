import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainAvailability, buildExplainRequest } from '../src/explainer.js';
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

test('E11 simulated API failure (model throws) -> fallback, error "model error"', async () => {
  const explodingModel = async () => { throw new Error('connection reset by peer'); };
  const r = await explainAvailability(fact(), { model: explodingModel });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'model error');
  assert.notEqual(r.error, 'timeout'); // distinct from the timeout path
  assert.ok(r.explanation.length > 0);
});

// F1 regression: the timeout is enforced by explainAvailability itself.
test('E12 injected model that never resolves -> fallback with error "timeout"', async () => {
  const started = process.hrtime.bigint();
  const r = await explainAvailability(fact(), {
    timeoutMs: 50,
    model: () => new Promise(() => {}), // never settles
  });
  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
  assert.equal(r.ok, false);
  assert.equal(r.error, 'timeout');
  assert.ok(r.explanation.length > 0);
  assert.ok(elapsedMs < 1000, `must return near-instantly, took ${elapsedMs.toFixed(0)}ms`);
});

// F1 regression: a slow-but-valid model that beats the timer still succeeds.
test('E13 model slower than latencyMs but faster than timeout still succeeds', async () => {
  const r = await explainAvailability(fact(), { timeoutMs: 500, latencyMs: 20 });
  assert.equal(r.ok, true);
  assert.match(r.explanation, /available/i);
});

// F2 regression: buildExplainRequest uses the checked times, not new inputs.
test('E14 buildExplainRequest uses checked start/end and verdict, ignoring later input changes', () => {
  const lastCheck = {
    roomLabel: 'R1',
    available: false,
    reason: REASONS.OVERLAP,
    start: '10:30',
    end: '11:30',
  };
  const request = buildExplainRequest(lastCheck);
  assert.deepEqual(request, {
    roomLabel: 'R1',
    start: '10:30',           // NOT the 11:00 default from fact()
    end: '11:30',
    isAvailable: false,
    reasonCode: REASONS.OVERLAP,
  });
  assert.notEqual(request.start, '11:00');
  assert.notEqual(request.end, '12:00');
});

test('E15 buildExplainRequest maps available/OK verdict correctly', () => {
  const request = buildExplainRequest({ roomLabel: 'R1', available: true, reason: REASONS.OK, start: '15:00', end: '16:00' });
  assert.equal(request.isAvailable, true);
  assert.equal(request.reasonCode, REASONS.OK);
  assert.equal(request.start, '15:00');
  assert.equal(request.end, '16:00');
});

test('E16 buildExplainRequest returns null when no check has run', () => {
  assert.equal(buildExplainRequest(null), null);
});

test('E10 decision source of truth untouched: mock cannot flip result', async () => {
  const factFalse = fact({ isAvailable: false, reasonCode: REASONS.OVERLAP });
  const r = await explainAvailability(factFalse);
  assert.equal(r.ok, true);
  assert.doesNotMatch(r.explanation, /\bis available\b/i);
});
