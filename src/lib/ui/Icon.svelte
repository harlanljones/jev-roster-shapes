<script lang="ts" module>
	// D-62: icons come from Phosphor (regular weight, one stroke family), as the
	// ai-design-skills Design Values require. Only the path data is rendered.
	import arrowLeft from '@phosphor-icons/core/regular/arrow-left.svg?raw';
	import arrowRight from '@phosphor-icons/core/regular/arrow-right.svg?raw';
	import arrowUpRight from '@phosphor-icons/core/regular/arrow-up-right.svg?raw';
	import githubLogo from '@phosphor-icons/core/regular/github-logo.svg?raw';

	const SOURCES = {
		'arrow-left': arrowLeft,
		'arrow-right': arrowRight,
		'arrow-up-right': arrowUpRight,
		'github-logo': githubLogo
	} as const;

	export type IconName = keyof typeof SOURCES;

	const PATHS = Object.fromEntries(
		Object.entries(SOURCES).map(([name, svg]) => [
			name,
			[...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]!)
		])
	) as Record<IconName, string[]>;
</script>

<script lang="ts">
	let { name, size = 20, label }: { name: IconName; size?: number; label?: string } = $props();
</script>

<svg
	class="icon"
	viewBox="0 0 256 256"
	width={size}
	height={size}
	fill="currentColor"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	focusable="false"
>
	{#each PATHS[name] as d (d)}
		<path {d} />
	{/each}
</svg>

<style>
	.icon {
		flex: none;
	}
</style>
