# Frontend stack options, September 2026

Research input for the RS-01 stack decision (revisits D-07). Question: which UI framework and toolchain should the local synthetic prototype use, counting newer and experimental options?

Retrieved 2026-09-19. Versions, dist-tags, and publish dates come from the npm registry (`npm view <pkg> dist-tags|time`) and the crates.io API unless another source is cited. Project-status claims come from first-party pages. Where a first-party page could not be fetched, the claim is marked **unverified**. The assessment section is analysis, not a source claim.

## What the stack must support

From [SPEC](../../SPEC.md) §5–§9, [WORKFLOWS](../WORKFLOWS.md) §6–§10, [ACCEPTANCE](../ACCEPTANCE.md) §4, and [DECISIONS](../DECISIONS.md) D-07/D-08:

- Contracts and a pure deterministic engine whose types are shared with the UI.
- Keyboard-complete tables, player selectors, Move/Swap controls, dialogs that restore focus, and result announcements that do not move focus.
- A proposed p95 ≤ 250 ms from committed edit to rendered quantitative diff.
- Local-only operation: no server, SSR, hosting, or authentication (O-05 remains open).
- Development split across agents with exclusive component ownership.

The golden workload is ten members, two templates, and nine slots. Any framework below can render it far inside the latency target, so rendering speed does not separate the candidates. Accessible primitives, testing, TypeScript tooling, stability, and agent familiarity do.

## UI frameworks

| Framework | Stable line | Pre-release line | Status | Accessible primitives | Component testing | Type-checking path |
| --- | --- | --- | --- | --- | --- | --- |
| React | 19.3.0 (2026-09-09); React Compiler 1.0.0 (2025-10-07) | canary | Stable. Compiler "fully production-ready" [R1] | react-aria-components 1.21.1; @ark-ui/react 5.39.2 | @testing-library/react 16.3.3 | Plain TSX, so `tsc` 7 works |
| Svelte | 5.57.1 (5.0.0 on 2024-10-19) | @sveltejs/kit 3.0.0-next.27 | Stable | bits-ui 2.19.2; @ark-ui/svelte 5.24.2 | @testing-library/svelte 5.4.2 | `svelte-check` 4.7.6 peers `typescript ^5 \|\| ^6`, so type checking stays on TS 6 |
| Vue | 3.5.43 | 3.6.0-rc.9 (Vapor mode; 3.6.0-alpha.1 on 2025-07-12) | 3.6 and Vapor are still release candidates: npm `latest` is 3.5.43. Several secondary blogs wrongly report 3.6 as released. | @ark-ui/vue 5.39.2 | @testing-library/vue 8.1.0 (2024-05) | `vue-tsc` 3.3.11 is built on the TypeScript JS API, which TS 7.0 does not ship (inference, not run) |
| Solid | 1.9.15 | 2.0.0-rc.9 (2.0.0-experimental.0 on 2025-02-13) | 2.0 is a release candidate. The team's RC announcement describes first-class async and a rebuilt reactive core [S1] | @kobalte/core 0.13.14 (2.0 in alpha); @ark-ui/solid 5.39.2 | @solidjs/testing-library 0.8.10 (2024-09); 1.0.0-beta.3 for Solid 2 | Plain TSX, so `tsc` 7 works |
| Angular | 22.1.7 (22.0.0 on 2026-06-03) | 22.2.0-rc.0 | Stable; signal-first; new apps zoneless with OnPush. Official blog returned HTTP 403, so feature claims are **unverified** [A1] | @angular/aria 22.1.7, @angular/cdk 22.1.7 | Angular testing utilities | Angular compiler; TS 7 compatibility **unverified** |
| Preact + Signals | 10.29.8; @preact/signals 2.11.2 | 11.0.0-rc.2 | 10 stable, 11 in release candidacy | React libraries through `preact/compat` (**unverified** for React Aria) | @testing-library/preact 3.2.4 (2024-05) | Plain TSX, so `tsc` 7 works |
| Lit | 3.3.3 (2026-05-14) | — | Stable web components | None first-party | Real-browser runners (e.g. Vitest Browser Mode) | Plain TS, so `tsc` 7 works |
| Marko | 6.3.51 (6.0.0 on 2025-04-11) | — | Stable; streaming/SSR-oriented | None | — | Marko language tools |
| Qwik | 1.20.0 | @qwik.dev/core 2.0.0-beta.43 | 2.0 still beta [Q1]; resumability targets server rendering | — | — | — |
| Remix 3 | `remix` 2.17.5 is the older React-based line | 3.0.0-rc.3 | RC published 2026-08-31, stable planned for October 2 at Remix Jam. Own UI runtime; full-stack, with SPA support [X1] | Built-in components | — | — |
| Ripple | — | 0.4.6 (0.4.0–0.4.6 published 2026-09-15 to 09-18) | Pre-1.0 TypeScript-first framework with `.tsrx` files and fine-grained `track()` reactivity. The README makes no stability claim [P1]; the publish cadence shows active churn | None | None documented | TSRX editor extension; `@ripple-ts/vite-plugin` 0.4.6 |
| Leptos / Dioxus / Yew (Rust to WASM) | 0.8.20 / 0.7.10 / 0.23.0 | 0.9.0-beta / 0.8.0-alpha.1 / — | Pre-1.0 crates | None | Rust tests | Types live in Rust; the JSON contract would need a second implementation or generation |

