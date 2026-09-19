# Development instructions

Build a reproducible position-player acquisition comparison: one baseline and two candidates under shared assumptions. Preserve the distinction between source evidence, assumptions/judgments, and calculated effects. Synthetic prototype implementation may proceed; team data, external model processing, and deployment require their specific prerequisites.

## Read before changing a component

- For every implementation task, read `SPEC.md` and its task in `ROADMAP.md`.
- For calculations, eligibility, workloads, or feasibility, read `docs/DOMAIN_AND_CALCULATIONS.md`.
- For schemas, imports, persistence, exports, or versioning, read `docs/DATA_CONTRACT.md`.
- For screens, interaction, accessibility, or visible failure states, read `docs/WORKFLOWS.md`.
- For tests, performance measurement, or completion claims, read `docs/ACCEPTANCE.md`.
- For a design choice or an unresolved dependency, read `docs/DECISIONS.md`; record material implementation choices there before building against them.

`SPEC.md` defines product scope; the focused documents define the prototype contract within that scope. Resolve contradictions explicitly before implementing affected behavior. Follow the user's current instructions and scoped repository instructions; document a deliberate contract revision in the same change as its implementation.

## Implementation boundaries

- Keep data validation, deterministic calculations, rendering, persistence, and optional classification in separate components. Layout and model responses cannot change quantitative results.
- Use explicit units, stable IDs, input versions, and provenance. Preserve missing values; suppress unsupported totals and deltas instead of replacing missing projections with zero.
- Allow incomplete saved drafts; derive feasibility and review readiness from the documented checks. A lineup allocation is not proof that a transaction is legally executable.
- Keep synthetic fixtures visibly labeled and separate from permitted team data. External processing and deployment remain separate decisions; continue unaffected local work while those decisions are unresolved.
- Preserve replay inputs and calculation version. A saved result must be reproducible without a future provider response.

## Work and evidence

No application scripts or implementation stack were established at this handoff. Bootstrap through `RS-01`; use the resulting manifest and README for actual commands. Do not report planned commands as executed checks.

Run checks appropriate to the changed behavior and the acceptance document. Before completion, record the commands actually run, results, relevant fixture or scenario IDs, and any untested boundary. Run `git diff --check` for documentation edits. Every correctness or performance claim needs observed evidence; proposed targets and synthetic demonstrations are not pilot outcomes.

When development work is delegated by the user or orchestrator:

1. Assign each task an ID, dependencies, and one writer for each file/component. Freeze shared contracts before independent implementation.
2. Run only dependency-ready, non-overlapping work concurrently. Route shared schema, fixture, and documentation changes through their current owner.
3. Integrate in dependency order and rerun relevant cross-component checks. A component passing in isolation does not close its integration gate.
4. Report task status, outcome delivered, validation evidence, and remaining blockers. Include correctness, reproducibility, reliability, performance, data handling, and model cost evidence when affected; keep pilot usefulness claims separate.

<!-- codebase-memory-mcp:start -->
# Codebase Memory

## Codebase Knowledge Graph (codebase-memory-mcp)

This project uses codebase-memory-mcp to maintain a knowledge graph of the codebase.
ALWAYS prefer MCP graph tools over grep/glob/file-search for code discovery.

### Priority Order
1. `search_graph` — find functions, classes, routes, variables by pattern
2. `trace_path` — trace who calls a function or what it calls
3. `get_code_snippet` — read specific function/class source code
4. `check_index_coverage` — validate candidate paths and missed ranges before claims
5. `query_graph` — run Cypher queries for complex patterns
6. `get_architecture` — high-level project summary

### Evidence tiers
- **Scout (Tier 1):** quick positive lookup with few calls and targeted source checks. Mark it provisional; do not make negative or exhaustive claims.
- **Verify (Tier 2, default):** task-directed graph evidence, relevant trace directions, exact snippets for material claims, and relevant pagination.
- **Auditor (Tier 3):** bounded-scope full verification with current generation, complete relevant pagination, both call directions and broader relationships when material, and every limitation disclosed.
- After candidate paths are known in any tier, call `check_index_coverage` once with every evidence path. Add relevant scopes for negative or exhaustive claims. A clean result means no recorded gap, not proof of completeness. For partial, skipped, excluded, stale, pending, or unknown coverage, read/grep the reported ranges or scope before relying on graph results.

### When to fall back to grep/glob
- Searching for string literals, error messages, config values
- Searching non-code files (Dockerfiles, shell scripts, configs)
- When MCP tools return insufficient results

### Examples
- Find a handler: `search_graph(name_pattern=".*OrderHandler.*")`
- Who calls it: `trace_path(function_name="OrderHandler", direction="inbound")`
- Read source: `get_code_snippet(qualified_name="pkg/orders.OrderHandler")`

### Session resets and subagents
- At session start or after compaction, confirm the nearest graph project and generation with `list_projects` or `index_status`, then choose Scout, Verify, or Auditor.
- Before spawning a subagent, query the graph and coverage in the parent. Pass the tier, project, generation/freshness, bounded scope, queries and pagination state, qualified symbols, paths, call-chain findings, coverage evidence with ranges/reasons, source fallback already performed, and unresolved questions in the delegated task context.
- Do not assume subagents inherit MCP access or the parent conversation. If a child lacks MCP tools, it must not call or claim MCP access. It should use the supplied evidence and read/grep exact source, especially every reported missed-coverage range.
<!-- codebase-memory-mcp:end -->
