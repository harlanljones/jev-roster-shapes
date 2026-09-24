# Roster Shapes

Baseball teams make roster decisions with incomplete information. Roster Shapes compares acquisition options side by side. It shows who plays, who sits, and what changes.

Live demo: https://jev-roster-shapes.pages.dev/

## What it is

Roster Shapes is an interactive workspace for position-player roster decisions. The central concept is a roster visually represented with shapes: every player has a readable identity, role, workload, and profile glyph before an analyst builds two alternative scenarios against the current baseline. Every number traces to a source, an explicit assumption, or a versioned calculation.

It is a working prototype, not a finished product. It uses public baseball data only. No team partnership or private data is involved.

## What it does

- Compares one baseline roster against two candidate scenarios.
- Makes the roster itself legible first: field positions, depth, workload, and shape profiles share one view.
- Shows positional coverage and gaps ("white space") by position and game context.
- Shows playing-time transfers: who gains and loses plate appearances.
- Shows projected offensive contribution, but only where the inputs support it. Missing data stays missing. It is never silently filled with zero.
- Opens evidence for any number: the source value, the assumption behind it, and the formula and version used.
- Saves drafts and exports self-contained files that another analyst can re-import and replay exactly.

## The demo: five 2026 Red Sox storylines

The demo opens on the roster as a fitted case. Each lineup slot is a foam cutout cut to the shape it asks for, and each player is a piece in their profile shape, sized by the runs they actually produced in 2026 and split into a vs-left and a vs-right half colored against the league. Visible foam is friction, an empty cutout is a position nobody on the bench covers, and the same pieces then appear in an interaction map, a capacity bin whose lid is the pool's tightest fit, and slot-by-slot bars. These diagrams are a labeled display layer (D-43); the workspace keeps the pinned engine totals below. Five storylines from real Red Sox roster events follow as retrospective analyses. Their displayed dates are verified event windows or dated anchors, not the later date when public stats were fetched. Each compares a baseline against two candidates over the same illustrative 10-game horizon, using observed 2026 scoring rates (runs per plate appearance through September 20, via the free MLB Stats API).

| Storyline | Baseline | Candidate A | Candidate B |
| --- | --- | --- | --- |
| Who carries the lineup without Devers and Bregman? | 39.13 runs | 38.32 (−0.81) | Unavailable — Casas has no 2026 rate |
| Four gloves, three spots, one DH | 38.32 | 39.13 (+0.81) | 37.46 (−0.86) |
| From the worst infield to steady | 38.32 | 39.96 (+1.64) | 39.24 (+0.92) |
| Narváez's middle ground vs Wong's rebound | 38.32 | 39.05 (+0.73) | 38.33 (+0.01) |
| No Refsnyder, no Romy: who faces lefties? | 39.13 | 40.77 (+1.64) | 39.58 (+0.45) |

![Start screen: the roster as a fitted case](docs/images/library-roster-shapes.png)
![Workspace: side-by-side capacity bins for baseline, A, B and the tightest fit](docs/images/storyline-comparison.png)

The demo is honest about uncertainty. The injured slugger's hoped-for return shows no offensive total, because he has no 2026 at-bats. The backup catcher out-hit the starter on observed numbers, and the tables say so. Shapes summarize player profiles. They never change a calculation.

## Potential applications

- Trade-deadline preparation: stage competing offers against the same roster and assumptions.
- Lineup and playing-time planning: see coverage gaps before they appear on the field.
- Prospect promotion cases: compare the rookie's path against the veteran's role.
- Reproducible analysis: export any comparison and hand it to a colleague who can replay it exactly.
- Beyond baseball: the same pattern fits any roster-constrained planning problem.

## How it does it

Three layers stay separate. Source evidence holds the raw values and their provenance. Assumptions hold the human judgments: lineups, workload caps, profile labels. Calculations hold the deterministic math. Geometry never creates value. Rearranging tiles never changes a result.

The engine is deterministic. The same versioned inputs always produce identical outputs. Validation rejects broken files atomically and keeps valid-but-flawed drafts open for inspection. Saved results replay against stored inputs, and mismatches block review instead of failing silently.

