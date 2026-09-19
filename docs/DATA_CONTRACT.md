# Data contract v1

Read before writing the importer, domain types, persistence, export, or provider adapter. This is the normative JSON boundary for the synthetic prototype. Implement a machine-readable validator as the first domain work package; [examples/comparison-v1.json](examples/comparison-v1.json) is the golden positive example.

## 1. Common conventions

- JSON field names are case-sensitive. Version 1 rejects unknown fields at validation boundaries so misspelled fields cannot silently disappear.
- IDs are nonempty, stable ASCII strings. References must resolve within the bundle. Array ordering is presentation order unless specifically identified below.
- Counts are finite, nonnegative safe integers. Nullability is explicit. Missing required fields are errors; explicit `null` carries the documented unknown/unassigned meaning.
- Timestamps use UTC ISO-8601 strings. Decimal rate/result strings use ordinary signed base-10 notation, without exponent notation, at most six fractional digits.
- `schemaVersion` is `"1.0"`. An unsupported version produces a version error and leaves existing local work untouched.
- User-facing evidence strings are plain text. Render them escaped; never execute markup, scripts, or imported formulas.
- Every file and screen sourced from the fixture carries `dataClass: "synthetic"`. Supported future classes are `public` and `restricted`; merely changing that field does not authorize use of restricted inputs.

## 2. Bundle

The import/export object contains these required keys:

| Key | Type | Meaning |
| --- | --- | --- |
| `schemaVersion` | string | Boundary version |
| `bundleId` | ID | Identity of this immutable export |
| `createdAt` | timestamp | Export creation time |
| `dataClass` | enum | `synthetic`, `public`, or `restricted` |
| `sources` | Source[] | Provenance records |
| `dataset` | Dataset | Frozen player/projection inputs |
| `assumptions` | AssumptionSet | Shared demand and calculation settings |
| `comparison` | Comparison | Baseline and candidate scenario revisions |
| `results` | CalculationResult[] | Cached results; empty for an unevaluated input fixture, populated on calculated exports |

Source: `{id, title, kind, effectiveAt, note}`, with kind `synthetic`, `projection`, `eligibility`, or `manual`. Notes must distinguish invented values from measured or approved inputs. No network resolution is necessary to load a bundle.

Dataset: `{id, revision, sourceIds, players, metricDefinitions, projections}`. Revision is a positive integer; references include both ID and revision. Dataset changes create a new revision, never mutate a saved one.

Player: `{id, name, bats, eligiblePositions, sourceIds}`. `bats` is `L`, `R`, `S`, or `unknown`. Eligibility is a unique array drawn from the eight defensive positions in the domain spec; it may be empty. DH is not an eligibility entry.

MetricDefinition: `{id, unit, referenceBaseline, sourceId, note}`. V1 contribution supports only unit `runs_per_PA`. Other source metrics require a future contract or a distinct display-only structure; do not relabel them as runs.

Projection: `{playerId, metricDefinitionId, overall, vsL, vsR, sourceId}`. Each rate is a decimal string or null. A `(playerId, metricDefinitionId)` pair is unique. No projection row means unavailable, not a zero rate. Mixing sources/baselines within the selected metric is invalid unless a future reviewed conversion contract explicitly supports it.

## 3. Shared assumptions

AssumptionSet:

```text
{ id, revision, authorId, horizonGames, offenseMode, metricDefinitionId,
  sourceId, templates }
```

`offenseMode` is `overall` or `split`. Templates are unique by ID, and their game counts sum to `horizonGames`.

Template:

```text
{ id, label, starterHand, games, defensiveOutsPerGame, slots }
```

`starterHand` is `L`, `R`, `unknown`, or `mixed` and has no arithmetic effect. Positive-game templates require positive defensive outs per game. In this first model the fielding period is shared by all eight positions.

Slot:

```text
{ order, role, paByPitcherHand: { L, R, unknown } }
```

Order is an integer 1–9. Each template contains every order once and every role once, including DH. Exposure counts are **total PA for that slot across the template's games**, not PA per game. Sum them to get slot PA; sum all slots to get the template opportunity budget. Record the budget methodology in the shared assumption source note.

Pitcher exposure and player batting handedness are different concepts. No automatic assignment of handedness exposure from `starterHand` or `bats` is permitted.

## 4. Scenarios and comparison

Comparison:

```text
{ id, revision, datasetRef: { id, revision },
  assumptionRef: { id, revision }, baseline, candidates }
```

Candidates is an array of zero to two Scenario objects, allowing progressive drafting. Each scenario is independent; B is not an edit on A. All share the comparison's pinned references.

Scenario:

```text
{ id, revision, authorId, label, memberIds, incomingIds, outgoingIds,
  allocations, workloadCaps, constraints, review }
```

Baseline incoming/outgoing lists are empty. For each candidate, membership must equal `(baseline.memberIds - outgoingIds) union incomingIds`. Incoming IDs cannot already be baseline members; outgoing IDs must be baseline members. Lists contain no duplicates. Every member resolves to a dataset player. Incoming/outgoing IDs cannot overlap.

Allocation: `{templateId, assignments}` with Assignment `{order, playerId}`. Each scenario includes every shared template exactly once and every slot exactly once. `playerId` is an ID or null. Draft references that are structurally valid but violate domain constraints may be saved, with issues; broken references cannot be imported as a valid bundle.

