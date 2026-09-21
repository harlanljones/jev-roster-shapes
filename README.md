# Roster Shapes

A local synthetic workspace for comparing position-player acquisitions through explicit workload, coverage, and projection assumptions. The prototype is complete: a SvelteKit static app in which an analyst compares baseline/A/B allocations under shared assumptions, edits assignments (selectors, Swap, Move), inspects evidence, saves drafts, and exports/imports versioned bundles with verified replay. All data is labeled synthetic; no team partnership or approved data is assumed.

## Start here

Development agents should read [AGENTS.md](AGENTS.md), then check [ROADMAP.md](ROADMAP.md) for status. RS-01 through RS-07 are complete plus a post-RS-07 UI gap closure (import-from-file, Swap/Move controls, keyboard walkthrough, full axe audit). RS-08 through RS-10 need people, permissions, or external decisions and are out of scope for synthetic work.

| Document | Use it for |
| --- | --- |
| [Product specification](SPEC.md) | Scope, product hypotheses, pilot plan, and non-goals |
| [Development instructions](AGENTS.md) | Component-specific reading, evidence, and agent coordination |
| [Roadmap](ROADMAP.md) | Task IDs, dependencies, ownership, integration and completion gates |
| [Domain and calculations](docs/DOMAIN_AND_CALCULATIONS.md) | Assignments, outs/PA accounting, feasibility, metric availability, and readiness |
| [Data contract](docs/DATA_CONTRACT.md) | Versioned import/export records, validation, results, and replay |
| [Interaction contract](docs/WORKFLOWS.md) | Screens, state transitions, editing, failures, and keyboard behavior |
| [Acceptance](docs/ACCEPTANCE.md) | Exact numerical examples, failure cases, integration and evaluation protocol |
| [Decisions](docs/DECISIONS.md) | Adopted prototype defaults and unresolved external dependencies |
| [Synthetic comparison](docs/examples/comparison-v1.json) | Machine-readable baseline/A/B input with independently specified expected totals |

The focused documents refine SPEC within its scope. Domain rules own arithmetic and feasibility; the data contract owns serialization; workflows own interactions; acceptance cases verify them. Resolve a contradiction at its authoritative source rather than implementing whichever phrasing is easiest.

## Development status

The pinned local stack is Bun 1.4.2, Node 26.x, Svelte 5.57, SvelteKit 2.70 (static single-page app), Vite 8.3, TypeScript 6.0, Zod 4.6, and `@noble/hashes` 2.4 (`mise.toml` pins the runtimes; `package.json` pins exact versions). `bun run check`, `bun run lint`, the Vitest server/integration projects (28 tests), and the Playwright suite (10 journeys: comparison edit/save/reload, latency, pinned and full axe audits, import/swap/move/replace, keyboard walkthrough) pass against the production build. Team deployment and optional Jev integration have separate prerequisites and do not block synthetic work.

The frozen v1 contract is `BundleSchema` validation, canonical SHA-256 input digests, and the deterministic `deterministic-engine-v1` calculation. See the [roadmap implementation handoff](ROADMAP.md#implementation-handoff) for fixture IDs, observed commands, and limitations (including the RS-07 headless-Chromium notes).

The golden fixture is ten games and 360 PA per scenario, with synthetic offensive totals of **6.4 / 8.4 / 7.6** runs for baseline/A/B. It demonstrates arithmetic only. Detailed expectations and mutations are in the acceptance document.

## Commands

```sh
bun install --frozen-lockfile
bun run dev        # local dev server
bun run check      # svelte-check, zero warnings
bun run lint       # prettier + eslint
bunx vitest run --project server --project integration
bun run build
bun run test:e2e   # production build + Playwright (Chromium)
```

`bun run test` also includes a browser-component project that hangs in frame-less headless Chromium; the Playwright journeys cover that surface instead (see RS-07 limitations in ROADMAP.md).

## Next development assignment

> Synthetic prototype work is complete. The remaining roadmap items (RS-08 pilot prerequisites, RS-09 optional classification experiment, RS-10 outcome study) each wait on people, permissions, or external decisions — writing code or documents does not satisfy those gates. The only unblocked code option is pointer drag-and-drop (D-20, enhancement only; every operation already works by keyboard).
