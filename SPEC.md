# Roster Shapes

## Product and pilot specification · v0.1

**Status:** Proposed for review; no team partnership, data access, staffing, or model performance is assumed approved.

**Intended pilot context:** Boston Red Sox position-player roster evaluation.

**Pilot duration:** Six weeks after the data, staffing, and evaluation prerequisites in this spec are met.

## 1. Product thesis

Roster Shapes is an interactive workspace for comparing how potential acquisitions change a team's positional coverage, lineup options, and allocation of playing time.

The product combines team-approved projections with explicit roster assumptions. It shows who gains and loses opportunities, which assignments remain uncovered, and what tradeoffs follow from each scenario. Every displayed change can be traced to an input, an assumption, or a calculation.

The pilot tests two hypotheses:

1. A visual roster comparison helps evaluators identify consequential tradeoffs faster, without reducing assessment quality.
2. Jev can add useful, repeatable classifications of player profiles or scouting evidence beyond a simple baseline, at acceptable latency and cost.

The product hypothesis can succeed even if the model hypothesis fails. Quantitative scenario results must remain available without Jev.

## 2. Users and the first decision workflow

The primary user is a baseball operations analyst preparing acquisition options. A baseball operations evaluator reviews the assumptions and implications. The pilot supports decision preparation; it does not approve transactions.

**First workflow:** Compare two position-player or bench acquisition candidates against the same baseline roster over a fixed planning horizon.

The analyst:

1. Opens a versioned baseline roster and projection snapshot.
2. Chooses a planning horizon, opponent-handedness assumptions, and lineup templates.
3. Creates a scenario by adding a candidate and selecting any outgoing or displaced player.
4. Reviews or adjusts the proposed allocation of starts, defensive innings, and plate appearances.
5. Compares baseline, candidate A, and candidate B using identical assumptions.
6. Inspects evidence and saves a reproducible comparison for review.

An illustrative result would say: “This allocation fills the previously uncovered starts at second base, transfers plate appearances from Player B to Player A, and leaves the same late-game defensive limitation.” The system must show the underlying assignments and quantities. It must not infer that a visually fuller roster is necessarily more valuable.

## 3. Scope

### Included

- One team's position-player pool and a manually selected set of acquisition candidates.
- Versioned imports of approved roster, eligibility, availability, projection, and optional scouting data.
- Baseline plus two candidate scenarios, with explicit incoming and outgoing players.
- Editable lineup templates and allocation assumptions.
- Positional coverage, workload, platoon exposure, and projected offensive contribution where comparable inputs exist.
- Visual comparison, evidence drill-down, assumption edits, and saved scenario export.
- An optional, separately evaluated Jev classification experiment.

### Deferred

- Pitching staff allocation and pitcher archetypes.
- Postseason portability scores or October optimization.
- Automated trade proposals, target discovery, or transaction execution.
- A complete service-time, option, waiver, payroll, or roster-eligibility rules engine.
- Injury prediction, causal teammate compensation estimates, and a universal roster-fit score.
- Claims that the system predicts wins or transaction value from shape composition.

Contract costs and roster-slot limits may be displayed when supplied. Users must acknowledge unchecked transaction constraints before marking a scenario ready for review. The product must distinguish a feasible lineup allocation from a legally executable transaction.

## 4. Core concepts and data contracts

| Entity | Required content |
| --- | --- |
| Player | Stable ID, name, batting handedness, approved position eligibility, provenance |
| Projection snapshot | Source, effective date, player IDs, metric definitions, units, workload basis, available split estimates, uncertainty if supplied |
| Availability assumption | Planning-horizon limits, evidence, author, timestamp; unknown is explicit |
| Lineup template | Named context, game count or weight, defensive assignments, DH assumption, batting-order assumptions |
| Scenario | Baseline ID, incoming/outgoing players, assignments, workload limits, shared assumptions, author and revision |
| Calculation result | Input version IDs, calculation version, feasibility status, coverage and contribution deltas, missing-data flags |
| Classification | Model/version, rubric/version, exact input reference, output distribution, latency, cost, status, optional override |

Use a single documented unit for each input. Reject duplicate IDs, invalid units, inconsistent projection snapshots, and impossible assignments. Missing estimates remain missing rather than becoming zero or league average silently.

Prototype work may use clearly labeled synthetic fixtures. Team data becomes usable only after a designated data owner confirms permitted sources, access, and any external processing restrictions.

## 5. Scenario calculation model

### 5.1 Planning horizon and assignments

The user supplies the number of games in the horizon and the context distribution, such as expected games against left- and right-handed starters. These are scenario assumptions, not predictions generated by the classifier.

