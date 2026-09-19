<script lang="ts">
	import AppShell from '$lib/app/AppShell.svelte';
	import favicon from '$lib/app/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Roster Shapes</title>
</svelte:head>

<AppShell>
	{@render children()}
</AppShell>
