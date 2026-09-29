<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { Bundle, Scenario } from '$lib/contracts';
	import { scenariosOf } from './decision';
	import { lineupBin, lineupRuns, scenarioLineup, type Pool } from './shape-case';

	// D-50: the decision's scenarios as one control. The pick lives in the
	// `?scenario=` query, so the board and every subpage agree on it and a
	// link carries it.
	let { bundle, pool, current }: { bundle: Bundle; pool: Pool; current: Scenario } = $props();

	const rows = $derived.by(() => {
		const base = lineupRuns(pool, scenarioLineup(bundle, bundle.comparison.baseline));
		return scenariosOf(bundle).map((s) => {
			const lineup = scenarioLineup(bundle, s);
			const runs = lineupRuns(pool, lineup);
			const bin = lineupBin(pool, lineup);
			const isBase = s.id === bundle.comparison.baseline.id;
			const delta =
				isBase || runs == null || base == null
					? null
					: `Δ ${runs - base >= 0 ? '+' : '−'}${Math.abs(runs - base).toFixed(1)}`;
			return {
				s,
				runs: runs == null ? 'runs unavailable' : `${runs.toFixed(1)} runs`,
				delta: isBase ? 'baseline' : (delta ?? 'Δ unavailable'),
				fill: `${Math.round(bin.fill)}% filled`
			};
		});
	});

	function choose(id: string): void {
		const url = new URL(page.url);
		if (id === bundle.comparison.baseline.id) url.searchParams.delete('scenario');
		else url.searchParams.set('scenario', id);
		// The target is this page's own resolved URL with a new query, so there is
		// no route to resolve.
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}
</script>

<div class="scenarios" role="group" aria-label="Scenario on the board">
	{#each rows as row (row.s.id)}
		<button
			type="button"
			class="scenario"
			aria-pressed={row.s.id === current.id}
			onclick={() => choose(row.s.id)}
		>
			<span>{row.s.label}</span>
			<small>{row.runs} · {row.delta} · {row.fill}</small>
		</button>
	{/each}
</div>

<style>
	.scenarios {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.scenario {
		display: grid;
		gap: 0.1rem;
		min-height: 2.75rem;
		border: 1px solid var(--rule);
		border-radius: 8px;
		padding: 0.6rem 0.9rem;
		color: var(--ink);
		background: var(--panel);
		font: inherit;
		font-size: 0.9rem;
		text-align: left;
		cursor: pointer;
	}
	.scenario small {
		color: var(--ink-soft);
		font-family: var(--mono);
		font-size: 0.75rem;
	}
	.scenario[aria-pressed='true'] {
		border-color: var(--ink);
		box-shadow: inset 0 0 0 1px var(--ink);
	}
</style>