A lineup template specifies one player in each required defensive position and a compatible batting lineup for its context. The same player cannot occupy two simultaneous positions. Bench alternatives are evaluated as alternative templates, never counted as simultaneous coverage.

The engine validates:

- Required positions are filled by eligible players or explicitly marked uncovered.
- Players do not exceed their approved availability and workload limits.
- Starts and defensive innings reconcile to the chosen horizon and templates.
- Plate appearances reconcile to the supplied team opportunity budget.
- Incoming, outgoing, and retained players reconcile to scenario membership.
- User-specified roster-slot and cost constraints are satisfied when those checks are enabled.

An incomplete scenario is inspectable but labeled infeasible. It cannot produce a ready-for-review recommendation.

### 5.2 Coverage shortfalls: the definition of white space

For position `p` and context `c`, define required defensive innings `D[p,c]` from the horizon and templates. Let `A[i,p,c]` be innings assigned to eligible player `i` in a feasible allocation.

```text
coverage_shortfall[p,c] = max(0, D[p,c] - sum_i A[i,p,c])
```

White space represents this measured shortfall in a dedicated position lane. The interface labels its unit and context. Layout padding and the gaps around irregular icons never count toward the metric.

Eligibility and expected defensive quality are separate. An eligible but weak defender fills an assignment while retaining a visible quality concern. Improving defensive quality does not invent additional covered innings.

Do not combine innings, plate appearances, payroll, and qualitative flags into one unlabeled white-space number. Separate panels show separate deficits and constraints.

### 5.3 Allocation and contribution

Each scenario must contain an allocation. The initial UI can copy a baseline and propose an eligible substitution, but the user confirms displaced opportunities. Adding a player does not create additional team plate appearances.

If the projection source supplies additive offensive value per plate appearance relative to a common baseline, calculate:

```text
offensive_contribution = sum_i,c (allocated_PA[i,c] × projected_runs_per_PA[i,c])
scenario_delta = candidate_contribution - baseline_contribution
```

Use only compatible units and baselines. If the source provides only a rate index, display that index and workload separately until an analyst approves a documented conversion. Do not add rate indexes or combine overlapping value measures such as WAR and its component runs.

Split estimates are used only when supplied and approved for this purpose. Display their sample or uncertainty limitations when available. Missing splits disable split-specific value claims while leaving assignment comparisons usable.

Defensive and baserunning measures remain separate in the pilot unless the analytics lead signs off on a common additive model. No automatic bonus is awarded for complementary shapes, handedness diversity, or a teammate's supposed ability to compensate for another player's weakness.

### 5.4 Robustness and sensitivity

Users can rerun a comparison under explicit alternatives, including lower availability for one player or a changed handedness mix. Each alternative preserves its own inputs and allocation.

Report which conclusions change. Do not call these alternatives confidence intervals or probabilities unless an approved probabilistic model supports that interpretation. The system does not infer statistical uncertainty from arbitrary assumption ranges.

## 6. Visual design and the role of shapes

The visual workspace has two coordinated views:

- **Roster allocation:** position lanes show assigned defensive innings and measured shortfalls. A separate workload view sizes player tiles by allocated plate appearances.
- **Scenario comparison:** baseline, A, and B show changes in coverage, opportunities, supported contribution metrics, and unresolved constraints.

Every tile carries a name and readable workload value. Color represents a consistently defined performance measure with a visible legend; labels and icons must preserve meaning without color. Metric thresholds and the comparison population are versioned.

Shape is a compact summary of a player's profile. It never determines tile area, creates coverage, or directly changes projected value. A context change may alter a player's allocation or fit assessment without changing their underlying profile label.

The original eight labels—Square, Rectangle, Circle, Pentagon, Octagon, Diamond, Star, and Funky—are taxonomy candidates. The pilot does not assume that eight exclusive categories are useful or exhaustive.

Before enabling shape classification, evaluators must document each category's plain-language definition, positive examples, counterexamples, required inputs, and boundary cases. Test whether different evaluators apply those definitions consistently. Permit an unclassified or mixed-profile display state. If the taxonomy adds confusion or cannot be labeled reliably, ship readable skill tags and profile bars while revising it.

## 7. Jev experiment and model boundaries

Jev is a replaceable judgment service behind a provider interface. Candidate tasks include applying a frozen profile rubric or classifying permitted scouting excerpts into narrowly defined evidence tags.

The model must not perform workload arithmetic, validate lineup feasibility, invent unavailable projections, or independently calculate overall transaction value.

Implementation requirements:

