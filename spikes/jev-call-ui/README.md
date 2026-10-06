# Jev call UI directions (mockups)

Throwaway mockups, before any app code, for one screen that shows both the
roster diagram and the Jev call: its questions, each question's type
(`choice` / `noul`), instructions, and criteria.

Open `mockups.html` in a browser. It is self-contained apart from Google Fonts.

- **A. Tag on the piece**: the D-50 board stays the one diagram; selecting a
  piece hangs the call on it (state, both questions, every criterion with
  Jev / rule / analyst marks).
- **B. Call sheet**: the call is the main object, editable question by
  question, then run across the roster as an agreement grid with a small board.
- **C. Criteria lanes**: the nine profile criteria become lanes and pieces sit
  in the lane their source chose; a Jev / rule / analyst toggle moves them.

Data: players, slots, splits, analyst labels, and rule-baseline labels are the
real `wild-card-roster` bundle (2026-09-27) and `rule-baseline-v1`; the request
text matches `buildProfileRequest`. **Jev probabilities and evidence scores are
invented for layout.** No provider call was made, and nothing here touches the
engine or a bundle.
