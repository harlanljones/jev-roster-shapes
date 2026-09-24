<script lang="ts">
	import { shapePath } from '$lib/shapes/geometry';
	import type { ShapeLabel } from '$lib/shapes/taxonomy';

	// Equal-area glyphs (D-43): every label draws with the same area, so a
	// glyph shows which shape, never how much.
	let { shape, size = 20 }: { shape: ShapeLabel; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="-14 -14 28 28"
	aria-hidden="true"
	focusable="false"
	fill="currentColor"
>
	{#if shape === 'Unclassified'}
		<path
			d={shapePath('Circle', 0, 0, 9)}
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-dasharray="3 2"
		/>
	{:else}
		<path d={shapePath(shape, 0, 0, 9)} />
	{/if}
</svg>
