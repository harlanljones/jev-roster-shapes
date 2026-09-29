<script lang="ts">
	import { resolve } from '$app/paths';
	import { DIAGRAMS, type DiagramKey } from './decision';

	// D-50: the board and its supplementary diagrams, one row of links. The
	// scenario pick rides along in the query so every page shows the same one.
	let {
		slug,
		current,
		scenarioId = null
	}: {
		slug: string;
		current: 'board' | DiagramKey | 'snapshots';
		scenarioId?: string | null;
	} = $props();

	const query = $derived(scenarioId ? `?scenario=${encodeURIComponent(scenarioId)}` : '');
</script>

<nav class="decision-nav" aria-label="Decision diagrams">
	<a
		href="{resolve('/scenario/[slug]', { slug })}{query}"
		aria-current={current === 'board' ? 'page' : undefined}>Board</a
	>
	{#each DIAGRAMS as d (d.key)}
		<a
			href="{resolve('/scenario/[slug]/[diagram=diagram]', { slug, diagram: d.key })}{query}"
			aria-current={current === d.key ? 'page' : undefined}>{d.nav}</a
		>
	{/each}
	<a
		href={resolve('/scenario/[slug]/snapshots', { slug })}
		aria-current={current === 'snapshots' ? 'page' : undefined}>Snapshots</a
	>
</nav>

<style>
	.decision-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	a {
		display: inline-flex;
		align-items: center;
		min-height: 2.75rem;
		border: 1px solid var(--rule);
		border-radius: 999px;
		padding: 0 0.95rem;
		color: var(--ink);
		background: var(--panel);
		font: 500 0.8rem var(--mono);
		text-decoration: none;
	}
	a:hover {
		border-color: var(--ink-soft);
	}
	a[aria-current='page'] {
		border-color: var(--ink);
		color: var(--panel);
		background: var(--ink);
	}
</style>
