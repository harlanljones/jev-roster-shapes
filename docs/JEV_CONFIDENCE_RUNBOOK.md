# Runbook: diagnosing Jev's confidence and evidence scores

Use this when a Jev number looks wrong, flat, or untrustworthy: most often
`evidence_sufficient` sitting near 0.5 for everyone, or a `confidence` that does
not match the distribution beside it. It separates what the stored answers show
from what has been tested, and says which change each outcome justifies.

Everything here is advisory-layer work (D-47, D-58). Nothing in this runbook can
change a calculation, a bundle, or a digest, and no threshold it mentions is
calibrated (O-07 is open).

## The numbers, and where each comes from

| Shown as | Question | What it is | Source |
|---|---|---|---|
| Probability per label | `profile` (choice) | Model's distribution over the nine rubric labels; sums to 1 | provider |
| Confidence (Outputs table, "CONFIDENCE 85%") | `profile` (choice) | "How certain the model is, derived from probabilities" | provider, derived from the distribution |
| Evidence sufficient (`evidence_sufficient`, the 0–1 marker) | `evidence_sufficient` (noul) | "The yes/no answer on a scale from 0 (no) to 1 (yes)": the model's probability that the observations suffice to apply the rubric without guessing | provider |
| Hatched piece | derived | `evidence_sufficient` below `THIN_EVIDENCE_BELOW` (0.25) | `src/lib/app/jev-call.ts`, D-59 |

Vendor definitions: docs.typesafe.ai/api (read 2026-10-07). The vendor
recommends the optional `criteria` text to say what a yes and a no mean; ours
is `EVIDENCE_SUFFICIENT_CRITERIA` in `src/lib/classification/rubric.ts`.

Versions that key a recorded answer: request digest, `jev-profile-rubric-v1`
(`JEV_RUBRIC_VERSION`), `jev-profile-prompt-v1` (`PROMPT_VERSION`). Changing the
question wording means bumping `PROMPT_VERSION` (or the rubric version); until
CI asks again the app shows "not recorded", never a stale answer.

## What was observed (2026-10-07, 109 recorded answers, `jev-1.13.0`)

| Group | `evidence_sufficient` |
|---|---|
| Players with complete evidence (PA, both splits, rate, eligibility) | 0.29–0.55, mean 0.45, most 0.45–0.50 |
| Player with no PA and no splits (Triston Casas) | 0.10 |
| Same player across storylines (only the dated rate differs) | moved by up to 0.19 |
| Season PA bands | 100–300 PA mean 0.43; 300–550 mean 0.47; 550+ mean 0.46 |

Reading: the model is not saying "evidence is thin". It is close to 50/50 for
nearly everyone and reacts only when evidence is entirely absent. By the
rubric's own "true" text every one of these players qualifies. The answers are
therefore weak evidence of anything about a player until the cause below is
known. The profile label distribution is a separate matter: label choice looked
internally consistent (each label matched its highest probability).

## Hypotheses (none confirmed as of this writing)

| id | Hypothesis | Why it is plausible |
|---|---|---|
| H1 | The question asks about the whole rubric, including Pentagon (needs age ≤ 25) and Octagon (needs defensive value) | The sources never supply age or defense, so "without guessing" is honestly doubtful for everyone |
| H2 | The prompt tells the model data is missing | The state prints `Age: not available`, and the provenance note says "Age is not in the sources" |
| H3 | The `noul` scale is compressed toward 0.5 | Values cluster tightly at 0.45–0.50 regardless of volume |
| H4 | Asking the profile question first changes the second answer | Both questions share one request |
| H5 | It is noise | A coin-flip value that varies 0.19 for one player across storylines |

## Step 1: Look at the stored answers (free, no provider call)

The recorded file is `src/lib/classification/jev-results.json` (one record per
line). Confirm the shape of the problem before spending anything:

```
bun -e "const r=Object.values(JSON.parse(require('fs').readFileSync('src/lib/classification/jev-results.json','utf8')).records);
const v=r.map(x=>x.answer.evidenceSufficient).sort((a,b)=>a-b);
console.log({n:v.length,min:v[0],median:v[v.length>>1],max:v[v.length-1],below25:v.filter(x=>x<.25).length,below50:v.filter(x=>x<.5).length})"
```

- A tight band (here: median ≈ 0.45, one value below 0.25) means the score is
  not discriminating. Go to Step 2.
- A wide spread that tracks PA or missing splits means the question works and
  the problem is elsewhere (check the cutoff in D-59, or the profile label).

## Step 2: Run the probe (≈165 calls, about $0.007 at list price)

