# Development handoff roadmap

**Status:** Planned; no implementation tasks completed. The inspected starting repository contained `SPEC.md` and Git metadata, with no application manifest, tests, or deployment configuration. Companion documents added for this handoff are specifications, not implemented capabilities. No graph project or generation was available for this repository at handoff.

## Outcome and boundaries

Deliver a local, clearly synthetic prototype in which an analyst compares baseline/A/B allocations, inspects coverage and opportunity changes, saves an incomplete draft, and replays a completed comparison. Then separately decide whether the prerequisites support a team pilot.

The prototype uses the focused domain contract: full-game templates, integer game counts and defensive outs per game, eight fielding positions, DH as a batting role, and explicit PA budgets by pitcher handedness. These are prototype simplifications. Late-game substitutions and effects inferred from starter handedness are outside this version.

Quantitative results remain usable without classification. Pitching, target ranking, transaction execution, injury prediction, and a complete legal roster rules engine remain outside scope. Real-data permission, evaluator staffing, provider handling, deployment, and any outcome-study claim remain unresolved until their individual gates are satisfied. Unknowns do not block synthetic implementation.

## Decisions before implementation

`docs/DECISIONS.md` tracks decisions and their evidence. `RS-01` records the local prototype stack before implementation: default to TypeScript, React, and Vite unless repository evidence or a concrete requirement supports another choice. This is a proposed bootstrap choice, not an existing dependency or a team deployment commitment.

Confirm component paths and the fixture/schema boundary during bootstrap. Assign named owners when work is actually delegated; roles below indicate responsibility only. The six-week pilot in `SPEC.md` starts after its prerequisites are met and is not a promise for this unstaffed backlog.

## Work items

All paths below are **PROPOSED until RS-01 freezes the scaffold**. A directory is exclusive to its active task owner. Another task may use the exported interface but must request changes through that owner. Documentation or manifest changes are coordinated through the integrator. Each task starts as **not started**.

| ID | Dependencies | Suggested role and exclusive component | Deliverable and exit evidence |
| --- | --- | --- | --- |
| RS-01 | None | Integrator: root manifest, lockfile, build/test config, `src/app/`, `README.md`, roadmap and decision records | Record stack and component ownership; establish a runnable local shell and actual setup/build/type/test commands; execute the applicable commands and record results. Freeze import boundaries before parallel work. |
| RS-02 | RS-01 | Data engineer: `src/contracts/`, `src/fixtures/`, `tests/contracts/` | Implement versioned schemas, validation, and labeled synthetic benchmark fixtures from the data/domain contracts. Include valid baseline/A/B and targeted malformed/missing-data cases. Rejections identify fields and reasons; every accepted fixture validates. Publish immutable fixture IDs for other components. |
| RS-03 | RS-02 | Calculation engineer: `src/engine/`, `tests/engine/` | Implement pure membership, assignments, coverage, workload, PA reconciliation, contribution, and feasibility calculations. Pass documented conservation and missing-data cases with independently reconciled expected values. Same versioned inputs produce identical results. |
| RS-04 | RS-02 | Persistence engineer: `src/persistence/`, `tests/persistence/` | Implement versioned save/import/export for complete comparisons and incomplete drafts. Preserve snapshots and all replay inputs. Demonstrate round-trip fidelity, version rejection, and malformed-import recovery; stale stored results cannot silently override recomputation. |
| RS-05 | RS-02 | UI engineer: `src/ui/`, `tests/ui/` | Implement workflows against frozen contract fixtures: baseline/A/B, editable assumptions and assignments, evidence panels, drafts, missing/infeasible states, accessible tables and controls. Demonstrate keyboard completion of the specified flow. Use fixture outputs until engine integration. |
| RS-06 | RS-03, RS-04, RS-05 | Integrator: `src/app/`, `tests/integration/`; other component changes requested from their owners | Wire real calculation and persistence into UI. Complete acquisition comparison, changed assumptions, invalid draft, export/import/replay, and evidence drill-down using the benchmark cases. Acceptance evidence contains observed results rather than screenshots alone. |
| RS-07 | RS-06 | Validation engineer: `tests/e2e/`, `benchmarks/`, `reports/prototype/` | Audit acceptance requirements, accessibility, failure behavior, and traceability. Measure edit-to-render latency on a recorded reference setup; report p95 and workload. Fixes belong to component owners. Publish pass/fail/blocked results and limitations; close the synthetic prototype only when mandatory gates pass. |
| RS-08 | RS-01; real ingestion waits for approved contract and source | Pilot/data lead: `docs/pilot/` | Obtain source permissions, data handling rules, approved units/eligibility/workload assumptions, named staffing, study plan, and evaluation baselines. Record evidence and blocked items. Synthetic work continues while this is incomplete. Team-data adapter implementation needs a scoped follow-up task after these choices. |
| RS-09 | RS-02; approved rubric and permitted provider inputs | Model engineer: `src/classification/`, `tests/classification/`, `reports/model/` | Optional, separately authorized experiment: frozen rubric and rule baseline, provider contract verification, validated adapter/cache/override behavior, outage tests, held-out evaluation with cost and latency. Start with permitted synthetic inputs if useful. No calibration or adoption claim without adequate evidence; core engine remains independent. |
| RS-10 | RS-07, RS-08; deployment prerequisites separately resolved | Pilot lead: `reports/pilot/`; deployment component allocated in a follow-up plan | Execute the approved study and report usefulness, errors, uncertainty, operating effort, and limitations. Record product and model expansion decisions independently. If participants/data are insufficient, report usability findings and defer efficacy claims. |

