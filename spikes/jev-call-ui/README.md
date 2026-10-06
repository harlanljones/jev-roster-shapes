# Jev call UI layouts (mockups)

Throwaway mockups, before any app code, for screens that show both the roster
diagram and the Jev call: its questions, each question's type
(`choice` / `noul`), instructions, and criteria.

Open `mockups.html` in a browser. It is self-contained apart from Google Fonts.

Both are primary components on every layout, built once and composed three
ways:

- `<RosterDiagram>`: `mode` (`packed` board or `lanes` by criterion),
  `source` (`analyst` / `rule` / `jev`), `highlight` (`disagreements`),
  `selected`, `thinEvidence`.
- `<JevCall>`: `request`, `response`, `compare` (rule and analyst marks),
  `orientation` (`vertical` / `horizontal`), `editable`.

Layouts:

- **A. Side by side**: packed board and a vertical call in equal halves.
- **B. Call over board**: a horizontal, editable call across the top and a
  full-width board below with disagreements ringed.
- **C. Lanes and call**: the diagram in lanes mode beside a vertical call.

Data: players, slots, splits, analyst labels, and rule-baseline labels are the
real `wild-card-roster` bundle (2026-09-27) and `rule-baseline-v1`; the request
text matches `buildProfileRequest`. **Jev probabilities and evidence scores are
invented for layout.** No provider call was made, and nothing here touches the
engine or a bundle.
