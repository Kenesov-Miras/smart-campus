// Smart Campus - room availability (BUGGY version: BUG-A + BUG-B)
export const MAX_DURATION_MIN = 120;

export function isRoomAvailable(request, bookings, room, now) {
  const start = Date.parse(request.start);
  const end = Date.parse(request.end);
  const nowMs = Date.parse(now);

  // AC1
  if (!(start < end)) return result(false, 'INVALID_RANGE');
  if (start < nowMs) return result(false, 'IN_THE_PAST');
  // AC2
  if ((end - start) / 60000 > MAX_DURATION_MIN) return result(false, 'TOO_LONG');
  // AC3
  if (room.blocked) return result(false, 'ROOM_BLOCKED');

  // BUG-B: sort() mutates the original bookings array
  const sorted = [...bookings].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  for (const b of sorted) {
    if (b.roomId !== room.id) continue;
    // BUG-A: <= and >= treat touching endpoints as conflicts
    if (start < Date.parse(b.end) && end > Date.parse(b.start)) {
      return result(false, 'OVERLAP');
    }
  }
  return result(true, 'OK');
}

function result(available, reason) {
  return { available, label: available ? 'Available' : 'Unavailable', reason };
}