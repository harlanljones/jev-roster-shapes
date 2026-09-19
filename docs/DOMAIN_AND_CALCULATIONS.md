# Domain and calculation rules

Read this before implementing allocations, validation, comparison metrics, or synthetic fixtures. [SPEC.md](../SPEC.md) defines product scope; this document specifies the first implementation. These rules are synthetic-prototype defaults pending baseball review, not claims about official roster rules.

## 1. Modeling boundary

Version 1 uses **full-game lineup templates**. Each template repeats one starting lineup for an integer number of games. It assumes each assigned defender plays the template's stated defensive outs per game. Mid-game substitutions, extra-inning distributions, pitcher batting, and dynamic lineup optimization are outside this version.

Use eight defensive positions: `C`, `1B`, `2B`, `3B`, `SS`, `LF`, `CF`, `RF`. `DH` is a batting role and receives no defensive innings. Every template has exactly nine batting slots, each linked to one of the eight positions or DH. A player assigned to a slot takes that slot's role and opportunities. This single assignment representation prevents mismatched batting and fielding lineups.

Each template defines its own explicit demand:

- `games`: number of full games using the template.
- `defensiveOutsPerGame`: demand per defensive position in each game; 27 in the synthetic fixture.
- Nine uniquely numbered batting slots, each with a unique role.
- Each slot's total projected PA over **all games in that template**, including explicit exposure counts by pitcher handedness.

Template game counts sum to the horizon. A template with zero games has zero PA demand. A zero-game horizon is valid for boundary testing and has zero demand throughout. Handedness context such as “left-handed starter” is metadata; it does not imply all PA will face left-handed pitching.

## 2. Allocation and conservation

A scenario maps every `(templateId, slot)` to a player ID or `null`. Null means uncovered demand. A reserve player has membership but no assignment. Roles and slot demand belong to the shared assumptions; assignments belong to the scenario.

For each template:

1. Validate exactly nine assignments, one for each defined slot.
2. Confirm each non-null ID belongs to the scenario roster.
3. Confirm non-null IDs are unique within that template.
4. Confirm fielding assignments have approved eligibility for that position. Any roster player may be assigned DH under this prototype policy.
5. Assign each player the full slot demand; do not silently split or redistribute it.

The same player may play different positions in different templates because their game counts represent different games. Count their total workload across all templates.

```text
player_starts[i] = sum of template.games for slots assigned to i
player_defensive_outs[i] = sum of (template.games × template.defensiveOutsPerGame)
                           over non-DH slots assigned to i
player_PA[i,hand] = sum of slot.paByPitcherHand[hand] over slots assigned to i
player_PA[i] = sum_hand player_PA[i,hand]
```

Count a player's start once per game, including DH starts. Batting and defending in the same game are not two starts.

Each roster member has an assumption record containing horizon-wide maximum starts, defensive outs, and PA. A limit of zero means zero capacity; `null` means unknown. Unknown limits for an allocated player block readiness until supplied. An unused reserve with unknown capacity does not block readiness. Compare each workload against its applicable limit; equality passes.

For every template and pitcher-hand bucket:

```text
allocated_PA + unallocated_PA = slot_PA_demand summed across all nine slots
```

Adding a candidate changes membership only. Allocating the candidate requires a proposed or explicit slot replacement that shows displaced PA. Removing an assigned player must present the affected assignments and then set them to null on confirmation. No operation changes demand to hide a shortfall.

## 3. Coverage and feasibility

Use integer **outs** internally; baseball innings notation is not decimal arithmetic. Display 28 outs as “9 innings + 1 out,” never “9.1 decimal innings.” A position accumulates one out of coverage for each out of team defense; summing across eight positions produces position-outs, not team outs.

```text
demand_outs[position,template] = games × defensiveOutsPerGame
allocated_outs[position,template] = demand_outs if that slot has a valid player; otherwise 0
shortfall_outs = demand_outs - allocated_outs
```

DH has PA demand but no defensive coverage cell. Show an unfilled DH slot through unallocated PA and an incomplete-lineup issue.

