# Acceptance and evaluation

> Status note (D-38, 2026-09-21): §1's synthetic golden table is superseded —
> the golden fixture was removed from the app/test surface and its expectations
> replaced by the five 2026 storyline tables in D-40 (asserted in
> `tests/storylines/registry.test.ts`). The calculation cases in §2 below are
> unchanged in behavior and are re-targeted at the power-vacuum storyline in
> `tests/engine/calculation.test.ts`. `docs/examples/comparison-v1.json` stays
> read-only as the historical v1 illustration.

Read when implementing tests, measuring performance, or claiming completion. These are requirements and independently specified expected values, not a record of passing application tests. Record observed results in the report paths assigned by [ROADMAP.md](../ROADMAP.md).

## 1. Golden synthetic comparison (historical — superseded, see note above)

[comparison-v1.json](examples/comparison-v1.json) is a complete, invented input bundle. It contains no real player or team projections. Preserve this file as the contract example; the implementation may copy it into runtime fixtures and must verify that copy against this version.

The horizon is ten games: four in template `vs-left-starter`, six in `vs-right-starter`. Each position requires 27 defensive outs per game. Each batting slot has 16 and 24 PA respectively, totaling 40. Every slot has ten PA versus left-handed pitchers and thirty versus right-handed pitchers across both templates. This exposure is explicit and deliberately distinct from starter-handedness metadata.

Eight retained starters each project at `0.02` synthetic runs per PA. The ninth starter, `p-2b`, projects at `0`. An unused reserve, `p-reserve`, has no projection row. Candidate A (`p-a`) projects at `0.05`; candidate B (`p-b`) at `0.03`. Each candidate replaces the reserve in membership and takes the incumbent second baseman's two template assignments; the incumbent remains available but unallocated.

| Expected quantity | Baseline | A | B |
| --- | --- | --- | --- |
| Roster members | 10 | 10 | 10 |
| Allocated / unallocated PA | 360 / 0 | 360 / 0 | 360 / 0 |
| Defensive outs per fielding position | 270 | 270 | 270 |
| Total position-outs across eight positions | 2160 | 2160 | 2160 |
| Defensive shortfall | 0 | 0 | 0 |
| Synthetic offensive runs | `6.4` | `8.4` | `7.6` |
| Offensive delta vs baseline | `0` | `2` | `1.2` |
| Allocation feasibility | feasible | feasible | feasible |
| Review readiness on first load | false: acknowledgment missing | false: acknowledgment missing | false: acknowledgment missing |

The golden fixture's `results` array is empty intentionally. It does not pretend that an engine has already evaluated it. Compare decimal numeric values exactly before display rounding; trailing zero formatting is not a substantive difference.

## 2. Engine and contract cases

Each mutation below starts from the golden input unless its row says otherwise. Tests must exercise the public contract/engine boundary and meaningful outputs, not duplicate private implementation steps.

| ID | Input or action | Required outcome |
| --- | --- | --- |
| C-01 | Evaluate the unmodified fixture | All totals above match exactly; missing reserve projection has no effect because its PA are zero |
| C-02 | Clear baseline RF in both templates | RF shortfall 270 outs = 90 innings; 40 unallocated PA; 320 allocated PA; incomplete; baseline offense and both deltas unavailable; independently valid candidate totals remain available |
| C-03 | Put `p-ss` in both SS and 2B in one template | `DUPLICATE_ASSIGNMENT`; invalid; no authoritative coverage/workload or value totals |
| C-04 | Give `p-ss` eligibility at 2B, then swap SS and 2B in only one template, also granting incumbent SS eligibility | Feasible if caps allow; disjoint templates do not double-count starts; PA unchanged |
| C-05 | Assign `p-a` at C without C eligibility | `INELIGIBLE_POSITION`; unchanged demand; invalid |
| C-06 | Set A's `p-a.maxPA` to 39, then 40 | First invalid with `CAP_EXCEEDED`; second feasible at the boundary |
| C-07 | Set an allocated player's starts cap to null, then set an unused reserve's caps to null | Allocated unknown creates incomplete/`CAP_UNKNOWN`; unused reserve unknown alone leaves feasibility unchanged |
| C-08 | Leave an outgoing player assigned or in membership | Domain reference/membership issue; never silently retain or replace the player |
| C-09 | Change candidate A rates to L=`0.08`, R=`0.04`; select split mode for the whole comparison | Candidate A adds `2` runs for its 10 L / 30 R PA; full A total `8.4`; baseline still `6.4` |
| C-10 | Starting C-09, edit only starterHand metadata | Identical numerical metrics; metadata revision/digest may change |
| C-11 | Starting C-09, change the shared 2B slot exposure to total 20 L / 20 R PA | Recompute baseline/A/B together; A's candidate contribution becomes `2.4`, total `8.8`, delta `2.4` |
| C-12 | In split mode, transfer 1 R PA into unknown for an occupied slot | Total PA conserved; offense unavailable with `UNKNOWN_EXPOSURE`; coverage unchanged |
| C-13 | Missing L rate and zero L PA for that player in split mode | Still calculable from supported positive exposures; missing L at positive exposure instead yields `MISSING_RATE` |
| C-14 | Remove a positive-PA player's overall rate in overall mode | Coverage remains feasible; affected full offense/delta unavailable; no zero substitution |
| C-15 | Clear DH in both baseline templates | 40 unallocated PA; all defensive lanes remain covered; incomplete; no invented DH defensive shortfall |
| C-16 | Set horizon, every template game count, and every slot PA count to zero | Zero workload/coverage demand and available zero offense if assignments/caps are otherwise valid; no divide-by-zero |
| C-17 | Use negative rate `-0.01` for candidate A | A total `6`, delta `-0.4`; negative rates are valid |
| C-18 | Duplicate ID, unknown field, negative count, fractional game count, malformed decimal, or unsupported schema | Import rejects atomically with a path and reason; existing workspace remains intact |
| C-19 | Compare results from different shared assumptions or snapshots | `INCOMPATIBLE_COMPARISON`; no numeric cross-scenario delta |
| C-20 | Set baseline roster limit to 9 with 10 members; separately enable a budget with missing cost | Constraint failed / unknown respectively; readiness false; allocation metrics still available |
| C-21 | Reorder display tiles or change advisory shape | Identical metric values; display/classifier state cannot alter assignments or calculation inputs |
| C-22 | Serialize input object keys in a different order | Same canonical input digest and values; array ordering retains its documented identity semantics |
| C-23 | Require 28 defensive outs in each of ten games | Per-position demand 280 outs, displayed as 93 innings + 1 out; raise defensive caps accordingly or expect capacity failure |
| C-24 | Evaluate an excessive integer/product outside safe calculation bounds | Explicit numeric validation failure; never an imprecise silently rounded result |
| C-25 | Change baseline membership while leaving candidate records unchanged | Input digest changes; candidate membership revalidated; mismatch surfaced; acknowledgments cleared |
| C-26 | Duplicate a member cost row or add a nonmember cost row | Invalid cost structure; no double-counted or silently ignored cost |

