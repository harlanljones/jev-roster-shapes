<script lang="ts">
	import AppShell from '$lib/app/AppShell.svelte';
	import favicon from '$lib/app/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// D-62: shared meta and social tags. Each page sets its own <title> and description.
	const SITE = 'https://jev-roster-shapes.pages.dev';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#eef0ef" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#181818" media="(prefers-color-scheme: dark)" />
	<meta property="og:site_name" content="Roster Shapes" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Roster Shapes" />
	<meta
		property="og:description"
		content="Taylor Wyman's roster shapes idea, applied to eight real 2026 Red Sox decisions."
	/>
	<meta property="og:image" content="{SITE}/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="A Red Sox lineup drawn as shapes packed into a case, with the space it leaves off."
	/>
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<AppShell>
	{@render children()}
</AppShell>
