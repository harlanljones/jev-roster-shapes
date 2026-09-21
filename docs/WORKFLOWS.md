# Interaction contract

Status: implementation defaults for the local prototype (D-38 through D-40: library-first, five public 2026 retrospective analyses, analyst-labeled shape rubric v1). Read [SPEC.md](../SPEC.md) for product scope; use the domain and data contracts for calculations and serialization. This document owns screens, transitions, and observable interaction behavior.

## 1. First complete journey

An analyst opens the start screen's roster-and-shapes graphic, picks one of the five retrospective analyses, acknowledges its public-data provenance, reviews the event window and source snapshot, edits allocations across baseline and candidates A/B, compares supported results, inspects evidence, and exports a comparison another analyst can replay.

Completion means the exported comparison restores its inputs and results, including gaps and unavailable metrics. An acquisition preference is optional; a recommended transaction is outside this workflow.

The prototype works locally without a model provider or team account. Show the bundle's data class (`Public data` with its observed-values limitation, or `Synthetic demo data` for imported synthetic bundles) on the workspace and exports. Authentication, real data permissions, and deployment remain separate release gates.

## 2. Workspace and navigation

Use one comparison workspace with these reachable views. They may be panels or routes; implementation must preserve the same selected comparison and revision.

| View | Required content | Primary action |
| --- | --- | --- |
| Library / start | Interactive roster-and-shapes graphic (position lanes, shape glyphs, player detail, table equivalent) plus five retrospective analyses with event windows and source snapshots | Open analysis |
| Assumptions | Horizon, templates, PA budgets, exposure assumptions, limits, provenance | Apply assumptions |
| Allocation | Baseline/A/B selector, membership, template slots, workloads, diagnostics | Commit allocation edit |
| Compare | Baseline/A/B columns, coverage, PA transfers, supported metrics, checks | Inspect a result |
| Evidence | Source, assumptions/judgments, formula and input versions | Return to originating result |
| Review / export | Exact revision, readiness checks, missing metrics, unchecked rules | Save / export revision |

Keep the comparison name, shared assumption revision, snapshot date, active scenario, unsaved status, and readiness summary visible or one navigation action away. Give empty workspaces an explicit load/import action.

Navigation preserves committed draft edits. Invalid text in an editor remains local to that editor until corrected or explicitly discarded; it must not replace the last valid scenario record.

## 3. Load and import

1. Load the bundled demo or choose a compatible exported bundle.
2. Validate the whole bundle before changing the active workspace.
3. Show source label, dates, schema/calculation versions, scenario count, and validation summary.
4. Open the validated comparison as a new local record; retain existing records.

For errors, identify the field or record, expected format, and repair action. Duplicate IDs, unknown versions, invalid units, and incompatible snapshots prevent activation. Keep the currently open comparison intact.

A projection date alone is descriptive freshness information. Apply stale-data warnings only against an explicit freshness policy; show that policy with the warning. Never silently replace a saved snapshot with a newer one.

For this prototype, bundle import is the portable interchange workflow. Additional raw-source adapters require their own mapping and validation contract before appearing as supported import options.

## 4. Set shared assumptions

Baseline, A, and B belong to one comparison and share one assumption set. Show this scope next to the assumptions editor.

- Set a nonnegative integer horizon and integer game counts for full-game templates; counts reconcile to the horizon.
- Each template has eight defensive slots: C, 1B, 2B, 3B, SS, LF, CF, RF; DH is a separate ninth batting assignment.
- Specify defensive outs per game and display resulting innings with explicit units, such as `9 innings + 1 out`; retain integer outs internally.
- Set batting order, projected PA for each batting slot, and that slot's exposure to pitcher handedness.
- Label starter handedness as context metadata. It does not set all PA exposure to that hand.
- Show applicable availability and workload limits, including explicit unknown values.

The first implementation uses full-game assignments without substitutions. Describe that simplification beside template editing so an analyst does not mistake a full-game projection for late-game coverage modeling.

