# TEST_REPORT.md — Smart Campus explainer test report

All rows below are filled from the actual `npm test` run recorded in this
session's transcript (44 tests, 44 pass, 0 fail). No results are guessed.

Run date: 2026-11-20 · Runner: `node --test` · Result: **44 pass / 0 fail**

## Automated test results

| ID | Test case | Input | Expected result | Observed result | Pass/Fail |
|---|---|---|---|---|---|
| E01 | Available slot explained | Room R1, 11:00–12:00, isAvailable=true, OK | ok=true; explanation says "available", never "unavailable"; ≤300 chars | ok=true; explanation "Room R1 is available from …"; matches all assertions | Pass |
| E02 | Overlap explained | R1, 11:00–12:00, isAvailable=false, OVERLAP | ok=true; explanation says "unavailable" and mentions overlap | ok=true; "Room R1 is unavailable … overlapping an existing booking" | Pass |
| E03 | Blocked room explained | R1, isAvailable=false, ROOM_BLOCKED | ok=true; explanation says "unavailable" and mentions blocked | ok=true; explanation mentions both | Pass |
| E04 | Invalid time range explained | isAvailable=false, INVALID_RANGE | ok=true; explanation says "unavailable" | ok=true; explanation says "unavailable" | Pass |
| E05 | Past time explained | isAvailable=false, IN_THE_PAST | ok=true; explanation says "unavailable" | ok=true; explanation says "unavailable" | Pass |
| E06 | Empty input rejected | roomLabel="" | ok=false; non-empty safe fallback message | ok=false; fallback string returned | Pass |
| E07 | Overly long input rejected | roomLabel = 501 chars | ok=false; safe fallback returned | ok=false; fallback string returned | Pass |
| E08 | Timeout path | latency 5000ms > timeout 5ms | ok=false; error="timeout"; fallback returned | ok=false; error="timeout"; fallback returned | Pass |
| E11 | Simulated API failure (distinct from timeout) | model stub throws "connection reset by peer" | ok=false; error="model error" (not "timeout"); fallback returned | ok=false; error="model error"; fallback returned | Pass |
| E09 | Invalid model output rejected | stubbed model returns disagreeing text for OVERLAP case | ok=false; fallback returned | ok=false; fallback returned | Pass |
| D01–D06 | Explainer never changes the decision | 6 cases (available, overlap, blocked, invalid range, past, too long): isRoomAvailable() before vs. after explainer call, plus fixture-mutation check | after deep-equals before in all 6 cases; fixtures unmutated | All 6 deep-equal assertions held; fixtures identical | Pass |
| D07 | Explainer cannot fabricate availability | OVERLAP case; explanation wording checked against decision, decision re-checked after | explanation says "unavailable"; re-checked decision deep-equals original | Both assertions held | Pass |
| E10 | Mock cannot flip verdict wording | isAvailable=false + OVERLAP fed to mock | ok=true but explanation never contains "is available" | ok=true; no "is available" wording | Pass |

Supporting suites (unchanged this task, re-run for confirmation): T01–T15
availability rules (15 pass), P01–P11 prompt construction (11 pass).

## Manual UI checks

Perform these in the browser after a fresh load of the page:

1. **Available slot** — set Start 11:00, End 12:00, leave "Room is blocked"
   unchecked, click "Check availability". Expected: green box reading
   "Available: The room is free for this time."
2. **Overlapping slot** — set Start 10:30, End 11:30, click "Check
   availability". Expected: red box reading "Unavailable: The time overlaps an
   existing booking."
3. **Explanation box label** — with any result showing, click "Explain
   availability". Expected: a gray box appears below the result, headed
   "AI-generated explanation (mock)", clearly styled differently from the
   green/red status box.
4. **Explanation resets on a new check** — click "Check availability" again
   with different times. Expected: the explanation box hides immediately; it
   only reappears if "Explain availability" is clicked again.
