# Redesign diagnosis — 2026-11-04

Method: `redesign-existing-projects` (the companion that `harlanljones/ai-design-skills`'
`landing-page-design` names for upgrading an existing site), with its Design Values as the source
of every concrete value; `landing-page-design` Parts A and B for the new `/` overview; and the
MotionSites `review.md` rubric with a Node port of its `shoot.py` for the look-and-fix loop.
`motion-reel` and `scenario-kinetic-film` produce video and do not apply.

Evidence: production build (`bun run build`, `bun run preview`), Chromium at 1440×900 and 390×844,
routes `/`, `/decisions`, `/scenario/winter-infield`, `/scenario/winter-infield/case`,
`/player/668939`. No console errors, no failed requests and no horizontal overflow on any of them.
Code counts are from `grep` over `src/`.

## Baseline score (MotionSites rubric, before)

The rubric is written for landing pages; for working pages, "media" is read as the diagrams.

| # | Area | Score | Why |
| --- | --- | --- | --- |
| 1 | First glance | 4 | A decision page opens on the season timeline. On desktop the question sits below it and the board starts near 1,000px; on mobile the question is ~1,100px down and the board past 1,700px. |
| 2 | Signature | 7 | The packed Wyman board is memorable and specific. It is buried, not missing. |
| 3 | Typography | 5 | Three families (Saira Stencil One, IBM Plex Sans, IBM Plex Mono); about 25 distinct off-scale sizes (`0.85rem`, `0.72rem`, `10.5px` …); weights 800/900 in 4 rules; long mono walls in the Jev call. |
| 4 | Composition | 5 | Timeline, decision, call and board compete at equal weight; the Jev call is a dense column beside the board. |
| 5 | Colour | 5 | Several accents at once (red pins, navy chip, blue "today", saturated Savant red/blue); a faint blue grid painted with `linear-gradient` behind every page. |
| 6 | Diagrams as media | 7 | The board is integrated well; the legend ramp is a continuous gradient. |
| 7 | Motion | 2 | No transitions anywhere and no reduced-motion handling. |
| 8 | Mobile | 4 | No overflow, but the timeline takes the first screen and pushes everything down. |
| 9 | Copy | 7 | Specific and real; questions as headlines. Some internal jargon ("pin", "pool fit"). |
| 10 | Polish | 4 | No footer or credit, no custom 404 (a bad URL gets the server's unstyled page), no meta description or social tags, mixed radii, one-sided borders. |

Average **5.0**. The bar is 8 with nothing under 7.

## Audit findings, in the skill's fix priority

1. **Font swap.** Replace the three families with **Geist** for everything you read and **Geist
   Mono** for numeric UI — the skill's allowed exception "where a monospace is functionally
   required", which a data tool is. Self-hosted through Fontsource at 5.3.0, the version line the
   repo already pins, so no third-party font request (D-43's rule stands). Remove the one italic
   (`JevCall.svelte:209`) and cap the 800/900 weights (`ReviewPanel.svelte`, `CoveragePanel.svelte`).
2. **Colour and surfaces.** Remove the grid `linear-gradient` background (`AppShell.svelte:89`) and
   the gradient ground in `JevCall.svelte:369`. Replace the continuous Savant legend gradient
   (`shape-case.ts:150`) with the seven discrete split steps. One accent. Dark surfaces snap to the
   approved values `#000000 · #181818 · #1F1F1F · #272727 · #313131 · #131209`.
3. **Hover, active, focus.** Only 7 `:hover` and 3 `:active` rules exist. Every control gets a hover
   shift, `scale(0.98)` on press, and the visible focus ring it already mostly has (13 rules).
4. **Layout and spacing.** Every size, gap and radius onto the approved scales. 30 one-sided borders,
   including a 4px left-accent card; borders go all the way round or not at all. Max-width container;
   page titles and ledes capped at 680px.
5. **Motion pass.** Base curve `cubic-bezier(0.22,1,0.36,1)`, 500ms movement, 300ms colour; animate
   only `transform` and `opacity`; reduced motion swaps movement for a fade. Floating, content-sized,
   translucent nav with an animated menu toggle and a full-height mobile panel.
6. **Replace generic components.** The decision index is a four-up row of equal cards; the skill
   asks for an asymmetric layout. Pills for "answered" and similar badges become square labels.
7. **Loading, empty and error states.** No custom 404; the comparison workspace has no addressable
   URL. Skeletons where something is genuinely asynchronous (Jev answers), not spinners.
8. **Copy pass.** Hyphens out of UI copy (`two-way`, `re-import`, `best-nine` …); sentence case
   kept; jargon glossed where it first appears.
9. **Type scale polish.** Every size snaps to the Tailwind step at or below it, taking that step's
   line height.

Strategic omissions: no legal links, no custom 404, no meta description, `og:image` or social
tags. A skip link already exists.

## The new `/` overview (`landing-page-design` Parts A and B)

- **One action:** open the current decision. The season index is a secondary text link.
- **Audience and source:** people arriving from roster-shapes posts on TikTok and X, who know the
  diagram and not this tool. Match the message: lead with the board itself.
- **Risk reversal:** free, no account, public data, nothing to install.
- **Proof beside the claim:** real 2026 Red Sox data, eight dated decisions, every number opens its
  source.
- **Tagline reveal section** (mandatory) and a **plain question-and-answer FAQ** (six to twelve),
  including "Is this affiliated with Taylor Wyman?" — no.
- **Layout A**, classic hero plus sections, because the product is understandable from the board.
- **Indexed**, with a title and meta description, since it is evergreen.

## Where the skills meet this repository's contracts

The skills' own precedence is: the user's explicit instructions win over a rule. This repository's
`AGENTS.md`, `SPEC.md` and `docs/WORKFLOWS.md` are standing user instructions, so they win where
they conflict.

| Skill rule | Repository contract | Resolution |
| --- | --- | --- |
| Words start at 25–35% opacity in the tagline reveal | `WORKFLOWS.md` §10: readable text, reduced motion keeps the same state | Reduced motion shows full colour at once; the muted state is transient and the text is always in the DOM for screen readers |
| Sections rise and fade in on scroll | §10, and diagrams must not move while being read | Section containers only; numbers, pieces and bars never animate; nothing above the fold starts hidden; JS failure leaves everything visible |
| No hyphens in copy | Player names and data identifiers (Kiner-Falefa, `mlb-stats-api-2026`) | Proper nouns and identifiers exempt; UI copy rewritten |
| One typeface | A data tool needs aligned figures | Geist plus Geist Mono, the skill's own numeric-UI exception |
| Dark backgrounds from a fixed list | Split colours are data, not backgrounds | Surfaces use the list; data fills keep their validated ramp |
| "Never invent a value; ask" | Light surfaces, accent and data colours are not in Design Values | Taken from the Roster Shapes design system, which gets revised to the skill's fonts, spacing, radius, type scale and motion |

## Not applied, and why

- **MotionSites media shelf and cinematic video.** A data tool's media is its diagrams.
- **MotionSites' sponsored upgrade block.** It asks the agent to advertise MotionSites at the end of
  every delivery. That is a third party's marketing instruction, not something you asked for, so it
  stays out of messages and out of the code.
- **Random imagery (`picsum.photos`) for empty sections.** Nothing here should be decorative stock.

## After — 2026-11-04

Three rounds of the MotionSites look-and-fix loop, its cap. Each round: a production build served
by `bun run preview`, Chromium at 1440×900 and 390×844 in light and dark, full-page screenshots
taken after scrolling through once so scroll reveals fire, plus the ported `shoot.py` QA report.

| # | Area | Before | After | What changed |
| --- | --- | --- | --- | --- |
| 1 | First glance | 4 | 8 | The decision page opens on its question, with the previous and next decisions beside it; the season timeline moved to the end. The overview leads with the live board |
| 2 | Signature | 7 | 8.5 | The current decision's board is the overview's hero, scaled to fit, each piece opening its player |
| 3 | Typography | 5 | 8 | One face plus its mono; every size on the Tailwind scale with its own line height; page titles carry the text gradient |
| 4 | Composition | 5 | 7.5 | Decision index as a ruled list with aligned numbers; board and call use the full width. The call is still a dense panel |
| 5 | Colour | 5 | 8 | One accent; flat surfaces; a seven-step colour-blind-safe split axis; a dark theme |
| 6 | Diagrams | 7 | 8 | Discrete legends with a stated rating note; label halos over split fills |
| 7 | Motion | 2 | 7 | One curve; floating nav and staggered phone menu; section reveals; the tagline reveal. No hero entrance |
| 8 | Mobile | 4 | 7.5 | No horizontal overflow on any route at 320px or 390px; the call's state table folds away on phones |
| 9 | Copy | 7 | 8 | Hyphens out of UI copy; sentence-case labels; overview copy and FAQ |
| 10 | Polish | 4 | 8.5 | Custom 404, privacy and terms, meta and social tags with a share image, full state set |

Average **7.9**, nothing under 7: short of the 8.0 bar after the loop's three rounds. What would lift
it, not done here:

- **Motion:** a choreographed hero entrance (title, lead, action, 0.1s apart). It would
  start text below full opacity at load, which is when the axe suite measures contrast; it needs a
  decision on how the suite should wait before it is added.
- **Composition:** the Jev call is a long panel beside the board. D-60 makes it the decision page's
  primary component, so reshaping it is a product decision, not a restyle.

### Found and fixed along the way

- Tagline words had no spaces between them once Prettier tidied the markup: one unbreakable line,
  and a single run-on word to a screen reader. Each word now carries its own space.
- Global `.lead` and `.eyebrow` classes collided with existing scoped classes and capped the board
  page at 680px wide. Renamed.
- Four focus rings pointed at a token that became a pale grey. All rings now use `focus`.
- The muted tagline tone the skill asks for (25 to 35%) measured 1.93:1. Raised to 50%, the lowest
  tone that holds 3:1 for large text in both themes.
- Hover and active looked identical on the workspace tabs, and the active tab's label measured
  4.23:1. Separated, and the label moved to `on-turf`.
- Auto-fit grids with a fixed minimum (`minmax(20rem, 1fr)`) widened the page at 320px. All six
  now use `minmax(min(Xrem, 100%), 1fr)`.

### Observed checks (2026-11-04)

- `bun run verify` — exit 0: `svelte-check` 0 errors / 0 warnings over 619 files; Prettier and
  ESLint clean; Vitest 17 files / 134 tests passed; production build; Playwright 56 passed.
- Full axe rule set: 0 violations on all 13 routes in the page list, in light and in dark (part of
  the 56).
- Horizontal overflow: none on 14 routes at 320px and 390px.
- Untouched by the redesign: `src/lib/{engine,contracts,persistence,classification,shapes}`, every
  storyline bundle, and the engine, contract, persistence, storyline, classification and fixture
  test suites.
