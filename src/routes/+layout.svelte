<script lang="ts">
	import AppShell from '$lib/app/AppShell.svelte';
	import favicon from '$lib/app/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// D-62: the shared social tags live in src/app.html so link-preview crawlers, which do not
	// run script, see them (ssr is off). Each page sets its own <title> and description here.
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AppShell>
	{@render children()}
</AppShell>
