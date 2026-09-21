# Development handoff roadmap

**Status:** RS-01 through RS-07 complete (RS-06 marked "complete, initial" integration; RS-07 validation gates pass with recorded limitations), followed by the library-first revision (D-38 through D-40). The local prototype is a runnable SvelteKit app with a strict v1 bundle validator, pinned storyline registry, deterministic engine, versioned persistence, a roster-and-shapes start screen opening five 2026 public comparisons, a wired comparison workspace, and passing Playwright e2e journeys with a measured edit-to-render p95. No team data, pilot staffing, provider approval, or deployment is implied.

## Outcome and boundaries

Deliver a local prototype in which an analyst opens a 2026 storyline from the roster-and-shapes start screen, compares baseline/A/B allocations, inspects coverage and opportunity changes, saves an incomplete draft, and replays a completed comparison. Then separately decide whether the prerequisites support a team pilot.

The prototype uses the focused domain contract: full-game templates, integer game counts and defensive outs per game, eight fielding positions, DH as a batting role, and explicit PA budgets by pitcher handedness. These are prototype simplifications. Late-game substitutions and effects inferred from starter handedness are outside this version.

Quantitative results remain usable without classification. Pitching, target ranking, transaction execution, injury prediction, and a complete legal roster rules engine remain outside scope. Real-data permission, evaluator staffing, provider handling, deployment, and any outcome-study claim remain unresolved until their individual gates are satisfied. Unknowns do not block synthetic implementation.

## Decisions before implementation

`docs/DECISIONS.md` tracks decisions and their evidence. `RS-01` records the selected SvelteKit/TypeScript prototype stack and `RS-02` freezes the executable contract boundary described by D-22 through D-27. These are local prototype choices, not a team deployment commitment.

Confirm component paths and the fixture/schema boundary during bootstrap. Assign named owners when work is actually delegated; roles below indicate responsibility only. The six-week pilot in `SPEC.md` starts after its prerequisites are met and is not a promise for this unstaffed backlog.

## Work items

The paths below are frozen for the prototype. A directory is exclusive to its active task owner. Another task may use the exported interface but must request changes through that owner. Documentation or manifest changes are coordinated through the integrator. Status is recorded in the implementation handoff below.

| ID | Dependencies | Suggested role and exclusive component | Deliverable and exit evidence |
| --- | --- | --- | --- |
| RS-01 **(complete)** | None | Integrator: root manifest, lockfile, build/test config, `src/app/`, `README.md`, roadmap and decision records | Record stack and component ownership; establish a runnable local shell and actual setup/build/type/test commands; execute the applicable commands and record results. Freeze import boundaries before parallel work. |
| RS-02 **(complete)** | RS-01 | Data engineer: `src/contracts/`, `src/fixtures/`, `tests/contracts/` | Implement versioned schemas, validation, and labeled synthetic benchmark fixtures from the data/domain contracts. Include valid baseline/A/B and targeted malformed/missing-data cases. Rejections identify fields and reasons; every accepted fixture validates. Publish immutable fixture IDs for other components. |
| RS-03 **(complete)** | RS-02 | Calculation engineer: `src/engine/`, `tests/engine/` | Implement pure membership, assignments, coverage, workload, PA reconciliation, contribution, and feasibility calculations. Pass documented conservation and missing-data cases with independently reconciled expected values. Same versioned inputs produce identical results. |
| RS-04 **(complete)** | RS-02 | Persistence engineer: `src/persistence/`, `tests/persistence/` | Implement versioned save/import/export for complete comparisons and incomplete drafts. Preserve snapshots and all replay inputs. Demonstrate round-trip fidelity, version rejection, and malformed-import recovery; stale stored results cannot silently override recomputation. |
| RS-05 **(complete)** | RS-02 | UI engineer: `src/ui/`, `tests/ui/` | Implement workflows against frozen contract fixtures: baseline/A/B, editable assumptions and assignments, evidence panels, drafts, missing/infeasible states, accessible tables and controls. Demonstrate keyboard completion of the specified flow. Use fixture outputs until engine integration. |
| RS-06 **(complete, initial)** | RS-03, RS-04, RS-05 | Integrator: `src/app/`, `tests/integration/`; other component changes requested from their owners | Wire real calculation and persistence into UI. Complete acquisition comparison, changed assumptions, invalid draft, export/import/replay, and evidence drill-down using the benchmark cases. Acceptance evidence contains observed results rather than screenshots alone. |
| RS-07 **(complete)** | RS-06 | Validation engineer: `tests/e2e/`, `benchmarks/`, `reports/prototype/` | Audit acceptance requirements, accessibility, failure behavior, and traceability. Measure edit-to-render latency on a recorded reference setup; report p95 and workload. Fixes belong to component owners. Publish pass/fail/blocked results and limitations; close the synthetic prototype only when mandatory gates pass. |
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