Applying a shared edit creates a new comparison revision, increments all scenario revisions, clears all acknowledgments, and recalculates all three scenarios. Dataset changes follow the same policy. Retain their assignments where structurally valid; identify assignments needing repair. Changing template structure must show a preview of removed or unassigned slots before commit.

Create a sensitivity case by duplicating the comparison with a named assumption change. Compare A and B against the baseline inside that case. Label cross-case inspection as sensitivity, with changed assumptions visible.

## 5. Create acquisition scenarios

Copy the baseline allocation into A or B. Choose an incoming player from the supplied candidate pool and an outgoing player when needed; retain both stable IDs in scenario history.

Membership changes do not allocate opportunities automatically. Offer an explicit substitution preview showing affected slots, PA transfers, defensive workload, and new diagnostics. Commit only the edits shown in that preview.

Removing an assigned player clears their assignments and retains the demand in those slots. The resulting scenario is a saved draft with uncovered defense and unallocated PA until repaired.

Adding a player already in the scenario produces a field-level error. Candidate search matches names and stable IDs; no external discovery or implied player facts are needed.

## 6. Edit allocations

For each template, show games, defensive workload, nine batting slots, each slot's PA and exposure assumptions, assigned player, and eligibility status. A player chooser must offer `Unassigned` explicitly.

Each edit previews the affected player workloads and diagnostic changes, then commits as one action. A duplicate or ineligible assignment is rejected with a specific reason; the existing valid assignments remain intact. Clearing a slot is an allowed draft edit.

The displayed team PA budget stays fixed when players move. An empty batting slot retains its PA budget as unallocated PA. Show allocated, unallocated, and required totals together.

Offer an explicit swap when a player already occupies another slot in the same template; show both destination assignments and validate both before applying. Selecting a bench alternative changes that template's allocation, not simultaneous coverage.

Drag-and-drop is optional. Every allocation operation must also work through labeled player selectors or `Move` / `Swap` controls using keyboard alone. Reordering display tiles has no calculation effect.

After a commit, retain the last rendered result while recalculation is pending and label it `Updating`. Associate results with the input revision; discard late results from earlier revisions. Never display an old delta as current.

## 7. Compare without hiding missingness

Present the same metrics in the same order for baseline, A, and B:

- Coverage demand, assigned defense, and measured shortfall by position and context.
- Allocated PA, unallocated PA, and player-level PA changes from baseline.
- Workload and eligibility diagnostics.
- Offensive contribution and deltas only when the required inputs and feasible allocations support them.
- Show optional supplied costs separately with their period, currency, and source. Additional defensive/baserunning display metrics require a contract extension; v1 must not fabricate them.

Show zero as `0` and unavailable as `Unavailable — [reason]`. A scenario with missing rates must not show a partial sum styled as a full total. Suppress a delta if either contributing total is unavailable; retain supported coverage and workload comparisons.

For an incomplete draft, label partial assignment quantities provisional and suppress full value comparisons. For an invalid allocation, suppress authoritative computed totals and show raw inputs with diagnostics. A diagnostic links to the exact template, slot, player, or assumption that needs repair.

White space appears only in measured position lanes, labeled with its shortfall and unit. A separate DH/batting view expresses offensive assignments. Shape glyphs, empty canvas, and layout spacing have no quantitative interpretation: shapes are assumption-layer profile labels (see the shape rubric), never calculation inputs.

Player tiles show names and numeric workload. Any performance color has a visible measure, unit, scale, and missing-data treatment. A table or text equivalent exposes every visual quantity. Unclassified profiles are a normal state (e.g. a player with no observed inputs).

## 8. Inspect evidence

Every quantity, warning, and advisory profile exposes its evidence from the place where it appears. Opening evidence preserves the scenario and selected result; closing returns keyboard focus to its trigger.

| Evidence layer | Required display |
| --- | --- |
| Source | Source ID/name, snapshot date/version, player, metric, value, unit, supplied limitations |
| Assumptions / judgments | Chosen limits, assignments, exposures, author/revision; model or human label and override reason when present |
| Calculation | Formula, relevant inputs, calculation version, resulting value, diagnostic or unavailability reason |

