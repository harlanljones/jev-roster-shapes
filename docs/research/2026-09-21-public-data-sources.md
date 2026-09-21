# Alternative (public) data sources for Roster Shapes

Reviewed 2026-09-21 via web search plus one live API probe. Research only: it does
not satisfy O-01 (approved sources) or RS-08 (permissions, staffing, study plan), and
per D-28 the app still opens only `synthetic` bundles until RS-08 records permission.
A `public`-class bundle adapter remains a scoped follow-up task.

## What the v1 contract needs (DATA_CONTRACT §§2–3, D-04, D-23)

- Players: stable ID, name, batting handedness (`L/R/S/unknown`), eligibility over the
  eight defensive positions, `sourceIds` provenance.
- One metric definition with unit `runs_per_PA` (the validator rejects other units);
  projections carry `overall`, `vsL`, `vsR` rates or explicit nulls.
- Sources with kind, effective date, and notes distinguishing invented from measured data.
- SPEC §5.3: a rate index (wOBA, wRC+, OPS) cannot stand in for runs/PA until an
  analyst approves a documented conversion; missing stays missing.

## Candidate sources

### 1. MLB Stats API (`statsapi.mlb.com`) — recommended backbone for identity/roster/observed stats

- Free, no API key, plain JSON over HTTPS (verified live 2026-09-21: player season
  totals return PA, R, AVG/OBP/SLG among ~40 fields; team/player/leader endpoints
  respond without auth). Community docs: `appac.github.io/mlb-data-api-docs`,
  `toddrob99/MLB-StatsAPI` wiki, `sportsdataverse` Python/R wrappers.
- Covers: stable MLBAM person IDs, full name, bat/throw side, primary position,
  team rosters (`/teams/{id}/roster` with season/date), season/observed stats,
  leaders. One probe confirmed `plateAppearances` + `runs` per season split, so
  **observed** R/PA is directly derivable.
- Gaps: the season endpoint returns one row per season/team — **no pitcher-hand
  splits** in the basic response (platoon columns must come from §2 or §4). It
  publishes **observed stats, not projections**. It is unofficial (no published
  SLA/terms page found); every response carries an MLBAM copyright notice, so
  commercial/team use still needs legal review under RS-08.
- Contract fit: `people` + `roster` → Player rows (ID, name, bats, primary position
  as eligibility hint only); season stats → observed R/PA metric definition for
  backtesting-shaped bundles, never silent projections.

### 2. FanGraphs projections (Steamer/ZiPS/Depth Charts) — recommended projection source, via paid export

- The only public projection systems with **preseason platoon splits**: Steamer
  batting offers Overall / vs LHP / vs RHP views (verified on 2026 pages); member
  extras include handedness, percentile, and context-neutral variants. ZiPS, ATC,
  THE BAT, OOPSY also hosted; Depth Charts combine ZiPS+Steamer with staff
  playing-time allocation.
- Access: **Data Export is Members Only** (one-click CSV for personal projects);
  leaderboards/projections pages are otherwise free to view. Owner statement
  (David Appelman): *"All the data on FanGraphs, exported or not, is for private,
  non-commercial use, or may be used in accordance with fair use."*
- Consequence: automated scraping (libraries exist, e.g. `FanGraphs-Export`) is the
  wrong path — it bypasses the membership gate the site funds itself with and risks
  ToS disruption clauses. Budget one membership and use the export UI; record the
  membership, export date, and projection version in every Source record.
- Contract fit: projected PA + counting stats (R, etc.) → projected overall R/PA
  via a documented conversion; vs LHP/vs RHP → split rates. Steamer preseason is
  the closest match to `overall` + `vsL` + `vsR` in one system. Still needs the
  analyst-approved conversion note (SPEC §5.3) because R/PA is derived, not published.

### 3. Retrosheet + retrosplits (Chadwick Bureau) — free splits history, any use

- Retrosheet event files (1871–2025 annual zips) are free **for any use including
  commercial products**, with one condition: a prominent attribution statement
  (wording on `retrosheet.org/game.htm`). `retrosplits` (ODbL) pre-aggregates
  day-by-day records and **batting/pitching splits 1969–present** from play-by-play —
  pitcher-hand splits are derivable without re-parsing events.
- Contract fit: observed R/PA by pitcher hand for historical seasons; independent
  cross-check for eligibility (games by position derivable from events). Best used
  as the evidence base for a "historical backtest" bundle rather than forward
  projections.

### 4. Lahman Database via SABR — free eligibility evidence, no splits

- Annual free download (currently through 2025) with `People` (including
  `retroID`, `bbrefID`, bats/throws), `Batting`, and `Fielding` (games by `POS`) —
  exactly the approved-eligibility evidence the domain contract wants. No platoon
  splits, one-season lag.
- Contract fit: `Fielding.G by POS` → eligibility arrays with a documented
  games-played threshold; `People` → bats + cross-IDs.

### 5. Chadwick Register — free ID crosswalk

- Person identification/demographics including MLBAM keys, under open terms
  (distributed CC BY-SA inside `baseballdatabank`). Use to join MLBAM ↔
  FanGraphs ↔ Lahman/Retrosheet IDs deterministically and store the mapping
  revision in the Source note.

### 6. Tooling, not sources: pybaseball / baseballr / sportsdataverse

- Python/R wrappers over the above (Statcast, FanGraphs leaderboards, Lahman,
  Retrosheet via Chadwick CLI). They inherit each upstream's terms — pybaseball
  hitting FanGraphs endpoints does not launder the membership/license position.
  Useful for the adapter spike, not citable as provenance.

### Deprioritized

- **Baseball Savant / Statcast**: rich observed advanced metrics (xwOBA, Barrels,
  OAA) under MLBAM copyright, but no projections and no runs/PA; display-only at most.
- **ESPN hidden JSON endpoints**: expose vs-Left/vs-Right splits, but unofficial,
  undocumented, and ESPN ToS-hostile — strictly a fallback if §1–§4 fail.
- **Commercial APIs** (Sportradar, SportsDataIO, wager-oriented RapidAPI wares):
  keyed, paid, and mostly observed-stats/odds shaped — no runs/PA projections;
  out of scope for a synthetic-to-public pilot step.

## Recommended public-bundle recipe (for RS-08 sign-off, not a decision)

1. Identity/roster/bats: MLB Stats API `people` + team `roster` (free, versioned by
   fetch date; store request URLs in the Source note).
2. Projections overall + splits: one FanGraphs membership export, single system
   (Steamer preseason first choice for its vs-LHP/vs-RHP views), with the R/PA
   conversion documented and analyst-approved.
3. Eligibility evidence: Lahman `Fielding` games-by-position (+ Retrosheet spot
   checks); IDs joined via the Chadwick Register.
4. Bundle as `dataClass: "public"`, sources kind-tagged (`projection`,
   `eligibility`, `manual` for the conversion), effective dates pinned — then
   follow D-28: open only after RS-08 records permission.

## Open verification before any adapter task

- Confirm the current membership export includes the vs-LHP/vs-RHP columns and its
  exact column contract (export sample, not page HTML).
- Decide the R/PA conversion (projected R ÷ projected PA vs. linear-weights from
  wOBA) and get analytics-lead sign-off per SPEC §5.3.
- Legal/owner review of MLBAM copyright notice and FanGraphs private-use license
  for the intended (internal synthetic-evaluation) use — the RS-08 gate.
