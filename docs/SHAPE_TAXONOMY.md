# Shape taxonomy rubric v1 (analyst-labeled)

Status: adopted for the local prototype UI only (D-39). These are
analyst labels, not evaluator consensus: O-03 stays open. Shape labels live in
`src/lib/shapes/taxonomy.ts` (rubric `shape-rubric-v1`) and never enter bundle
inputs, the input digest, or the calculation identity — rearranging or
relabeling shapes cannot change a quantitative result (C-21 equivalent).

## Product Role

Shapes are the central visual language of the Roster Shapes demo. The landing
page begins with the actual roster represented in a bounded roster board, then
connects those profiles to field positions, lineup evidence, depth, workload,
and scenario comparisons. A shape is not ornamental filler: it is a compact,
inspectable profile summary paired with the player's name and readable data.

Required inputs per player: 2026 observed R/PA (or explicit null), 2026 games
by position (≥10 = eligible, D-35 rule reused), season PA total, age/role
context from the cited March 2026 previews. A player with zero PA and no
eligibility is Unclassified — the taxonomy never forces a label.

## Definitions, examples, counterexamples, boundaries

| Shape | Plain-language definition | 2026 examples | Counterexample (looks close, is not) | Boundary rule |
| --- | --- | --- | --- | --- |
| Star | Elite observed run production among regulars (≥0.120 R/PA) with an everyday role | Caleb Durbin (0.130742, 566 PA, 3B); Willson Contreras (0.127580, 533 PA, 1B) | Wilyer Abreu (0.123288 but role story is durability, not stardom — Rectangle) | Rate below 0.120 with any PA total is never a Star |
| Square | Steady single-position regular with a mid observed rate; solid, unspectacular | Carlos Narváez (0.076087, 552 PA, C); Connor Wong (0.094421, C) | Trevor Story (SS-only but the 2026 question is his throws — Octagon) | Multi-position eligibility moves a player to Circle |
| Rectangle | High-PA workhorse (≥550 PA) carrying everyday volume | Wilyer Abreu (657 PA); Jarren Duran (592 PA) | Ceddanne Rafaela (569 PA but the story is the Gold Glove — Pentagon/Octagon judgment call, see below) | Below 550 PA is never a Rectangle |
| Circle | Well-rounded righty utility: multi-position eligible, mid rate, no everyday slot | Isiah Kiner-Falefa (2B/SS); Andruw Monasterio (2B/SS) | Marcelo Mayer (multi-position but the story is fragility — Diamond) | Single-position players are never Circles |
| Pentagon | Young flash: 25 or under with extra-base/speed electricity and high variance | Roman Anthony (21, first full season); Ceddanne Rafaela (25, Gold Glove, swings at everything) | Jarren Duran (29, established volume — Rectangle) | Over 25, or below 200 PA on a full season, needs a written exception |
| Octagon | Defensive anchor: the shortstop-grade glove the infield is built around | Trevor Story (SS, club leader; 2025 late-season throw slippage recorded as the limitation, not a disqualifier) | Marcelo Mayer (plus defender but only 228 PA — Diamond) | A player benched for defense in the storyline set cannot be the Octagon |
| Diamond | High-value but fragile: above-roster-median rate with an injury-limited season (<300 PA) | Marcelo Mayer (0.083333 over 228 PA; never topped 91 pro games before 2026) | Roman Anthony (223 PA but the story is ascent, not fragility — Pentagon) | ≥300 PA is never a Diamond |
| Funky | Irregular profile: DH-only (no position ≥10 games) or fringe (<100 PA) bat | Masataka Yoshida (DH-only, most expensive pinch hitter); Nate Eaton (55 PA, no eligibility) | Rob Refsnyder-type platoon bats with real eligibility would be Circles, not Funky | Any ≥10-game position disqualifies Funky (except DH) |
| Unclassified | Missing inputs: zero PA and no eligible position | Triston Casas (0 PA in 2026, 60-day IL, null rate) | Every other roster player has inputs and takes a label | Never display a rate or shape-based claim for Unclassified |

## Known judgment calls (recorded, not hidden)

- Rafaela could be Rectangle (569 PA) or Octagon (Gold Glove CF); rubric v1
  assigns Pentagon on the "swings at everything, timely hitting, age 25" flash
  reading. A future evaluator pass may move him to Octagon without touching any
  bundle, digest, or result.
- Story as Octagon carries the explicit limitation that his 2025 late-season
  range/throws slipped (Globe, March 2026); storyline S5-B ("Monasterio SS,
  Story sits") exists precisely to test that limitation.
- Anthony (Pentagon) vs Mayer (Diamond) at ~225 PA each is the rubric's core
  ascent-vs-fragility distinction; small input changes near the 200/300 PA
  lines can flip Pentagon/Diamond/Rectangle, which is why shapes stay out of
  the calculation identity.

## Glyphs

Square = square; Rectangle = wide rectangle; Circle = circle; Pentagon =
regular pentagon; Octagon = regular octagon; Diamond = rotated square; Star =
five-pointed star; Funky = irregular blob; Unclassified = dashed hollow circle.
Every glyph is paired with its text label and a table equivalent (WORKFLOWS §7).
