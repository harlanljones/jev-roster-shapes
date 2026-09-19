# Roster Shapes

A proposed workspace for comparing position-player acquisitions through explicit workload, coverage, and projection assumptions. The current repository contains a development specification and synthetic examples; application implementation has not started.

## Start here

Development agents should read [AGENTS.md](AGENTS.md), then take the first dependency-ready work item in [ROADMAP.md](ROADMAP.md). Start with `RS-01` to scaffold the local synthetic prototype. This handoff does not assume a Red Sox partnership or approved team data.

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

No install, build, test, or launch commands exist yet. The proposed local default is TypeScript/React/Vite; RS-01 records actual dependency versions and verified commands here after scaffolding. Team deployment and optional Jev integration have separate prerequisites and do not block synthetic work.

The golden fixture is ten games and 360 PA per scenario, with synthetic offensive totals of **6.4 / 8.4 / 7.6** runs for baseline/A/B. It demonstrates arithmetic only. Detailed expectations and mutations are in the acceptance document.

## Suggested first development assignment

> Implement RS-01, then RS-02. Read AGENTS.md and the linked contracts. Record and scaffold the local prototype stack, establish actual verification commands, implement the v1 bundle validator, and adopt the supplied synthetic fixture. Stop at the schema/fixture integration gate with runnable evidence and a clear component ownership map for RS-03/04/05. Do not turn unverified baseball or model assumptions into data.

To start a larger delegated implementation, use the roadmap's dependency waves and exclusive ownership after RS-02 freezes the interfaces. Documentation is ready for implementation; the human pilot remains conditional on its listed prerequisites.
