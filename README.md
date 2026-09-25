# Roster Shapes

Baseball teams make roster decisions with incomplete information. Roster Shapes compares acquisition options side by side. It shows who plays, who sits, and what changes.

Live demo: https://jev-roster-shapes.pages.dev/

## What it is

Roster Shapes is an interactive workspace for position-player roster decisions. The central concept is a roster visually represented with shapes: every player has a readable identity, role, workload, and profile glyph before an analyst builds two alternative scenarios against the current baseline. Every number traces to a source, an explicit assumption, or a versioned calculation.

It is a working prototype, not a finished product. It uses public baseball data only. No team partnership or private data is involved.

## What it does

- Compares one baseline roster against two candidate scenarios.
- Makes the roster itself legible first: field positions, depth, workload, and shape profiles share one view.
- Searches each scenario's roster for the best nine it can field, one lineup per pitcher-hand context, and reports what that leaves on the table.
- Shows positional coverage and gaps ("white space") by position and game context.
- Shows playing-time transfers: who gains and loses plate appearances.
- Shows projected offensive contribution, but only where the inputs support it. Missing data stays missing. It is never silently filled with zero.
- Shows the exact classification prompt and, when a key is configured and acknowledged, the provider's validated answers beside the roster they describe.
- Opens evidence for any number: the source value, the assumption behind it, and the formula and version used.
- Saves drafts and exports self-contained files that another analyst can re-import and replay exactly.

## The demo: the 2026 Red Sox season, five decisions

The demo opens on a season index: Boston's record as games over .500, with today marked on the axis and five decisions pinned to the dates they were made. Pick a decision and the roster appears as a fitted case. Each lineup slot is a foam cutout cut to the shape it asks for, and each player is a piece in their profile shape, sized by the runs they actually produced in 2026 and split into a vs-left and a vs-right half colored against the league. Visible foam is friction, an empty cutout is a position nobody on the bench covers, and the same pieces then appear in an interaction map, a capacity bin whose lid is the hindsight best nine, and slot-by-slot bars. Those diagrams are a labeled display layer (D-43).

The engine answers a different question from the diagrams. For each scenario it searches that scenario's own roster for the best nine it can field — one lineup per pitcher-hand context — and then judges that lineup with the same feasibility, coverage, and capacity rules as any other scenario (D-45). The result is a pool fit: its total, how many runs the lineup actually used leaves on the table, who gains and loses plate appearances, who ends up on the bench, which position moves it requires, and what it still cannot cover. It is bounded by the roster the comparison really has, so a candidate's fit may field an incoming player and the baseline's may not, and a member with no rate is excluded and listed rather than scored as zero.

| Decision | Lineup used | Pool's best nine | Left on the table |
| --- | --- | --- | --- |
| Feb 9 second base | 51.68 | 52.69 | +1.011 |
| Mar 26 DH lane | 51.68 | 51.68 | 0 (the lineup used is already the fit) |
| Jul 22 July run | 44.02 | 45.77 | +1.754 |
| Aug 3 deadline C | 46.09 | 46.16 | +0.077 |
| Sep 25 October | 43.26 | 45.83 | +2.571 |

Each decision compares the lineup Boston actually used (from MLB box scores) against two alternatives over the same illustrative 10-game horizon. The engine scores all three with what was known on the decision date: 2025 runs per plate appearance before Opening Day, 2026 rates through the day before for later pins (D-44). Data comes from the free MLB Stats API.

### Snapshots: the prompt and its answers

Every decision has a **Snapshots** subpage showing the exact request a Jev classification would send — the frozen rubric, the observations supplied for one player, and the typed questions — beside that player's roster and the engine's best nine. Paste a TypeSafe API key and the page calls the provider on request, validates every response against a versioned contract, and shows the answer with its full probability distribution, the model version, token usage, timing, and an estimated cost at the published list price. The key is held in memory for the session only and is never written to a bundle, a draft, storage, or the repository, so the deployed demo cannot call the provider without one (D-47).

