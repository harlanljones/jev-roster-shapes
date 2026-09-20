# Roster Shapes

A local synthetic workspace for comparing position-player acquisitions through explicit workload, coverage, and projection assumptions. The SvelteKit scaffold and RS-02 data-contract layer are implemented; calculation, persistence, and comparison workflows remain in the next roadmap wave.

## Start here

Development agents should read [AGENTS.md](AGENTS.md), then take the first dependency-ready work item in [ROADMAP.md](ROADMAP.md). RS-01 and RS-02 are complete; the next wave is RS-03/04/05 with exclusive ownership of engine, persistence, and UI components. This handoff does not assume a Red Sox partnership or approved team data.

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

The pinned local stack is Bun 1.4.2, Node 26.x (26.8.2 observed), Svelte 5.57, SvelteKit 2.70, Vite 8.3, TypeScript 6.0, Zod 4.6, and `@noble/hashes` 2.4. `bun run check`, `bun run lint`, the Node Vitest project, and `bun run build` pass for the current scaffold and contract layer. Team deployment and optional Jev integration have separate prerequisites and do not block synthetic work.

The current RS-02 gate freezes `BundleSchema`, `validateBundle`, `parseBundle`, `computeInputDigest`, the typed fixture registry, and the golden digest. See the [roadmap implementation handoff](ROADMAP.md#implementation-handoff) for fixture IDs, observed commands, and limitations.

The golden fixture is ten games and 360 PA per scenario, with synthetic offensive totals of **6.4 / 8.4 / 7.6** runs for baseline/A/B. It demonstrates arithmetic only. Detailed expectations and mutations are in the acceptance document.

## Next development assignment

> Implement RS-03, RS-04, and RS-05 after the RS-02 review. Read AGENTS.md and the linked contracts. Keep calculations, persistence, and rendering separate; use the frozen contract and fixture IDs; and preserve the distinction between source evidence, assumptions, and calculated effects.

To start a larger delegated implementation, use the roadmap's dependency waves and exclusive ownership after RS-02 freezes the interfaces. Documentation is ready for implementation; the human pilot remains conditional on its listed prerequisites.
