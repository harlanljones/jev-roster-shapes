# Decisions and unresolved dependencies

This register distinguishes implementation defaults from external commitments. Defaults below are selected for an immediately buildable synthetic prototype. They may be revised with a documented reason and updated contracts/fixtures. Unresolved pilot decisions block only their dependent work.

## Adopted prototype defaults

| ID | Decision | Reason and consequence |
| --- | --- | --- |
| D-01 | Build a local synthetic prototype first | No team data, partnership, staffing, or deployment has been established. Synthetic work can proceed now. |
| D-02 | Use full-game templates and one player per batting/defensive-role slot | Makes simultaneous assignments and opportunity conservation explicit. Substitutions and pitcher batting require another model version. |
| D-03 | Represent defense in integer outs, PA as explicit integer projected counts | Prevents innings-notation errors and hidden opportunity creation. Fractional expected PA require a future contract revision. |
| D-04 | Use one overall/split mode and metric basis per comparison | Prevents incompatible deltas. Starter hand is metadata; exposure is separately supplied. |
| D-05 | Make taxonomy/classification optional | A readable comparison is independently valuable; a failed classification experiment must not block it. Initial profiles may be unclassified. |
| D-06 | Use explicit local saves and portable versioned JSON bundles | Supports drafts and replay with a small prototype. Browser storage is not a team deployment or backup plan. |
| D-07 | Default scaffold to TypeScript, React, and Vite | Fits a browser prototype with shared types and isolated pure calculations. RS-01 must record versions, package manager, tests, and actual verified commands; these dependencies are not installed yet. |
| D-08 | Keep calculations, persistence, UI, and provider adapters separate | Enables bounded agent ownership and numerical tests independent of rendering/network state. |
| D-09 | Select coverage-only or coverage-and-offense review scope explicitly | Missing projections do not invalidate known coverage; they do prohibit unsupported full value comparisons. |
| D-10 | Show neutral/unclassified profiles until a rubric and color scale are defined | Avoids inventing baseball judgments for a visually polished demo. Use real quantities and labeled synthetic values. |

## Open decisions

Owner roles are responsibilities to assign, not named commitments. `TBD` is an unresolved external fact, not permission to fabricate a default for the real pilot.

| ID | Question / required evidence | Role | Blocks | Safe work meanwhile |
| --- | --- | --- | --- | --- |
| O-01 | Which approved projection and eligibility sources, units, rights, and update cadence? | Data/analytics lead | Team ingestion and source mappings | Fixture contracts and synthetic engine |
| O-02 | Which planning horizon, PA methodology, caps, and opponent exposure assumptions reflect the actual decision? | Baseball evaluator | Real scenario conclusions | Explicit synthetic assumptions |
| O-03 | Does the eight-shape taxonomy have usable definitions and agreement? | Evaluator lead | Shape rubric adoption | Neutral profile display and measured allocation |
| O-04 | Is provider processing permitted for each input field; what are retention and access requirements? | Data owner | Proprietary provider requests | Adapter interface or public/synthetic evaluation |
| O-05 | Which environment, identity system, access roles, persistence, retention, and backups support team use? | Engineering/data owner | Shared deployment | Local synthetic prototype |
| O-06 | Who supplies evaluation time and scoring; what sample size and failure policy? | Pilot lead | Outcome study and efficacy claims | Usability rehearsal and instruments |
| O-07 | What constitutes an acceptable classification error, review burden, latency, and cost? | Analytics/model lead | Model adoption | Exploratory results labeled as such |
| O-08 | Which cost period and roster constraints should the first decision actually enforce? | Baseball/analytics lead | Real cost/transaction interpretation | Disabled checks labeled unchecked |

## Change protocol

For a material implementation choice, append its ID, status, owner/task, rationale, affected contracts, and validation evidence before dependent work. A contract revision changes the schema/calculation version when old records would otherwise be interpreted differently. Preserve old fixtures and provide an explicit migration plan.

A local UI arrangement or library choice within the frozen interfaces can be resolved by its component owner. Changes to projection meaning, workload arithmetic, readiness, or permissions require the corresponding domain or data owner; continue independent tasks rather than halting the entire prototype.

## Handoff readiness

Development may start with RS-01. The architecture default and synthetic modeling assumptions are defined; no app scaffold, deployment, calibration, or user study is claimed complete. The first development report should establish actual commands and component ownership, then run RS-02 against the supplied golden fixture.
