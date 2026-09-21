<script lang="ts">
	import type { ShapeLabel } from '$lib/shapes/taxonomy';

	let { shape, size = 20 }: { shape: ShapeLabel; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	aria-hidden="true"
	focusable="false"
	fill="currentColor"
>
	{#if shape === 'Square'}
		<rect x="5" y="5" width="14" height="14" rx="1" />
	{:else if shape === 'Rectangle'}
		<rect x="3" y="8" width="18" height="8" rx="1" />
	{:else if shape === 'Circle'}
		<circle cx="12" cy="12" r="8" />
	{:else if shape === 'Pentagon'}
		<polygon points="12,3 20.6,9.2 17.3,19.3 6.7,19.3 3.4,9.2" />
	{:else if shape === 'Octagon'}
		<polygon points="20.3,8.6 15.4,3.7 8.6,3.7 3.7,8.6 3.7,15.4 8.6,20.3 15.4,20.3 20.3,15.4" />
	{:else if shape === 'Diamond'}
		<polygon points="12,3 21,12 12,21 3,12" />
	{:else if shape === 'Star'}
		<path d="M12 2.5l2.9 6.2 6.6.7-4.9 4.5 1.4 6.5-6-3.4-6 3.4 1.4-6.5L2.5 9.4l6.6-.7z" />
	{:else if shape === 'Funky'}
		<path d="M12 3c5 0 9 4 8 9-.5 3-3 4-4 6-1.5 2.5-5 3-7.5 2C5 18.5 3 15 3.5 11.5 4 7 7 3 12 3z" />
	{:else}
		<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-dasharray="3 2" />
	{/if}
</svg>
