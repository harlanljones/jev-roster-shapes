# Design

The visual system for Roster Shapes after the public-release redesign (D-62). The source of truth
is the **Roster Shapes design system** artifact
(<https://claude.ai/artifact/LSQcbG65oYb3ZdM1b43Z1B>): its brand book, tokens and component
previews. A copy of its tokens is checked in at `docs/design/roster-shapes-tokens.json`, and
`src/lib/ui/tokens.css` is generated from it — edit the artifact, then regenerate; never hand-edit
a value in `tokens.css`.

Concrete values follow Harlan Jones' `ai-design-skills`: `landing-page-design` Part B and its
companion `redesign-existing-projects` (Design Values). Values those skills leave open — the light
surfaces, the accent and the data colours — are this system's own. The number format, chart rules
and grey-midpoint diverging scale are borrowed from the sibling Hot Stove Lab system; its verdict
apparatus is not (D-62). The redesign's audit and scores are in
`reports/redesign/2026-11-04-diagnosis.md`.

## Idea

The roster is a fitted equipment case, and the idea of reading a roster as shapes in a box is
Taylor Wyman's ([the framework guide](docs/wyman-diagram.md)). Each lineup slot is a cutout cut to
the shape it asks for; each player is a piece in their rubric shape, sized by the runs they
produced. A snug piece fills its cutout; visible foam is friction; an empty cutout is a position
nobody covers; headroom under the bin's lid is value the lineup leaves off. Copy explains what to
look at, not how the page was built.

## World

A flat page in two themes, following `prefers-color-scheme`. Light is a cool case ground
(`case-000`) with white panels (`case-100`) edged in hairlines; dark uses only the approved dark
surfaces (`#181818`, `#1F1F1F`, `#272727`, `#313131`). Backgrounds are never gradients. The one
gradient anywhere is on page-title text: black to `#666666` in light, white to `#9B9B9B` in dark.

| Token | Use |
| --- | --- |
| `case-000` · `case-100` · `case-200` | Page ground · panels · sunken surfaces (table heads, tracks) |
| `case-300` · `case-400` | Hairlines and dividers · control borders (3:1) |
| `ink` · `ink-muted` | Text · secondary text, axes, sources (4.5:1 on every case surface, both themes) |
| `ink-faint` | Large text in a transient state only (the tagline before it fills); 3:1, never body copy |
| `turf` · `on-turf` · `turf-soft` | The one accent: primary action, links, current state · text on it · hover ground |
| `focus` · `focus-inverse` | The 2px focus ring, offset 2px · the ring on foam |
| `foam` · `foam-deep` · `foam-edge` · `on-foam` | The case object, dark in both themes · recesses · cutout lips (3:1) · text on foam |
| `grade-snug` · `grade-fits` · `grade-loose` | Fit grades on panels; `-on-foam` variants inside the case |
| `unknown` | Missing values and ungraded pieces; never shown as zero |

## Data colour

Piece halves use seven discrete steps from `split-cold-3` to `split-warm-3`, cold blue below the
league line for that pitcher hand, a neutral grey at it, warm brass above, saturating at ±.150 OPS
in steps of .043 (`SPLIT_STEPS` in `src/lib/app/shape-case.ts`). The axis separates by lightness
as well as hue, so it reads for colour-blind viewers. It is a **rating**, which inverts the
original framework's rule that colour carries role; every legend says so. Text drawn over a piece
carries a 3px halo in the panel colour, since it straddles two fills.

## Type

- **Geist** for everything read; **Geist Mono** for everything counted, with tabular figures.
  Self-hosted through Fontsource; the app makes no third-party font request.
- Every size is a Tailwind step with its own line height (12/16 up to 96/1), set through
  `--text-*` and `--text-*--lh`. Line heights are Tailwind's unitless ratios, so line boxes grow
  with the reader's text size. No italics; nothing above weight 600; Geist Mono loads 400, 500 and
  600, so no weight is synthesised.
- Page titles use `.page-title`: `text-5xl`, `text-4xl` at phone width, capped at 680px.

## Space, shape, motion

- Spacing only from 0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96px (`--spacing-*`).
- Corners: `--radius-sm` 2px, `--radius-md` 4px, `--radius-full` for the nav and thumbs.
- Borders, not shadows; `--shadow-pop` only for the floating nav and popovers.
- One curve, `cubic-bezier(0.22,1,0.36,1)`: 500ms movement, 300ms colour. Only transform and
  opacity animate. Section containers rise and fade in once on scroll (`src/lib/app/reveal.ts`);
  numbers, pieces and bars never move while being read; a script failure leaves everything visible.
  Reduced motion swaps movement for a fade.

## Components

- `app/AppShell`: the floating nav (content-sized, translucent, blurred), the phone menu (full
  height, links arriving 60ms apart), and the site footer — the one `contentinfo` landmark, carrying
  the Taylor Wyman credit (D-61) and the privacy, terms and source links.
- `app/OverviewPage`: `/`, with the current decision's board as the hero (`WymanBoard fit`).
- `app/TaglineReveal`: the overview's large tagline; words start in `ink-faint`, the lowest opaque
  tone that keeps the transient state at 3:1 for large text in both themes.
- `app/DecisionNav`: Board · Diagrams · Snapshots · Workspace, plus the Diagram tab row.
- `app/MethodPage`, `app/ProsePage`, `app/CompareGate`: how to read it; plain pages; the workspace's
  acknowledgment.
- `diagrams/SplitLegend`: the seven-step axis and its rating note.
- `diagrams/WymanBoard`, `RosterDiagram`, `JevCall`, `ShapeCase`, `InteractionMap`, `CapacityBin`,
  `SlotBars`, `Piece`, `PieceDetail`, `Findings`, `CaseTable`, `ui/ShapeGlyph`: as before (D-43,
  D-50, D-57), restyled onto the tokens. `JevCall` folds its state table away at phone width while
  keeping D-60's order.
- `ui/Icon`: Phosphor icons (regular), path data only.

## Rules

- Headings stand alone: no eyebrow or kicker labels above them. The decision page's "Decision 6 of
  8" line is navigation, with links to the previous and next decisions.
- Borders go all the way round or not at all; no coloured side stripes on a card.
- Touch targets are at least 44px; focus is the 2px `focus` ring.
- Links in running text keep an underline: colour alone cannot mark them.
- Every diagram has a text equivalent: labelled piece buttons, `role="img"` labels with the stats,
  per-piece titles, and the case table.
- The page never scrolls sideways at 320px or wider; wide tables and diagrams scroll inside their
  own container, and auto-fit grids use `minmax(min(Xrem, 100%), 1fr)`.
- Engine numbers and display-layer numbers are always labelled apart: "Pinned 10-game engine
  total" versus "actual 2026 (display layer)".
- Every route passes the full axe rule set in both themes (`tests/e2e/accessibility-full.spec.ts`).