## Toolchain

- **Package managers.** Bun 1.4.2 is the latest release (2026-09-05); this machine has 1.4.0 via mise. uv 0.12.17 is the latest on PyPI; this machine has 0.12.5. The user directed on 2026-09-19 that Bun and uv, at their newest versions, handle all package management.
- **Bun as a runtime.** Bun 1.4 states that "vitest runs under Bun, including `--coverage`, with the threads and forks pools" [B1]. Bun's built-in fullstack dev server bundles HTML entrypoints with HMR and TS/JSX transpilation. Its documentation calls the feature a work in progress and demonstrates only React [B2]. `bun test` runs DOM tests through happy-dom's global registrator, not a real browser [B3].
- **Vite 8.** Vite 8.0 (2026-03-12) replaces esbuild plus Rollup with Rolldown as its single bundler and requires Node.js 20.19+ or 22.12+. `@vitejs/plugin-react` 6 uses Oxc for React Refresh, so Babel is no longer a dependency [V1]. The current release is 8.3.0. The React Compiler's documented Vite path is a Babel plugin [R1]. With plugin-react 6.1.1 that means installing the optional peers `@rolldown/plugin-babel` and `babel-plugin-react-compiler`.
- **Rsbuild.** 2.2.8 (2.0.0 on 2026-04-22) is the Rspack-based alternative to Vite.
- **TypeScript 7.** 7.0.2 (2026-07-08) is the Go native port. It "does not ship with an API"; the team expects "TypeScript 7.1 to ship with a new (and different) API". New defaults are `strict: true`, `module: esnext`, and `types: []`. `target: es5`, `baseUrl`, and `moduleResolution: node`/`node10` are removed. `--build` is supported. Tools that need the classic API can install TypeScript 6 alongside it through the `@typescript/typescript6` alias [T1]. The `typescript` 7.0.2 package exports only `lib/version.cjs` and `unstable/*` entry points (npm `exports` field).
- **Linting.**
  - typescript-eslint 8.70.0 peers `typescript >=4.8.4 <6.1.0`; native TypeScript 7.1 support exists only as a prototype pull request [E1].
  - Oxlint 1.83.0 has stable type-aware linting through tsgolint v7, which is built on TypeScript 7.0.2 and covers 59 of typescript-eslint's 61 type-aware rules [O1]. Oxlint implements ESLint's `no-restricted-imports`; `import/no-restricted-paths` is not listed [O2].
  - Biome 2.5.14 lints and formats.