RS-08 through RS-10 include work that requires people, permissions, or external decisions; writing a document does not satisfy those prerequisites. RS-09 is optional and never a predecessor of the quantitative prototype.

## Dependency order and integration gates

The prototype critical path is `RS-01 → RS-02 → RS-03/04/05 → RS-06 → RS-07`. After the frozen schemas and fixtures exist, calculation, persistence, and UI work can run concurrently with exclusive ownership. UI tests may use fixture results; they do not establish calculation correctness.

| Wave | Work | Integration checkpoint |
| --- | --- | --- |
| 1 | RS-01 | Stack recorded, scaffold runs, paths and commands established. |
| 2 | RS-02; RS-08 planning can proceed separately | Frozen schema and fixture IDs with validation evidence. |
| 3 | RS-03, RS-04, RS-05; optional RS-09 after its prerequisites | Components agree on versioned contracts; isolated checks pass; no duplicated calculation logic in UI. |
| 4 | RS-06 | One runnable comparison can be edited, saved, imported, and reproduced. |
| 5 | RS-07 | Mandatory prototype acceptance gates pass; measured performance and limitations recorded. |
| 6 | RS-10 once pilot prerequisites and integration are ready | Separate product and model findings, explicit expansion/defer decision. |

Before integration, each component owner reports changed interfaces, tests run, fixture IDs, and known limitations. The integrator resolves contract changes with affected owners, then reruns cross-component checks. Preserve stable task IDs when splitting work; append a suffix and update predecessors rather than silently reusing an ID.

## Measures and review cadence

Targets inherited from `SPEC.md` remain **proposed**. No current numerical baseline or named owner is available. `docs/ACCEPTANCE.md` defines concrete correctness cases; `RS-07` records the reference setup and measurements; `RS-08` establishes the human-study baselines and freezes its protocol.