Distinguish these states:

| State | Meaning | Output |
| --- | --- | --- |
| `invalid` | Malformed structure, bad references, duplicate player, ineligible role, or exceeded known cap | Issues and demand may be inspected; suppress authoritative allocation totals and value comparisons |
| `incomplete` | Structurally valid draft with null assignments or unknown applicable caps | Valid partial allocation/coverage plus explicit unmet demand; suppress full contribution and scenario value delta |
| `feasible` | All assignments complete, eligible, unique, within known caps | Quantitative comparison available subject to metric-input completeness |

An invalid template never contributes a misleading “feasible” result. An over-capacity player cannot be fixed by clamping their workload or crediting their assignments selectively. Explain the issue and require an edit.

White space is the labeled shortfall within a position lane. Layout spacing, decorative shapes, the ordering of players, and classification changes have no effect on coverage.

## 4. Offensive contribution

A comparison declares exactly one `offenseMode`: `overall` or `split`. It also pins one `metricDefinitionId`, whose definition must establish additive runs per PA, the reference baseline, source, and effective snapshot. The synthetic metric is arbitrary demonstration data, not WAR or a forecast of team wins.

For `overall`, require an overall rate for each player with positive PA and multiply by total PA. For `split`, multiply `L` and `R` PA by their matching rates. Positive `unknown` exposure makes the split total unavailable; do not fill it with overall rates. Missing rates at zero exposure do not affect totals. Never choose modes independently for the compared scenarios.

```text
overall_runs = sum_i total_PA[i] × overall_runs_per_PA[i]
split_runs = sum_i (PA[i,L] × runs_per_PA[i,L] + PA[i,R] × runs_per_PA[i,R])
delta_runs = candidate_runs - baseline_runs
```

Rates are signed decimal strings with at most six fractional digits. Calculate in integer millionths of a run, and round only for presentation. Result decimal strings retain exact calculated value. Use safe integer bounds for all products or wider integer arithmetic; reject overflow instead of silently rounding.

Return `unavailable`, with reason codes and affected player IDs, if an allocation is not feasible or any positive-exposure rate is missing or incompatible. A partial contribution may be listed as a labeled subtotal in evidence, never in the full-total or delta field. Negative rates and negative deltas are valid.

Coverage changes and supported offensive contribution remain separate. There is no scalar “fit,” diversity bonus, defensive compensation bonus, or shape-weighted value.

## 5. Comparison compatibility

Baseline, A, and B must reference the same dataset snapshot, assumption set, rate mode, and metric definition. Baseline identity is immutable for the comparison. Membership, assignments, caps, and optional constraints may vary and must be disclosed in the diff.

If shared assumptions or the dataset change, create a new comparison revision, increment all scenario revisions, clear their acknowledgments, and recalculate all three scenarios, including baseline. Preserve the former revision. Baseline membership changes also invalidate candidate membership checks and acknowledgments. Comparing two results with incompatible inputs returns `INCOMPATIBLE_COMPARISON`, not a numeric delta.

For a metric delta, both corresponding metrics must be available. For valid incomplete drafts, coverage can be compared with a visible draft label, while offensive value remains unavailable.

## 6. Readiness and reproducibility

Keep three concepts separate: allocation feasibility, per-metric availability, and review readiness. A feasible scenario with missing projections may be ready as a **coverage-only review**, provided the user explicitly chooses that review scope. It must still show the missing offensive metric.

Readiness requires a feasible allocation, available metrics required by the selected review scope, no exceeded enabled constraints, and an acknowledgment of unchecked transaction rules bound to the current scenario revision. Editing scenario content invalidates the acknowledgment. Unknown enabled constraints block readiness; disabled constraints stay listed as unchecked.

Saved drafts are allowed in every structurally importable state. Save immutable inputs and results with versions. Reopening replays the pinned calculation version, compares it with the stored result, and flags a mismatch. If that version is unavailable, display the stored result as historical with replay unavailable; never silently recalculate under a new version.

Classification caches and human profile labels do not participate in the calculation identity. Model failures cannot change a stored quantitative result.
