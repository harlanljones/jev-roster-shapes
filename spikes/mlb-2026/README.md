# 2026 season-timeline storylines (D-44)

Builds the five static `public`-class v1 bundles the library opens, one per
dated decision on the 2026 season timeline, plus the display-layer season file
the Shape Case reads. Replaces the D-40 `build.mjs` builder.

## Two steps

```sh
DATA_AS_OF=2026-09-25 bun spikes/mlb-2026/timeline-fetch.mjs   # network
bun spikes/mlb-2026/timeline-build.mjs                         # offline
bunx prettier --write spikes/mlb-2026/timeline-snapshot.json src/lib/storylines/*.json
bun spikes/mlb-2026/sync-registry.mjs                          # pin digests and totals
```

`timeline-fetch.mjs` reads `statsapi.mlb.com` (free, no key) and writes
`timeline-snapshot.json`: every finished 2026 Boston game with its starting
lineup (order, player, position), opposing starter and hand, and score;
active and 40-man rosters on 2026-03-25, 06-30, 08-02 and the as-of date;
people; hitting for 2025 and for dated 2026 windows; 2025 fielding; and
season vs-LHP/vs-RHP splits. The sandbox that built this change cannot reach
statsapi, so `.github/workflows/timeline-snapshot.yml` runs the fetch in
GitHub Actions and commits the snapshot back to the branch.

`timeline-build.mjs` needs no network. It turns the snapshot into bundles,
validates each with the frozen contract, runs the real engine, and refuses to
write if any scenario is infeasible, a lineup uses a player twice or at a
position he is not eligible for, a candidate breaks the membership equation,
or a baseline member was neither on the 40-man roster on the pin's date nor a
Boston starter in its observed window. It also writes
`src/lib/storylines/season.json` (record by game, and PA, runs, and splits for
each storyline player) for the display layer.

## Rules

- **Rates** are observed R/PA through the decision date: 2025 totals for the
  preseason pins, then 2026 through June 30, through August 2, and season to
  date. Traded players use the combined all-teams row. Date-range hitting rows
  come back duplicated from the API, so the builder dedupes them.
- **Eligibility**: ≥10 fielding games at a position in 2025 (D-35), or ≥10
  Boston starts there in 2026 through the decision date, or ≥3 starts in the
  pin's observed window. Date-range fielding rows carry no position, so 2026
  eligibility comes from box-score starts.
- **Baselines** are the lineups Boston used most in each observed window.
- The API's 2026-08-02 40-man roster already omits Narváez, who started that
  day; the start keeps him in the deadline baseline.

## Observed result (snapshot 2026-09-25, 159 games, 85–74)

```
preseason-dh      51.68311 | A 48.46843 (−3.21468) | B 47.13219 (−4.55092)
preseason-second  51.68311 | A 49.23211 (−2.451)   | B 51.55675 (−0.12636)
july-run          44.0207  | A 45.77464 (+1.75394) | B 44.7284  (+0.7077)
deadline-catcher  46.08519 | A 46.54759 (+0.4624)  | B 45.60467 (−0.48052)
october-lineup    43.255052| A 43.941312(+0.68626) | B 42.979536(−0.275516)
```

Every scenario is feasible; readiness is false only for the missing
transaction-rule acknowledgment. An independent Decimal hand derivation
(Σ slot PA × R/PA) matches every total.

## Limitations

- Observed, not projected, rates; illustrative 10-game horizon; placeholder
  caps; costs disabled; overall mode with null split rates (D-42).
- Event dates come from public reporting (Wikipedia's 2026 Red Sox season
  page, NESN for the clinch); the snapshot is primary for records and lineups.
