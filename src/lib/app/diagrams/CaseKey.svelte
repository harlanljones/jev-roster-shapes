<script lang="ts">
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';
	import { SHAPE_LABELS } from '$lib/shapes/taxonomy';
	import SplitLegend from './SplitLegend.svelte';

	// How to read a piece: color, halves, area, tabs, and the shape vocabulary.
	let { compact = false }: { compact?: boolean } = $props();
</script>

<div class="key">
	<SplitLegend compact />
	{#if !compact}
		<p>
			Left half vs LHP, right half vs RHP, each colored against the league line for that hand and
			scaled by that split against the player's own. A dashed half is under 100 PA. Area is runs:
			actual 2026 PA × observed R/PA. Side tabs are positions played; no tabs means no glove. A
			dashed ring around a piece marks a move from the storyline's baseline.
		</p>
	{/if}
	<ul class="shapes" aria-label="Shape vocabulary">
		{#each SHAPE_LABELS as shape (shape)}
			<li><ShapeGlyph {shape} size={16} />{shape}</li>
		{/each}
	</ul>
</div>

<style>
	.key {
		display: grid;
		gap: var(--spacing-75);
		color: var(--ink-muted);
		font-size: var(--text-xs);
		line-height: var(--text-xs--lh);
	}
	p {
		margin: 0;
	}
	.shapes {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-75) var(--spacing-100);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.shapes li {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-50);
	}
</style>
