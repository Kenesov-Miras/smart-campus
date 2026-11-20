# PROMPTS.md — Prompt variants for the Smart Campus explainer

Comparison of three prompt variants for the mock explanation feature. The
availability decision itself is always made by `isRoomAvailable()`; prompts
only shape how the (mock) model words the explanation.

**Honesty note:** the comparison below is reasoned against the mock adapter
(`src/explainer.js`), not a real LLM. The mock is deterministic and cannot
hallucinate, so these scores are an informed design judgement, not measured
model behavior.

## The variants

| Variant | Approach |
|---|---|
| A — Minimal | One instruction + raw JSON context. Relies on the system prompt for all guardrails. |
| B — Rules-based | The guardrail rules (only supplied facts, no invented bookings, never change the decision, max 2 sentences) are repeated in the user message, next to the context. |
| C — Strict format | Same rules as B, plus the output must be exactly `{"explanation": "..."}`. |

## Comparison

| Criterion | A — Minimal | B — Rules-based | C — Strict format |
|---|---|---|---|
| Clarity | 3 — Short and readable, but pushes all constraints to the system prompt, which can drift out of sync with the task. | 5 — Rules sit directly beside the data, so the model sees the constraints at the point of use. | 4 — Equally clear rules, but the added output-format instruction makes the prompt slightly denser for a free-text task. |
| Consistency | 2 — Output shape depends entirely on the model honoring the system prompt; wording and length will vary most here. | 4 — Repeated rules keep length and tone stable run to run; wording of the sentence itself can still vary. | 5 — The required JSON envelope makes output machine-checkable and uniform, which suits the `validateOutput` step in the adapter. |
| Factual agreement | 3 — With no in-prompt reminder, a weak model is most likely here to embellish or hedge. | 5 — The "do not invent facts / do not change the decision" rules are explicit, directly reducing the main failure mode. | 5 — Same explicit rules as B, plus a format that leaves no room for extra commentary. |

## Recommendation

**Variant C (strict format)** is recommended. It matches how the mock adapter
already works — it validates that the reply is short and agrees with the
verdict — and a fixed JSON envelope makes that validation reliable rather than
hopeful. The JSON wrapping is also the safest base if a real LLM replaces the
mock later: format constraints survive model changes better than phrasing
hopes. Variant B is a good fallback if free-text output is preferred for UI
reasons; variant A is not recommended for anything beyond prototyping.

Caveat repeated honestly: these scores are reasoned against the deterministic
mock, not measured against a real LLM. Swapping in a real model would require
re-testing all three variants before trusting this ranking.
