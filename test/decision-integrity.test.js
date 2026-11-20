import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRoomAvailable } from '../src/availability.js';
import { explainAvailability } from '../src/explainer.js';
import { REASONS, DEMO_NOW, DEMO_BOOKINGS } from '../src/constants.js';

// Proves the explainer never changes the deterministic decision: for every
// case, isRoomAvailable() before and after calling the explainer is identical
// (deep-equal on the full result object, with fresh fixture copies).

const NOW = DEMO_NOW;
const t = (hm) => `2026-11-02T${hm}:00Z`;
const room = () => ({ id: 'R1', blocked: false });
const blockedRoom = () => ({ id: 'R1', blocked: true });
const fixtures = () => [
  { roomId: 'R1', start: t('13:00'), end: t('14:00') },
  { roomId: 'R1', start: t('10:00'), end: t('11:00') },
];

const CASES = [
  { id: 'D01', name: 'available', start: '15:00', end: '16:00', room: room },
  { id: 'D02', name: 'overlap', start: '10:30', end: '11:30', room: room },
  { id: 'D03', name: 'blocked room', start: '15:00', end: '16:00', room: blockedRoom },
  { id: 'D04', name: 'invalid time range', start: '10:00', end: '09:00', room: room },
  { id: 'D05', name: 'past time', start: '07:00', end: '07:30', room: room },
  { id: 'D06', name: 'too long', start: '15:00', end: '17:01', room: room },
];

for (const c of CASES) {
  test(`${c.id} explainer does not change decision for case: ${c.name}`, async () => {
    const bookingsBefore = fixtures();
    const before = isRoomAvailable(
      { start: t(c.start), end: t(c.end) }, bookingsBefore, c.room(), NOW,
    );

    const out = await explainAvailability({
      roomLabel: 'R1',
      start: t(c.start),
      end: t(c.end),
      isAvailable: before.available,
      reasonCode: before.reason,
    });

    const after = isRoomAvailable(
      { start: t(c.start), end: t(c.end) }, bookingsBefore, c.room(), NOW,
    );

    assert.deepEqual(after, before);
    assert.ok(out.ok === true || out.ok === false); // explainer ran to a conclusion
    if (out.ok) {
      // The successful explanation must agree with the decision's direction.
      assert.equal(/\bunavailable\b/i.test(out.explanation), !before.available);
    }
    // Fixtures the decision consumed were never mutated by either call.
    assert.deepEqual(bookingsBefore, fixtures());
  });
}

test('D07 explainer cannot fabricate availability the decider denied', async () => {
  const decision = isRoomAvailable(
    { start: t('10:30'), end: t('11:30') }, fixtures(), room(), NOW,
  );
  assert.equal(decision.available, false); // deterministic starting point

  const out = await explainAvailability({
    roomLabel: 'R1',
    start: t('10:30'),
    end: t('11:30'),
    isAvailable: decision.available,
    reasonCode: decision.reason,
  });

  assert.equal(out.ok, true);
  assert.match(out.explanation, /unavailable/i); // wording follows the decision
  const recheck = isRoomAvailable(
    { start: t('10:30'), end: t('11:30') }, fixtures(), room(), NOW,
  );
  assert.deepEqual(recheck, decision); // decision unchanged after explainer
});
