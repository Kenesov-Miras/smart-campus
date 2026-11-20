// MOCK LLM adapter — no real API, no keys, no network.
// It only rephrases the facts it is given; it never decides availability.
import { REASONS } from './constants.js';

export const EXPLAINER_LIMITS = {
  maxInputLength: 500,
  maxOutputLength: 300,
  maxSentences: 2,
  timeoutMs: 3000,
};

const FALLBACK = 'Sorry, the explanation is unavailable. The booking status above remains authoritative.';

export async function explainAvailability(input, { now = Date.now(), timeoutMs = EXPLAINER_LIMITS.timeoutMs, latencyMs = 0, model = mockModelCall } = {}) {
  const check = validateInput(input);
  if (!check.ok) return { explanation: FALLBACK, ok: false, error: check.error };

  try {
    const raw = await model(check.value, now, timeoutMs, latencyMs);
    const out = validateOutput(raw, check.value.isAvailable);
    if (!out.ok) return { explanation: FALLBACK, ok: false, error: out.error };
    return { explanation: raw, ok: true };
  } catch (err) {
    const error = err && err.code === 'MOCK_TIMEOUT' ? 'timeout' : 'model error';
    return { explanation: FALLBACK, ok: false, error };
  }
}

function validateInput(input) {
  if (input == null || typeof input !== 'object') return { ok: false, error: 'input must be an object' };
  for (const key of ['roomLabel', 'start', 'end', 'isAvailable', 'reasonCode']) {
    if (!(key in input)) return { ok: false, error: `missing field: ${key}` };
  }
  const { roomLabel, start, end, reasonCode } = input;
  if (typeof roomLabel !== 'string' || !roomLabel.trim()) return { ok: false, error: 'roomLabel empty' };
  if (typeof start !== 'string' || !start.trim()) return { ok: false, error: 'start empty' };
  if (typeof end !== 'string' || !end.trim()) return { ok: false, error: 'end empty' };
  if (typeof reasonCode !== 'string' || !reasonCode.trim()) return { ok: false, error: 'reasonCode empty' };
  if (typeof input.isAvailable !== 'boolean') return { ok: false, error: 'isAvailable must be boolean' };
  if (!Object.values(REASONS).includes(reasonCode)) return { ok: false, error: 'unknown reasonCode' };
  for (const v of [roomLabel, start, end, reasonCode]) {
    if (v.length > EXPLAINER_LIMITS.maxInputLength) return { ok: false, error: 'input too long' };
  }
  if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) {
    return { ok: false, error: 'malformed timestamp' };
  }
  return { ok: true, value: input };
}

function validateOutput(text, isAvailable) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, error: 'empty output' };
  if (text.length > EXPLAINER_LIMITS.maxOutputLength) return { ok: false, error: 'output too long' };
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length > EXPLAINER_LIMITS.maxSentences) return { ok: false, error: 'too many sentences' };
  const saysAvailable = /\bavailable\b/i.test(text);
  const saysUnavailable = /\bunavailable\b/i.test(text);
  if (isAvailable && !saysAvailable) return { ok: false, error: 'disagrees with isAvailable' };
  if (!isAvailable && (saysAvailable && !saysUnavailable)) return { ok: false, error: 'disagrees with isAvailable' };
  return { ok: true };
}

// Simulated model call: resolves after latencyMs unless the timeout fires first.
function mockModelCall(input, now, timeoutMs, latencyMs) {
  const { roomLabel, start, end, isAvailable, reasonCode } = input;
  const reason = REASON_TEXT[reasonCode] || reasonCode;
  const when = `${start} to ${end}`;
  const verdict = isAvailable
    ? `Room ${roomLabel} is available from ${when}.`
    : `Room ${roomLabel} is unavailable from ${when} because the request is ${reason}.`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const e = new Error('mock model timed out');
      e.code = 'MOCK_TIMEOUT';
      reject(e);
    }, timeoutMs);
    setTimeout(() => {
      clearTimeout(timer);
      resolve(verdict);
    }, latencyMs);
    void now;
  });
}

const REASON_TEXT = {
  [REASONS.OK]: 'no booking conflicts',
  [REASONS.INVALID_RANGE]: 'not a valid time range',
  [REASONS.IN_THE_PAST]: 'in the past',
  [REASONS.TOO_LONG]: 'longer than the maximum duration',
  [REASONS.ROOM_BLOCKED]: 'because the room is blocked',
  [REASONS.OVERLAP]: 'overlapping an existing booking',
};