## Implementation handoff

### RS-02 — complete

Artifacts:

- `src/lib/contracts/bundle.ts` and `src/lib/contracts/index.ts`: strict Zod 4.6 schemas, RFC 6901 issue paths, semantic reference checks, draft-versus-reject import behavior, result-shape checks, canonicalization, and synchronous SHA-256 input digests.
- `src/lib/fixtures/comparison-v1.json`: runtime copy of the canonical golden fixture; JSON-equivalent to `docs/examples/comparison-v1.json`.
- `src/lib/fixtures/registry.ts` and `src/lib/fixtures/index.ts`: stable fixture IDs, pinned accepted-input digests, acceptance outcomes, and hand-derived golden expectations labeled `hand-derived-acceptance-v1`.
- `tests/contracts/bundle.test.ts` and `tests/fixtures/registry.test.ts`: boundary and registry coverage.

Fixture IDs: `golden`, `incomplete-rf`, `duplicate-position-draft`, `missing-positive-rate`, `over-capacity-draft`, `unknown-field`, `unsupported-version`, `duplicate-projection-key`, `half-filled-acknowledgment`, and `nonmember-cost`.

Observed validation:

- `bun install --frozen-lockfile` — passed with Bun 1.4.2; dependencies installed from the pinned lockfile.
- `bun run check` — passed with 0 errors and 0 warnings.
- `bun run lint` — passed Prettier and ESLint.
- `bunx vitest run --project server` — passed: 2 files, 10 tests.
- `bun run build` — passed: production SvelteKit/static build completed.
- `git diff --check` — passed.
- `jq -e -s '.[0] == .[1]' docs/examples/comparison-v1.json src/lib/fixtures/comparison-v1.json` — passed; canonical and runtime fixture contents are equal.
- Golden input digest: `2f5d4e55813dce6c29acc1e691e97b6a3ea0c055003de4801434657578b447a4`.

### RS-03 / RS-04 / RS-05 — complete

Artifacts:

- `src/lib/engine/calculation.ts`: pure deterministic engine (`deterministic-engine-v1`) — membership, eligibility, duplicate, cap, coverage, PA reconciliation, split/overall offense in integer millionths, constraints, readiness, per-scenario and comparison-level results with deltas. Results are validated against the frozen `ResultSchema` before return.
- `src/lib/persistence/`: versioned repository (`PersistenceRepository`), memory + IndexedDB storage adapters, revision history, import conflict handling, replay verification (`REPLAY_MISMATCH` / `REPLAY_UNAVAILABLE`), and storage-failure propagation.
- `src/lib/ui/`: presentation components (scenario tabs, assumptions, allocation, coverage, workload, review) driven by view-model types in `src/lib/ui/types.ts`; no calculation logic in the UI layer.
- `src/lib/app/workspace.ts` and `src/lib/app/HomePage.svelte` (RS-06 wiring): builds the comparison view model from the bundle + engine results and commits edits through full re-validation and recalculation; saves/exports via the persistence repository.
- `tests/engine/calculation.test.ts`, `tests/persistence/repository.test.ts`, `tests/integration/comparison.test.ts` (cross-component journey: calculate → edit → save → export → reimport → replay-verified).

Observed validation:

- `bun run check` — 0 errors, 0 warnings.
- `bun run lint` — Prettier + ESLint clean.
- `bunx vitest run --project server --project integration` — 5 files, 28 tests passed.
- `bun run build` — production static build completed.