Player shapes (Star, Square, Rectangle, Circle, Pentagon, Octagon, Diamond, Funky) are analyst-applied profile labels under a documented rubric. They are the demo's primary visual language, not decoration: the roster board makes every profile inspectable before comparison. Shapes remain display-only and never change calculations. One player with no 2026 inputs stays Unclassified rather than guessed.

## For developers

Prerequisites: Bun 1.4.2, Node 26.x, Python 3.12 (see `mise.toml`).

```sh
bun install --frozen-lockfile
bun run dev        # local dev server
bun run check      # typecheck, zero warnings
bun run lint       # prettier + eslint
bunx vitest run --project server --project integration
bun run build
bun run test:e2e   # production build + Playwright (Chromium)
```

Pushes to `main` build on GitHub Actions and deploy to Cloudflare Pages (see "Demo deployment" in the roadmap handoff). Pull requests get preview deployments.

### Demo deployment

The workflow requires repository secrets `CLOUDFLARE_API_TOKEN` with Pages edit
permission and `CLOUDFLARE_ACCOUNT_ID`. The Pages project
`jev-roster-shapes` must be provisioned once by an authorized Cloudflare owner;
the workflow intentionally fails if the project or credentials are invalid.
Pushes to `main` deploy production. Pull requests from this repository deploy a
preview, while fork pull requests only run the build and checks because GitHub
does not expose repository secrets to forks. This is a public demo deployment,
not the approved authenticated team environment described by RS-08.

The public 2026 decision-pool snapshot is refreshed daily by GitHub Actions.
The job opens a reviewable pull request when source data changes; it never
silently changes production or the retrospective event dates. A refresh PR must
be reviewed for roster membership, eligibility, rates, digests, and
hand-derived scenario expectations before merge.

| Document | Use it for |
| --- | --- |
| [Product specification](SPEC.md) | Scope, hypotheses, pilot plan, non-goals |
| [Development instructions](AGENTS.md) | Component reading, evidence, agent coordination |
| [Roadmap](ROADMAP.md) | Task IDs, ownership, integration gates, handoff log |
| [Domain and calculations](docs/DOMAIN_AND_CALCULATIONS.md) | Assignments, outs/PA accounting, feasibility, readiness |
| [Data contract](docs/DATA_CONTRACT.md) | Versioned records, validation, results, replay |
| [Interaction contract](docs/WORKFLOWS.md) | Screens, editing, failures, keyboard behavior |
| [Acceptance](docs/ACCEPTANCE.md) | Exact numerical cases and evaluation protocol |
| [Decisions](docs/DECISIONS.md) | Adopted defaults (D-01–D-41) and open dependencies |
| [Shape taxonomy](docs/SHAPE_TAXONOMY.md) | Analyst-labeled 8-shape rubric v2 for the Shape Case diagrams |
| [Design](DESIGN.md) | Visual system: the case metaphor, tokens, type, and diagram components |

Repository layout:

```text
src/lib/{contracts,storylines,shapes,engine,persistence,ui}/  component sources
src/lib/app/  landing case, Shape Case model and diagrams, workspace wiring
src/routes/   single-page shell
tests/{contracts,storylines,engine,persistence,integration,e2e}/  checks
spikes/mlb-2026/  2026 storyline bundle builder
docs/  contracts, decisions, shape rubric, research, example bundle
reports/prototype/  measured latency evidence
```

Measured: edit-to-render p95 of **8.8 ms** against the proposed 250 ms budget on the reference setup (`reports/prototype/edit-latency.json`). Verified by 30 unit/integration tests and 17 end-to-end journeys.

## Data and limits

- Rates are observed 2026 public values, not projections. Splits are unavailable. The horizon and workload caps are illustrative placeholders.
- Shape labels are one analyst team's rubric. No evaluator consensus exists yet.
- There is no team data, no approved projection source, no staffing, and no deployment beyond this public demo. Saved drafts live in the browser only.
- Underlying public baseball data carries its own terms (MLBAM copyright notice), recorded per source in each bundle.

## License

MIT — see [LICENSE](LICENSE).
