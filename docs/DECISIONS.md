# Decisions and unresolved dependencies

This register distinguishes implementation defaults from external commitments. Defaults below are selected for an immediately buildable synthetic prototype. They may be revised with a documented reason and updated contracts/fixtures. Unresolved pilot decisions block only their dependent work.

## Adopted prototype defaults

| ID | Decision | Reason and consequence |
| --- | --- | --- |
| D-01 | Build a local synthetic prototype first | No team data, partnership, staffing, or deployment has been established. Synthetic work can proceed now. |
| D-02 | Use full-game templates and one player per batting/defensive-role slot | Makes simultaneous assignments and opportunity conservation explicit. Substitutions and pitcher batting require another model version. |
| D-03 | Represent defense in integer outs, PA as explicit integer projected counts | Prevents innings-notation errors and hidden opportunity creation. Fractional expected PA require a future contract revision. |
| D-04 | Use one overall/split mode and metric basis per comparison | Prevents incompatible deltas. Starter hand is metadata; exposure is separately supplied. |
| D-05 | Make taxonomy/classification optional | A readable comparison is independently valuable; a failed classification experiment must not block it. Initial profiles may be unclassified. |
| D-06 | Use explicit local saves and portable versioned JSON bundles | Supports drafts and replay with a small prototype. Browser storage is not a team deployment or backup plan. |
| D-07 | Default scaffold to TypeScript, React, and Vite | **Superseded by D-13 on 2026-09-19.** Fits a browser prototype with shared types and isolated pure calculations. RS-01 must record versions, package manager, tests, and actual verified commands; these dependencies are not installed yet. |
| D-08 | Keep calculations, persistence, UI, and provider adapters separate | Enables bounded agent ownership and numerical tests independent of rendering/network state. |
| D-09 | Select coverage-only or coverage-and-offense review scope explicitly | Missing projections do not invalidate known coverage; they do prohibit unsupported full value comparisons. |
| D-10 | Show neutral/unclassified profiles until a rubric and color scale are defined | Avoids inventing baseball judgments for a visually polished demo. Use real quantities and labeled synthetic values. |

## Implementation decisions, 2026-09-19

The user adopted these in an interactive design review before RS-01. Each entry is adopted but not yet verified. The owning task records validation evidence in the [roadmap](../ROADMAP.md) implementation handoff when it closes. The research behind D-13 to D-16 is in [research/2026-09-19-frontend-stack.md](research/2026-09-19-frontend-stack.md).

### Process

| ID | Decision | Task | Rationale and trade-off | Rejected alternatives |
| --- | --- | --- | --- | --- |
| D-11 | Build RS-01 through RS-07 in this cycle. Stop for user review at each wave gate: after RS-02, after RS-03/04/05, and after RS-06. RS-07 ends with its audit report. RS-08 to RS-10 stay out of scope because they need people, permissions, or external decisions. | Integrator | Reviews fall where later work starts depending on frozen outputs. | Stopping only after RS-02 or only when blocked; RS-01 and RS-02 only |
| D-12 | `main` is the default branch. Its root commit holds the unchanged handoff documents, and implementation happens on `feat/prototype`. Commits happen only when the user asks; while the permission check blocks the agent from committing, the agent lists each task's files at each review gate for the user to commit. RS-03, RS-04, and RS-05 are built in parallel by Sonnet 5 subagents, each owning only its component. Worktrees need a commit to start from, so the isolation method is settled at the RS-02 gate. The integrator merges the components in dependency order and reruns cross-component checks. | Integrator | The session's permission check blocks agent commits, so the user controls when commits happen. Parallel work is faster but adds merge and consistency risk, which the frozen RS-02 contract limits. | Keeping `master`; the agent committing per task or at gates; building wave 3 sequentially; Opus 5 or mixed models for subagents |

### Stack and tooling