Remaining limitations: the browser Vitest project (component tests) and Playwright e2e journeys (I-07 keyboard, accessibility audit, latency measurement) belong to RS-07. Import-from-file UI and swap/Move preview controls are not yet wired; edits currently go through slot selectors. Classification remains not applicable — disabled.

### RS-06 — complete (initial integration)

The demo comparison loads in the app shell, edits recompute all scenarios, drafts save to IndexedDB (memory fallback), and export produces a self-contained v1 bundle that reimports with replay verified (integration test evidence above). Full e2e acceptance journeys are RS-07's gate.

### RS-07 — complete

Artifacts:

- `tests/e2e/workspace-journey.spec.ts`: three Playwright journeys — (1) switch scenario → edit an allocation → save draft → reload restores the saved draft from storage; (2) instrumented edit-to-render latency measurement writing `reports/prototype/edit-latency.json`; (3) DOM-level axe-core accessibility audit.
- `tests/integration/shell.spec.ts`: production shell asserts the synthetic-data labeling, scenario tablist, and a pinned-rule axe audit.
- `reports/prototype/edit-latency.json`: recorded measurement (see below).
- Fixes found by validation (applied to owning components): `structuredClone` on the Svelte `$state` proxy threw `DataCloneError` in real Chromium, silently breaking every assignment edit and export — replaced with `$state.snapshot` in `src/lib/app/HomePage.svelte`; the workspace now restores a previously saved draft on mount, so a reload replays the saved comparison instead of silently resetting to the fixture.

Observed validation (reference setup: WSL2 headless Chromium 153, Playwright, 1280×720, static production build):

- `bun run test:e2e` — 4 tests passed (journey, latency, axe audit, shell).
- `bun run check` / `bun run lint` — clean.
- `bunx vitest run --project integration --project server` — 5 files, 28 tests passed.
- `bun run build`, `git diff --check` — clean.
- Edit-to-render latency: 9 samples on the first assignment selector, p50 3.6ms, p95 8.8ms, max 8.8ms against the proposed 250ms budget (`reports/prototype/edit-latency.json`). Synthetic single-page workload; not a pilot performance claim.

Limitations:

- This environment's headless Chromium produces no animation frames, so Playwright actionability checks (and full axe runs) hang. Journeys therefore dispatch real DOM events (click/change) instead of trusted input, and the axe audit pins a 19-rule subset (names, labels, ARIA validity, structure, headings, tables, duplicate IDs); the full axe rule set (e.g. color-contrast) blocks the main thread here and could not run. Re-run a full audit in a frame-producing environment before any external demo.
- Browser-mode Vitest component tests (`tests/app/`) hang for the same reason and were validated via the Playwright e2e suite instead; the keyboard-arc journey (I-07) is exercised via tabs/select semantics but not a literal keystroke walkthrough.

### Post-RS-07 UI gap closure (`feat/ui-gaps`)

Delivered: import-from-file in the app shell (validates the whole bundle via `repository.importJson` before activation; rejection keeps the open comparison and shows field-level issues; a duplicate bundle ID offers an explicit "Replace as new revision" or cancel; replay status shown on success) and a keyboard-operable per-template Swap control that exchanges two slots and recalculates all scenarios. Files: `src/lib/app/HomePage.svelte`, `src/lib/ui/AllocationPanel.svelte`, `src/lib/ui/types.ts`, `tests/e2e/import-swap.spec.ts`.

Observed: `bun run check`, `bun run lint`, `bunx vitest run --project integration --project server` (28 tests) and `bunx playwright test` (6 tests, including 2 new: swap, and malformed-then-valid import against `comparison-v1.json`) pass; `git diff --check` clean. Not run: `bun run test` (its browser project hangs in this environment, see RS-07 limitations). Previously untested: replace-as-new-revision UI path, Move preview, literal keystroke walkthrough, full axe rule set — all closed in the follow-up below. The latency e2e rewrites `reports/prototype/edit-latency.json`; the regenerated copy from a 3-worker run was discarded, so the RS-07 single-worker reference is unchanged.

### Post-RS-07 UI gap closure, part 2 (D-31, D-32)