- Define a versioned schema and validate every provider response.
- Supply the relevant evidence explicitly; do not rely on remembered player facts.
- Store model identity, rubric, request inputs, response, timing, and cost.
- Cache classifications by input, rubric, and model version.
- Run classification outside the drag-and-drop calculation path.
- On timeout or invalid response, retain valid calculations and display classification as unavailable or stale.
- Keep the original classification alongside any evaluator override and its reason.

Compare Jev with both evaluator labels and a transparent rule-based baseline on the same inputs. Separate rubric development examples from a held-out evaluation set. Include ambiguous profiles, missing inputs, and multiple player seasons where feasible; keep related records together when splitting data to avoid leakage.

Evaluate class-level errors, repeatability, sensitivity to small input changes, calibration, review workload, latency, and cost. Report a confusion matrix, performance by category, abstention coverage, a proper probability scoring rule such as Brier score, and reliability plots. Agreement with evaluator consensus measures rubric alignment, not objective baseball truth.

Confidence thresholds are chosen from observed error and review tradeoffs. The original 0.80 and 0.65 thresholds are not adopted by default. If the sample cannot support a calibration claim, label probabilities as model estimates and keep classifications advisory. Model confidence must never appear as the probability that an acquisition will succeed.

## 8. Evidence and explanation

Each result exposes three distinct layers:

1. **Source evidence:** projection values, scouting excerpts where permitted, timestamps, units, and source IDs.
2. **Assumptions and judgments:** eligibility decisions, workload caps, taxonomy labels, model estimates, and human overrides.
3. **Calculated effects:** allocation changes, coverage shortfalls, and supported contribution deltas with the formulas and versions used.

An explanation card can say “This scenario assigns 80 additional PA to Player A.” It can say “The rubric classified this profile as bat-first.” It cannot label selected inputs as model attribution without a validated attribution method, or imply that a plausible explanation establishes causality.

Exports contain the scenario assumptions, unresolved checks, data versions, model status, and calculation results so another analyst can reproduce the comparison.

## 9. Proposed architecture

```text
Approved imports → validated, versioned snapshots
                              ↓
Scenario inputs → deterministic allocation/metric engine → comparison UI
                              ↓                              ↓
                        scenario records                evidence cards

Permitted evidence → optional Jev adapter → classification cache/review
```

Keep input adapters, roster calculations, taxonomy classification, and rendering independently testable. The saved scenario is the source of truth; the layout is a projection of those records.

The calculation engine must produce identical results for the same versioned inputs. Persist completed allocations rather than depending on a future model response to reproduce a saved result. Display freshness and snapshot dates prominently.

The implementation stack, hosting, and authentication integration are selected at kickoff against team requirements. An internal pilot requires authenticated access, role-appropriate permissions, and separation of proprietary data from demo fixtures. Send only specifically approved data to an external model provider; provider data handling must be resolved before proprietary integration.

## 10. Pilot measures and acceptance gates

All numeric thresholds below are **proposed targets**, not existing performance claims. The baseline, evaluator availability, and tolerable error rates must be established in week 1. Named owners are assigned at kickoff.

| Measure | Baseline | Proposed gate / target | Instrument and accountable role |
| --- | --- | --- | --- |
| Decision usefulness | Measure current workflow | At least 25% lower median completion time, with no reduction in blinded assessment quality | Counterbalanced comparison exercises using a frozen scoring rubric; pilot lead |
| Allocation correctness | No implementation yet | All agreed conservation, eligibility, simultaneous-position, and capacity checks pass | Calculation fixtures and invariant checks; engineering lead |
| Reproducibility | No implementation yet | Every saved benchmark comparison recreates its results from stored inputs and versions | Replay checks; engineering lead |
| Traceability | No implementation yet | Every displayed result resolves to a source, explicit assumption, or versioned calculation | Acceptance audit of benchmark scenarios; analytics lead |
| Interactive calculation | Measure first working build | p95 at or below 250ms from committed allocation edit to rendered quantitative diff on the agreed reference setup | Instrumented representative scenarios, excluding background classification; engineering lead |
| Evaluator consistency | Measure week 1 | Report agreement and disagreement by category before adopting a taxonomy gate | Independent labeling followed by adjudication; evaluator lead |
| Jev benefit | Measure baseline classifier | Demonstrated benefit on the predefined task without unacceptable error or review burden; thresholds frozen before held-out testing | Held-out comparisons, calibration plots and error review; analytics lead |
| Failure behavior | No implementation yet | Missing data, infeasible allocations, and provider failures are clearly surfaced; calculations remain usable where inputs permit | Targeted failure tests; engineering lead |

