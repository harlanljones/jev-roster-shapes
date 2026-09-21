# RS-08 Pilot Readiness Gate

**Status:** Blocked. This record is a checklist for the real pilot, not evidence
that team access, staffing, or approval exists.

RS-08 is the next roadmap milestone after the completed synthetic/public demo.
The local application and public Cloudflare demo can continue independently while
these external prerequisites are unresolved.

## Required Evidence

| Gate | Required record | Status | Owner |
| --- | --- | --- | --- |
| Data permission | Approved roster, eligibility, availability, projection, and optional scouting sources; rights and update cadence | Not supplied | Data owner |
| Units and definitions | Common metric units, planning horizon, PA methodology, defensive workload, eligibility threshold, and missing-data policy | Not approved | Analytics lead |
| Data handling | Fields permitted to leave the team environment, provider terms, retention, deletion, and access controls | Not approved | Data owner |
| Staffing | Named pilot/product, engineering, analytics, evaluator, and data owners with available time | Not assigned | Pilot lead |
| Evaluation baseline | Current workflow timing and quality baseline, matched cases, counterbalanced order, and scoring rubric | Not recorded | Pilot lead |
| Evaluation protocol | Sample-size rationale, failure/timeout handling, analysis rules, and uncertainty reporting | Not frozen | Pilot lead |
| Deployment controls | Identity system, roles, persistence, backups, retention, incident ownership, and environment approval | Not approved | Engineering/data owner |

## Exit Criteria

RS-08 can close only when each row has an owner, a dated source or decision
record, and an explicit approval status. A prose plan without those records does
not authorize team-data ingestion or a team deployment.

Until then:

- Keep the public demo labeled as observed public values, not team-approved projections.
- Keep restricted bundles blocked by the application.
- Keep synthetic and public fixtures separate from any future team adapter.
- Do not send proprietary data to an external model provider.
- Treat the browser's local saves as demo persistence, not a team backup.

## Next Handoff

When the data owner and pilot lead provide the missing records, create a scoped
team-data adapter task that maps the approved sources into schema `1.0`, adds
fixture-level validation for each source, and reruns the calculation, replay,
traceability, and failure gates before opening any restricted bundle.
