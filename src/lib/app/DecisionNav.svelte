<script lang="ts">
	import { resolve } from '$app/paths';
	import { DIAGRAMS, type DiagramKey } from './decision';
	import { detailQuery, scenarioQuery } from './routes';

	// D-63: a decision has four places: its board, the tabbed diagrams behind it, the Jev
	// snapshots, and the comparison workspace. The scenario pick rides along on the board and
	// the diagrams and the workspace so they all show the same one.
	let {
		slug,
		current,
		scenarioId = null
	}: {
		slug: string;
		current: 'board' | DiagramKey | 'snapshots' | 'compare';
		scenarioId?: string | null;
	} = $props();

	const inDetail = $derived(DIAGRAMS.some((d) => d.key === current));
	const view = $derived(inDetail ? (current as DiagramKey) : 'case');
</script>

<nav class="decision-nav" aria-label="This decision">
	<ul class="segments">
		<li>
			<a
				href="{resolve('/decisions/[slug]', { slug: slug })}{scenarioQuery(scenarioId)}"
				aria-current={current === 'board' ? 'page' : undefined}>Board</a
			>
		</li>
		<li>
			<a
				href="{resolve('/decisions/[slug]/detail', { slug: slug })}{detailQuery(view, scenarioId)}"
				aria-current={inDetail ? 'page' : undefined}>Diagrams</a
			>
		</li>
		<li>
			<a
				href={resolve('/decisions/[slug]/snapshots', { slug: slug })}
				aria-current={current === 'snapshots' ? 'page' : undefined}>Snapshots</a
			>
		</li>
		<li>
			<a
				href="{resolve('/decisions/[slug]/compare', { slug: slug })}{scenarioQuery(scenarioId)}"
				aria-current={current === 'compare' ? 'page' : undefined}>Workspace</a
			>
		</li>
	</ul>
</nav>
{#if inDetail}
	<nav class="views" aria-label="Diagram">
		{#each DIAGRAMS as d (d.key)}
			<a
				href="{resolve('/decisions/[slug]/detail', { slug: slug })}{detailQuery(d.key, scenarioId)}"
				aria-current={current === d.key ? 'true' : undefined}>{d.nav}</a
			>
		{/each}
	</nav>
{/if}

<style>
	.segments {
		display: inline-flex;
		flex-wrap: wrap;
		gap: var(--spacing-50);
		margin: 0;
		padding: var(--spacing-50);
		list-style: none;
		border: 1px solid var(--case-300);
		border-radius: var(--radius-md);
		background: var(--case-200);
	}
	.segments a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 var(--spacing-200);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 600;
		text-decoration: none;
	}
	.segments a:hover {
		color: var(--ink);
		background: var(--case-100);
	}
	.segments a[aria-current='page'] {
		border-color: var(--case-300);
		color: var(--ink);
		background: var(--case-100);
		box-shadow: inset 0 -2px 0 var(--turf);
	}
	@media (max-width: 520px) {
		.segments {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			box-sizing: border-box;
			width: 100%;
		}
		.segments a {
			justify-content: center;
		}
	}
	.views {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-300);
		margin-top: var(--spacing-200);
	}
	.views a {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: var(--ink-muted);
		font-size: var(--text-sm);
		line-height: var(--text-sm--lh);
		font-weight: 500;
		text-decoration: none;
	}
	/* The current view is marked by a bar that grows from the left: transform only. */
	.views a::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: var(--spacing-50);
		height: 2px;
		background: var(--turf);
		transform: scaleX(0);
		transform-origin: left;
	}
	.views a:hover {
		color: var(--ink);
	}
	.views a[aria-current='true'] {
		color: var(--ink);
	}
	.views a[aria-current='true']::after {
		transform: scaleX(1);
	}
	@media (prefers-reduced-motion: no-preference) {
		.views a {
			transition: color var(--dur-fade) var(--ease);
		}
		.views a::after {
			transition: transform var(--dur-move) var(--ease);
		}
	}
</style>
