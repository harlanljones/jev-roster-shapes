# Roster shapes: the framework, and what this repository does with it

The idea this project is built on is Taylor Wyman's. He publishes as
[@taylormetrics](https://www.tiktok.com/@taylormetrics) on TikTok and
[@taylormetrics](https://x.com/taylormetrics) on X.

## 1. Origin and credit

Wyman originated the diagram that carries his name — the Wyman Diagram, also called roster
shapes: a roster drawn as shapes packed into a box. Every roster is a box to fill, and the best
possible team leaves no white space. He drew the first ones by hand on TikTok, where they went
viral, and the format has since spread well beyond basketball.

This repository is one of those spreads. It applies the same idea to a baseball lineup, with the
box as a fitted equipment case. The framework is his; every judgment, label, rule and number here
is this project's own, as section 3 sets out.

He has no involvement in this project. He has not reviewed it, endorsed it, or supplied data for
it, and there is no affiliation with him, The BBall Index, PFF, or MLB.

## 2. His published encoding

Four channels carry meaning in Wyman's own version:

| Channel | What it means |
| --- | --- |
| Size | Value over replacement. |
| Outline / shape | How easily the player fits alongside teammates. Squares and rectangles sit flush against their neighbours. Pentagons, triangles and stars leave gaps around themselves. |
| Colour | Role — balanced, perimeter shooter, on-ball creator, interior big, disruptor/connector. Explicitly *not* a rating. |
| White space | What a perfect team would add: the gap between this roster and the box filled. |

Position within the box is layout only and carries no meaning.

Two independently built versions credit him and carry the same encoding:
[databallr.com/roster-shapes](https://databallr.com/roster-shapes) and
[github.com/jjustin-liu/roster-visualization](https://github.com/jjustin-liu/roster-visualization).
They are cited here as versions that credit him, not as his own words.

Reviewed 2026-11-03. TikTok is JavaScript-gated and x.com returns HTTP 402 through this
environment's proxy, so no individual post could be opened. Nothing here cites a video, a title or
a caption, and his analytical positions below are paraphrased from public statements rather than
quoted.

## 3. What this repository keeps, cuts and borrows

| # | His rule | This repository | Call |
| --- | --- | --- | --- |
| 1 | A roster is a box to fill; the best possible team leaves no white | The fitted case and the capacity bin, with the lid set to the pool's hindsight tightest fit; headroom under the lid is value the lineup leaves off | **Keep.** It is the spine of D-43 and D-50 |
| 2 | Size is value over replacement, superlinear in value | Piece area is proportional to actual 2026 runs, which is observed PA times observed R/PA: linear, with no replacement baseline | **Borrow the replacement baseline** as a recorded proposal, display-layer only. **Cut the superlinear exponent**: it is tuned to basketball, and the author of the data-driven version calls it a choice rather than a finding |
| 3 | The outline is how easily a player fits alongside teammates | A rubric v2 shape is a *profile* summary — platoon quirk, position count, PA volume, age, fragility. Fit lives separately, in the cutout ask and the snug / fits / loose grade | **Keep the split, and say so.** Do not adopt a fitted portability outline: in the data-driven version, leave-one-out fill R-squared is 14 percent and portability R-squared about 1 percent even with 15,812 NBA lineups, and this repository has no comparable baseball lineup data to fit against |
| 4 | Colour is role, and colour is not a rating | Colour is each half's split OPS against the league line for that pitcher hand | **Divergence, recorded.** This repository's colour *is* a rating, which inverts his rule. The ramp stays, already labeled a judgment layer. A role channel, if it ever arrives, takes a label or a pattern and never colour |
| 5 | Position in the box is layout only | Each cutout is a specific lineup slot, so position is a real constraint | **Keep this repository's reading.** Baseball positions are hard eligibility constraints, not layout |
| 6 | White space is what a perfect team would add | Split in two: an empty cutout is a position nobody on the roster covers, and headroom under the lid is value left off | **Keep the refinement**, which separates a coverage gap from a value gap |
| 7 | A team-fit figure in points per 100 that lineups gain or lose by playing together | No quantified interaction term. The interaction map shows shared positions, tested swaps and platoon complements only | **Cut, with the reason recorded.** It needs lineup-level data this repository does not have, and the basketball version's out-of-sample signal is about 1 percent |
| 8 | Outlines are mostly judgement; state the honest ceiling; a choice is stated as one; a disagreement with the hand-drawn original is a finding rather than a bug | Already the house style: judgment layers labeled, missing values suppressed rather than zero-filled, and [Known judgment calls (recorded, not hidden)](SHAPE_TAXONOMY.md) kept in the rubric | **Keep, and credit.** This is the strongest alignment between his method and this repository's, and the clearest thing to credit as an influence |
| 9 | Tiers beat 1-to-100 ranks; all-in-one metrics are weak at sorting the top three to five players; impact is not talent; understand a metric before trusting it | Snug / fits / loose is already a tier rather than a score. The actual-2026-runs display layer and the engine's dated-metric total already separate what a player produced from what a rate implies | **Borrow as named principles.** No numeric fit score, as a standing rule; and the display-versus-engine split is named for the impact-versus-talent distinction it already draws |
| 10 | A shape describes fit, not quality | Rubric v2 already redefined Star as a tough fit rather than a star player (D-43) | **Keep.** It converges on his outline-as-fit idea, which was not the reason for the change |

## 4. This repository's earlier reading of the shapes (superseded)

Before 2026-11-03 this guide described the shapes as role archetypes: Square a 3-and-D player,
Hexagon a playmaker, Pentagon an offense-only star, Circle a scorer who is a defensive liability.
That was this repository's own secondhand gloss, written without a source. It is not his published
encoding, which is in section 2; it conflicts with rubric v2; it names a Hexagon this repository
does not have; and it was never adopted by the app (D-50). It is recorded here so the correction
is visible rather than silent.

## In this app (D-50)

Each decision page centers on one Wyman-style board, drawn from 2026 Red Sox data rather than the basketball rosters his own diagrams cover:

- **The box** is the most this roster pool could field in hindsight: the tightest fit, with platoons and position moves, packed until it reaches the lid.
- **The pieces** are the scenario's nine lineup slots, sized by actual 2026 runs and dropped in by gravity. Left and right halves are the player's split against left- and right-handed pitching.
- **Empty space** is literal: gaps where outlines don't nest, and headroom between the top of the pile and the lid. Headroom is value the lineup leaves off.
- **Off the field** is an open tray beside the board with everyone the lineup leaves out, at the same scale.

The shapes follow the repository's rubric v2 ([Shape taxonomy](SHAPE_TAXONOMY.md)) — not the role
glosses in section 4, and not his encoding in section 2. In particular, a Star is a player with
quirks who is hard to fit, not a star player. The fitted case, the engine's pool fit, the
interaction map, and the slot bars are subpages behind the board.