Nothing on that page is a claim. The rubric is analyst-derived and has no evaluator agreement behind it (O-03); whether this data may leave the team environment is unresolved (O-04); no tolerable error, latency, or cost limit has been agreed, so no confidence threshold is applied anywhere (O-07); and the transparent rule-based baseline SPEC §7 asks for is not built, so the comparison is against the analyst label only. A profile is a display mark: it cannot change coverage, workload, contribution, or any other number.

| Date | Decision | Baseline | Candidate A | Candidate B |
| --- | --- | --- | --- | --- |
| Jan 14 | Offseason infield: the rebuilt infield, keep Bregman, or Casas at first | 50.70 runs | 50.69 (−0.02) | 46.72 (−3.98) |
| Mar 26 | Opening Day: Duran DH, Yoshida DH vs righties, or trade Duran | 50.70 | 48.77 (−1.93) | 48.88 (−1.82) |
| Jul 22 | July run: June regulars or July regulars? | 44.02 | 45.77 (+1.75) | 44.73 (+0.71) |
| Aug 3 | Deadline: stand pat, the Rutschman and Mayer trades, or Rutschman and keep Mayer | 46.09 | 46.55 (+0.46) | 44.65 (−1.43) |
| Sep 25 | Wild Card roster (14 position players): carry Contreras, he's ready, or leave him off | 43.22 | 43.85 (+0.63) | 42.68 (−0.54) |

The Wild Card pin compares three rosters under the same 14-position-player limit Boston used in 2025; it is not a postseason optimization. The April 25 manager change is marked on the timeline but is not a decision here: it led to coaching and batting-order changes, not roster moves. Scenario details were checked against 2026 reporting (D-48).

![Start screen: the roster as a fitted case](docs/images/library-roster-shapes.png)
![Workspace: side-by-side capacity bins for baseline, A, B and the engine's best nine](docs/images/storyline-comparison.png)

The demo is honest about hindsight. Before Opening Day, the club's own choices beat every alternative on 2025 numbers, and keeping Bregman scores even with the rebuilt infield because Mayer's small 2025 sample was strong; the July lineup that went 21–4 also scores ahead on what everyone had hit through June. The case shows what the season went on to produce, labeled apart from the engine number. Shapes summarize player profiles. They never change a calculation.

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
src/lib/{contracts,storylines,shapes,engine,persistence,ui,classification}/  component sources
src/lib/app/  season index, decision case, Shape Case model and diagrams, workspace wiring
src/routes/   / · /scenario/[slug] · /scenario/[slug]/snapshots · /player/[id]
tests/{contracts,storylines,engine,persistence,classification,integration,e2e,fixtures,app}/  checks
spikes/mlb-2026/  season snapshot fetcher and storyline bundle builder
docs/  contracts, decisions, shape rubric, research, example bundle
reports/prototype/  measured latency evidence
```

Measured: edit-to-render p95 of **8.8 ms** against the proposed 250 ms budget on the reference setup (`reports/prototype/edit-latency.json`); the pool fit adds about 12 ms of engine work to the same path. Verified by 77 unit/integration tests and 27 end-to-end journeys.

## Data and limits

- Rates are observed 2026 public values, not projections. Splits are unavailable. The horizon and workload caps are illustrative placeholders.
- The pool fit maximizes that dated rate under eligibility and one-player-per-slot. It is not a lineup recommendation: it ignores platoon advantage (no split rates exist in these bundles), defense, and age, and it holds the roster fixed.
- Shape labels and the classification rubric are one analyst team's judgments. No evaluator consensus exists yet.
- Classification is advisory, opt-in, and unverified: no key is bundled, the response contract is implemented from the vendor's published API rather than a verified account, and cost figures are estimates at a published list price.
- There is no team data, no approved projection source, no staffing, and no deployment beyond this public demo. Saved drafts live in the browser only.
- Underlying public baseball data carries its own terms (MLBAM copyright notice), recorded per source in each bundle.

## License

MIT — see [LICENSE](LICENSE).