For a scenario delta, expose both operands and the allocation changes that produced them. Evidence may explain assigned PA without making a causal claim about acquisition success.

If classification is enabled later, use visible pending, current, stale, unavailable, and overridden states. Model failure changes that advisory state only. A manual override keeps the original output and records the reason; quantitative results do not depend on the label.

## 9. Save, review, export, restore

Expose `Save draft` regardless of feasibility, provided the record is structurally valid. A successful save shows its revision and local timestamp. A failed save retains the in-memory work, visibly marks it unsaved, and offers retry and export.

Use explicit local saves for the prototype. Indicate that local records are tied to this browser/device and that exporting creates a portable copy. Detect an unsaved revision when replacing or closing the workspace where the host supports that warning.

Readiness is a checklist with independent dimensions:

| Dimension | Behavior |
| --- | --- |
| Coverage/allocation feasibility | All required assignments and conservation/capacity checks pass before review readiness |
| Metric availability | Select `coverage` or `coverage_and_offense` review scope; the former permits missing offensive rates with visible limitations, the latter requires available offense |
| Transaction checks | List enabled checks and require acknowledgment of unchecked legal/roster rules |
| Saved revision | Review applies to a persisted exact revision; subsequent edits return it to draft |

`Ready for review` means the checklist passed for the saved comparison; it is not transaction approval. The complete comparison requires baseline and both A and B, all feasible and individually ready for the same selected review scope. Earlier drafts may contain fewer candidates. Optional model availability is not a readiness requirement.

Export includes versioned inputs, allocations, assumption set, cached results with diagnostics and availability, and acknowledgment through the v1 bundle contract. Give the file a comparison name and revision. Export drafts with their draft status and failures intact. Classification provenance export requires the later classifier contract extension.

On restore, recompute with the cached result's supported calculation version and compare results. An empty result cache triggers initial calculation. A mismatch blocks verified replay and review readiness; show the discrepancy while retaining the original bundle. An unsupported input schema rejects import. An unavailable historical calculation version permits viewing stored results labeled `Historical — replay unavailable`, with readiness blocked; migration must be explicit.

## 10. Failure and accessibility behavior

| Condition | Required outcome |
| --- | --- |
| No eligible player | Keep the slot unassigned; expose the shortfall and reason |
| Unknown limit or missing projection | Show the unresolved input and its affected checks/metrics |
| Calculation error | Retain inputs; mark results unavailable; provide retry and diagnostic details |
| Local storage unavailable/full | Keep editing in memory with persistent unsaved warning and export action |
| Optional provider unavailable | Retain deterministic results and show classification unavailable |
| Empty/zero-game horizon | Render defined zero-demand results without divide-by-zero artifacts |

All actions have visible labels and keyboard focus. Dialogs restore focus, errors reference fields, and result updates announce concise changes without moving focus. Charts expose text values; statuses and eligibility are understandable without color. Reduced motion preserves the same feedback and state changes.

## 11. Observable user acceptance

1. From a fresh start screen, a user opens a retrospective analysis, acknowledges its public data, sees the event window and source snapshot, and completes a baseline/A/B comparison without a provider connection.
2. A keyboard-only user makes the same supported assignment and swap edits as a pointer user.
3. Removing a starter preserves required demand and PA, exposes uncovered assignments, and disables full value comparison until repaired.
4. A shared exposure change updates all scenarios; starter-hand metadata alone does not rewrite exposure.
5. Missing split rates leave workload/coverage visible and identify exactly which value results are unavailable.
6. From a delta, a reviewer reaches its two operands, input versions, and formula, then returns to the originating result.
7. Saving/exporting an incomplete draft and importing it restores the same shortfalls and unavailable metrics.
8. A feasible comparison can be marked ready only after saving and acknowledging unchecked transaction rules; editing it removes readiness.
9. Save failure and stale calculation responses never produce a false saved/current indicator.
10. Moving decorative tiles — or relabeling shapes — changes neither quantities nor replayed results.
