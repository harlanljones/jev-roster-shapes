# Shape taxonomy rubric v2 (analyst-labeled)

Status: adopted for the local prototype UI only (D-39, revised by D-43). These are
analyst labels, not evaluator consensus: O-03 stays open. Shape labels live in
`src/lib/shapes/taxonomy.ts` (rubric `shape-rubric-v2`) and never enter bundle
inputs, the input digest, or the calculation identity — rearranging or
relabeling shapes cannot change a quantitative result (C-21 equivalent).

## Product Role

Shapes are the central visual language of the Roster Shapes demo. The landing
page begins with the roster as a fitted case (D-43): each lineup slot is a
cutout cut to the shape it asks for, and each player is a piece in their rubric
shape, so a piece that fills its cutout is a snug fit and visible foam is
friction. The same pieces then appear in the interaction map, the capacity bin,
and the slot-by-slot bars. A shape is not ornamental filler: it is a compact,
inspectable profile summary paired with the player's name and readable data.

Required inputs per player: 2026 observed R/PA (or explicit null), 2026 games
by position (≥10 = eligible, D-35 rule reused), season PA total, age/role
context from the cited March 2026 previews. A player with zero PA and no
eligibility is Unclassified — the taxonomy never forces a label.

## Definitions, examples, counterexamples, boundaries

| Shape | Plain-language definition | 2026 examples | Counterexample (looks close, is not) | Boundary rule |
| --- | --- | --- | --- | --- |
| Star | A quirky or tough fit: a hitter who plays one side of the platoon well and the other poorly, so he fills a slot snugly only as half of a platoon. Rule: a gap of at least .200 OPS between vs-LHP and vs-RHP, with 50+ PA on each side (2026 statSplits) | Isiah Kiner-Falefa (.417 vs LHP over 54 PA, .701 vs RHP over 126 PA) | Caleb Durbin (elite 0.127148 R/PA but .697 / .718 splits, no quirk — Square) | A gap under .200, or under 50 PA on either side, is never a Star; production level alone never makes a Star |
| Square | Steady single-position regular with no platoon quirk; solid everyday piece | Caleb Durbin (0.127148, 582 PA, 3B, .697 / .718); Willson Contreras (0.127580, 533 PA, 1B, .981 / .878); Adley Rutschman (C); Connor Wong (0.094017, C) | Trevor Story (SS-only but the 2026 question is his throws — Octagon) | Multi-position eligibility moves a player to Circle; a .200+ platoon gap moves him to Star |
| Rectangle | High-PA workhorse (≥550 PA) carrying everyday volume | Wilyer Abreu (674 PA); Jarren Duran (603 PA) | Ceddanne Rafaela (574 PA but the story is the Gold Glove — Pentagon/Octagon judgment call, see below) | Below 550 PA is never a Rectangle |
| Circle | Well-rounded utility: multi-position eligible, mid rate, no everyday slot, no platoon quirk | Nick Sogard (1B/2B, .793 / .704); Andruw Monasterio (2B/SS/3B, .798 / .608, a .190 gap); Anthony Seigler, Mickey Gasper, Jahmai Jones (multi-position, fewer than 50 PA on one side); Curtis Mead (1B/2B/3B, .897 / .817 over 329 PA, a high rate for a Circle on a sample cut short by a wrist fracture) | Isiah Kiner-Falefa (2B/SS, but a .284 platoon gap — Star under v2); Marcelo Mayer (multi-position but the story is fragility — Diamond) | Single-position players are never Circles; a .200+ platoon gap moves a Circle to Star |
| Pentagon | Young flash: 25 or under with extra-base/speed electricity and high variance | Roman Anthony (21, first full season); Ceddanne Rafaela (25, Gold Glove, swings at everything) | Jarren Duran (29, established volume — Rectangle) | Over 25, or below 200 PA on a full season, needs a written exception |
| Octagon | Defensive anchor: the shortstop-grade glove the infield is built around | Trevor Story (SS, club leader; 2025 late-season throw slippage recorded as the limitation, not a disqualifier) | Marcelo Mayer (plus defender but only 236 PA — Diamond) | A player benched for defense in the storyline set cannot be the Octagon |
| Diamond | High-value but fragile: above-roster-median rate with an injury-limited season (<300 PA) | Marcelo Mayer (0.080508 over 236 PA, 228 for Boston before the deadline trade to San Francisco; never topped 91 pro games before 2026) | Roman Anthony (237 PA but the story is ascent, not fragility — Pentagon) | ≥300 PA is never a Diamond |
| Funky | Irregular profile: DH-only (no position ≥10 games) or fringe (<100 PA) bat | Masataka Yoshida (DH-only, most expensive pinch hitter); Nate Eaton (55 PA, no eligibility) | Rob Refsnyder-type platoon bats with real eligibility would be Circles, not Funky | Any ≥10-game position disqualifies Funky (except DH) |
| Unclassified | Missing inputs: zero PA and no eligible position | Triston Casas (0 PA in 2026, 60-day IL, null rate) | Every other roster player has inputs and takes a label | Never display a rate or shape-based claim for Unclassified |

