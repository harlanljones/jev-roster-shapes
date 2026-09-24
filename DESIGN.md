# Design

The visual system for Roster Shapes after the Shape Case redesign (D-43). The
source of truth for tokens is `:root` in `src/lib/app/AppShell.svelte`.

## Idea

The roster is a fitted equipment case. Each lineup slot is a foam cutout cut to
the shape it asks for; each player is a piece in their rubric shape, sized by
the runs they produced. A snug piece fills its cutout; visible foam is friction;
an empty cutout is a position nobody on the bench covers; headroom under the
bin's lid is value the lineup leaves off. Every screen reads from that one
metaphor, and the diagrams carry the argument. Copy explains what to look at,
not how the page was built.

## World

One world for the whole app: a light, cool steel magnet board with a faint blue
grid, white panels pinned to it, and the dark foam case as the physical object
on the board. The case is the only dark surface. There is no dark theme; the
board is the page.

| Token | Value | Use |
| --- | --- | --- |
| `--board` | `#dde3e8` | Page background, under a 32px grid at 7% marker blue |
| `--panel` | `#fbfcfd` | Panels, trays, bins, cards |
| `--ink` | `#16202a` | Text, primary buttons, selected states |
| `--ink-soft` | `#4a5663` | Secondary text (≥4.5:1 on board and panel) |
| `--rule` | `#c5ced6` | Borders and dividers |
| `--marker` | `#1e4fa8` | Focus rings, links, DH lane, the tightest-fit frame |
| `--accent` | `#c8323a` | Tested swaps, retrospective banner |
| `--snug` / `--fits` / `--loose` | `#23794a` / `#8a5e0e` / `#b3261e` | Fit grades on light surfaces |
| foam / shell | `#2c312f` / `#191d1c` | The case only; grades there use `#7fd39f` / `#f0c56b` / `#ff8a7a` |

Earlier token names (`--paper`, `--rust`, `--sage`, `--navy`, …) are aliased in
`AppShell` so the workspace panels in `src/lib/ui` take the new look without
per-panel rewrites.

## Data color

Piece halves use a Savant-style diverging ramp against the league line for that
pitcher hand: blue below, gray at league average, red above, saturating at
±.150 OPS. The ramp is the only saturated color on data; the chrome stays
neutral so the pieces carry the color. Missing data is a hatched, dashed
outline, never a filled shape and never zero.

## Type

- Display: Saira Stencil One (stenciled equipment-case lettering) for the
  wordmark, page and section headings, and case labels.
- Body: IBM Plex Sans 400/600.
- Numbers and labels: IBM Plex Mono 400/500/600 with tabular figures.

All three are self-hosted through Fontsource (latin subsets); the app makes no
third-party font requests.

## Components

- `diagrams/ShapeCase`: the case (1000×980 viewBox), selectable pieces with
  labeled buttons, bench tray, empty cutouts.
- `diagrams/InteractionMap`: fixed-position pool map with layer toggles.
- `diagrams/CapacityBin`: one lineup packed into the pool's bin.
- `diagrams/SlotBars`: bars by slot and pitcher hand with league lines.
- `diagrams/Piece`: the shared piece (split halves, tabs, missing state).
- `diagrams/PieceDetail`: the tag on the selected piece.
- `diagrams/Findings`: three reads under a diagram (empty space, fits,
  friction), each with a full top rule in its tone.
- `diagrams/CaseTable`: the case as a table.
- `ui/ShapeGlyph`: equal-area glyphs from the same geometry.

## Rules

- Headings stand alone: no eyebrow or kicker labels above them.
- No colored side stripes; callouts use a full 1px border.
- Touch targets are at least 44px; focus is a 3px marker-blue ring.
- Every diagram has a text equivalent: labeled piece buttons, `role="img"`
  labels with the stats, per-piece titles, and the case table.
- Layout collapses to one column below 1100px (landing trays, workspace case)
  and the bins stack below 560px; the page never scrolls sideways (wide tables
  scroll inside their own container).
- Engine numbers and display-layer numbers are always labeled apart:
  "Pinned 10-game engine total" versus "actual 2026 (display layer)".
