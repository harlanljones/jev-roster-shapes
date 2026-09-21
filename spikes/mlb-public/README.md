# Public-data adapter spike (D-34)

Builds one static `public`-class v1 bundle from freely fetchable 2025 data and
proves the frozen validator and deterministic engine accept real-shaped public
inputs. The app does **not** open this bundle (D-28 holds until RS-08 records
permission); there is no app wiring and no network call at bundle load.

## Rebuild

```sh
bun spikes/mlb-public/build.mjs
```

Fetches 11 Red Sox `people` + 2025 season hitting and fielding rows from
`statsapi.mlb.com` (free, no key), derives observed R/PA and games-by-position
eligibility, writes `redsox-observed-2025.json`.

## Observed result (2026-09-21, eligibility update)

```
mlbam-baseline rev 1: feasible offense=44.466 ready=false (ACKNOWLEDGMENT_REQUIRED)
mlbam-candidate-a rev 1: feasible offense=45.2524 ready=false (ACKNOWLEDGMENT_REQUIRED)
inputDigest=45022eaa000160400308a5b42b6f3782c7d6938bf2a1771e7eacd345b426c04f
```

Validation: `parseBundle` accepts the built object with no diagnostics; both
scenarios are feasible with available overall offense; readiness is false only
for the missing transaction-rule acknowledgment, exactly like the golden
synthetic fixture. Candidate A (Roman Anthony in, Rob Refsnyder out, Jarren
Duran sliding to DH) adds about 0.79 runs over the illustrative 360 PA.

## Design choices and limitations

- Metric is **observed** 2025 regular-season R/PA (all teams for traded players),
  rounded to six decimals — a documented SPEC §5.3 conversion, not a forward
  projection. The Source and MetricDefinition notes say so explicitly.
- `offenseMode` is `overall`; `vsL`/`vsR` are null. Platoon splits need the
  FanGraphs membership export, which has not been provided — no scraping.
- Eligibility aggregates MLB fielding-split games by position across stints at
  **≥10 games** (spike default per D-35; evaluator decision TBD); DH rows are
  excluded. Observed spread: Duran LF/CF, Rafaela 2B/CF, Refsnyder LF/RF,
  Gonzalez 1B/2B, Anthony LF/RF; single-position regulars unchanged. Lahman
  Fielding stays the independent cross-check option.
- Templates reuse the synthetic 10-game demand shape with an explicit
  illustrative-horizon note; workload caps are generous placeholders because real
  limits are TBD (O-02). Costs are disabled.
- Player IDs are `mlbam-{id}` ASCII strings; names keep official diacritics.
- Live fetch happens only when this script runs. The checked-in JSON is the
  reviewable artifact; re-running may change `createdAt` and player data, which
  changes the input digest by design.