| ID | Decision | Task | Rationale and trade-off | Rejected alternatives |
| --- | --- | --- | --- | --- |
| D-13 | Build the UI with Svelte 5.57 on SvelteKit 2.70, as a static single-page app (adapter-static, no server rendering) on Vite 8.3. Supersedes D-07's React default. | RS-01 | User choice after the stack research. Stable and concise, and single-page mode fits local-only use while keeping a hosted adapter available for O-05. Costs: svelte-check supports TypeScript 6 at most (see D-14), and SvelteKit's `$app` modules need test doubles in component tests. | React 19.3 (the research's lead candidate); Solid 2.0 RC; Ripple 0.4; Svelte without SvelteKit; SvelteKit 3 pre-release |
| D-14 | Use TypeScript 6.0.3 only. Lint with ESLint 10 + typescript-eslint 8.70 (type-aware) + eslint-plugin-svelte 3.23. Format with Prettier 3.9 + prettier-plugin-svelte 4.1. | RS-01 | One compiler covers `.svelte` and `.ts` files, and ESLint is the only linter that checks Svelte templates with type information. Revisit TypeScript 7 once svelte-check supports it. | TypeScript 6 and 7 side by side; Oxlint, alone or with ESLint; Biome (its Svelte support is experimental); no linter or formatter |
| D-15 | Bun 1.4.2 installs packages and runs repository scripts. Node 26.7.0 runs Vite, Vitest, svelte-check, and ESLint. uv 0.12.17 handles any Python. `mise.toml` pins the three tools; `package.json` pins exact dependency versions and names `bun@1.4.2` as package manager; `bun.lock` is committed. | RS-01 | The user directed Bun and uv, at their newest versions, for all package management. The tools run on their documented runtime. | Running the tools on Bun; npm or pnpm; caret version ranges |
| D-16 | A Vitest 5 Node project tests contracts, fixtures, engine, and persistence. UI components are tested in Vitest Browser Mode, in Playwright's Chromium, with vitest-browser-svelte. Playwright Test with axe-core runs end-to-end journeys and the RS-07 latency measurement. RS-07's reference setup is this Apple M1 Mac, Chromium only, with a production build. | RS-01, RS-05, RS-07 | Keyboard, focus, and dialog behavior need a real browser; pure logic stays fast in Node. Other browsers remain untested, and RS-07 must report that. | jsdom component tests; running journeys in Vitest only; measuring in all three browsers |
| D-17 | Code lives in `src/lib/{contracts,fixtures,engine,persistence,ui}`, plus `classification` if RS-09 starts. The integrator owns `src/routes`, `src/lib/app`, and root configuration. Tests live in `tests/<component>`, `tests/integration`, and `tests/e2e`. Imports use `$lib`. eslint-plugin-boundaries 7.2 enforces the allowed dependencies between components. | RS-01 freezes; all tasks | Idiomatic SvelteKit that keeps the roadmap's ownership map. Boundary violations appear in the editor and in lint. | Tests beside source; top-level `src/<component>` via aliases; a custom boundary test; dependency-cruiser |

### Runtime architecture

| ID | Decision | Task | Rationale and trade-off | Rejected alternatives |
| --- | --- | --- | --- | --- |
| D-18 | The engine runs in a Web Worker behind an asynchronous interface. Each result carries its input revision, so late results from older revisions are discarded. | RS-03 (pure engine), RS-06 (worker wiring) | Makes the `Updating` state and I-06 real, and keeps input responsive on larger workloads. Worker messaging adds about a millisecond to each edit. | Main thread behind an async wrapper |
| D-19 | Local persistence uses IndexedDB behind the repository interface. | RS-04 | Asynchronous, with a large quota and room for structured revision history; I-05 failures can be simulated. | localStorage; Origin Private File System |
| D-20 | Pointer drag-and-drop ships in v1 as an enhancement. It uses the same preview-and-commit path as the required keyboard selectors and Move/Swap controls. | RS-05 | User choice. Every operation stays available by keyboard; drag-and-drop adds UI and test work. | Selectors and Move/Swap only |
| D-21 | Decide these at the design checkpoint before RS-05: the visual direction (the user picks from one or two mockups), the styling approach, the accessible component library, chart rendering, and how drag-and-drop is implemented. | RS-05 with the user | They depend on the chosen visual direction. | Deciding them now, without mockups |

### Data contract (RS-02)

| ID | Decision | Task | Rationale and trade-off | Rejected alternatives |
| --- | --- | --- | --- | --- |
| D-22 | The v1 validator is executable TypeScript built with Zod 4.6. No JSON Schema file is published until something outside the app needs one. The input digest is SHA-256 computed synchronously with @noble/hashes 2.4. | RS-02 | Zod rejects unknown fields, reports exact issue paths, and infers types. A synchronous digest keeps the engine API synchronous in every runtime. | Valibot; ArkType; a hand-written validator; generated or authoritative JSON Schema; Web Crypto |
| D-23 | **Import rejects the whole bundle for:** shape or type errors; unknown or missing fields; unsupported versions; duplicate IDs or keys; unresolved references; units other than `runs_per_PA`; malformed template or allocation structure; anything other than exactly one cap record per member; duplicate or non-member cost rows; half-filled acknowledgments; and acknowledgments whose revision differs from the scenario's. **Everything else imports as a draft for the engine to flag:** membership mismatches, assigned non-members, repeated players, ineligible positions, caps, empty slots, rates, exposure, and constraint results. A cost row whose currency or period differs from an enabled budget makes the cost check `unknown`. | RS-02, RS-03 | Broken references can't be imported (DATA_CONTRACT §4), but domain violations must stay openable as drafts (C-03, C-05, C-08, C-25). | Rejecting more (conflicts with ACCEPTANCE); rejecting less; treating stale acknowledgments as absent |
| D-24 | Add issue codes `DUPLICATE_ID`, `ACKNOWLEDGMENT_REQUIRED`, `NUMERIC_OVERFLOW`, and `REPLAY_MISMATCH`. Issue paths are RFC 6901 JSON Pointers, sorted segment by segment (array indices as numbers), then by code. Offense and constraint reasons use the Issue shape, and `issues` lists every diagnostic, readiness blockers included. The result validator enforces the consistency rules in DATA_CONTRACT §5. Readiness for the whole comparison (a saved revision; baseline, A, and B all present) belongs to RS-06, which adds its own codes. | RS-02 | Every diagnostic links to a field, and RS-03 can check every engine output with the same validator. | Reusing existing codes; dotted paths; checking result shapes only; listing blockers only under `readiness` |
| D-25 | Checks stricter than the contract's letter: IDs are visible ASCII without whitespace. Names, labels, and titles are non-empty. `sourceIds` are non-empty. Decimals match `-?(0\|[1-9]\d*)(\.\d{1,6})?`. Currency is three capital letters. Timestamps are valid UTC times ending in `Z`. Each projection's `sourceId` equals its metric definition's, otherwise `METRIC_MISMATCH`. Zero-game templates have zero PA. | RS-02 | Catches ambiguous or unsourced data at the import boundary. | The contract's letter only |
| D-26 | Fixtures form a typed registry of variations built from the golden bundle. Each fixture has a stable ID, its ACCEPTANCE case, its expected import outcome, and a pinned input digest. Edits to shared inputs bump revisions as the contract requires, and each fixture has its own `bundleId`. RS-02 also publishes hand-derived expected results for the golden fixture only, labeled `calculationVersion: "hand-derived-acceptance-v1"`. | RS-02 | Any content change fails the tests. The UI can render real-shaped results before the engine exists, and RS-03 is tested against expectations it didn't write. | One JSON file per case; expected results for every fixture; inputs only |
| D-27 | How ambiguous acceptance cases are read: <br>• C-03: in the baseline's vs-left-starter template. <br>• C-05: in Candidate A, `p-a` moves to catcher and `p-2b` returns to second base. <br>• C-06: the golden fixture itself is the 40-PA boundary case for Candidate A's `p-a`. <br>• C-11: the shared 2B slot's 20 L / 20 R total splits 8/8 in the vs-left template and 12/12 in the vs-right template. <br>• C-12: builds on C-09. <br>• C-13: uses `p-dh`; the calculable variant moves DH exposure to right-handed pitching. <br>• C-20b: the baseline's costs use test currency `XTS` for period `pilot-horizon`. <br>• C-23: two fixtures, with defensive-out caps at 270 and at 280. <br>• C-24: one fixture with an out-of-range input integer (rejected at import) and one with an out-of-range product (`NUMERIC_OVERFLOW`). <br>• C-25: removes `p-reserve` from the baseline. | RS-02 | Makes the fixed test inputs explicit. | Reading C-05 literally (both duplicate and ineligible) |
| D-28 | The validator accepts `synthetic`, `public`, and `restricted` bundles. The app opens only `synthetic` until RS-08 records permission, and explains why others are blocked. | RS-02, RS-06 | Validation stays a pure contract check, and the policy sits where permission will eventually be granted. | Rejecting non-synthetic bundles in the validator; opening anything behind a warning banner |
| D-29 | Known v1 limitation: acknowledgments are bound to scenario revision numbers. A bundle edited by hand without bumping its revision keeps its acknowledgment. Bundles with cached results would still fail replay, which blocks readiness. Revisit before analysts share bundles. | RS-04, RS-06 | Avoids a schema change for a risk the app's own editor doesn't create. | Adding a content digest to `review` |
| D-30 | The RS-01 app shell shows the title, `Synthetic demo data`, an explicit empty state, and a check that the browser build validates the golden fixture and computes its digest. No product UI or visual design. | RS-01 | Proves the contract code runs in the browser build without taking over RS-05's work. | A blank page; starting the workspace layout |

## Open decisions

Owner roles are responsibilities to assign, not named commitments. `TBD` is an unresolved external fact, not permission to fabricate a default for the real pilot.

| ID | Question / required evidence | Role | Blocks | Safe work meanwhile |
| --- | --- | --- | --- | --- |
| O-01 | Which approved projection and eligibility sources, units, rights, and update cadence? | Data/analytics lead | Team ingestion and source mappings | Fixture contracts and synthetic engine |
| O-02 | Which planning horizon, PA methodology, caps, and opponent exposure assumptions reflect the actual decision? | Baseball evaluator | Real scenario conclusions | Explicit synthetic assumptions |
| O-03 | Does the eight-shape taxonomy have usable definitions and agreement? | Evaluator lead | Shape rubric adoption | Neutral profile display and measured allocation |
| O-04 | Is provider processing permitted for each input field; what are retention and access requirements? | Data owner | Proprietary provider requests | Adapter interface or public/synthetic evaluation |
| O-05 | Which environment, identity system, access roles, persistence, retention, and backups support team use? | Engineering/data owner | Shared deployment | Local synthetic prototype |
| O-06 | Who supplies evaluation time and scoring; what sample size and failure policy? | Pilot lead | Outcome study and efficacy claims | Usability rehearsal and instruments |
| O-07 | What constitutes an acceptable classification error, review burden, latency, and cost? | Analytics/model lead | Model adoption | Exploratory results labeled as such |
| O-08 | Which cost period and roster constraints should the first decision actually enforce? | Baseball/analytics lead | Real cost/transaction interpretation | Disabled checks labeled unchecked |

## Change protocol

For a material implementation choice, append its ID, status, owner/task, rationale, affected contracts, and validation evidence before dependent work. A contract revision changes the schema/calculation version when old records would otherwise be interpreted differently. Preserve old fixtures and provide an explicit migration plan.

A local UI arrangement or library choice within the frozen interfaces can be resolved by its component owner. Changes to projection meaning, workload arithmetic, readiness, or permissions require the corresponding domain or data owner; continue independent tasks rather than halting the entire prototype.

## Handoff readiness

Development may start with RS-01. The architecture default and synthetic modeling assumptions are defined; no app scaffold, deployment, calibration, or user study is claimed complete. The first development report should establish actual commands and component ownership, then run RS-02 against the supplied golden fixture.
