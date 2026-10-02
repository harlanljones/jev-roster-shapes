# 2026 season-timeline storylines (D-44, pins reworked in D-48)

Builds the eight static `public`-class v1 bundles the library opens, one per
dated decision on the 2026 season timeline, plus the display-layer season file
the Shape Case reads. Replaces the D-40 `build.mjs` builder.

## Two steps

```sh
DATA_AS_OF=2026-09-27 bun spikes/mlb-2026/timeline-fetch.mjs   # network
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
a baseline member was neither on the 40-man roster on the pin's date nor a
Boston starter in its observed window (players a pin lists as `injured` are
exempt), or a pin with a roster limit (`rosterSizeMax`, 14 for the Wild Card
roster) has a scenario that fails it. It also writes
`src/lib/storylines/season.json` (record by game, and PA, runs, and splits for
each storyline player) for the display layer.

## Rules

- **Rates** are observed R/PA through the decision date: 2025 totals for the
  preseason pins, then 2026 through June 30, through August 2, and through the
  September 27 regular-season close. Traded players use the combined all-teams
  row. Date-range hitting rows come back duplicated from the API, so the
  builder dedupes them.
- **Eligibility**: ≥10 fielding games at a position in 2025 (D-35), or ≥10
  Boston starts there in 2026 through the decision date, or ≥3 starts in the
  pin's observed window. Date-range fielding rows carry no position, so 2026
  eligibility comes from box-score starts.
- **Baselines** are the lineups Boston used most in each observed window.
- **Fixed decision windows.** `ROSTER_DATES` and `FIXED_WINDOWS` keep
  2026-09-27 and the window key `through-2026-09-27`, so a later `DATA_AS_OF`
  can no longer drop a pin's window (the moving `through-${END_DATE}` key is
  only added when it does not collide with a fixed one); decision dates are
  pinned in `timeline-build.mjs` too, which is why the Wild Card pin is keyed
  to the season close (SEASON_END 2026-09-27) rather than to `snapshot.asOf`.
- **Regular-season rows only.** Every date-range stats request passes
  `gameType=R`, so a window extending into October cannot pull postseason
  games into a regular-season rate.
- **Free-agent candidates.** Randy Arozarena (668227) and Brandon Lowe
  (664040) are fetched into the snapshot for the `winter-bat` pin only, as
  incoming candidates; they are never baseline members, so the baseline
  roster guard still holds.
- The API's 2026-08-02 40-man roster already omits Narváez, who started that
  day; the start keeps him in the deadline baseline. Mayer was on the injured
  list at the deadline, so the deadline pin lists him as `injured`.

## Observed result (snapshot 2026-09-27, 162 games, 87–75)

```
offseason-infield     50.70271 | A 50.68765 (−0.01506)  | B 46.71816 (−3.98455)
opening-day-outfield  50.70271 | A 48.773902 (−1.928808)| B 48.88215 (−1.82056)
july-run              44.0207  | A 45.77464 (+1.75394)  | B 44.7284  (+0.7077)
deadline              46.08519 | A 46.54759 (+0.4624)   | B 44.65364 (−1.43155)
wild-card-roster      43.289994| A 43.51009 (+0.220096)  | B 42.799194 (−0.4908)
winter-infield        43.289994| A 45.578704 (+2.28871) | B 46.004264 (+2.71427)
winter-duran          43.289994| A 43.432194 (+0.1422)  | B 43.25889  (−0.031104)
winter-bat            43.289994| A 45.66305 (+2.373056) | B 44.447994 (+1.158)
```

Every scenario is feasible; readiness is false only for the missing
transaction-rule acknowledgment. An independent Decimal hand derivation
(Σ slot PA × R/PA) matches every total.

## Limitations

- Observed, not projected, rates; illustrative 10-game horizon; placeholder
  caps; costs disabled; overall mode with null split rates (D-42).
- Event dates come from public reporting (Wikipedia's 2026 Red Sox season
  page, NESN for the clinch); the snapshot is primary for records and lineups.
- No club decision had been announced for the three winter pins as of
  October 1, 2026, so they price reporting's questions rather than a choice
  the club has made.
- Franklin Arias is excluded from the winter scenarios: he has no
  major-league plate appearance to build a rate from, and scoring him would
  need minor-league rates and a new eligibility rule, neither of which exists.
- Display-layer splits can drift upstream on a refetch: they are corrected
  for display only, so a source revision may move a `splits` row (one Rafaela
  OPS correction did) while `players` and every engine total stay put.