- **Formatting.** oxfmt is at 0.68.0 (pre-1.0), alongside Biome 2.5.14 and Prettier 3.9.8.
- **Testing.**
  - Vitest 5.0.0 (2026-09-03) focuses on performance and adds a Trace View to Browser Mode. `clearMocks` now defaults to true, and locators are strict by default. It requires Vite ≥ 6.4 and Node.js ≥ 22.12 [W1]. The current release is 5.0.1.
  - Supporting packages: @vitest/browser-playwright 5.0.1, @playwright/test 1.63.0, axe-core 4.13.0, happy-dom 20.14.5, jsdom 30.1.0.

## Assessment for Roster Shapes

Analysis for the decision, not a source claim.

- **React 19.3.** It has the most complete accessible-primitive library (React Aria Components), mature Testing Library support, TSX that type-checks with TS 7, and the largest body of agent familiarity. The React Compiler is optional here: the workload is tiny, and enabling it brings Babel back into the Vite 8 transform path.
- **Svelte 5.** Stable and concise, but choosing it keeps type checking on TypeScript 6, because `svelte-check` has not adopted 7.
- **Solid 2.** The newest option with a credible path to stability. Fine-grained signals match the "edit, recalculate, update only the diff" loop. The costs are release-candidate churn and thinner accessibility and testing support: the Solid 2 testing library is still beta.
- **Vue 3.6 Vapor.** Still a release candidate, and its type checking likely needs TypeScript 6.
- **Experimental options** (Ripple, Remix 3 RC, Qwik 2 beta, Rust/WASM). They are a weak foundation for a multi-agent prototype whose value depends on correctness and accessibility evidence. Each justifies a time-boxed spike only if evaluating the framework is itself a goal.

Leading candidate: React 19.3 on Vite 8.3 with TypeScript 7.0, Oxlint type-aware linting, Vitest 5, and Bun as package manager. It is the newest stable option at each layer, with no tool pinned to a pre-release. The strongest newer alternative is Solid 2, provided release-candidate risk is acceptable.

## Sources

- [R1] React, "React Compiler v1.0", 2025-10-07: https://react.dev/blog/2025/10/07/react-compiler-1
- [S1] SolidJS on X, Solid 2.0 release-candidate announcement: https://x.com/solid_js/status/2087958309160780182 ; roadmap discussion: https://github.com/solidjs/solid/discussions/2425
- [A1] Angular blog, "Announcing Angular v22" (HTTP 403 when fetched): https://blog.angular.dev/announcing-angular-v22-c52bb83a4664
- [Q1] Qwik releases: https://github.com/QwikDev/qwik/releases
- [X1] Remix, "Remix 3 Release Candidate", 2026-08-31: https://remix.run/blog/remix-3-release-candidate
- [P1] Ripple README: https://github.com/Ripple-TS/ripple
- [B1] Bun, "Bun v1.4", 2026-08-20: https://bun.com/blog/bun-v1.4
- [B2] Bun docs, fullstack dev server: https://bun.com/docs/bundler/fullstack
- [B3] Bun docs, DOM testing: https://bun.com/docs/test/dom
- [V1] Vite, "Vite 8.0 is out!", 2026-03-12: https://vite.dev/blog/announcing-vite8
- [T1] TypeScript, "Announcing TypeScript 7.0", 2026-07-08: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- [E1] typescript-eslint pull request #12803, TypeScript 7.1 native backend prototype: https://github.com/typescript-eslint/typescript-eslint/pull/12803
- [O1] Oxc, "Type-Aware Linting Stable", 2026-07-22: https://oxc.rs/blog/2026-07-22-type-aware-linting-stable
- [O2] Oxlint rules reference: https://oxc.rs/docs/guide/usage/linter/rules.html
- [W1] Vitest, "Vitest 5.0 is out!", 2026-09-03: https://vitest.dev/blog/vitest-5.html
- npm registry and crates.io API queries, 2026-09-19.