Delivered: a keyboard-operable per-template Move control (`AssignmentMove` in `src/lib/ui/types.ts`; relocate into an `Unassigned` slot, occupied destinations blocked client-side with a Swap pointer; invalid Moves never flip the draft), live single-commit Swap/Move previews (slot order, role, PA, affected players), evidence-drawer focus return to its trigger, and two full-axe repairs (darkened `--muted`/`--rust`, unique Assumptions region name). Files: `src/lib/ui/AllocationPanel.svelte`, `src/lib/ui/AssumptionsPanel.svelte`, `src/lib/ui/types.ts`, `src/lib/app/HomePage.svelte`, `tests/e2e/import-swap.spec.ts` (+replace, +move), `tests/e2e/keyboard.spec.ts` (literal-keystroke I-07: arrow-key tabs, Home/ArrowDown select edits, Tab/Enter swap submit, evidence focus return), `tests/e2e/accessibility-full.spec.ts` (full axe rule set, no pinning).

Observed: `bun run check` (0 errors/warnings), `bun run lint` (Prettier + ESLint clean), `bunx vitest run --project integration --project server` (5 files, 28 tests passed), `bunx playwright test` (10 tests passed: 4 journey/latency/pinned-axe/shell + swap + malformed/valid import + replace-as-new-revision + move + keyboard + full axe). Not run: `bun run test` (browser project hangs in this environment, see RS-07 limitations). The latency e2e rewrote `reports/prototype/edit-latency.json` under multi-worker parallelism; restored via `git checkout`, so the RS-07 single-worker reference is unchanged.

Limitations and notes:

- The RS-07 full-axe hang does **not** reproduce here: the full rule set completes in ~1–2s. It initially reported 25 color-contrast nodes (one root cause: `--muted`/`--rust` on `--paper-deep`) and 1 landmark-unique node (nested "Assumptions" regions); both repaired per D-32 and now green, so the full-audit spec is a permanent suite member. If the hang recurs on another setup, fall back to the pinned rule set.
- The RS-07 headless-Chromium frame limitation still stands: journeys use DOM events / `selectOption` except `keyboard.spec.ts`, whose interactions are literal trusted key presses; pointer drag-and-drop (D-20) remains unimplemented — selectors plus Swap/Move cover every operation by keyboard.
- Fixes touched UI copy (inner "Shared planning context" heading) and the shared palette only; no contract, engine, fixture, or persistence changes.
- The RS-07 headless-Chromium frame limitation still stands: journeys use DOM events / `selectOption` except `keyboard.spec.ts`, whose interactions are literal trusted key presses. Pointer drag-and-drop is now implemented (see below); selectors plus Swap/Move still cover every operation by keyboard.
- Fixes touched UI copy (inner "Shared planning context" heading) and the shared palette only; no contract, engine, fixture, or persistence changes.

### Post-RS-07 drag-and-drop (D-20, D-33)

Delivered: pointer-only native HTML5 drag-and-drop on the allocation table rows. Dropping an assigned row onto an occupied slot in the same template commits a Swap; onto an Unassigned slot commits a Move — both through the existing Swap/Move callbacks, with a live drop preview naming both slots. Same-slot, cross-template, and Unassigned-source drags are ignored. Files: `src/lib/ui/AllocationPanel.svelte`, `tests/e2e/drag-drop.spec.ts` (swap, move, and unassigned-guard journeys via dispatched DragEvents with a DataTransfer).

Observed: `bun run check` (0 errors/warnings), `bun run lint` (Prettier + ESLint clean), `bunx vitest run --project integration --project server` (28 tests passed), `bunx playwright test` (13 tests passed, including the 3 new drag journeys and the still-green full axe audit). Not run: `bun run test` (browser project hangs in this environment, see RS-07 limitations). The latency e2e rewrote `reports/prototype/edit-latency.json` under multi-worker parallelism; restored via `git checkout`, so the RS-07 single-worker reference is unchanged.

Limitations: touch drag is out of scope; keyboard parity is unchanged and covered by `keyboard.spec.ts`. No contract, engine, fixture, or persistence changes.

### Public-data adapter spike (D-34, research follow-up)

