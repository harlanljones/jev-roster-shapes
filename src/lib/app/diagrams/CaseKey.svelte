<script lang="ts">
	import ShapeGlyph from '$lib/ui/ShapeGlyph.svelte';
	import { SHAPE_LABELS } from '$lib/shapes/taxonomy';
	import { SAVANT_GRADIENT } from '../shape-case';
	import { LEAGUE_OPS } from '../split-evidence';

	// How to read a piece: color, halves, area, tabs, and the shape vocabulary.
	let { compact = false }: { compact?: boolean } = $props();
	const lg = (v: number) => v.toFixed(3).slice(1);
</script>

<div class="key">
	<div class="ramp">
		<span>vs league</span>
		<span class="bar" style:background={SAVANT_GRADIENT}></span>
		<span>−.150 · avg · +.150 OPS</span>
	</div>
	{#if !compact}
		<p>
			Left half vs LHP, right half vs RHP, each colored against the league line for that hand ({lg(
				LEAGUE_OPS.L
			)} vs LHP, {lg(LEAGUE_OPS.R)} vs RHP) and scaled by that split against the player's own. A dashed
			half is under 100 PA. Area is runs: actual 2026 PA × observed R/PA. Side tabs are positions played;
			no tabs means no glove. A dashed gold ring marks a move from the storyline's baseline.
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
		gap: 0.6rem;
		color: var(--ink-soft);
		font-size: 0.8rem;
		line-height: 1.5;
	}
	.ramp {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
		font-family: var(--mono);
		font-size: 0.72rem;
	}
	.bar {
		width: 9rem;
		height: 0.6rem;
		border-radius: 2px;
	}
	p {
		margin: 0;
	}
	.shapes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 0.8rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.shapes li {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
</style>