Review delivery, correctness, and performance weekly. Evaluate user outcomes after the comparison workflow is usable and at the final readout. Record model performance whenever the model, rubric, or input contract changes.

The evaluator study uses matched cases, counterbalanced tool order, and a rubric covering missed constraints, allocation accuracy, and identification of relevant tradeoffs. Agreement with one evaluator's preferred acquisition is not the definition of a correct assessment. Freeze sample size, cases, and analysis rules before final testing. Report paired task results and uncertainty, including failures. If recruitment is too small for a credible comparative claim, report the pilot as a usability study and explicitly defer efficacy claims.

Minimum calculation fixtures cover zero demand, an ineligible assignment, a player assigned to simultaneous positions, an exceeded workload cap, conserved team plate appearances, missing split projections, and scenario replay. Rearranging tiles must never change a calculated result. These checks validate the roster model rather than the appearance of the interface.

## 11. Six-week delivery plan

| Week | Deliverable | Exit gate |
| --- | --- | --- |
| 1 | Decision workflow, data contract, evaluator rubric, baseline study, taxonomy draft | Approved scope and permitted inputs; owners assigned; benchmark and acceptance protocol recorded |
| 2 | Snapshot import and deterministic scenario engine | Analyst-reconciled fixtures; coverage and allocation invariants pass; missing data remains explicit |
| 3 | Baseline/A/B comparison and evidence drill-down | Evaluator can complete an end-to-end scenario and reproduce a saved result |
| 4 | Interaction polish, failure handling, optional Jev adapter | Quantitative diff measured against latency target; provider outages do not block comparisons; development-set model results available |
| 5 | Assumption sensitivity and evaluator exercises | High-impact usability defects addressed; evaluation protocol and rubric frozen before held-out testing |
| 6 | Held-out evaluation, outcome readout, expansion decision | Report usefulness, correctness, limitations, operating effort, and model comparison separately |

**Critical path:** permitted data and agreed definitions → calculation correctness → usable comparison → evaluator study → decision. Model experimentation can proceed after the rubric and input contract exist, alongside UI work, without blocking that path.

Proposed ownership separates the data adapter, calculation engine, UI, and model adapter. Integrate at the data-contract boundary in week 2, the full comparison in week 3, and the failure/performance checkpoint in week 4. Do not begin automated target ranking or pitching work during this pilot.

## 12. Resources, dependencies, and decisions

Required roles are a pilot/product lead, an engineering lead with UI and data implementation capacity, an analytics lead, a baseball operations evaluator lead, and a data owner. Individuals may cover multiple roles, but actual availability must be confirmed before committing to six weeks. The original staffing estimate is not adopted without a workload review.

Resolve at kickoff:

- Planning horizon, decision examples, and opportunity-budget methodology.
- Projection sources, common units, eligible positions, and availability assumptions.
- Evaluator participants, labeling time, adjudication process, and study size.
- Whether the shape taxonomy deserves inclusion in the first interface.
- Which data can leave the team environment and which provider terms apply.
- Deployment, access control, retention, operating budget, and named owners.

If proprietary access is delayed, continue implementation against synthetic fixtures and replan the team evaluation date. If evaluator agreement is weak, revise the rubric or use skill tags. If Jev adds no useful benefit, disable it. If quantitative allocations cannot be reconciled, stop scenario-value claims until the calculation model is corrected.

## 13. Completion and expansion decision

The pilot is complete when evaluators can compare two acquisitions against a reproducible baseline, inspect measured coverage and opportunity changes, identify unresolved assumptions, and save a reviewable result—and when the outcome study and limitations are documented.

Advance the product only if the correctness gates pass and the evaluation supports useful decision preparation. Adopt Jev only if its separate benchmark supports its role. A positive usability result does not validate model calibration, predictive baseball value, or a postseason extension.

Possible next phases are broader position-player planning, candidate ranking against explicit constraints, and a separately specified pitching model. Each requires a new decision workflow and validation plan.

## 14. References and claim boundaries

- The supplied *Project Proposal: Roster Shapes (Jev Engine Edition)* is the concept source. Its partnership framing, staffing, taxonomy, latency, and performance claims are proposals rather than verified project facts.
- [TypeSafe introduction](https://docs.typesafe.ai/introduction) describes typed questions and recommends composing narrow judgments in application code.
- [TypeSafe launch announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev) reports vendor latency and schema guarantees. Those claims do not establish this application's latency, classification calibration, or baseball decision quality.

Vendor references were reviewed on September 18, 2026. Integration must verify the actual API contract and benchmark the selected model version before release.