Delivered: `spikes/mlb-public/build.mjs` fetches completed-2025 Red Sox data from the free MLB Stats API (no key), derives observed R/PA, and writes the static `public`-class bundle `spikes/mlb-public/redsox-observed-2025.json` (11 players, baseline + Anthony-for-Refsnyder candidate, overall mode, splits null). No app wiring; the app still opens only `synthetic` per D-28.

Observed (`bun spikes/mlb-public/build.mjs`, 2026-09-21): `parseBundle` accepts with no diagnostics; baseline feasible at 44.466 runs, candidate A feasible at 45.2524 (+0.79 over 360 PA); readiness false only on `ACKNOWLEDGMENT_REQUIRED`; `inputDigest=45022eaa…`. Eligibility update (D-35): fielding-split games aggregated at ≥10 per position — Duran LF/CF, Rafaela 2B/CF, Refsnyder LF/RF, Gonzalez 1B/2B, Anthony LF/RF; offense unchanged. `bun run check` / `bun run lint` clean (spike scripts run outside the app tsconfig via a scoped eslint override).

Limitations: observed-not-projected rates, generous placeholder caps, no splits (FanGraphs export not provided — no scraping). Rebuilding rewrites `createdAt`/data and therefore the digest; run `prettier --write` on the regenerated JSON.

### Data-class gate and public demo (D-28 implemented, D-36)

Delivered: the importer pre-reads `dataClass` before touching storage. `restricted` bundles are hard-blocked naming the RS-08 permission record; the open comparison stays intact. `public` bundles open only after an explicit per-bundle-ID session acknowledgment ("observed public values, not team-approved projections"); declining keeps the current comparison. Shell badge, hero eyebrow/lede/title now render from the open bundle's `dataClass`, and the `public` copy never claims synthetic. Files: `src/lib/app/HomePage.svelte`, `src/lib/app/AppShell.svelte` (static badge moved into the data-aware hero), `tests/e2e/data-class-gate.spec.ts` (acknowledge-and-open, decline, restricted block, no-repeat-ask).

Observed: `bun run check` / `bun run lint` clean; `bunx playwright test` 17 passed (13 prior + 4 gate). Live demo (temporary spec, since removed): importing `spikes/mlb-public/redsox-observed-2025.json`, acknowledging, and screenshotting shows the public-data hero/banner, feasible baseline (44.466 runs) and candidate A (45.2524, +0.7864) cards, and the allocation table with real names, eligibility, and workloads (`/tmp/jev-public-demo-top.png`, `/tmp/jev-public-demo-allocation.png`; replay status correctly reads `unevaluated` for the results-empty spike bundle).

Limitations: the session acknowledgment is a demo path the user explicitly requested, not an RS-08 permission record — team data and any decision use still wait on RS-08. No contract/engine/fixture changes.

### Default-to-public web servers (D-37)

Delivered: the dev/build/preview servers (one SvelteKit app) default to the public spike bundle. First paint still holds the synthetic fixture with an immediate per-session acknowledgment prompt ("This workspace defaults to public data …"); confirming opens `mlbam-bos-observed-2025-spike` through the tested import path, declining keeps synthetic. Saved drafts restore by ID (public first, then synthetic); a restored public draft counts as the session acknowledgment. Runtime copy `src/lib/fixtures/redsox-observed-2025.json` is pinned identical to the spike output by `tests/fixtures/public-sync.test.ts`; evidence copy in `workspace.ts` is data-aware (observed-values language for public). Files: `src/lib/fixtures/registry.ts`, `src/lib/fixtures/redsox-observed-2025.json`, `src/lib/app/HomePage.svelte`, `src/lib/app/workspace.ts`, `tests/fixtures/public-sync.test.ts`, `tests/app/home.svelte.test.ts`, `tests/e2e/data-class-gate.spec.ts`, `README.md`, `docs/DECISIONS.md` (D-37).

Observed: `bun run check` (0 errors/warnings), `bun run lint` (Prettier + ESLint clean), `bunx vitest run --project server --project integration` (6 files, 30 tests passed, incl. 2 new sync tests), `bun run build` (static build completed), `bunx playwright test` (17 passed, incl. 4 rewritten gate journeys). Not run: `bun run test` (browser project hangs in this environment, see RS-07 limitations). `git diff --check` clean; the latency e2e rewrote `reports/prototype/edit-latency.json` under multi-worker parallelism and it was restored, so the RS-07 single-worker reference is unchanged.