## 3. Persistence, integration, and UI gates

| ID | Journey | Pass evidence |
| --- | --- | --- |
| I-01 | Import → calculate → edit A → save → reload → export → reimport | Same versioned inputs and exact values restored; calculation identity verified |
| I-02 | Save/reload C-02 incomplete draft and a structurally valid over-capacity draft | Null assignments and capacity issues survive; readiness remains false; no lost demand |
| I-03 | Import cached result with changed runs but original input | Replay detects mismatch; original bundle retained; review blocked |
| I-04 | Open a bundle with supported schema but unavailable historical calculation version | Stored results labeled historical; replay unavailable; explicit migration needed to produce current results |
| I-05 | Fail browser persistence during save | Work remains in memory, unsaved warning visible, export available, no false saved indicator |
| I-06 | Commit two edits before first calculation resolves | Only latest matching revision becomes current; prior result labeled updating until replaced |
| I-07 | Complete load/edit/swap/evidence/save/export using keyboard | Same supported operations as pointer flow; focus returns from dialogs; errors linked to fields |
| I-08 | Inspect every golden result and one unavailable result | Source/assumption IDs, units, operands, formula/version, and reasons are reachable |
| I-09 | Acknowledge unchecked rules for saved baseline/A/B, then edit one scenario | Ready only for exact saved feasible revisions and selected scope; edited scenario requires acknowledgment again |
| I-10 | Disable or fail optional classification | Core journey and deterministic values unchanged; advisory status visibly unavailable |
| I-11 | Import an already-used bundle ID with different content | Conflict surfaced; existing data preserved until explicit new-revision resolution |
| I-12 | Render empty and unknown data | `0`, `Unavailable`, `Unassigned`, and `Unknown limit` remain distinguishable without color |
| I-13 | Change shared exposure or dataset after all scenarios were acknowledged | All scenario revisions advance, acknowledgments clear, and results recompute; former ready state is retained only in history |

The prototype completion report must link each mandatory case to test output or a recorded manual exercise. Unimplemented optional classification uses `not applicable — disabled`, not a fabricated outage pass. Any materially wrong numerical result blocks completion.

## 4. Performance protocol

Proposed target: p95 ≤250ms from committed allocation edit through validation, calculation, state update, and displayed quantitative diff. This target applies to local deterministic editing, excluding initial import and optional classification, which must be measured separately.

At RS-07, record commit, browser/version, hardware, build mode, fixture hash, template/member count, instrumentation boundaries, warm-up policy, sample count, p50/p95/max, and error count. Proposed repeatable run: 20 warm-up edits followed by 100 measured valid swaps and assignment edits. Keep rapid successive edits as a separate race-condition exercise. Measure an agreed larger workload before extrapolating beyond the golden fixture. A ten-game fixture passing is not evidence for arbitrary workloads.

## 5. Human and model evaluation handoff

Before a real pilot, RS-08 must record participants and availability, current-workflow baseline, matched cases, counterbalanced order, the scoring rubric, handling of failures/timeouts, sample size rationale, and analysis rules. Freeze the protocol before testing. Score correct identification of constraints/tradeoffs and faithful interpretation of uncertainty; do not score agreement with one person's favorite acquisition.

The proposed 25% median-time improvement from SPEC is contingent on no reduced blinded assessment quality. Report individual paired results and uncertainty, retaining failed tasks. Small convenience samples support usability findings, not a generalized efficacy claim.

Before any Jev adoption claim, freeze task/rubric, development and held-out splits, rule baseline, allowed inputs, probability scoring, review thresholds, per-class error tolerances, and latency/cost limits. Report labeler disagreement and abstention coverage. Team representatives supply tolerable risk thresholds; agents must not invent accepted error rates.
