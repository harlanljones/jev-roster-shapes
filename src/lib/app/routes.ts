import { resolve } from '$app/paths';
import type { DiagramKey } from './decision';

// D-63: the information architecture's query strings, and the path builders the redirect loaders
// use. Links and goto() calls write `resolve()` inline so the repository's
// svelte/no-navigation-without-resolve guard can see them; they append these queries. The
// scenario pick rides in `?scenario=` and falls back to the baseline when it is missing or
// unknown (`pickScenario`).

/** `?scenario=<id>`, or nothing for the baseline. */
export const scenarioQuery = (scenarioId?: string | null) =>
	scenarioId ? `?scenario=${encodeURIComponent(scenarioId)}` : '';

/** `?view=<diagram>`, plus the scenario pick when there is one. */
export const detailQuery = (view: DiagramKey, scenarioId?: string | null) =>
	`?view=${encodeURIComponent(view)}${scenarioId ? `&scenario=${encodeURIComponent(scenarioId)}` : ''}`;

// Path builders for the D-63 redirects from the old URLs.
export const decisionHref = (slug: string, scenarioId?: string | null) =>
	`${resolve('/decisions/[slug]', { slug })}${scenarioQuery(scenarioId)}`;

export const detailHref = (slug: string, view: DiagramKey, scenarioId?: string | null) =>
	`${resolve('/decisions/[slug]/detail', { slug })}${detailQuery(view, scenarioId)}`;

export const snapshotsHref = (slug: string) => resolve('/decisions/[slug]/snapshots', { slug });

/** Player pages take the MLBAM number without its `mlbam-` prefix. */
export const playerHref = (playerId: string) =>
	resolve('/players/[id]', { id: playerId.replace(/^mlbam-/, '') });