Limitations: observed-not-projected rates, generous placeholder caps, no splits, and baseline + one candidate only (not the two-candidate synthetic shape) — all labeled in-bundle. No RS-08 record exists; restricted/team data stays hard-blocked. Other e2e journeys intentionally still exercise the synthetic first paint.

### Library-first revision (D-38, D-39, D-40 — user directive 2026-09-21)

Delivered: `/` opens a start screen whose first section is the interactive roster-and-shapes graphic (SVG baseball field, eight position lanes + DH, per-player shape glyph from the analyst-labeled 8-shape rubric v1 in `docs/SHAPE_TAXONOMY.md` / `src/lib/shapes/taxonomy.ts`, click/keyboard selection, player detail, headshots, depth chart, and side-by-side lineup tables), followed by five dated retrospective analyses. Each analysis carries verified event dates/anchors separately from the later public-data source snapshot. Opening an analysis goes through the D-36 per-bundle public acknowledgment; the workspace (save/export/import, evidence, Swap/Move/keyboard/drag, restricted block) shows the retrospective label, event window, and source snapshot. The five `public` bundles in `src/lib/storylines/` remain calculation inputs; the retrospective metadata is UI-layer context and does not change digests or results. Every e2e journey now opens an analysis through an addressable scenario route.

Observed: `bun run check` (0 errors/warnings), `bun run lint` (Prettier + ESLint clean), `bunx vitest run --project server --project integration` (5 files, 30 tests passed), `bun run build` (static build completed), `bunx playwright test` (17 passed: library ack/decline/restricted/re-import, journey + reload-restore, latency, pinned + full axe, shell, swap, malformed/valid import, replace-as-new-revision, move, keyboard, 3 drag journeys). Not run: `bun run test` (browser project hangs in this environment, see RS-07 limitations). `git diff --check` clean; the latency e2e rewrote `reports/prototype/edit-latency.json` under multi-worker parallelism and it was restored, so the RS-07 single-worker reference is unchanged.

Limitations: observed-not-projected 2026 rates, illustrative horizon, placeholder caps, no splits (the lefty-hole storyline says so on its card), analyst-labeled shapes with no evaluator agreement (O-03 open), outgoing members leave the planning roster per the v1 membership equation, saved drafts under retired bundle IDs are not migrated. Two issues found by verification and fixed in this change: the builder initially rounded Contreras 68/533 down (correct: 0.127580) and mis-assigned two candidate reserves against the membership equation (both caught by the script's own guards); the new `{#if}` workspace mount initially threw `DataCloneError` on the `$state` proxy (fixed with `$state.snapshot` at both boundaries, same lesson as RS-07).

### Shape-first landing refinement

Delivered: the landing page now treats the shape roster as the primary product
surface. The field is a stable baseline overview without the platoon/template
switch, the actual lineup and depth chart remain visible as side-by-side tables,
and the full source roster appears in a bordered shape board with names,
eligibility, and rubric labels. Storyline cards add exact dates, concise
descriptions, and source context. Shapes remain assumption-layer display labels;
the workspace keeps the underlying scenario templates and calculations intact.

### Deployment hardening and RS-08 handoff

Delivered: the Cloudflare Pages workflow now keeps build/typecheck validation on
all pull requests, deploys previews only when repository secrets are available,
and skips fork deployments with an explicit explanation instead of failing on
withheld secrets. The deployment no longer masks arbitrary Pages API or
authentication errors behind a successful `|| echo` self-provision command; the
Pages project must be provisioned once by an authorized owner. `docs/pilot/README.md`
records the RS-08 prerequisites and remains blocked until those external records
exist.

Observed: the latest `main` deployment workflow run (`35562606070`) completed
successfully before this hardening change. After installing the pinned lockfile,
local typecheck, lint, server/integration tests, production build, and diff
checks pass. RS-08 is not complete: no team permission, staffing, evaluation
protocol, or shared deployment approval is present.

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
