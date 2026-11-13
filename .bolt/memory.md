# Project memory

## Product intent & audience

- Small Node.js availability/booking time-slot checker utility.
- Determines whether a booking range is available based on rules (e.g. start time not in the past).
- Audience: developers maintaining or consuming the utility; likely demo/learning context given fixed demo clock.

## Brand personality & voice

- No brand/voice context applicable — backend utility project.

## Visual design & UX direction

- No UI — backend-only Node.js project with tests.

## Decisions, constraints & rationale

- Test runner: Node built-in `node --test`; `npm test` executes `node --test test/availability.test.js`.
- Single test file: `test/availability.test.js`; tests labeled T01, T02, … with TAP output.
- Test naming convention: `T## AC# <description>` (maps to acceptance criteria AC1, etc.).
- Shared test helpers: `ask(start, end)` returns `{ available, reason }`; `REASONS` object with `REASONS.OK` and other reason constants.
- Fixed demo "now" clock at 08:00 used in tests.
- Boundary semantics: `start < now` is forbidden (in the past); `start === now` is allowed — half-open interval. Regression test T15 locks this in.
- A risk/bug register exists with entries like BUG-A (boundary tests), BUG-B (no-mutation tests), R2 (start===now boundary).
- `npm run build` exists, writes to `dist/`; build output was not verified during test work.
- No lint, type-check, or CI configuration exists in the project.

## Open questions & assumptions

- Should `dist/` be kept in sync with source, or is it stale/committed for deployment?
- Should CI, lint, or type checks be added as the project grows?
- Is the fixed demo clock (08:00) sufficient, or should tests parametrize over multiple times?
- Are there additional acceptance criteria beyond AC1 that need coverage?