## Rubric v2 revision (D-43, 2026-09-24)

Harlan's definition: a Star is a player with quirks, a tough fit, not a star
player. Under v1 a Star meant elite production; v2 moves that meaning out of the
shape entirely (production is already the piece's size) and gives Star to the
two hitters whose 2026 splits make them platoon halves. Durbin and Contreras,
the v1 Stars, have no split quirk and become Squares. Circles in v1 that meet
the Star rule (Kiner-Falefa, Monasterio) become Stars. Split evidence is the
display-only snapshot in `src/lib/app/split-evidence.ts` (MLB Stats API
statSplits, fetched 2026-09-24); it never enters a bundle. The revision is
reversible without touching any bundle, digest, or result.

Cutout asks (what shape each lineup slot is cut for) are a proposed judgment
layer in `src/lib/app/shape-case.ts`: C Square; 1B Square (accepts Rectangle);
2B Square (accepts Circle, Octagon, Star); 3B Square (accepts Octagon); SS
Octagon (accepts Circle, Star); LF and RF Rectangle (accept Pentagon, Square);
CF Octagon (accepts Pentagon, Rectangle); DH Funky (accepts Rectangle, Square,
Star). A piece matching the primary ask is snug, an accepted shape fits, any
other shape is loose, and Unclassified has no grade.

## Full-season reapplication (D-44, 2026-09-25; refreshed under D-48)

The season timeline reapplied the unchanged v2 rule to the full-season
combined rows in `src/lib/storylines/season.json` (MLB Stats API, through
September 25). Kiner-Falefa stays a Star (.284 gap). Monasterio's gap narrowed
from .247 to .190, so he moves from Star to Circle; the rule did not change,
the sample did. Players the timeline added are labeled under the same rule:
Rogers and Bregman Square (Bregman's rows are his 2026 season with the Cubs,
shown as the counterfactual in the offseason storyline), Seigler, Gasper, and
Jones Circle. Several players (Mayer, Gasper, Jones, Rogers, Seigler) show gaps
above .200 on fewer than 50 PA against one hand, which the rule treats as
noise, not a quirk. Rationale numbers follow the checked-in snapshot and are
refreshed with it.

## Known judgment calls (recorded, not hidden)

- Curtis Mead (added for the Wild Card storyline, D-49) is a Circle on
  eligibility and splits, but his 0.148936 R/PA is the highest in the pool and
  came before a wrist fracture ended his season on July 29; a Diamond reading
  (high value, fragile) is defensible once his 329 PA are weighed against the
  layoff.
- Rafaela could be Rectangle (574 PA) or Octagon (Gold Glove CF); rubric v1
  assigns Pentagon on the "swings at everything, timely hitting, age 25" flash
  reading. A future evaluator pass may move him to Octagon without touching any
  bundle, digest, or result.
- Story as Octagon carries the explicit limitation that his 2025 late-season
  range/throws slipped (Globe, March 2026); the retired D-40 storyline that
  benched Story for Monasterio tested that limitation; the July-run timeline
  storyline (D-44) now shows Monasterio taking most July starts at short.
- Anthony (Pentagon) vs Mayer (Diamond) at ~225 PA each is the rubric's core
  ascent-vs-fragility distinction; small input changes near the 200/300 PA
  lines can flip Pentagon/Diamond/Rectangle, which is why shapes stay out of
  the calculation identity.

## The model rubric is a separate artifact

`src/lib/classification/rubric.ts` holds `jev-profile-rubric-v1`: the closed set of
nine options and their plain-language definitions and boundary rules, in the form the
Jev request sends them. It is derived from this document's table, and it is *not* the
analyst labels in `src/lib/shapes/taxonomy.ts` — those are the comparison target and are
deliberately withheld from every prompt, together with their rationales, so the
comparison is not circular. The rubric version is part of the classification cache key,
so rewording a definition re-asks the question instead of reusing an answer. Both
artifacts are display-layer: neither enters a bundle, a digest, or a result.

## Glyphs

Every shape is drawn at the same area for the same radius
(`src/lib/shapes/geometry.ts`), so a glyph or piece shows which shape, never how
much. Square = square; Rectangle = 1.8:1 rectangle; Circle = circle; Pentagon =
regular pentagon; Octagon = regular octagon; Diamond = rotated square; Star =
five-pointed star; Funky = irregular blob; Unclassified = dashed hollow circle.
Every glyph is paired with its text label and a table equivalent (WORKFLOWS §7).
