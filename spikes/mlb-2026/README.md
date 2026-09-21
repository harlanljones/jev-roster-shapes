# 2026 storyline bundle builder (D-40)

Builds the five static `public`-class v1 bundles the library opens, from
freely fetchable 2026 data, and proves the frozen validator and deterministic
engine accept them before anything is written.

## Rebuild

```sh
bun spikes/mlb-2026/build.mjs
```

Fetches 15 Red Sox position-player `people` + 2026 season hitting and
fielding rows from `statsapi.mlb.com` (free, no key), derives observed R/PA
and games-by-position eligibility (≥10 games, D-35 rule), assembles the five
baseline/A/B bundles, validates each, asserts the hand-derived D-40 offense
expectations (totals and deltas, including the unavailable Casas case), and
writes `src/lib/storylines/*.json`.

## Observed result (2026-09-21)

```
power-vacuum/base: feasible offense=39.13172
power-vacuum/cand-a: feasible offense=38.3194
power-vacuum/cand-b: feasible offense=unavailable
power-vacuum: inputDigest=d60784cb…
outfield-logjam/base: feasible offense=38.3194
outfield-logjam/cand-a: feasible offense=39.13172
outfield-logjam/cand-b: feasible offense=37.46168
infield-reset/base: feasible offense=38.3194
infield-reset/cand-a: feasible offense=39.95648
infield-reset/cand-b: feasible offense=39.2414
catcher-split/base: feasible offense=38.3194
catcher-split/cand-a: feasible offense=39.05276
catcher-split/cand-b: feasible offense=38.32944
lefty-hole/base: feasible offense=39.13172
lefty-hole/cand-a: feasible offense=40.7688
lefty-hole/cand-b: feasible offense=39.57752
```

Readiness is false only for the missing transaction-rule acknowledgment in
every scenario. Candidate B of the power vacuum (Casas DH, zero 2026 PA) is
feasible with unavailable offense — missing stays missing.

## Design choices and limitations

- Metric is **observed** 2026 regular-season R/PA through 2026-09-20 (all
  teams for traded players), rounded to six decimals — a documented SPEC §5.3
  conversion, not a forward projection. Source and MetricDefinition notes say
  so explicitly.
- `offenseMode` is `overall`; `vsL`/`vsR` are null. Splits need the FanGraphs
  membership export, which has not been provided — no scraping.
- Eligibility reuses the ≥10-game spike default (evaluator decision TBD); DH
  rows excluded. 2026 spread: Mayer/IKF/Monasterio multi-position (2B/SS),
  Duran LF/CF, Anthony LF-only, Yoshida/Eaton/Casas DH-only-or-less.
  Outgoing members leave the planning roster entirely (v1 membership equation);
  the benched star stays only where the equation keeps them (reserve member).
- Templates reuse the 10-game demand shape with an explicit illustrative
  horizon note; workload caps are generous placeholders because real limits
  are TBD (O-02). Costs are disabled.
- Player IDs are `mlbam-{id}` ASCII strings; names keep official diacritics.
- Live fetch happens only when this script runs. The checked-in JSON files are
  the reviewable artifacts; input digests exclude `createdAt`/`bundleId`, but
  run `prettier --write` on regenerated JSON and rerun the suite — the pinned
  digests fail until the new content is reviewed.