WorkloadCap: `{playerId, maxStarts, maxDefensiveOuts, maxPA, sourceId}`. Exactly one record exists per scenario member; each limit is a count or null. Caps apply across the full horizon and include DH starts/PA. A cap change is an explicit scenario assumption change.

Constraints:

```text
{ rosterSizeMax, costBudget, costs }
```

`rosterSizeMax` is an integer or null (disabled). `costBudget` is null (disabled) or `{currency, period, maxMinorUnits}`. `costs` contains `{playerId, currency, period, minorUnits, sourceId}` for members when supplied. Require at most one record per member; reject duplicate and nonmember cost records. An enabled budget needs exactly one matching record for every member. Amounts are nonnegative safe integers; currency is an explicit code and period is a shared label, such as `pilot-horizon`. Costs must match enabled budget currency/period. No prorating, currency conversion, or inference from annual salary is implicit. Disabled cost checks may display available costs individually; partial cost sums must be labeled partial.

Review:

```text
{ scope, uncheckedTransactionRulesAcknowledgedAt, acknowledgedScenarioRevision }
```

Scope is `coverage` or `coverage_and_offense`. Both acknowledgment fields are null until explicitly confirmed; otherwise timestamp and revision must both be present and the revision must match the scenario. Readiness is calculated, not trusted from imported input. This acknowledgment records a review limitation, not transaction approval. Acknowledgment is metadata attached to the current content revision; it does not itself increment that revision. Any content edit increments the revision and clears acknowledgment. Author IDs are nonempty identity labels; `demo-analyst` identifies the synthetic author, not an authenticated team account.

Changing shared assumptions, dataset/projections, or baseline membership increments every affected scenario revision and clears all scenario acknowledgments in the comparison, as well as creating a new comparison revision. Changes cannot retain an acknowledgment for older calculation inputs. Baseline membership edits must also reconcile candidate incoming/outgoing sets explicitly.

## 5. Results and issue contract

The engine returns an object separate from imported inputs:

```text
{ calculationVersion, inputDigest, scenarioId, scenarioRevision,
  feasibility, issues, workload, coverage, offense, constraints, readiness }
```

`feasibility`: `invalid`, `incomplete`, or `feasible`. Issue: `{code, path, message, playerIds}`; path identifies the affected JSON field. Use stable codes; prose can evolve. Return issues in path/code order for deterministic output.

Required codes include `INVALID_SCHEMA`, `UNSUPPORTED_VERSION`, `UNKNOWN_REFERENCE`, `DUPLICATE_ASSIGNMENT`, `INELIGIBLE_POSITION`, `MEMBERSHIP_MISMATCH`, `CAP_EXCEEDED`, `CAP_UNKNOWN`, `UNASSIGNED_SLOT`, `MISSING_RATE`, `UNKNOWN_EXPOSURE`, `METRIC_MISMATCH`, `INCOMPATIBLE_COMPARISON`, `CONSTRAINT_EXCEEDED`, `CONSTRAINT_UNKNOWN`, and `REPLAY_UNAVAILABLE`.

Workload: an array of `{playerId, starts, defensiveOuts, PA, paByPitcherHand}`. Coverage: array of `{templateId, position, demandOuts, allocatedOuts, shortfallOuts}`. Invalid allocations return these as null instead of plausible-looking authoritative totals; the UI can inspect raw inputs and demand separately. Workload is sorted by player ID; coverage follows template input order and the canonical position order in the domain spec. Zero-workload members are included.

Offense: `{status, runs, reasons}`, where status is `available` or `unavailable`; `runs` is an exact decimal string or null. An available zero is `"0"`, distinct from unavailable null. Reasons reference issue codes and affected inputs. Formatting may display two decimal places but exports retain exact precision.

Constraints result: `{rosterSize, cost}`, each `{status, reasons}` with status `passed`, `failed`, `unknown`, or `unchecked`. Readiness: `{ready, scope, blockingCodes}`. Numeric comparison deltas use the same available/unavailable convention, plus both source result identities.

Calculate a digest from the object containing `schemaVersion`, `dataClass`, `sources`, `dataset`, `assumptions`, and `comparison`, with all their fields. Including baseline membership is essential because candidate validity depends on it. Exclude `results`, `bundleId`, and `createdAt` so cached outputs and re-export timestamps do not change input identity. All scenario results within a comparison may share this digest; identify each result by digest, calculation version, scenario ID, and scenario revision together. Canonicalize recursively by sorting object keys lexicographically, preserving array order, using JSON string escaping and no whitespace; encode as UTF-8 and SHA-256. Input numbers are integers only. A digest detects changes; it does not authenticate authorship.

## 6. Persistence and boundaries

Persist the input bundle, results, calculation version, and input digests together. Each cached result must reference a scenario in that bundle; at most one result exists per scenario and calculation version. An empty results list means unevaluated, not verified. An export must be self-contained for replay with the corresponding engine; it must not require resolving a live vendor endpoint. Preserve past revisions when editing a saved comparison. Treat duplicate import IDs with different content as a conflict requiring an explicit replace-as-new-revision action.

Prototype persistence may be local browser storage behind a repository interface. Show whether edits are unsaved, saved locally, or exported. Storage failure preserves in-memory edits and offers export. Browser storage is not a team backup or an authorized place for proprietary data by default.

Classification records belong to a separate optional store: `{id, playerId, evidenceDigest, modelId, modelVersion, rubricVersion, requestedAt, status, probabilities, rawResponseRef, latencyMs, cost, override}`. Design its exact provider schema in the model work package. Missing model access does not block the bundle, importer, or calculation work.