| Measure | Baseline | Gate / target | Method | Accountable role | Cadence |
| --- | --- | --- | --- | --- | --- |
| Allocation correctness | No implementation | All agreed invariants and benchmark cases pass | Independent fixture reconciliation and automated engine checks | Engineering lead | Component and integration changes |
| Reproducibility | No implementation | Every saved benchmark comparison replays from preserved inputs/versions | Export/import/recompute comparison | Engineering lead | Persistence/engine changes |
| Traceability | No implementation | Every displayed benchmark result resolves to evidence, assumption, or calculation | Acceptance audit | Analytics lead | Integration and final audit |
| Failure behavior | No implementation | Invalid, missing, stale, and unavailable states meet acceptance behavior | Targeted failure exercises | Engineering lead | Each affected change |
| Interactive latency | TBD in RS-07 | Proposed p95 ≤250ms from committed edit to rendered quantitative diff | Instrumented representative workload and recorded setup | Engineering lead | First integrated build, relevant changes, final audit |
| Decision usefulness | Current workflow TBD in RS-08 | Proposed ≥25% lower median task time without reduced blinded quality | Frozen matched/counterbalanced protocol with paired results and uncertainty | Pilot lead | Baseline, usable workflow, final readout |
| Taxonomy agreement / model benefit | TBD before model evaluation | Report category agreement; freeze adoption thresholds before held-out test | Independent labels, baseline comparison, error/calibration and abstention analysis | Evaluator and analytics leads | Rubric/model/input changes |
| Model reliability and cost | No provider integration | Error/review/cost limits TBD before adoption | Timeout/schema tests, measured timing, usage and cost | Model owner | Each benchmark and provider change |
| Data handling and access | Synthetic only | Approved sources and processing; deployment controls verified before team use | Permission records and access/retention checks | Data owner | Before each new source/provider/deployment |

## Risk triggers and responses

| Trigger | Response / gate | Owner task |
| --- | --- | --- |
| Projection units or baselines cannot be reconciled | Continue assignment comparison; suppress unsupported aggregate value and resolve definitions. | RS-02 / RS-03 / RS-08 |
| Conservation or replay check fails | Block ready-result completion and release of affected claims; correct the component and replay all impacted cases. | RS-03 / RS-04 / RS-06 |
| Team data or evaluators unavailable | Continue synthetic prototype; defer the team study and reset its start date. | RS-08 |
| Proposed shape labels cannot be applied consistently | Use readable profile tags/bars or an unclassified state; revise rubric separately. | RS-05 / RS-09 |
| Model outage, malformed output, or weak benchmark | Keep quantitative comparison usable; mark classification unavailable/stale or disable it. | RS-09 / RS-06 |
| Performance misses target | Profile measured edit path, remediate bottleneck, rerun the same recorded workload; disclose any unresolved miss. | RS-07 |
| Proprietary integration or deployment requested without prerequisites | Resolve only that dependent gate; keep local synthetic development moving. | RS-08 / follow-up deployment plan |

## Requirement traceability and completion

| Requirement or gap | Authoritative input | Work / gate |
| --- | --- | --- |
| White space has a measured baseball meaning | SPEC §5; domain contract | RS-02 / RS-03 / RS-05 |
| Allocation and contribution preserve opportunities and missingness | SPEC §4–5; data/domain contracts | RS-02 / RS-03 |
| Baseline/A/B share assumptions; analysts inspect and save work | SPEC §2, §8; workflows | RS-04 / RS-05 / RS-06 |
| Geometry cannot create value; readable alternatives exist | SPEC §6; workflows | RS-05 / RS-07 |
| Saved results are reproducible and evidence is inspectable | SPEC §8–10; data/acceptance contracts | RS-04 / RS-06 / RS-07 |
| Model benefits and confidence need evidence | SPEC §7; decisions | RS-09 independent gate |
| Partnership, staffing, outcome baselines, and permissions are unverified | SPEC §10–13; decisions | RS-08 / RS-10 |
| Stack, commands, and deployment are not established | SPEC §9; decisions | RS-01; deployment follow-up after RS-08 |

To close a task, add its status, artifact paths, actual validation commands/results, fixture IDs or measurement setup, and remaining limitations to the implementation handoff. Mark blocked checks as blocked; never infer a pass from the absence of an error report. Prototype completion means RS-01 through RS-07 meet their gates. Pilot completion additionally requires the actual study and documented expansion decision in RS-10.
