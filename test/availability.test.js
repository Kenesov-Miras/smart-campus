import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRoomAvailable } from '../src/availability.js';

const NOW = '2026-11-02T08:00:00Z';              // fixed clock
const t = (hm) => `2026-11-02T${hm}:00Z`;
const room = () => ({ id: 'R1', blocked: false });
const fixtures = () => [                          // fresh fixtures, intentionally unsorted
  { roomId: 'R1', start: t('13:00'), end: t('14:00') },
  { roomId: 'R1', start: t('10:00'), end: t('11:00') },
];
const ask = (s, e, r = room(), b = fixtures()) =>
  isRoomAvailable({ start: t(s), end: t(e) }, b, r, NOW);

// AC1
test('T01 AC1 start == end -> Unavailable', () => assert.equal(ask('09:00','09:00').available, false));
test('T02 AC1 start > end -> Unavailable',  () => assert.equal(ask('10:00','09:00').available, false));
test('T03 AC1 request in the past -> Unavailable', () => assert.equal(ask('07:00','07:30').reason, 'IN_THE_PAST'));
// AC2
test('T04 AC2 121 min -> Unavailable', () => assert.equal(ask('15:00','17:01').reason, 'TOO_LONG'));
test('T05 AC2 exactly 120 min -> Available', () => assert.equal(ask('15:00','17:00').available, true));
// AC3
test('T06 AC3 blocked room -> Unavailable', () => assert.equal(ask('15:00','16:00', {id:'R1',blocked:true}).reason, 'ROOM_BLOCKED'));
// AC4
test('T07 AC4 partial overlap -> Unavailable', () => assert.equal(ask('10:30','11:30').reason, 'OVERLAP'));
test('T08 AC4 fully inside booking -> Unavailable', () => assert.equal(ask('10:15','10:45').available, false));
test('T09 AC4 touches END of booking (11:00-12:00) -> Available [BUG-A]', () => assert.equal(ask('11:00','12:00').available, true));
test('T10 AC4 touches START of booking (09:00-10:00) -> Available [BUG-A]', () => assert.equal(ask('09:00','10:00').available, true));
test('T11 AC4 no bookings -> Available', () => assert.equal(ask('10:00','11:00', room(), []).available, true));
// AC5
test('T12 AC5 label Available / Unavailable', () => {
  assert.equal(ask('15:00','16:00').label, 'Available');
  assert.equal(ask('10:30','11:30').label, 'Unavailable');
});
test('T13 AC5 bookings array is NOT mutated [BUG-B]', () => {
  const b = fixtures(); const before = structuredClone(b);
  isRoomAvailable({ start: t('15:00'), end: t('16:00') }, b, room(), NOW);
  assert.deepEqual(b, before);
});