Needs the TypeSafe key in your environment (it is a GitHub secret; CI does not
run the probe). The probe calls the provider directly, bypasses the cache,
records nothing under `src/`, and writes `reports/jev-probe/probe-<time>.{json,md}`.

```
TYPESAFE_API_KEY=… bun spikes/mlb-2026/jev-probe.mjs
```

It changes one thing at a time on a fixed sample (14 Wild Card players with
complete evidence plus Casas):

| Variant | Changes | Tests |
|---|---|---|
| `base` ×3 | nothing | noise floor and player signal |
| `noAge`, `noNote`, `noAgeNote` | drops the age line and/or provenance note | H2 |
| `scoped` | question excludes Pentagon/Octagon | H1 |
| `synthAge` | a made-up age (27) | H1 |
| `asChoice` | same question as a true/false choice | H3 |
| `q2Only` | profile question removed | H4 |
| `negStrip` | strips PA, splits, rate, eligibility | control |

`synthAge` and `negStrip` are synthetic. They exist to test the question and are
never recorded, shown, or committed as classifications.

## Step 3: Read the result against the pre-registered rules

The rules are fixed in the script header and are not tuned after a run.

1. **Control first.** `negStrip` must fall by at least 0.20 and by more than
   2× noise. If it does not, the question ignores evidence entirely: stop,
   the score is not usable, and no variant result matters.
2. **Noise.** Mean within-player sd over the three `base` repeats. If it is
   large (the report prints "player signal beyond noise"), H5 explains most of the
   clustering; fix by averaging or drop the score, not by rewording.
3. **Per variant.** A shift is **supported** at +0.15 or more and more than 2×
   noise, **rejected** under 0.05, otherwise **inconclusive**; a drop of 0.15 or
   more is reported as moved down.

| Outcome | Meaning | Change it justifies |
|---|---|---|
| `noAge`/`noAgeNote` supported, `noNote` rejected | The `Age: not available` line is the cue (H2) | Stop printing absent fields as "not available" for fields no rubric rule can use for this label set, or state them as out of scope in the rubric |
| `scoped` or `synthAge` supported | The rubric's unevaluable labels depress it (H1) | Ask the sufficiency question over the labels the sources can decide (or split the rubric); keep Pentagon/Octagon as coverage, not guesses, as `rule-baseline-v1` does (D-55) |
| `asChoice` far above `base` | The `noul` scale is compressed (H3) | Use a choice-typed question and read P(true); re-key as a new prompt version |
| `q2Only` supported | The profile question biases it (H4) | Send the sufficiency question as its own request |
| Everything rejected, `negStrip` passes, noise small | The scale is real and the players are genuinely borderline | Leave the question; the 0.50 reading was the mistake, keep D-59's cutoff |
| `negStrip` fails | The score ignores evidence | Retire the hatching and the number from the UI until a different question works |

## Step 4: Apply a change safely

1. Change the wording or state in `src/lib/classification/rubric.ts` or
   `prompt.ts`, and **bump `PROMPT_VERSION`** (or `JEV_RUBRIC_VERSION`). This is
   what invalidates old answers; skipping it leaves stale answers looking current.
2. Update the tests that pin the wording (`tests/classification/jev.test.ts`,
   `tests/app/jev-call.test.ts`) and run `bun run check`, `bun run lint`,
   `bun run test`.
3. Record the decision in `docs/DECISIONS.md` with the probe table as evidence,
   and re-examine D-59's 0.25 cutoff against the new distribution.
4. Merge, then run the **Classify with Jev** workflow manually (**Run workflow**).
   It asks only requests with no valid answer, so a version bump re-asks every
   request (about 109 calls, roughly $0.005). Expect the app to show "not
   recorded" between the merge and the commit CI makes.
5. Verify on the live Snapshots page: cost line has `$… USD`, distribution
   looks different from the table above, no console errors.

## Guardrails

- A probe or a cutoff is a judgment, not calibration. Do not describe either as
  a measured error rate; no tolerable error exists (O-07) and provider
  processing is still unresolved (O-04).
- Never record a synthetic variant's answer in `jev-results.json`.
- Do not apply a confidence threshold in the classification layer (SPEC §7).
- Keep model output out of the calculation path; layout and model responses
  cannot change a quantitative result.

## Evidence log

Add a dated row each time the probe is run. Keep the raw `probe-*.json` with
the decision that used it.

| Date | Model | Noise (within sd) | Control (`negStrip`) | Supported | Rejected | Decision |
|---|---|---|---|---|---|---|
| 2026-10-07 | jev-1.13.0 | not yet measured | not yet run | none confirmed | none confirmed | D-59 cutoff 0.25 (display only); probe written, not yet run against the provider |
